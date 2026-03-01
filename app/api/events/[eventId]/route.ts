import { NextResponse } from "next/server";
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
