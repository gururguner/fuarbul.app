import "server-only";

import { FairStatus, Prisma } from "@prisma/client";

import {
  categorySlugToFairCategory,
  seededFairTranslations,
} from "@/lib/fairs";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import type {
  Fair,
  FairDateFilter,
  FairFilters,
  FairLocale,
  LocalizedFairFields,
} from "@/types/fair";

const fairInclude = {
  categories: {
    include: {
      category: true,
    },
  },
  subcategories: {
    include: {
      subcategory: true,
    },
  },
} satisfies Prisma.FairInclude;

type FairWithRelations = Prisma.FairGetPayload<{
  include: typeof fairInclude;
}>;

const publishedFairWhere = {
  isPublished: true,
  status: FairStatus.PUBLISHED,
} satisfies Prisma.FairWhereInput;

export async function getPublishedFairs() {
  const fairs = await prisma.fair.findMany({
    where: publishedFairWhere,
    include: fairInclude,
    orderBy: {
      startDate: "asc",
    },
  });

  return fairs.map(mapFairToUiFair);
}

export async function getFilteredFairs(filters: FairFilters = {}) {
  const where = await buildFilteredFairWhere(filters);
  const fairs = await prisma.fair.findMany({
    where,
    include: fairInclude,
    orderBy: {
      startDate: "asc",
    },
  });

  return fairs.map(mapFairToUiFair);
}

export async function getAvailableFairCities() {
  const fairs = await prisma.fair.findMany({
    where: publishedFairWhere,
    distinct: ["city"],
    orderBy: {
      city: "asc",
    },
    select: {
      city: true,
    },
  });

  return fairs
    .map((fair) => fair.city)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "tr"));
}

export async function getActiveCategories() {
  return prisma.category.findMany({
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
      slug: true,
      nameTr: true,
      nameEn: true,
    },
  });
}

export async function getFeaturedFairs() {
  const fairs = await prisma.fair.findMany({
    where: {
      ...publishedFairWhere,
      isFeatured: true,
    },
    include: fairInclude,
    orderBy: {
      startDate: "asc",
    },
  });

  return fairs.map(mapFairToUiFair);
}

export async function getUpcomingFairs(limit?: number) {
  const fairs = await prisma.fair.findMany({
    where: {
      ...publishedFairWhere,
      startDate: {
        gte: startOfToday(),
      },
    },
    include: fairInclude,
    orderBy: {
      startDate: "asc",
    },
    take: limit,
  });

  return fairs.map(mapFairToUiFair);
}

export async function getFairBySlug(slug: string) {
  const fair = await prisma.fair.findFirst({
    where: {
      ...publishedFairWhere,
      slug,
    },
    include: fairInclude,
  });

  return fair ? mapFairToUiFair(fair) : null;
}

export async function getIsFairFollowedByUser(fairId: string, userId?: string) {
  if (!userId) {
    return false;
  }

  const followedFair = await prisma.followedFair.findUnique({
    where: {
      userId_fairId: {
        fairId,
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(followedFair);
}

export async function getFollowedFairsByUser(userId: string) {
  const followedFairs = await prisma.followedFair.findMany({
    where: {
      userId,
      fair: publishedFairWhere,
    },
    include: {
      fair: {
        include: fairInclude,
      },
    },
  });

  return followedFairs
    .map(({ fair }) => fair)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map(mapFairToUiFair);
}

export async function getUserInterests(userId: string) {
  const interests = await prisma.userInterest.findMany({
    where: {
      userId,
      category: {
        isActive: true,
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        category: {
          sortOrder: "asc",
        },
      },
      {
        category: {
          nameTr: "asc",
        },
      },
    ],
  });

  return interests.map(({ category }) => ({
    id: category.id,
    slug: category.slug,
    nameTr: category.nameTr,
    nameEn: category.nameEn,
  }));
}

export async function getRecommendedFairsForUser(userId: string, limit = 3) {
  const interests = await prisma.userInterest.findMany({
    where: {
      userId,
      category: {
        isActive: true,
      },
    },
    select: {
      categoryId: true,
    },
  });
  const categoryIds = interests.map((interest) => interest.categoryId);

  if (!categoryIds.length) {
    return [];
  }

  const fairs = await prisma.fair.findMany({
    where: {
      ...publishedFairWhere,
      startDate: {
        gte: startOfToday(),
      },
      categories: {
        some: {
          categoryId: {
            in: categoryIds,
          },
        },
      },
    },
    include: fairInclude,
    orderBy: {
      startDate: "asc",
    },
    take: limit,
  });

  return fairs.map(mapFairToUiFair);
}

function mapFairToUiFair(fair: FairWithRelations): Fair {
  const categories = fair.categories
    .map(({ category }) => category)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ slug, nameTr, nameEn }) => ({ slug, nameTr, nameEn }));

  const subcategories = fair.subcategories
    .map(({ subcategory }) => subcategory)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ slug, nameTr, nameEn }) => ({ slug, nameTr, nameEn }));

  return {
    id: fair.id,
    slug: fair.slug,
    startsAt: fair.startDate.toISOString(),
    endsAt: fair.endDate.toISOString(),
    category: inferPrimaryCategory(categories.map((category) => category.slug)),
    categories,
    subcategories,
    translations: buildFairTranslations(fair),
    website: fair.officialWebsite ?? "#",
    isFeatured: fair.isFeatured,
  };
}

