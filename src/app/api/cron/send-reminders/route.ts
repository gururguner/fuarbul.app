import { NextResponse } from "next/server";

import { runFairReminderJob } from "@/lib/reminder-job";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 },
      );
    }

    console.warn(
      "[cron] CRON_SECRET is not configured. Allowing development-only reminder run.",
    );
  } else if (!isAuthorizedCronRequest(request, cronSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runFairReminderJob();

  return NextResponse.json(summary);
}

function isAuthorizedCronRequest(request: Request, cronSecret: string) {
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  return isVercelProductionCronRequest(request);
}

function isVercelProductionCronRequest(request: Request) {
  const userAgent = request.headers.get("user-agent")?.trim().toLowerCase();

  return (
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "production" &&
    userAgent === "vercel-cron/1.0"
  );
}
