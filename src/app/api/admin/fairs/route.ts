import { NextResponse } from "next/server";

import { createAdminFair } from "@/lib/admin-fair-actions";
import { getAdminUser } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const fair = await createAdminFair({
      adminUserId: adminUser.id,
      payload: await request.json(),
    });

    return NextResponse.json({ fair });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "create_failed" },
      { status: error instanceof Error && error.message === "slug_exists" ? 409 : 400 },
    );
  }
}
