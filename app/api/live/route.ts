import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { notifyFollowersForLiveSession } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const goLiveSchema = z.object({
  topic: z.string().min(3),
  meetingUrl: z.string().optional(),
  eventId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
});

function normalizeMeetingUrl(raw: string) {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function GET() {
  try {
    const sessions = await prisma.liveSession.findMany({
      where: { isActive: true },
      include: {
        professor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: { id: true, title: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch live sessions",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "PROFESSOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = goLiveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.liveSession.updateMany({
      where: { professorId: user.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    let resolvedEventId = parsed.data.eventId;
    let eventTagIds: string[] = [];
    let resolvedMeetingUrl = parsed.data.meetingUrl?.trim() ?? "";

    if (resolvedEventId) {
      const event = await prisma.event.findUnique({
        where: { id: resolvedEventId },
        select: { id: true, professorId: true, meetingUrl: true },
      });

      if (!event || event.professorId !== user.id) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await prisma.event.update({
        where: { id: resolvedEventId },
        data: {
          status: "LIVE",
          liveTopic: parsed.data.topic,
        },
      });

      resolvedMeetingUrl = event.meetingUrl;

      eventTagIds = (
        await prisma.eventTag.findMany({
          where: { eventId: resolvedEventId },
          select: { tagId: true },
        })
      ).map((row: { tagId: string }) => row.tagId);
    } else {
      if (!resolvedMeetingUrl) {
        return NextResponse.json(
          { error: "Meeting URL is required when no event is linked." },
          { status: 400 },
        );
      }

      resolvedMeetingUrl = normalizeMeetingUrl(resolvedMeetingUrl);
      try {
        new URL(resolvedMeetingUrl);
      } catch {
        return NextResponse.json({ error: "Meeting URL is invalid." }, { status: 400 });
      }

      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);
      const createdEvent = await prisma.event.create({
        data: {
          professorId: user.id,
          title: `Live Session: ${parsed.data.topic}`,
          description: "Ad-hoc live office hour session",
          startTime: now,
          endTime: end,
          meetingUrl: resolvedMeetingUrl,
          status: "LIVE",
          liveTopic: parsed.data.topic,
          tags: {
            create: parsed.data.tagIds.map((tagId) => ({ tagId })),
          },
        },
        select: { id: true },
      });

      resolvedEventId = createdEvent.id;
      eventTagIds = [...parsed.data.tagIds];
    }

    const mergedTagIds = [...new Set([...parsed.data.tagIds, ...eventTagIds])];

    const liveSession = await prisma.liveSession.create({
      data: {
        professorId: user.id,
        eventId: resolvedEventId,
        topic: parsed.data.topic,
        meetingUrl: resolvedMeetingUrl,
        tags: {
          create: mergedTagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    await notifyFollowersForLiveSession({
      professorId: user.id,
      title: "Professor is Live Now",
      body: `${user.name ?? user.email} started "${parsed.data.topic}".`,
      type: "event_live",
      tagIds: mergedTagIds,
      eventId: resolvedEventId,
    });

    return NextResponse.json({ liveSession }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to start live session" }, { status: 500 });
  }
}
