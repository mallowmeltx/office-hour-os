import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const role = body?.role;

    if (role !== UserRole.STUDENT && role !== UserRole.PROFESSOR) {
      return NextResponse.json(
        { error: "role must be STUDENT or PROFESSOR" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
