import "server-only";

import { Prisma } from "@prisma/client";

import type {
  AdminFairFilters,
  AdminFairQuickFilterValue,
} from "@/lib/admin-fair-options";
import { prisma } from "@/lib/prisma";

const adminFairInclude = {
  categories: {
    include: {
      category: true,
    },
  },
  sources: true,
  subcategories: {
    include: {
      subcategory: {
        include: {
          category: true,
        },
      },
    },
  },
} satisfies Prisma.FairInclude;

const adminFairListSelect = {
  categories: {
    select: {
      id: true,
    },
  },
  city: true,
  endDate: true,
  id: true,
  isFeatured: true,
  isIstanbulPriority: true,
  isPublished: true,
  name: true,
  officialWebsite: true,
  organizer: true,
  slug: true,
  sources: {
    select: {
      rawData: true,
      sourceName: true,
    },
  },
  startDate: true,
  status: true,
  updatedAt: true,
  venue: true,
} satisfies Prisma.FairSelect;

export type AdminFairWithRelations = Prisma.FairGetPayload<{
  include: typeof adminFairInclude;
}>;

type AdminFairListRecord = Prisma.FairGetPayload<{
  select: typeof adminFairListSelect;
}>;

export type AdminFairReviewStatusValue =
  | "CLEAN"
  | "MISSING_INFO"
  | "NEEDS_REVIEW";

export type AdminFairReviewReason =
  | "duplicate_uncertain"
  | "import_error"
  | "invalid_date"
  | "missing_category"
  | "missing_city"
  | "missing_name"
  | "missing_official_website"
  | "missing_organizer"
  | "missing_venue";

export type AdminFairReviewStatus = {
  reasons: AdminFairReviewReason[];
  status: AdminFairReviewStatusValue;
};

export type AdminFairQuickFilterCounts = Record<AdminFairQuickFilterValue, number>;

export type AdminFairPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export async function getAdminFairStats() {
  const [
    totalCount,
    publishedCount,
    draftCount,
    archivedCount,
    featuredCount,
    istanbulPriorityCount,
  ] = await Promise.all([
    prisma.fair.count(),
    prisma.fair.count({ where: { isPublished: true } }),
    prisma.fair.count({ where: { status: "DRAFT" } }),
    prisma.fair.count({ where: { status: "ARCHIVED" } }),
    prisma.fair.count({ where: { isFeatured: true } }),
    prisma.fair.count({ where: { isIstanbulPriority: true } }),
  ]);

  return {
    archivedCount,
    draftCount,
    featuredCount,
    istanbulPriorityCount,
    publishedCount,
    totalCount,
  };
}

export async function getAdminFairs(
  filters: AdminFairFilters = { page: 1, pageSize: 20 },
) {
  const fairs = await prisma.fair.findMany({
    where: buildAdminFairWhere(filters),
    orderBy: {
      updatedAt: "desc",
    },
    select: adminFairListSelect,
  });
  const mappedFairs = fairs.map((fair) => ({
    ...fair,
    isPastFair: isPastFair(fair.endDate),
    reviewStatus: getFairReviewStatus(fair),
  }));

  if (filters.quick === "needs-review") {
    return paginateAdminFairs(
      mappedFairs.filter(
        (fair) => fair.reviewStatus.status === "NEEDS_REVIEW",
      ),
      filters,
    );
  }

  return paginateAdminFairs(mappedFairs, filters);
}

function paginateAdminFairs(
  fairs: Array<AdminFairListRecord & {
    isPastFair: boolean;
    reviewStatus: AdminFairReviewStatus;
  }>,
  filters: AdminFairFilters,
) {
  const totalCount = fairs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const startIndex = (page - 1) * filters.pageSize;

  return {
    fairs: fairs.slice(startIndex, startIndex + filters.pageSize),
    pagination: {
      page,
      pageSize: filters.pageSize,
      totalCount,
      totalPages,
    } satisfies AdminFairPagination,
  };
}

export async function getAdminFairQuickFilterCounts(): Promise<AdminFairQuickFilterCounts> {
  const fairs = await prisma.fair.findMany({
    select: adminFairListSelect,
  });
  const today = startOfToday();

  return fairs.reduce<AdminFairQuickFilterCounts>(
    (counts, fair) => {
      if (
        fair.isPublished &&
        fair.endDate >= today &&
        fair.status !== "ARCHIVED" &&
        fair.status !== "CANCELLED"
      ) {
        counts.upcoming += 1;
      }

      if (fair.isPublished && fair.endDate < today) {
        counts.past += 1;
      }

      if (fair.isPublished && fair.status !== "ARCHIVED") {
        counts.published += 1;
      }

      if (fair.status === "DRAFT" || !fair.isPublished) {
        counts.drafts += 1;
      }

      if (getFairReviewStatus(fair).status === "NEEDS_REVIEW") {
        counts["needs-review"] += 1;
      }

      if (fair.sources.some((source) => source.sourceName === "TOBB")) {
        counts.tobb += 1;
      }

      if (fair.isIstanbulPriority) {
        counts["istanbul-priority"] += 1;
      }

      return counts;
    },
    {
      drafts: 0,
      "istanbul-priority": 0,
      "needs-review": 0,
      past: 0,
      published: 0,
      tobb: 0,
      upcoming: 0,
    },
  );
}

export async function getAdminFairById(id: string) {
  return prisma.fair.findUnique({
    where: {
      id,
    },
    include: adminFairInclude,
  });
}

