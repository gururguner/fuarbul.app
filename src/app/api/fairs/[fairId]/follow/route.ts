import { FairStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type FollowRouteContext = {
  params: Promise<{
    fairId: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: FollowRouteContext) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { fairId } = await params;
  const fair = await getPublishedFair(fairId);

  if (!fair) {
    return NextResponse.json({ error: "fair_not_found" }, { status: 404 });
  }

  await prisma.followedFair.upsert({
    create: {
      fairId,
      userId,
    },
    update: {},
    where: {
      userId_fairId: {
        fairId,
        userId,
      },
    },
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(_request: Request, { params }: FollowRouteContext) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { fairId } = await params;

  await prisma.followedFair.deleteMany({
    where: {
      fairId,
      userId,
    },
  });

  return NextResponse.json({ following: false });
}

function getPublishedFair(fairId: string) {
  return prisma.fair.findFirst({
    where: {
      id: fairId,
      isPublished: true,
      status: FairStatus.PUBLISHED,
    },
    select: {
      id: true,
    },
  });
}
