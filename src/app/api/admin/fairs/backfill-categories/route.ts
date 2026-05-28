import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import { backfillMissingFairCategories } from "@/lib/category-backfill";

export const runtime = "nodejs";

export async function POST() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const result = await backfillMissingFairCategories();

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "backfill_failed" },
      { status: 400 },
    );
  }
}
