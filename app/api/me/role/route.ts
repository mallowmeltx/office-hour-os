import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["STUDENT", "PROFESSOR"] as const;
type AllowedRole = (typeof allowedRoles)[number];

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const role = body?.role;

    if (!allowedRoles.includes(role as AllowedRole)) {
      return NextResponse.json(
        { error: "role must be STUDENT or PROFESSOR" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: role as AllowedRole },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
