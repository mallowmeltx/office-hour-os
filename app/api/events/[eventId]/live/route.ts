import { EventStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { notifyFollowersForEvent } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  topic: z.string().min(3),
  meetingUrl: z.url(),
});

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    if (user.role !== UserRole.PROFESSOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await context.params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.professorId !== user.id) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.LIVE,
        liveTopic: parsed.data.topic,
        meetingUrl: parsed.data.meetingUrl,
      },
    });

    const eventTags = await prisma.eventTag.findMany({
      where: { eventId },
      select: { tagId: true },
    });

    const liveSession = await prisma.liveSession.create({
      data: {
        eventId,
        professorId: user.id,
        topic: parsed.data.topic,
        meetingUrl: parsed.data.meetingUrl,
        isActive: true,
        tags: {
          create: eventTags.map((row) => ({ tagId: row.tagId })),
        },
      },
    });

    await notifyFollowersForEvent({
      eventId,
      professorId: user.id,
      title: "Professor is Live Now",
      body: `${user.name ?? user.email} started "${parsed.data.topic}".`,
      type: "event_live",
    });

    return NextResponse.json({ event: updatedEvent, liveSession });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
