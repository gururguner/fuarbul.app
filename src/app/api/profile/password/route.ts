import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const minPasswordLength = 8;

type ChangePasswordPayload = {
  confirmPassword?: string;
  currentPassword?: string;
  newPassword?: string;
};

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ChangePasswordPayload;
  const currentPassword = getPasswordValue(payload.currentPassword);
  const newPassword = getPasswordValue(payload.newPassword);
  const confirmPassword = getPasswordValue(payload.confirmPassword);

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  if (newPassword.length < minPasswordLength) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: "no_password_account" }, { status: 400 });
  }

  const passwordMatches = await compare(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    return NextResponse.json(
      { error: "current_password_incorrect" },
      { status: 400 },
    );
  }

  const passwordHash = await hash(newPassword, 12);

  await prisma.user.update({
    data: {
      passwordHash,
    },
    where: {
      id: userId,
    },
  });

  return NextResponse.json({ ok: true });
}

function getPasswordValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
