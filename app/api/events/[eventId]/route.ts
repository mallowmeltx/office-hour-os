import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_: Request, context: Params) {
  const { eventId } = await context.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      professor: {
        select: { id: true, name: true, email: true },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      liveSessions: {
        where: { isActive: true },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function DELETE(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, professorId: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (event.professorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction([
      // Remove all live session records tied to this event.
      prisma.liveSession.deleteMany({
        where: { eventId },
      }),
      prisma.event.delete({ where: { id: eventId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
