import { NextResponse } from "next/server";
import { buildDiscussionTree, discussionToText } from "@/lib/discussions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_: Request, context: Params) {
  const { eventId } = await context.params;

  const [event, posts] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    }),
    prisma.discussionPost.findMany({
      where: {
        eventId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        parentId: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tree = buildDiscussionTree(posts);
  const lines = [
    `Office Hours OS Discussion Export`,
    `Event: ${event.title}`,
    `Event ID: ${event.id}`,
    `Exported At: ${new Date().toISOString()}`,
    "",
    discussionToText(tree),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.id}-discussion.txt"`,
    },
  });
}
