import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type NotificationPreferencesPayload = {
  emailEnabled?: unknown;
  inAppEnabled?: unknown;
  remindFairStarted?: unknown;
  remindOneDayBefore?: unknown;
  remindSevenDaysBefore?: unknown;
  remindThirtyDaysBefore?: unknown;
};

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as NotificationPreferencesPayload;
  const preferences = await prisma.notificationPreference.upsert({
    create: {
      emailEnabled: toBoolean(payload.emailEnabled),
      inAppEnabled: toBoolean(payload.inAppEnabled),
      remindFairStarted: toBoolean(payload.remindFairStarted),
      remindOneDayBefore: toBoolean(payload.remindOneDayBefore),
      remindSevenDaysBefore: toBoolean(payload.remindSevenDaysBefore),
      remindThirtyDaysBefore: toBoolean(payload.remindThirtyDaysBefore),
      userId,
    },
    update: {
      emailEnabled: toBoolean(payload.emailEnabled),
      inAppEnabled: toBoolean(payload.inAppEnabled),
      remindFairStarted: toBoolean(payload.remindFairStarted),
      remindOneDayBefore: toBoolean(payload.remindOneDayBefore),
      remindSevenDaysBefore: toBoolean(payload.remindSevenDaysBefore),
      remindThirtyDaysBefore: toBoolean(payload.remindThirtyDaysBefore),
    },
    where: {
      userId,
    },
    select: {
      emailEnabled: true,
      inAppEnabled: true,
      remindFairStarted: true,
      remindOneDayBefore: true,
      remindSevenDaysBefore: true,
      remindThirtyDaysBefore: true,
    },
  });

  return NextResponse.json({
    preferences,
  });
}

function toBoolean(value: unknown) {
  return value === true;
}
