import "server-only";

import {
  NotificationTrigger,
  NotificationType,
  type User,
} from "@prisma/client";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

type SendEmailInput = {
  from?: string;
  html?: string;
  subject: string;
  text: string;
  to: string | string[];
};

type MailResult = {
  error?: string;
  id?: string | null;
  ok: boolean;
  skipped?: boolean;
};

type FairReminderEmailInput = {
  city: string;
  dateRange: string;
  fairId?: string;
  fairName: string;
  officialWebsite?: string | null;
  to: string;
  trigger?: NotificationTrigger;
  userId?: string;
  userName: string;
  venue: string;
  locale?: Locale;
  logDelivery?: boolean;
};

const defaultEmailFrom = "fuarbul <onboarding@resend.dev>";

export async function sendEmail({
  from = getEmailFrom(),
  html,
  subject,
  text,
  to,
}: SendEmailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[mail] RESEND_API_KEY is not configured.");

    return {
      error: "RESEND_API_KEY is not configured.",
      ok: false,
    };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      html: html ?? textToHtml(text),
      subject,
      text,
      to,
    });

    if (response.error) {
      return {
        error: response.error.message,
        ok: false,
      };
    }

    return {
      id: response.data?.id ?? null,
      ok: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send email.",
      ok: false,
    };
  }
}

export async function sendFairReminderEmail(
  input: FairReminderEmailInput,
): Promise<MailResult> {
  const shouldLogDelivery =
    input.logDelivery !== false && input.userId && input.fairId && input.trigger;

  if (shouldLogDelivery) {
    const existingLog = await prisma.notificationLog.findUnique({
      where: {
        userId_fairId_type_trigger: {
          fairId: input.fairId!,
          trigger: input.trigger!,
          type: NotificationType.EMAIL,
          userId: input.userId!,
        },
      },
      select: {
        status: true,
      },
    });

    if (existingLog?.status === "SENT") {
      return {
        ok: true,
        skipped: true,
      };
    }
  }

  const email = createFairReminderEmail(input);
  const result = await sendEmail({
    html: email.html,
    subject: email.subject,
    text: email.text,
    to: input.to,
  });

  if (shouldLogDelivery) {
    await prisma.notificationLog.upsert({
      create: {
        errorMessage: result.ok ? null : result.error,
        fairId: input.fairId!,
        status: result.ok ? "SENT" : "FAILED",
        trigger: input.trigger!,
        type: NotificationType.EMAIL,
        userId: input.userId!,
      },
      update: {
        errorMessage: result.ok ? null : result.error,
        sentAt: new Date(),
        status: result.ok ? "SENT" : "FAILED",
      },
      where: {
        userId_fairId_type_trigger: {
          fairId: input.fairId!,
          trigger: input.trigger!,
          type: NotificationType.EMAIL,
          userId: input.userId!,
        },
      },
    });
  }

  return result;
}

export function createFairReminderEmail({
  city,
  dateRange,
  fairName,
  officialWebsite,
  userName,
  venue,
  locale = "tr",
}: FairReminderEmailInput) {
  const website = officialWebsite || "-";
  const subject =
    locale === "tr"
      ? `Yaklaşan fuar hatırlatması: ${fairName}`
      : `Upcoming fair reminder: ${fairName}`;
  const lines =
    locale === "tr"
      ? [
          `Merhaba ${userName},`,
          "",
          `Takip ettiğin ${fairName} yaklaşıyor.`,
          `Tarih: ${dateRange}`,
          `Şehir: ${city}`,
          `Mekan: ${venue}`,
          `Resmi site: ${website}`,
          "",
          "fuarbul üzerinden takip ettiğin fuarlar için bu hatırlatmayı alıyorsun.",
        ]
      : [
          `Hi ${userName},`,
          "",
          `The fair you follow, ${fairName}, is coming up.`,
          `Date: ${dateRange}`,
          `City: ${city}`,
          `Venue: ${venue}`,
          `Official website: ${website}`,
          "",
          "You are receiving this reminder because you follow this fair on fuarbul.",
        ];
  const text = lines.join("\n");

  return {
    html: textToHtml(text),
    subject,
    text,
  };
}

export function getUserDisplayName(
  user: Pick<User, "email" | "name" | "surname">,
) {
  return [user.name, user.surname].filter(Boolean).join(" ").trim() || user.email;
}

export function formatReminderDateRange(
  startDate: Date,
  endDate: Date,
  locale: Locale = "tr",
) {
  const language = locale === "tr" ? "tr-TR" : "en-US";

  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth()
  ) {
    const monthYear = new Intl.DateTimeFormat(language, {
      month: "long",
      year: "numeric",
    }).format(startDate);

    return `${startDate.getDate()}-${endDate.getDate()} ${monthYear}`;
  }

  const formatter = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || defaultEmailFrom;
}

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
