import "server-only";

import { NotificationTrigger } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getReminderCandidates,
  sendReminderToCandidate,
} from "@/lib/reminders";
import type { Locale } from "@/lib/i18n";

type TriggerSummary = {
  checkedCount: number;
  failedCount: number;
  sentCount: number;
  skippedCount: number;
};

export type FairReminderJobSummary = {
  checkedCount: number;
  errors: string[];
  failedCount: number;
  sentCount: number;
  skippedCount: number;
  triggerBreakdown: Record<NotificationTrigger, TriggerSummary>;
};

type FairReminderJobOptions = {
  locale?: Locale;
  referenceDate?: Date;
};

const reminderTriggers = [
  NotificationTrigger.THIRTY_DAYS_BEFORE,
  NotificationTrigger.SEVEN_DAYS_BEFORE,
  NotificationTrigger.ONE_DAY_BEFORE,
  NotificationTrigger.FAIR_STARTED,
] as const;

export async function runFairReminderJob({
  locale = "tr",
  referenceDate = new Date(),
}: FairReminderJobOptions = {}): Promise<FairReminderJobSummary> {
  await createMissingDefaultNotificationPreferences();

  const summary = createEmptySummary();

  for (const trigger of reminderTriggers) {
    const triggerSummary = summary.triggerBreakdown[trigger];
    const candidates = await getReminderCandidates(
      trigger,
      referenceDate,
      locale,
    );

    triggerSummary.checkedCount += candidates.length;
    summary.checkedCount += candidates.length;

    for (const candidate of candidates) {
      const result = await sendReminderToCandidate(candidate, locale);

      if (result.skipped) {
        triggerSummary.skippedCount += 1;
        summary.skippedCount += 1;
        continue;
      }

      if (result.ok) {
        triggerSummary.sentCount += 1;
        summary.sentCount += 1;
        continue;
      }

      triggerSummary.failedCount += 1;
      summary.failedCount += 1;
      summary.errors.push(
        `${trigger} ${candidate.userId}/${candidate.fairId}: ${
          result.error ?? "Unknown email send failure"
        }`,
      );
    }
  }

  return summary;
}

async function createMissingDefaultNotificationPreferences() {
  const followedUsers = await prisma.followedFair.findMany({
    distinct: ["userId"],
    select: {
      user: {
        select: {
          notificationPreference: {
            select: {
              id: true,
            },
          },
        },
      },
      userId: true,
    },
  });
  const missingPreferenceUserIds = followedUsers
    .filter((followedUser) => !followedUser.user.notificationPreference)
    .map((followedUser) => followedUser.userId);

  if (!missingPreferenceUserIds.length) {
    return;
  }

  await prisma.notificationPreference.createMany({
    data: missingPreferenceUserIds.map((userId) => ({
      userId,
    })),
    skipDuplicates: true,
  });
}

function createEmptySummary(): FairReminderJobSummary {
  return {
    checkedCount: 0,
    errors: [],
    failedCount: 0,
    sentCount: 0,
    skippedCount: 0,
    triggerBreakdown: {
      [NotificationTrigger.THIRTY_DAYS_BEFORE]: createEmptyTriggerSummary(),
      [NotificationTrigger.SEVEN_DAYS_BEFORE]: createEmptyTriggerSummary(),
      [NotificationTrigger.ONE_DAY_BEFORE]: createEmptyTriggerSummary(),
      [NotificationTrigger.FAIR_STARTED]: createEmptyTriggerSummary(),
    },
  };
}

function createEmptyTriggerSummary(): TriggerSummary {
  return {
    checkedCount: 0,
    failedCount: 0,
    sentCount: 0,
    skippedCount: 0,
  };
}
