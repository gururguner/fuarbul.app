import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type InterestsPayload = {
  categoryIds?: unknown;
};

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as InterestsPayload;
  const categoryIds = Array.isArray(payload.categoryIds)
    ? payload.categoryIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const uniqueCategoryIds = Array.from(new Set(categoryIds));

  if (!uniqueCategoryIds.length) {
    return NextResponse.json(
      { error: "missing_interests" },
      { status: 400 },
    );
  }

  const validCategories = await prisma.category.findMany({
    where: {
      id: {
        in: uniqueCategoryIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      nameEn: true,
      nameTr: true,
      slug: true,
    },
  });

  if (validCategories.length !== uniqueCategoryIds.length) {
    return NextResponse.json(
      { error: "invalid_interests" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.userInterest.deleteMany({
      where: {
        userId,
        categoryId: {
          notIn: uniqueCategoryIds,
        },
      },
    }),
    prisma.userInterest.createMany({
      data: uniqueCategoryIds.map((categoryId) => ({
        categoryId,
        userId,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({
    interests: validCategories,
  });
}
