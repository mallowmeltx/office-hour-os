import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { notificationId } = await context.params;

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
