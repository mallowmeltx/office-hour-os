import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