export async function getAdminTaxonomy() {
  const [categories, subcategories] = await Promise.all([
    prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          nameTr: "asc",
        },
      ],
      select: {
        id: true,
        nameEn: true,
        nameTr: true,
        slug: true,
      },
    }),
    prisma.subcategory.findMany({
      where: {
        isActive: true,
        category: {
          isActive: true,
        },
      },
      orderBy: [
        {
          category: {
            sortOrder: "asc",
          },
        },
        {
          sortOrder: "asc",
        },
        {
          nameTr: "asc",
        },
      ],
      select: {
        categoryId: true,
        id: true,
        nameEn: true,
        nameTr: true,
        slug: true,
      },
    }),
  ]);

  return {
    categories,
    subcategories,
  };
}

function buildAdminFairWhere(filters: AdminFairFilters) {
  const and: Prisma.FairWhereInput[] = [];
  const query = filters.q?.trim();

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { venue: { contains: query, mode: "insensitive" } },
        { organizer: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (filters.status && filters.status !== "ALL") {
    and.push({
      status: filters.status,
    });
  }

  if (filters.quick === "published") {
    and.push({
      isPublished: true,
      status: {
        not: "ARCHIVED",
      },
    });
  }

  if (filters.quick === "upcoming") {
    and.push({
      endDate: {
        gte: startOfToday(),
      },
      isPublished: true,
      status: {
        notIn: ["ARCHIVED", "CANCELLED"],
      },
    });
  }

  if (filters.quick === "past") {
    and.push({
      endDate: {
        lt: startOfToday(),
      },
      isPublished: true,
    });
  }

  if (filters.quick === "drafts") {
    and.push({
      OR: [
        {
          status: "DRAFT",
        },
        {
          isPublished: false,
        },
      ],
    });
  }

  if (filters.quick === "tobb") {
    and.push({
      sources: {
        some: {
          sourceName: "TOBB",
        },
      },
    });
  }

  if (filters.quick === "istanbul-priority") {
    and.push({
      isIstanbulPriority: true,
    });
  }

  return and.length ? { AND: and } : undefined;
}

export function getFairReviewStatus(
  fair: AdminFairListRecord,
): AdminFairReviewStatus {
  const hardReasons = new Set<AdminFairReviewReason>();
  const softReasons = new Set<AdminFairReviewReason>();

  if (!fair.name.trim()) {
    hardReasons.add("missing_name");
  }

  if (!isValidFairDateRange(fair.startDate, fair.endDate)) {
    hardReasons.add("invalid_date");
  }

  if (!fair.city.trim()) {
    hardReasons.add("missing_city");
  }

  if (!fair.venue.trim()) {
    hardReasons.add("missing_venue");
  }

  if (!fair.categories.length) {
    hardReasons.add("missing_category");
  }

  if (fair.status === "DRAFT") {
    for (const reason of getImportHardReviewReasons(fair.sources)) {
      if (isImportReviewReasonStillRelevant(reason, fair)) {
        hardReasons.add(reason);
      }
    }
  }

  if (!fair.officialWebsite) {
    softReasons.add("missing_official_website");
  }

  if (!fair.organizer) {
    softReasons.add("missing_organizer");
  }

  if (hardReasons.size) {
    return {
      reasons: Array.from(hardReasons),
      status: "NEEDS_REVIEW",
    };
  }

  if (softReasons.size) {
    return {
      reasons: Array.from(softReasons),
      status: "MISSING_INFO",
    };
  }

  return {
    reasons: [],
    status: "CLEAN",
  };
}

function getImportHardReviewReasons(
  sources: AdminFairListRecord["sources"],
): AdminFairReviewReason[] {
  const reasons = new Set<AdminFairReviewReason>();

  for (const source of sources) {
    const importMetadata = getImportMetadata(source.rawData);

    if (!importMetadata) {
      continue;
    }

    for (const reason of importMetadata.reviewReasons) {
      const mappedReason = mapImportReviewReason(reason);

      if (mappedReason) {
        reasons.add(mappedReason);
      }
    }
  }

  return Array.from(reasons);
}

function getImportMetadata(rawData: Prisma.JsonValue) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const metadata = rawData.fuarbulImport;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const reviewReasons = Array.isArray(metadata.reviewReasons)
    ? metadata.reviewReasons.filter(
        (reason): reason is string => typeof reason === "string",
      )
    : [];

  return {
    reviewReasons,
  };
}

function mapImportReviewReason(
  reason: string,
): AdminFairReviewReason | null {
  const reasonMap: Record<string, AdminFairReviewReason | null> = {
    category_missing: "missing_category",
    city_missing: "missing_city",
    date_suspicious: "invalid_date",
    duplicate_uncertain: "duplicate_uncertain",
    invalid_date: "invalid_date",
    low_confidence: null,
    name_missing: "missing_name",
    parse_errors: "import_error",
    past_date: null,
    venue_missing: "missing_venue",
  };

  return reasonMap[reason] ?? null;
}

function isImportReviewReasonStillRelevant(
  reason: AdminFairReviewReason,
  fair: AdminFairListRecord,
) {
  if (reason === "missing_category") {
    return fair.categories.length === 0;
  }

  if (reason === "missing_city") {
    return !fair.city.trim();
  }

  if (reason === "missing_name") {
    return !fair.name.trim();
  }

  if (reason === "missing_venue") {
    return !fair.venue.trim();
  }

  if (reason === "invalid_date") {
    return !isValidFairDateRange(fair.startDate, fair.endDate);
  }

  return true;
}

function isValidFairDateRange(startDate: Date, endDate: Date) {
  return (
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    endDate >= startDate
  );
}

function isPastFair(endDate: Date) {
  return endDate < startOfToday();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}
