import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ professorId: string }>;
};

export async function POST(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { professorId } = await context.params;

    if (professorId === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 },
      );
    }

    await prisma.followProfessor.upsert({
      where: {
        studentId_professorId: {
          studentId: user.id,
          professorId,
        },
      },
      update: {},
      create: {
        studentId: user.id,
        professorId,
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
    return NextResponse.json(
      { error: "Failed to follow professor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const user = await requireUser();
    const { professorId } = await context.params;

    await prisma.followProfessor.deleteMany({
      where: {
        studentId: user.id,
        professorId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to unfollow professor" },
      { status: 500 },
    );
  }
}
