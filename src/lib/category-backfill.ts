import "server-only";

import { Prisma } from "@prisma/client";

import { suggestFairCategorySlugs } from "@/lib/fair-category-matcher";
import { prisma } from "@/lib/prisma";

export type CategoryBackfillResult = {
  addedRelationCount: number;
  scannedCount: number;
  stillMissingCount: number;
  updatedCount: number;
};

const fairBackfillSelect = {
  description: true,
  id: true,
  name: true,
  organizer: true,
  sources: {
    select: {
      rawData: true,
      sourceName: true,
    },
  },
  venue: true,
} satisfies Prisma.FairSelect;

type FairBackfillRecord = Prisma.FairGetPayload<{
  select: typeof fairBackfillSelect;
}>;

const ensuredBroadCategories = [
  {
    nameEn: "Art / Handicrafts",
    nameTr: "Sanat / El Sanatları",
    slug: "sanat-el-sanatlari",
  },
  {
    nameEn: "Souvenirs / Gifts",
    nameTr: "Hediyelik Eşya",
    slug: "hediyelik-esya",
  },
  {
    nameEn: "Trade / Industry",
    nameTr: "Ticaret / Sanayi",
    slug: "ticaret-sanayi",
  },
  {
    nameEn: "Textile / Fashion",
    nameTr: "Tekstil / Moda",
    slug: "tekstil-moda",
  },
  {
    nameEn: "Packaging",
    nameTr: "Ambalaj",
    slug: "ambalaj",
  },
  {
    nameEn: "Industry / Machinery",
    nameTr: "Endüstri / Makine",
    slug: "endustri-makine",
  },
  {
    nameEn: "Construction",
    nameTr: "Yapı / İnşaat",
    slug: "yapi-insaat",
  },
  {
    nameEn: "Pet",
    nameTr: "Evcil Hayvan",
    slug: "evcil-hayvan",
  },
  {
    nameEn: "Energy",
    nameTr: "Enerji",
    slug: "enerji",
  },
  {
    nameEn: "Marine",
    nameTr: "Denizcilik",
    slug: "denizcilik",
  },
  {
    nameEn: "Sports / Outdoor",
    nameTr: "Spor / Outdoor",
    slug: "spor-outdoor",
  },
] satisfies Array<{
  nameEn: string;
  nameTr: string;
  slug: string;
}>;

export async function backfillMissingFairCategories(): Promise<CategoryBackfillResult> {
  await ensureBroadCategories();

  const [activeCategories, fairs] = await Promise.all([
    prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
      },
    }),
    prisma.fair.findMany({
      where: {
        categories: {
          none: {},
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: fairBackfillSelect,
    }),
  ]);
  const categoryBySlug = new Map(
    activeCategories.map((category) => [category.slug, category]),
  );
  let updatedCount = 0;
  let addedRelationCount = 0;
  let stillMissingCount = 0;

  for (const fair of fairs) {
    const suggestedSlugs = suggestBackfillCategorySlugs(fair).filter((slug) =>
      categoryBySlug.has(slug),
    );

    if (!suggestedSlugs.length) {
      stillMissingCount += 1;
      continue;
    }

    const [createdRelations] = await prisma.$transaction([
      prisma.fairCategory.createMany({
        data: suggestedSlugs.map((slug) => ({
          categoryId: categoryBySlug.get(slug)!.id,
          fairId: fair.id,
        })),
        skipDuplicates: true,
      }),
      prisma.fair.update({
        data: {
          lastChangedAt: new Date(),
        },
        where: {
          id: fair.id,
        },
      }),
    ]);

    if (createdRelations.count > 0) {
      addedRelationCount += createdRelations.count;
      updatedCount += 1;
    } else {
      stillMissingCount += 1;
    }
  }

  return {
    addedRelationCount,
    scannedCount: fairs.length,
    stillMissingCount,
    updatedCount,
  };
}

async function ensureBroadCategories() {
  await Promise.all(
    ensuredBroadCategories.map((category, index) =>
      prisma.category.upsert({
        create: {
          isActive: true,
          nameEn: category.nameEn,
          nameTr: category.nameTr,
          slug: category.slug,
          sortOrder: 1000 + index,
        },
        update: {
          isActive: true,
          nameEn: category.nameEn,
          nameTr: category.nameTr,
        },
        where: {
          slug: category.slug,
        },
      }),
    ),
  );
}

function suggestBackfillCategorySlugs(fair: FairBackfillRecord) {
  const suggestion = suggestFairCategorySlugs({
    description: [fair.description, getFairSourceSearchText(fair.sources)]
      .filter(Boolean)
      .join(" "),
    name: fair.name,
    organizer: fair.organizer,
    venue: fair.venue,
  });

  return suggestion.slugs;
}

function getFairSourceSearchText(sources: FairBackfillRecord["sources"]) {
  return sources
    .map((source) => rawJsonToSearchText(source.rawData))
    .filter(Boolean)
    .join(" ");
}

function rawJsonToSearchText(value: Prisma.JsonValue | undefined): string {
  if (typeof value === "undefined") {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(rawJsonToSearchText).filter(Boolean).join(" ");
  }

  return Object.entries(value)
    .filter(([key]) => key !== "fuarbulImport")
    .map(([, nestedValue]) => rawJsonToSearchText(nestedValue))
    .filter(Boolean)
    .join(" ");
}
