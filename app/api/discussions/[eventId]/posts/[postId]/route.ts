import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000),
});

type Params = {
  params: Promise<{ eventId: string; postId: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    const { eventId, postId } = await context.params;
    const parsed = updatePostSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.discussionPost.findFirst({
      where: {
        id: postId,
        eventId,
      },
      select: {
        id: true,
        authorId: true,
        deletedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ error: "Cannot edit a deleted post." }, { status: 400 });
    }

    const post = await prisma.discussionPost.update({
      where: { id: postId },
      data: {
        content: parsed.data.content.trim(),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    const { eventId, postId } = await context.params;

    const existing = await prisma.discussionPost.findFirst({
      where: {
        id: postId,
        eventId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.discussionPost.update({
      where: { id: postId },
      data: {
        content: "deleted",
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
