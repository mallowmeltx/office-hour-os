import { NextResponse } from "next/server";
import { DEFAULT_TAGS } from "@/lib/default-tags";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await prisma.tag.createMany({
    data: DEFAULT_TAGS,
    skipDuplicates: true,
  });

  const user = await getCurrentUser();
  const [tags, following] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    user
      ? prisma.followTag.findMany({
          where: { studentId: user.id },
          select: { tagId: true },
        })
      : Promise.resolve([]),
  ]);

  const followed = new Set(following.map((row: { tagId: string }) => row.tagId));

  return NextResponse.json({
    tags: tags.map((tag: { id: string; slug: string; name: string }) => ({
      ...tag,
      isFollowing: followed.has(tag.id),
    })),
  });
}
