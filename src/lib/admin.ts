import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAdminUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "ADMIN",
    },
    select: {
      email: true,
      id: true,
    },
  });
}

export async function isCurrentUserAdmin() {
  return Boolean(await getAdminUser());
}
