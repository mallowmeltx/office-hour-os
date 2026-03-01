import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ tagId: string }>;
};

export async function POST(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { tagId } = await context.params;

    await prisma.followTag.upsert({
      where: {
        studentId_tagId: {
          studentId: user.id,
          tagId,
        },
      },
      update: {},
      create: {
        studentId: user.id,
        tagId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Concurrent follow requests can race; treat duplicate insert as success.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: true });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to follow tag" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { tagId } = await context.params;

    await prisma.followTag.deleteMany({
      where: {
        studentId: user.id,
        tagId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to unfollow tag" }, { status: 500 });
  }
}
