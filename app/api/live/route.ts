import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { notifyFollowersForLiveSession } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const goLiveSchema = z.object({
  topic: z.string().min(3),
  meetingUrl: z.url(),
  eventId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
});

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
    if (user.role !== UserRole.PROFESSOR) {
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

    const eventTagIds = parsed.data.eventId
      ? (
          await prisma.eventTag.findMany({
            where: { eventId: parsed.data.eventId },
            select: { tagId: true },
          })
        ).map((row) => row.tagId)
      : [];

    const mergedTagIds = [...new Set([...parsed.data.tagIds, ...eventTagIds])];

    const liveSession = await prisma.liveSession.create({
      data: {
        professorId: user.id,
        eventId: parsed.data.eventId,
        topic: parsed.data.topic,
        meetingUrl: parsed.data.meetingUrl,
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
      eventId: parsed.data.eventId,
    });

    return NextResponse.json({ liveSession }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to start live session" }, { status: 500 });
  }
}
