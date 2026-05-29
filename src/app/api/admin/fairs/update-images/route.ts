import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import { updateMissingFairImages } from "@/lib/fair-image-backfill";

export const runtime = "nodejs";

export async function POST() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const result = await updateMissingFairImages();

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "update_images_failed" },
      { status: 400 },
    );
  }
}
