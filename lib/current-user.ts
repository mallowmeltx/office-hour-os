import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

const ROLE_STUDENT = "STUDENT" as const;
const ROLE_PROFESSOR = "PROFESSOR" as const;

export async function getCurrentUser() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return null;
  }

  const auth0UserId = session.user.sub;
  const email = session.user.email;

  if (!auth0UserId || !email) {
    return null;
  }

  return prisma.user.upsert({
    where: { auth0UserId },
    update: {
      email,
      name: session.user.name ?? session.user.nickname ?? undefined,
    },
    create: {
      auth0UserId,
      email,
      name: session.user.name ?? session.user.nickname ?? undefined,
      role: ROLE_STUDENT,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireProfessor() {
  const user = await requireUser();
  if (user.role !== ROLE_PROFESSOR) {
    throw new Error("Forbidden");
  }
  return user;
}
