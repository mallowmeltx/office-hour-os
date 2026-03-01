import { EventStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function PATCH(_: Request, context: Params) {
  try {
    const user = await requireUser();
    if (user.role !== UserRole.PROFESSOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await context.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.professorId !== user.id) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.ENDED },
      }),
      prisma.liveSession.updateMany({
        where: {
          eventId,
          isActive: true,
        },
        data: {
          isActive: false,
          endedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
