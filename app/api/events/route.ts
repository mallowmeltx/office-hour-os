import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/current-user";
import { notifyFollowersForEvent } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
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

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const tagId = search.get("tagId");
  const professorId = search.get("professorId");

  const events = await prisma.event.findMany({
    where: {
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

  return NextResponse.json({ events });
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

    const start = new Date(parsed.data.startTime);
    const end = new Date(parsed.data.endTime);
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
