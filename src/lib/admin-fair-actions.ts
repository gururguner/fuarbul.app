import "server-only";

import { Prisma } from "@prisma/client";

import {
  fairStatusValues,
  sourceNameValues,
  type FairStatusValue,
  type SourceNameValue,
} from "@/lib/admin-fair-options";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { normalizeTurkeyCity } from "@/lib/turkey-cities";

export type AdminFairPayload = {
  categoryIds?: unknown;
  city?: unknown;
  description?: unknown;
  district?: unknown;
  endDate?: unknown;
  hall?: unknown;
  isFeatured?: unknown;
  isIstanbulPriority?: unknown;
  isPublished?: unknown;
  name?: unknown;
  officialWebsite?: unknown;
  organizer?: unknown;
  slug?: unknown;
  sourceName?: unknown;
  sourceUrl?: unknown;
  startDate?: unknown;
  status?: unknown;
  subcategoryIds?: unknown;
  venue?: unknown;
};

type SaveFairOptions = {
  adminUserId: string;
  fairId?: string;
  payload: AdminFairPayload;
};

export async function createAdminFair({ adminUserId, payload }: SaveFairOptions) {
  const data = await parseFairPayload(payload);

  await assertSlugAvailable(data.slug);

  const fair = await prisma.fair.create({
    data: buildFairData(data),
    select: {
      id: true,
    },
  });

  await saveFairRelations(fair.id, data);
  await logAdminAction({
    actionType: "CREATE",
    adminUserId,
    fairId: fair.id,
    metadata: { slug: data.slug },
  });

  return fair;
}

export async function updateAdminFair({
  adminUserId,
  fairId,
  payload,
}: SaveFairOptions) {
  if (!fairId) {
    throw new Error("fair_id_required");
  }

  const data = await parseFairPayload(payload);

  await assertSlugAvailable(data.slug, fairId);

  const fair = await prisma.fair.update({
    data: buildFairData(data),
    where: {
      id: fairId,
    },
    select: {
      id: true,
    },
  });

  await saveFairRelations(fair.id, data);
  await logAdminAction({
    actionType: "UPDATE",
    adminUserId,
    fairId: fair.id,
    metadata: { slug: data.slug },
  });

  return fair;
}

export async function archiveAdminFair(adminUserId: string, fairId: string) {
  await updateFairStatus(adminUserId, fairId, {
    actionType: "ARCHIVE",
    data: {
      isPublished: false,
      status: "ARCHIVED",
    },
  });
}

export async function publishAdminFair(adminUserId: string, fairId: string) {
  await updateFairStatus(adminUserId, fairId, {
    actionType: "PUBLISH",
    data: {
      isPublished: true,
      status: "PUBLISHED",
    },
  });
}

export async function moveAdminFairToDraft(
  adminUserId: string,
  fairId: string,
) {
  await updateFairStatus(adminUserId, fairId, {
    actionType: "UNPUBLISH",
    data: {
      isPublished: false,
      status: "DRAFT",
    },
  });
}

export async function toggleAdminFairFeatured(
  adminUserId: string,
  fairId: string,
) {
  const fair = await prisma.fair.findUniqueOrThrow({
    where: {
      id: fairId,
    },
    select: {
      isFeatured: true,
    },
  });

  await prisma.fair.update({
    data: {
      isFeatured: !fair.isFeatured,
    },
    where: {
      id: fairId,
    },
  });
  await logAdminAction({
    actionType: "UPDATE",
    adminUserId,
    fairId,
    metadata: { isFeatured: !fair.isFeatured },
  });
}

export async function toggleAdminFairIstanbulPriority(
  adminUserId: string,
  fairId: string,
) {
  const fair = await prisma.fair.findUniqueOrThrow({
    where: {
      id: fairId,
    },
    select: {
      isIstanbulPriority: true,
    },
  });

  await prisma.fair.update({
    data: {
      isIstanbulPriority: !fair.isIstanbulPriority,
    },
    where: {
      id: fairId,
    },
  });
  await logAdminAction({
    actionType: "UPDATE",
    adminUserId,
    fairId,
    metadata: { isIstanbulPriority: !fair.isIstanbulPriority },
  });
}

async function updateFairStatus(
  adminUserId: string,
  fairId: string,
  {
    actionType,
    data,
  }: {
    actionType: "ARCHIVE" | "PUBLISH" | "UNPUBLISH";
    data: Prisma.FairUpdateInput;
  },
) {
  await prisma.fair.update({
    data,
    where: {
      id: fairId,
    },
  });
  await logAdminAction({
    actionType,
    adminUserId,
    fairId,
  });
}

