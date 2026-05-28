import "server-only";

import {
  FairStatus,
  NotificationTrigger,
  NotificationType,
  Prisma,
} from "@prisma/client";

import {
  formatReminderDateRange,
  getUserDisplayName,
  sendFairReminderEmail,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

export type ReminderCandidate = {
  city: string;
  dateRange: string;
  email: string;
  fairId: string;
  fairName: string;
  officialWebsite: string | null;
  trigger: NotificationTrigger;
  userId: string;
  userName: string;
  venue: string;
};

const preferenceFieldByTrigger = {
  [NotificationTrigger.THIRTY_DAYS_BEFORE]: "remindThirtyDaysBefore",
  [NotificationTrigger.SEVEN_DAYS_BEFORE]: "remindSevenDaysBefore",
  [NotificationTrigger.ONE_DAY_BEFORE]: "remindOneDayBefore",
  [NotificationTrigger.FAIR_STARTED]: "remindFairStarted",
} satisfies Record<NotificationTrigger, keyof Prisma.NotificationPreferenceWhereInput>;

const daysBeforeByTrigger = {
  [NotificationTrigger.THIRTY_DAYS_BEFORE]: 30,
  [NotificationTrigger.SEVEN_DAYS_BEFORE]: 7,
  [NotificationTrigger.ONE_DAY_BEFORE]: 1,
  [NotificationTrigger.FAIR_STARTED]: 0,
} satisfies Record<NotificationTrigger, number>;

export async function getReminderCandidates(
  trigger: NotificationTrigger,
  referenceDate = new Date(),
  locale: Locale = "tr",
) {
  const dateRange = getTriggerDateRange(trigger, referenceDate);
  const preferenceField = preferenceFieldByTrigger[trigger];
  const notificationPreferenceWhere: Prisma.NotificationPreferenceWhereInput = {
    emailEnabled: true,
    [preferenceField]: true,
  };
  const followedFairs = await prisma.followedFair.findMany({
    where: {
      fair: {
        isPublished: true,
        startDate: dateRange,
        status: FairStatus.PUBLISHED,
      },
      user: {
        notificationPreference: {
          is: notificationPreferenceWhere,
        },
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
          id: true,
          name: true,
          surname: true,
        },
      },
    },
  });

  if (!followedFairs.length) {
    return [];
  }

  const sentLogs = await prisma.notificationLog.findMany({
    where: {
      OR: followedFairs.map((followedFair) => ({
        fairId: followedFair.fairId,
        userId: followedFair.userId,
      })),
      status: "SENT",
      trigger,
      type: NotificationType.EMAIL,
    },
    select: {
      fairId: true,
      userId: true,
    },
  });
  const sentLogKeys = new Set(
    sentLogs.map((log) => getCandidateKey(log.userId, log.fairId)),
  );

  return followedFairs
    .filter(
      (followedFair) =>
        !sentLogKeys.has(
          getCandidateKey(followedFair.userId, followedFair.fairId),
        ),
    )
    .map(
      (followedFair): ReminderCandidate => ({
        city: followedFair.fair.city,
        dateRange: formatReminderDateRange(
          followedFair.fair.startDate,
          followedFair.fair.endDate,
          locale,
        ),
        email: followedFair.user.email,
        fairId: followedFair.fair.id,
        fairName: followedFair.fair.name,
        officialWebsite: followedFair.fair.officialWebsite,
        trigger,
        userId: followedFair.user.id,
        userName: getUserDisplayName(followedFair.user),
        venue: followedFair.fair.venue,
      }),
    );
}

export async function sendReminderToCandidate(
  candidate: ReminderCandidate,
  locale: Locale = "tr",
) {
  return sendFairReminderEmail({
    city: candidate.city,
    dateRange: candidate.dateRange,
    fairId: candidate.fairId,
    fairName: candidate.fairName,
    locale,
    officialWebsite: candidate.officialWebsite,
    to: candidate.email,
    trigger: candidate.trigger,
    userId: candidate.userId,
    userName: candidate.userName,
    venue: candidate.venue,
  });
}

function getTriggerDateRange(
  trigger: NotificationTrigger,
  referenceDate: Date,
): Prisma.DateTimeFilter {
  const targetDate = new Date(referenceDate);
  targetDate.setDate(referenceDate.getDate() + daysBeforeByTrigger[trigger]);

  return {
    gte: startOfDay(targetDate),
    lte: endOfDay(targetDate),
  };
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}

function getCandidateKey(userId: string, fairId: string) {
  return `${userId}:${fairId}`;
}
