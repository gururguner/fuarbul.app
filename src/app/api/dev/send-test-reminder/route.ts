import { FairStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  formatReminderDateRange,
  getUserDisplayName,
  sendFairReminderEmail,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const followedFairs = await prisma.followedFair.findMany({
    where: {
      userId,
      fair: {
        endDate: {
          gte: startOfToday(),
        },
        isPublished: true,
        status: FairStatus.PUBLISHED,
      },
    },
    include: {
      fair: {
        select: {
          city: true,
          endDate: true,
          id: true,
          name: true,
          officialWebsite: true,
          startDate: true,
          venue: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
          surname: true,
        },
      },
    },
  });
  const followedFair = followedFairs.sort(
    (a, b) => a.fair.startDate.getTime() - b.fair.startDate.getTime(),
  )[0];

  if (!followedFair) {
    return NextResponse.json(
      { error: "no_followed_fairs" },
      { status: 400 },
    );
  }

  const result = await sendFairReminderEmail({
    city: followedFair.fair.city,
    dateRange: formatReminderDateRange(
      followedFair.fair.startDate,
      followedFair.fair.endDate,
      "tr",
    ),
    fairName: followedFair.fair.name,
    locale: "tr",
    logDelivery: false,
    officialWebsite: followedFair.fair.officialWebsite,
    to: followedFair.user.email,
    userName: getUserDisplayName(followedFair.user),
    venue: followedFair.fair.venue,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "send_failed", message: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    fairName: followedFair.fair.name,
    ok: true,
  });
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}
