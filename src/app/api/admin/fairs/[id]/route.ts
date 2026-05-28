import { NextResponse } from "next/server";

import {
  archiveAdminFair,
  moveAdminFairToDraft,
  publishAdminFair,
  toggleAdminFairFeatured,
  toggleAdminFairIstanbulPriority,
  updateAdminFair,
} from "@/lib/admin-fair-actions";
import { getAdminUser } from "@/lib/admin";

type AdminFairRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AdminFairActionPayload = {
  action?: string;
};

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: AdminFairRouteContext) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const fair = await updateAdminFair({
      adminUserId: adminUser.id,
      fairId: id,
      payload: await request.json(),
    });

    return NextResponse.json({ fair });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "update_failed" },
      { status: error instanceof Error && error.message === "slug_exists" ? 409 : 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: AdminFairRouteContext,
) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json()) as AdminFairActionPayload;

  try {
    if (payload.action === "archive") {
      await archiveAdminFair(adminUser.id, id);
    } else if (payload.action === "publish") {
      await publishAdminFair(adminUser.id, id);
    } else if (payload.action === "draft") {
      await moveAdminFairToDraft(adminUser.id, id);
    } else if (payload.action === "toggleFeatured") {
      await toggleAdminFairFeatured(adminUser.id, id);
    } else if (payload.action === "toggleIstanbulPriority") {
      await toggleAdminFairIstanbulPriority(adminUser.id, id);
    } else {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "action_failed" },
      { status: 400 },
    );
  }
}
