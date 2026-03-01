import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  const [professors, following] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.PROFESSOR },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    user
      ? prisma.followProfessor.findMany({
          where: { studentId: user.id },
          select: { professorId: true },
        })
      : Promise.resolve([]),
  ]);

  const followed = new Set(following.map((item) => item.professorId));

  return NextResponse.json({
    professors: professors.map((professor) => ({
      ...professor,
      isFollowing: followed.has(professor.id),
    })),
  });
}
