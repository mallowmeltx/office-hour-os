import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/current-user";
import { notifyFollowersForEvent } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  // Legacy fields (single datetime values)
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  // New fields (separate date/time controls)
  startDate: z.string().optional(),
  startClock: z.string().optional(),
  endDate: z.string().optional(),
  endClock: z.string().optional(),
  meetingUrl: z.string().min(3),
  tagIds: z.array(z.string()).default([]),
});

function normalizeMeetingUrl(raw: string) {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol;
}

function addHour(date: Date) {
  return new Date(date.getTime() + 60 * 60 * 1000);
}

function parseLocalDateTime(datePart: string, timePart: string) {
  return new Date(`${datePart}T${timePart}`);
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const tagId = search.get("tagId");
  const professorId = search.get("professorId");
  const user = await getCurrentUser();
  const now = new Date();

  // Auto-clean expired events and close their live sessions.
  const expiredEvents = await prisma.event.findMany({
    where: { endTime: { lt: now } },
    select: { id: true },
  });

  if (expiredEvents.length > 0) {
    const expiredIds = expiredEvents.map((event: { id: string }) => event.id);
    await prisma.$transaction([
      prisma.liveSession.deleteMany({
        where: {
          eventId: { in: expiredIds },
        },
      }),
      prisma.event.deleteMany({
        where: { id: { in: expiredIds } },
      }),
    ]);
  }

  const events = await prisma.event.findMany({
    where: {
      endTime: { gte: now },
      ...(professorId ? { professorId } : {}),
      ...(tagId
        ? {
            tags: {
              some: {
                tagId,
              },
            },
          }
        : {}),
    },
    orderBy: { startTime: "asc" },
    include: {
      professor: {
        select: { id: true, name: true, email: true },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return NextResponse.json({
    events: events.map(
      (event: { professorId: string }) => ({
        ...event,
        isOwner: user ? event.professorId === user.id : false,
      }),
    ),
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "PROFESSOR") {
      return NextResponse.json(
        { error: "Only professors can create events" },
        { status: 403 },
      );
    }

    const parsed = createEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let start: Date;
    let end: Date;

    // New split date/time shape
    if (parsed.data.startDate || parsed.data.startClock) {
      if (!parsed.data.startDate || !parsed.data.startClock) {
        return NextResponse.json(
          { error: "Start date and start time are required." },
          { status: 400 },
        );
      }

      start = parseLocalDateTime(parsed.data.startDate, parsed.data.startClock);

      if (!parsed.data.endDate && !parsed.data.endClock) {
        // No end provided -> default 1 hour session.
        end = addHour(start);
      } else if (parsed.data.endDate && !parsed.data.endClock) {
        // End date only -> keep same start clock.
        end = parseLocalDateTime(parsed.data.endDate, parsed.data.startClock);
      } else if (!parsed.data.endDate && parsed.data.endClock) {
        // End time only -> keep same start date.
        end = parseLocalDateTime(parsed.data.startDate, parsed.data.endClock);
      } else {
        end = parseLocalDateTime(
          parsed.data.endDate as string,
          parsed.data.endClock as string,
        );
      }
    } else {
      // Legacy single datetime shape
      if (!parsed.data.startTime) {
        return NextResponse.json({ error: "Start time is required." }, { status: 400 });
      }
      start = new Date(parsed.data.startTime);
      end = parsed.data.endTime ? new Date(parsed.data.endTime) : addHour(start);
    }

    const meetingUrl = normalizeMeetingUrl(parsed.data.meetingUrl);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid start or end date/time." },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time." },
        { status: 400 },
      );
    }

    try {
      // Validate final URL shape after normalization.
      new URL(meetingUrl);
    } catch {
      return NextResponse.json(
        { error: "Meeting URL is invalid." },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || undefined,
        startTime: start,
        endTime: end,
        meetingUrl,
        professorId: user.id,
        tags: {
          create: parsed.data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    await notifyFollowersForEvent({
      eventId: event.id,
      professorId: user.id,
      title: "New Office Hour Event",
      body: `${event.title} was scheduled by ${user.name ?? user.email}.`,
      type: "event_created",
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch {
    const maybeUser = await getCurrentUser();
    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
