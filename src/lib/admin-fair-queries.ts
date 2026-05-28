import "server-only";

import { Prisma } from "@prisma/client";

import type { AdminFairFilters } from "@/lib/admin-fair-options";
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

export type AdminFairWithRelations = Prisma.FairGetPayload<{
  include: typeof adminFairInclude;
}>;

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

export async function getAdminFairs(filters: AdminFairFilters = {}) {
  return prisma.fair.findMany({
    where: buildAdminFairWhere(filters),
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      city: true,
      endDate: true,
      id: true,
      isFeatured: true,
      isIstanbulPriority: true,
      isPublished: true,
      name: true,
      organizer: true,
      slug: true,
      startDate: true,
      status: true,
      updatedAt: true,
      venue: true,
    },
  });
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
    });
  }

  if (filters.quick === "upcoming") {
    and.push({
      endDate: {
        gte: startOfToday(),
      },
    });
  }

  if (filters.quick === "past") {
    and.push({
      endDate: {
        lt: startOfToday(),
      },
    });
  }

  if (filters.quick === "drafts") {
    and.push({
      status: "DRAFT",
    });
  }

  if (filters.quick === "needs-review") {
    and.push({
      isPublished: false,
      status: "DRAFT",
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}