async function buildFilteredFairWhere(filters: FairFilters) {
  const and: Prisma.FairWhereInput[] = [publishedFairWhere];
  const query = filters.q?.trim();

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { venue: { contains: query, mode: "insensitive" } },
        { organizer: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  const city = await resolveCityFilter(filters.city);

  if (city) {
    and.push({
      city: {
        equals: city,
        mode: "insensitive",
      },
    });
  }

  if (filters.category) {
    and.push({
      categories: {
        some: {
          category: {
            slug: filters.category,
            isActive: true,
          },
        },
      },
    });
  }

  const dateRange = getDateRange(filters.date);

  if (dateRange) {
    and.push({
      startDate: dateRange,
    });
  }

  if (typeof filters.featured === "boolean") {
    and.push({
      isFeatured: filters.featured,
    });
  }

  return {
    AND: and,
  } satisfies Prisma.FairWhereInput;
}

async function resolveCityFilter(city?: string) {
  if (!city) {
    return undefined;
  }

  const trimmedCity = city.trim();
  const requestedSlug = toSlug(trimmedCity);
  const cities = await getAvailableFairCities();
  const matchedCity = cities.find(
    (availableCity) => toSlug(availableCity) === requestedSlug,
  );

  return matchedCity ?? trimmedCity;
}

function getDateRange(date?: FairDateFilter): Prisma.DateTimeFilter | undefined {
  if (!date || date === "all") {
    return undefined;
  }

  const today = startOfToday();

  if (date === "upcoming") {
    return {
      gte: today,
    };
  }

  if (date === "this-week") {
    return {
      gte: today,
      lte: addDays(today, 7),
    };
  }

  if (date === "this-month") {
    return {
      gte: today,
      lte: endOfCurrentMonth(today),
    };
  }

  if (date === "next-3-months") {
    return {
      gte: today,
      lte: addMonths(today, 3),
    };
  }

  return undefined;
}

function buildFairTranslations(
  fair: FairWithRelations,
): Record<FairLocale, LocalizedFairFields> {
  const description = fair.description ?? "";
  const base = {
    name: fair.name,
    summary: summarize(description),
    description,
    city: fair.city,
    venue: fair.venue,
    organizer: fair.organizer ?? "-",
  };
  const overrides = seededFairTranslations[fair.slug];

  return {
    tr: {
      ...base,
      dateRange: formatDateRange(fair.startDate, fair.endDate, "tr"),
      ...overrides?.tr,
    },
    en: {
      ...base,
      dateRange: formatDateRange(fair.startDate, fair.endDate, "en"),
      ...overrides?.en,
    },
  };
}

function inferPrimaryCategory(categorySlugs: string[]) {
  for (const slug of categorySlugs) {
    const category = categorySlugToFairCategory[slug];

    if (category) {
      return category;
    }
  }

  return "Technology";
}

function formatDateRange(startDate: Date, endDate: Date, locale: FairLocale) {
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

function summarize(description: string) {
  if (!description) {
    return "";
  }

  const [firstSentence] = description.split(".");

  return firstSentence ? `${firstSentence}.` : description;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}

function endOfCurrentMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}