async function parseFairPayload(payload: AdminFairPayload) {
  const name = getString(payload.name);
  const slug = getString(payload.slug) || toSlug(name);
  const startDate = parseDate(payload.startDate);
  const endDate = parseDate(payload.endDate);
  const rawCity = getString(payload.city);
  const city = normalizeTurkeyCity(rawCity);
  const venue = getString(payload.venue);
  const status = parseStatus(payload.status);

  if (!name || !slug || !startDate || !endDate || !rawCity || !venue || !status) {
    throw new Error("missing_required_fields");
  }

  if (!city) {
    throw new Error("invalid_city");
  }

  const isArchivedOrDraft = status === "ARCHIVED" || status === "DRAFT";

  return {
    categoryIds: getStringArray(payload.categoryIds),
    city,
    description: getNullableString(payload.description),
    district: getNullableString(payload.district),
    endDate,
    hall: getNullableString(payload.hall),
    isFeatured: getBoolean(payload.isFeatured),
    isIstanbulPriority: getBoolean(payload.isIstanbulPriority),
    isPublished: isArchivedOrDraft ? false : getBoolean(payload.isPublished),
    name,
    officialWebsite: getNullableString(payload.officialWebsite),
    organizer: getNullableString(payload.organizer),
    slug,
    sourceName: parseSourceName(payload.sourceName),
    sourceUrl: getNullableString(payload.sourceUrl),
    startDate,
    status,
    subcategoryIds: getStringArray(payload.subcategoryIds),
    venue,
  };
}

function buildFairData(data: Awaited<ReturnType<typeof parseFairPayload>>) {
  const now = new Date();

  return {
    city: data.city,
    description: data.description,
    district: data.district,
    endDate: data.endDate,
    hall: data.hall,
    isFeatured: data.isFeatured,
    isIstanbulPriority: data.isIstanbulPriority,
    isPublished: data.isPublished,
    lastChangedAt: now,
    lastCheckedAt: now,
    name: data.name,
    officialWebsite: data.officialWebsite,
    organizer: data.organizer,
    slug: data.slug,
    startDate: data.startDate,
    status: data.status,
    venue: data.venue,
  } satisfies Prisma.FairCreateInput;
}

async function saveFairRelations(
  fairId: string,
  data: Awaited<ReturnType<typeof parseFairPayload>>,
) {
  await prisma.$transaction([
    prisma.fairCategory.deleteMany({
      where: {
        fairId,
      },
    }),
    prisma.fairSubcategory.deleteMany({
      where: {
        fairId,
      },
    }),
    prisma.fairSource.deleteMany({
      where: {
        fairId,
      },
    }),
  ]);

  const createOperations = [
    ...(data.categoryIds.length
      ? [
          prisma.fairCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
              categoryId,
              fairId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(data.subcategoryIds.length
      ? [
          prisma.fairSubcategory.createMany({
            data: data.subcategoryIds.map((subcategoryId) => ({
              fairId,
              subcategoryId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(data.sourceName
      ? [
          prisma.fairSource.create({
            data: {
              fairId,
              sourceName: data.sourceName,
              sourceUrl: data.sourceUrl,
            },
          }),
        ]
      : []),
  ];

  if (createOperations.length) {
    await prisma.$transaction(createOperations);
  }
}

async function assertSlugAvailable(slug: string, fairId?: string) {
  const existingFair = await prisma.fair.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (existingFair && existingFair.id !== fairId) {
    throw new Error("slug_exists");
  }
}

async function logAdminAction({
  actionType,
  adminUserId,
  fairId,
  metadata,
}: {
  actionType: "CREATE" | "UPDATE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE";
  adminUserId: string;
  fairId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminActionLog.create({
    data: {
      actionType,
      adminUserId,
      fairId,
      metadata,
    },
  });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const stringValue = getString(value);

  return stringValue || null;
}

function getBoolean(value: unknown) {
  return value === true;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseDate(value: unknown) {
  const stringValue = getString(value);

  if (!stringValue) {
    return null;
  }

  const date = new Date(stringValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStatus(value: unknown): FairStatusValue | null {
  return typeof value === "string" &&
    fairStatusValues.includes(value as FairStatusValue)
    ? (value as FairStatusValue)
    : null;
}

function parseSourceName(value: unknown): SourceNameValue | null {
  return typeof value === "string" &&
    sourceNameValues.includes(value as SourceNameValue)
    ? (value as SourceNameValue)
    : null;
}
