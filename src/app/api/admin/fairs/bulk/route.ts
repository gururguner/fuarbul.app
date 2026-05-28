import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import {
  adminFairBulkActionValues,
  bulkUpdateAdminFairs,
  type AdminFairBulkAction,
} from "@/lib/admin-fair-actions";

type BulkFairActionPayload = {
  action?: string;
  fairIds?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const payload = (await request.json()) as BulkFairActionPayload;

  if (!isBulkAction(payload.action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  if (!Array.isArray(payload.fairIds)) {
    return NextResponse.json({ error: "invalid_fair_ids" }, { status: 400 });
  }

  const fairIds = payload.fairIds.filter(
    (fairId): fairId is string => typeof fairId === "string",
  );

  try {
    const result = await bulkUpdateAdminFairs({
      actionName: payload.action,
      adminUserId: adminUser.id,
      fairIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "bulk_action_failed" },
      { status: 400 },
    );
  }
}

function isBulkAction(action: string | undefined): action is AdminFairBulkAction {
  return adminFairBulkActionValues.includes(action as AdminFairBulkAction);
}
