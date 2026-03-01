import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function PATCH(_: Request, context: Params) {
  try {
    const user = await requireUser();
    if (user.role !== "PROFESSOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await context.params;
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { professorId: true },
    });

    if (!session || session.professorId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
