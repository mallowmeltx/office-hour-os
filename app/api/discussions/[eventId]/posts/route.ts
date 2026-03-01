import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDiscussionTree } from "@/lib/discussions";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_: Request, context: Params) {
  const { eventId } = await context.params;
  const posts = await prisma.discussionPost.findMany({
    where: {
      eventId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorId: true,
      parentId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ posts, tree: buildDiscussionTree(posts) });
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const parsed = createPostSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const post = await prisma.discussionPost.create({
      data: {
        eventId,
        authorId: user.id,
        content: parsed.data.content,
        parentId: parsed.data.parentId,
      },
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
