import "server-only";

import { Prisma } from "@prisma/client";

import { suggestFairCategorySlugs } from "@/lib/fair-category-matcher";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

type IfmReviewStatus = "READY_TO_PUBLISH" | "NEEDS_REVIEW" | "SKIPPED";
type IfmPublishDecision =
  | "AUTO_PUBLISH"
  | "DRAFT"
  | "DRAFT_WOULD_BE_READY"
  | "PAST_AUTO_PUBLISH"
  | "PAST_DRAFT_WOULD_BE_READY"
  | "SKIP";

type DuplicateDecision =
  | "MATCHED_EXISTING"
  | "NEW_RECORD"
  | "UNCERTAIN"
  | "SKIPPED";

type RawIfmRow = {
  dateText?: string | null;
  description?: string | null;
  endDate?: unknown;
  externalId?: string | null;
  name?: string | null;
  officialWebsite?: string | null;
  organizer?: string | null;
  rawData: Record<string, unknown>;
  rowNumber: number;
  sourceText?: string | null;
  startDate?: unknown;
  url?: string | null;
};

type NormalizedIfmFairRow = {
  city: "İstanbul";
  description: string | null;
  endDate: Date | null;
  errors: string[];
  externalId: string | null;
  isIstanbulPriority: true;
  matchedCategoryFromName: boolean;
  name: string;
  officialWebsite: string | null;
  organizer: string | null;
  rawData: Record<string, unknown>;
  rowNumber: number;
  slug: string;
  sourceText: string;
  startDate: Date | null;
  suggestedCategorySlugs: string[];
  venue: "İstanbul Fuar Merkezi";
};

type ExistingFairMatch = {
  id: string;
  isPublished: boolean;
  officialWebsite: string | null;
  organizer: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "UPDATED" | "POSTPONED" | "CANCELLED" | "ARCHIVED";
  venue: string;
};

type IfmRowAssessment = {
  confidenceScore: number;
  duplicateDecision: DuplicateDecision;
  duplicateUncertain: boolean;
  isPastFair: boolean;
  publishDecision: IfmPublishDecision;
  reviewReasons: string[];
  reviewStatus: IfmReviewStatus;
};

export type IfmImportPreviewRow = {
  confidenceScore: number;
  duplicateDecision: DuplicateDecision;
  endDate: string | null;
  errors: string[];
  matchedCategoryFromName: boolean;
  name: string;
  organizer: string | null;
  publishDecision: IfmPublishDecision;
  reviewReasons: string[];
  reviewStatus: IfmReviewStatus;
  rowNumber: number;
  slug: string;
  startDate: string | null;
  suggestedCategorySlugs: string[];
  venue: string;
};

export type IfmImportResult = {
  autoPublishedCount: number;
  createdCount: number;
  draftSavedCount: number;
  dryRun: boolean;
  duplicateMatchedCount: number;
  errors: string[];
  failedCount: number;
  foundCount: number;
  importJobId?: string;
  needsReviewCount: number;
  pastFairCount: number;
  preview: IfmImportPreviewRow[];
  readyToPublishCount: number;
  skippedCount: number;
  updatedCount: number;
};

type ImportIfmFairsOptions = {
  adminUserId: string;
  autoPublishHighConfidence?: boolean;
  dryRun?: boolean;
  sourceText: string;
  sourceUrl?: string | null;
};

const READY_TO_PUBLISH_THRESHOLD = 70;
const ifmVenue = "İstanbul Fuar Merkezi" as const;
const ifmCity = "İstanbul" as const;

export function parseIfmCalendar(sourceText: string): RawIfmRow[] {
  const trimmedText = sourceText.trim();

  if (!trimmedText) {
    return [];
  }

  const jsonRows = parseJsonRows(trimmedText);

  if (jsonRows.length) {
    return jsonRows;
  }

  const jsonLdRows = parseJsonLdRows(trimmedText);

  if (jsonLdRows.length) {
    return jsonLdRows;
  }

  return parseTextRows(trimmedText);
}

export function normalizeIfmFairRow(row: RawIfmRow): NormalizedIfmFairRow {
  const name = getFirstString(row.name, getObjectString(row.rawData, ["title", "name", "eventName"]));
  const description = getFirstString(
    row.description,
    getObjectString(row.rawData, ["description", "summary", "content"]),
  );
  const organizer = getFirstString(
    row.organizer,
    getObjectString(row.rawData, ["organizer", "organizerName"]),
  );
  const officialWebsite = normalizeWebsite(
    getFirstString(row.officialWebsite, row.url, getObjectString(row.rawData, ["url", "website"])),
  );
  const startDate =
    parseIfmDate(row.startDate) ??
    parseDateRange(getFirstString(row.dateText, row.sourceText)).startDate;
  const endDate =
    parseIfmDate(row.endDate) ??
    parseDateRange(getFirstString(row.dateText, row.sourceText)).endDate ??
    startDate;
  const year = startDate?.getFullYear() ?? new Date().getFullYear();
  const slug = toSlug(`${name} ${year}`);
  const sourceText = [
    row.sourceText,
    name,
    description,
    organizer,
    JSON.stringify(row.rawData),
  ]
    .filter(Boolean)
    .join(" ");
  const categorySuggestion = suggestFairCategorySlugs({
    description: [description, sourceText].filter(Boolean).join(" "),
    name,
    organizer,
    venue: ifmVenue,
  });
  const errors = [
    ...(!name ? ["missing_name"] : []),
    ...(!startDate ? ["missing_or_invalid_start_date"] : []),
    ...(!endDate ? ["missing_or_invalid_end_date"] : []),
  ];

  return {
    city: ifmCity,
    description,
    endDate,
    errors,
    externalId: getFirstString(row.externalId, getObjectString(row.rawData, ["id", "externalId", "slug"])),
    isIstanbulPriority: true,
    matchedCategoryFromName: categorySuggestion.matchedFromName,
    name,
    officialWebsite,
    organizer,
    rawData: row.rawData,
    rowNumber: row.rowNumber,
    slug,
    sourceText,
    startDate,
    suggestedCategorySlugs: categorySuggestion.slugs,
    venue: ifmVenue,
  };
}

export async function importIfmFairs({
  adminUserId,
  autoPublishHighConfidence = false,
  dryRun = false,
  sourceText,
  sourceUrl = null,
}: ImportIfmFairsOptions): Promise<IfmImportResult> {
  const startedAt = new Date();
  const importJob = dryRun
    ? null
    : await prisma.importJob.create({
        data: {
          sourceName: "IFM",
          startedAt,
          status: "RUNNING",
        },
        select: {
          id: true,
        },
      });

  try {
    const normalizedRows = parseIfmCalendar(sourceText).map(normalizeIfmFairRow);
    const result: IfmImportResult = {
      autoPublishedCount: 0,
      createdCount: 0,
      draftSavedCount: 0,
      dryRun,
      duplicateMatchedCount: 0,
      errors: [],
      failedCount: 0,
      foundCount: normalizedRows.length,
      importJobId: importJob?.id,
      needsReviewCount: 0,
      pastFairCount: 0,
      preview: [],
      readyToPublishCount: 0,
      skippedCount: 0,
      updatedCount: 0,
    };

    for (const row of normalizedRows) {
      const existingFair = row.errors.length ? null : await findExistingFair(row);
      const duplicateUncertain = await getDuplicateUncertainty(row, existingFair);
      const assessment = assessIfmRow(row, {
        autoPublishHighConfidence,
        duplicateDecision: duplicateUncertain
          ? "UNCERTAIN"
          : existingFair
            ? "MATCHED_EXISTING"
            : "NEW_RECORD",
        duplicateUncertain,
      });

      updateAssessmentCounts(result, assessment);

      if (result.preview.length < 20) {
        result.preview.push(toPreviewRow(row, assessment));
      }

      if (assessment.duplicateDecision === "MATCHED_EXISTING") {
        result.duplicateMatchedCount += 1;
      }

      if (dryRun) {
        if (assessment.reviewStatus === "SKIPPED") {
          result.skippedCount += 1;
        } else if (existingFair) {
          result.updatedCount += 1;
        } else {
          result.createdCount += 1;
        }

        continue;
      }

      if (
        assessment.reviewStatus === "SKIPPED" ||
        row.errors.length ||
        !row.startDate ||
        !row.endDate
      ) {
        result.skippedCount += 1;
        result.errors.push(
          `Row ${row.rowNumber}: ${row.errors.join(", ") || "invalid_row"}`,
        );
        continue;
      }

      try {
        const shouldPublish =
          assessment.publishDecision === "AUTO_PUBLISH" ||
          assessment.publishDecision === "PAST_AUTO_PUBLISH";
        const slug = await resolveImportSlug(
          row.slug,
          existingFair?.id,
          row.externalId ?? String(row.rowNumber),
        );
        const fair = existingFair
          ? await updateExistingFair(existingFair, row, {
              shouldPublish,
              slug,
            })
          : await createIfmFair(row, {
              shouldPublish,
              slug,
            });

        await Promise.all([
          saveSuggestedCategories(fair.id, row.suggestedCategorySlugs),
          saveFairSource(fair.id, row, sourceUrl, assessment),
          prisma.adminActionLog.create({
            data: {
              actionType: "IMPORT",
              adminUserId,
              fairId: fair.id,
              metadata: {
                confidenceScore: assessment.confidenceScore,
                duplicateDecision: assessment.duplicateDecision,
                externalId: row.externalId,
                isPastFair: assessment.isPastFair,
                matchedCategoryFromName: row.matchedCategoryFromName,
                publishDecision: assessment.publishDecision,
                reviewReasons: assessment.reviewReasons,
                reviewStatus: assessment.reviewStatus,
                rowNumber: row.rowNumber,
                sourceName: "IFM",
              },
            },
          }),
        ]);

        if (existingFair) {
          result.updatedCount += 1;
        } else {
          result.createdCount += 1;
        }

        if (shouldPublish && !existingFair?.isPublished) {
          result.autoPublishedCount += 1;
        }
      } catch (error) {
        result.failedCount += 1;
        result.errors.push(
          `Row ${row.rowNumber}: ${
            error instanceof Error ? error.message : "import_failed"
          }`,
        );
      }
    }

    if (importJob) {
      await prisma.importJob.update({
        data: {
          createdCount: result.createdCount,
          errorMessage: result.errors.length ? result.errors.slice(0, 10).join("\n") : null,
          finishedAt: new Date(),
          foundCount: result.foundCount,
          status: "SUCCESS",
          updatedCount: result.updatedCount,
        },
        where: {
          id: importJob.id,
        },
      });
    }

    return result;
  } catch (error) {
    if (importJob) {
      await prisma.importJob.update({
        data: {
          errorMessage: error instanceof Error ? error.message : "import_failed",
          finishedAt: new Date(),
          status: "FAILED",
        },
        where: {
          id: importJob.id,
        },
      });
    }

    throw error;
  }
}

function assessIfmRow(
  row: NormalizedIfmFairRow,
  {
    autoPublishHighConfidence,
    duplicateDecision,
    duplicateUncertain,
  }: {
    autoPublishHighConfidence: boolean;
    duplicateDecision: DuplicateDecision;
    duplicateUncertain: boolean;
  },
): IfmRowAssessment {
  const today = startOfDay(new Date());
  const hasValidDates = Boolean(row.startDate && row.endDate);
  const dateSuspicious = Boolean(
    row.startDate && row.endDate && row.endDate < row.startDate,
  );
  const isPastFair = Boolean(row.endDate && row.endDate < today);
  let confidenceScore = 0;

  if (row.name && row.name.length >= 3 && row.name.length <= 180) {
    confidenceScore += 20;
  } else {
    confidenceScore -= 25;
  }

  if (hasValidDates) {
    confidenceScore += 20;
  } else {
    confidenceScore -= 30;
  }

  if (row.city === ifmCity) {
    confidenceScore += 15;
  }

  if (row.venue) {
    confidenceScore += 10;
  }

  if (row.suggestedCategorySlugs.length) {
    confidenceScore += 15;
  } else {
    confidenceScore -= 15;
  }

  if (row.organizer) {
    confidenceScore += 5;
  }

  if (row.officialWebsite) {
    confidenceScore += 10;
  }

  if (row.externalId) {
    confidenceScore += 10;
  }

  if (duplicateUncertain) {
    confidenceScore -= 20;
  }

  if (dateSuspicious) {
    confidenceScore -= 30;
  }

  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  const reviewReasons = [
    ...(!row.name ? ["name_missing"] : []),
    ...(!hasValidDates ? ["invalid_date"] : []),
    ...(row.city !== ifmCity ? ["city_missing"] : []),
    ...(!row.venue ? ["venue_missing"] : []),
    ...(!row.suggestedCategorySlugs.length ? ["category_missing"] : []),
    ...(duplicateUncertain ? ["duplicate_uncertain"] : []),
    ...(dateSuspicious ? ["date_suspicious"] : []),
    ...(row.errors.length ? ["parse_errors"] : []),
  ];

  if (!reviewReasons.length && confidenceScore < READY_TO_PUBLISH_THRESHOLD) {
    reviewReasons.push("low_confidence");
  }

  const reviewStatus: IfmReviewStatus = row.errors.length
    ? "SKIPPED"
    : reviewReasons.length
      ? "NEEDS_REVIEW"
      : "READY_TO_PUBLISH";
  const publishDecision: IfmPublishDecision =
    reviewStatus === "SKIPPED"
      ? "SKIP"
      : autoPublishHighConfidence &&
          reviewStatus === "READY_TO_PUBLISH" &&
          isPastFair
        ? "PAST_AUTO_PUBLISH"
        : autoPublishHighConfidence && reviewStatus === "READY_TO_PUBLISH"
          ? "AUTO_PUBLISH"
          : reviewStatus === "READY_TO_PUBLISH" && isPastFair
            ? "PAST_DRAFT_WOULD_BE_READY"
            : reviewStatus === "READY_TO_PUBLISH"
              ? "DRAFT_WOULD_BE_READY"
              : "DRAFT";

  return {
    confidenceScore,
    duplicateDecision:
      reviewStatus === "SKIPPED" ? "SKIPPED" : duplicateDecision,
    duplicateUncertain,
    isPastFair,
    publishDecision,
    reviewReasons,
    reviewStatus,
  };
}

async function updateExistingFair(
  existingFair: ExistingFairMatch,
  row: NormalizedIfmFairRow,
  {
    shouldPublish,
    slug,
  }: {
    shouldPublish: boolean;
    slug: string;
  },
) {
  const isPublished = existingFair.isPublished ? true : shouldPublish;
  const status = existingFair.isPublished
    ? existingFair.status
    : shouldPublish
      ? "PUBLISHED"
      : "DRAFT";

  return prisma.fair.update({
    data: {
      ...(isGenericVenue(existingFair.venue) ? { venue: row.venue } : {}),
      ...(existingFair.officialWebsite ? {} : { officialWebsite: row.officialWebsite }),
      ...(existingFair.organizer ? {} : { organizer: row.organizer }),
      isIstanbulPriority: true,
      isPublished,
      lastChangedAt: new Date(),
      lastCheckedAt: new Date(),
      slug,
      status,
    },
    where: {
      id: existingFair.id,
    },
    select: {
      id: true,
    },
  });
}

async function createIfmFair(
  row: NormalizedIfmFairRow,
  {
    shouldPublish,
    slug,
  }: {
    shouldPublish: boolean;
    slug: string;
  },
) {
  return prisma.fair.create({
    data: {
      city: row.city,
      description: row.description,
      endDate: row.endDate!,
      isFeatured: false,
      isIstanbulPriority: true,
      isPublished: shouldPublish,
      lastChangedAt: new Date(),
      lastCheckedAt: new Date(),
      name: row.name,
      officialWebsite: row.officialWebsite,
      organizer: row.organizer,
      slug,
      startDate: row.startDate!,
      status: shouldPublish ? "PUBLISHED" : "DRAFT",
      venue: row.venue,
    },
    select: {
      id: true,
    },
  });
}

function updateAssessmentCounts(
  result: IfmImportResult,
  assessment: IfmRowAssessment,
) {
  if (assessment.isPastFair) {
    result.pastFairCount += 1;
  }

  if (assessment.reviewStatus === "READY_TO_PUBLISH") {
    result.readyToPublishCount += 1;
  }

  if (assessment.reviewStatus === "NEEDS_REVIEW") {
    result.needsReviewCount += 1;
  }

  if (
    assessment.reviewStatus !== "SKIPPED" &&
    assessment.publishDecision !== "AUTO_PUBLISH" &&
    assessment.publishDecision !== "PAST_AUTO_PUBLISH"
  ) {
    result.draftSavedCount += 1;
  }
}

async function findExistingFair(
  row: NormalizedIfmFairRow,
): Promise<ExistingFairMatch | null> {
  if (row.externalId) {
    const source = await prisma.fairSource.findFirst({
      where: {
        externalId: row.externalId,
        sourceName: "IFM",
      },
      select: {
        fair: {
          select: existingFairSelect,
        },
      },
    });

    if (source?.fair) {
      return source.fair;
    }
  }

  if (!row.name || !row.startDate) {
    return null;
  }

  const exactMatch = await prisma.fair.findFirst({
    where: {
      city: {
        equals: ifmCity,
        mode: "insensitive",
      },
      name: {
        equals: row.name,
        mode: "insensitive",
      },
      startDate: {
        gte: startOfDay(row.startDate),
        lte: endOfDay(row.startDate),
      },
    },
    select: existingFairSelect,
  });

  if (exactMatch) {
    return exactMatch;
  }

  return prisma.fair.findFirst({
    where: {
      name: {
        contains: row.name.slice(0, Math.min(row.name.length, 24)),
        mode: "insensitive",
      },
      startDate: {
        gte: addDays(startOfDay(row.startDate), -2),
        lte: addDays(endOfDay(row.startDate), 2),
      },
      venue: {
        contains: "Fuar",
        mode: "insensitive",
      },
    },
    select: existingFairSelect,
  });
}

const existingFairSelect = {
  id: true,
  isPublished: true,
  officialWebsite: true,
  organizer: true,
  slug: true,
  status: true,
  venue: true,
} satisfies Prisma.FairSelect;

async function getDuplicateUncertainty(
  row: NormalizedIfmFairRow,
  existingFair: ExistingFairMatch | null,
) {
  if (existingFair || !row.name || !row.startDate) {
    return false;
  }

  const looseMatches = await prisma.fair.findMany({
    where: {
      city: {
        equals: ifmCity,
        mode: "insensitive",
      },
      name: {
        contains: row.name.slice(0, Math.min(row.name.length, 18)),
        mode: "insensitive",
      },
      startDate: {
        gte: addDays(startOfDay(row.startDate), -4),
        lte: addDays(endOfDay(row.startDate), 4),
      },
    },
    select: {
      id: true,
    },
    take: 2,
  });

  return looseMatches.length > 1;
}

async function resolveImportSlug(
  baseSlug: string,
  fairId?: string,
  suffixSeed = "ifm",
) {
  const existingFair = await prisma.fair.findUnique({
    where: {
      slug: baseSlug,
    },
    select: {
      id: true,
    },
  });

  if (!existingFair || existingFair.id === fairId) {
    return baseSlug;
  }

  const suffix = toSlug(`ifm-${suffixSeed}`).slice(0, 24) || "ifm";

  for (let index = 1; index <= 50; index += 1) {
    const candidate = `${baseSlug}-${suffix}${index === 1 ? "" : `-${index}`}`;
    const fair = await prisma.fair.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!fair || fair.id === fairId) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function saveSuggestedCategories(fairId: string, categorySlugs: string[]) {
  if (!categorySlugs.length) {
    return;
  }

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      slug: {
        in: categorySlugs,
      },
    },
    select: {
      id: true,
    },
  });

  if (!categories.length) {
    return;
  }

  await prisma.fairCategory.createMany({
    data: categories.map((category) => ({
      categoryId: category.id,
      fairId,
    })),
    skipDuplicates: true,
  });
}

async function saveFairSource(
  fairId: string,
  row: NormalizedIfmFairRow,
  sourceUrl: string | null,
  assessment: IfmRowAssessment,
) {
  const existingSource = await prisma.fairSource.findFirst({
    where: row.externalId
      ? {
          externalId: row.externalId,
          sourceName: "IFM",
        }
      : {
          fairId,
          sourceName: "IFM",
        },
    select: {
      id: true,
    },
  });
  const data = {
    externalId: row.externalId,
    fairId,
    lastSeenAt: new Date(),
    rawData: {
      ...toJsonObject(row.rawData),
      fuarbulImport: {
        confidenceScore: assessment.confidenceScore,
        duplicateDecision: assessment.duplicateDecision,
        duplicateUncertain: assessment.duplicateUncertain,
        isPastFair: assessment.isPastFair,
        matchedCategoryFromName: row.matchedCategoryFromName,
        publishDecision: assessment.publishDecision,
        reviewReasons: assessment.reviewReasons,
        reviewStatus: assessment.reviewStatus,
        suggestedCategorySlugs: row.suggestedCategorySlugs,
      },
    },
    sourceName: "IFM" as const,
    sourceUrl,
  };

  if (existingSource) {
    await prisma.fairSource.update({
      data,
      where: {
        id: existingSource.id,
      },
    });
    return;
  }

  await prisma.fairSource.create({
    data,
  });
}

function toPreviewRow(
  row: NormalizedIfmFairRow,
  assessment: IfmRowAssessment,
): IfmImportPreviewRow {
  return {
    confidenceScore: assessment.confidenceScore,
    duplicateDecision: assessment.duplicateDecision,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    errors: row.errors,
    matchedCategoryFromName: row.matchedCategoryFromName,
    name: row.name,
    organizer: row.organizer,
    publishDecision: assessment.publishDecision,
    reviewReasons: assessment.reviewReasons,
    reviewStatus: assessment.reviewStatus,
    rowNumber: row.rowNumber,
    slug: row.slug,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    suggestedCategorySlugs: row.suggestedCategorySlugs,
    venue: row.venue,
  };
}

function parseJsonRows(text: string) {
  try {
    return rowsFromJson(JSON.parse(text));
  } catch {
    return [];
  }
}

function parseJsonLdRows(text: string) {
  const scripts = Array.from(
    text.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  return scripts.flatMap((match) => parseJsonRows(stripHtml(match[1])));
}

function rowsFromJson(value: unknown): RawIfmRow[] {
  const arrays = findEventArrays(value);
  const rows = arrays.flatMap((array) =>
    array.map((item, index) => rawRowFromObject(item, index + 1)),
  );

  if (rows.length) {
    return rows;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => rawRowFromObject(item, index + 1));
  }

  if (value && typeof value === "object") {
    return [rawRowFromObject(value, 1)];
  }

  return [];
}

function findEventArrays(value: unknown): unknown[][] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return [value];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    if (
      Array.isArray(nestedValue) &&
      ["data", "events", "items", "list", "results"].includes(key)
    ) {
      return [nestedValue];
    }

    return findEventArrays(nestedValue);
  });
}

function rawRowFromObject(value: unknown, rowNumber: number): RawIfmRow {
  const rawData =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { value };
  const startDate = getObjectValue(rawData, [
    "startDate",
    "start",
    "dateStart",
    "beginDate",
  ]);
  const endDate = getObjectValue(rawData, [
    "endDate",
    "end",
    "dateEnd",
    "finishDate",
  ]);

  return {
    dateText: getFirstString(getObjectString(rawData, ["date", "dateText", "dates"])),
    description: getObjectString(rawData, ["description", "summary", "content"]),
    endDate,
    externalId: getObjectString(rawData, ["id", "externalId", "slug"]),
    name: getObjectString(rawData, ["name", "title", "eventName"]),
    officialWebsite: getObjectString(rawData, ["url", "website", "link"]),
    organizer: getObjectString(rawData, ["organizer", "organizerName"]),
    rawData,
    rowNumber,
    sourceText: JSON.stringify(rawData),
    startDate,
    url: getObjectString(rawData, ["url", "website", "link"]),
  };
}

function parseTextRows(text: string): RawIfmRow[] {
  const plainText = stripHtml(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  const blocks = plainText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const candidateBlocks = blocks.length > 1 ? blocks : plainText.split(/\n(?=\D{6,})/);

  return candidateBlocks
    .map((block, index) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const name = lines.find((line) => !parseDateRange(line).startDate) ?? lines[0] ?? "";
      const dateText = lines.find((line) => parseDateRange(line).startDate) ?? block;
      const url = lines.find((line) => /^https?:\/\//i.test(line)) ?? null;

      return {
        dateText,
        description: lines.slice(1).join("\n") || null,
        externalId: toSlug(`${name}-${index + 1}`) || null,
        name,
        officialWebsite: url,
        rawData: {
          text: block,
        },
        rowNumber: index + 1,
        sourceText: block,
        url,
      } satisfies RawIfmRow;
    })
    .filter((row) => row.name || row.dateText);
}

function parseDateRange(value: string | null | undefined) {
  const text = value ?? "";
  const numericRange = text.match(
    /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*[-–]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/,
  );

  if (numericRange) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] =
      numericRange;

    return {
      endDate: dateFromParts(endYear, endMonth, endDay),
      startDate: dateFromParts(startYear, startMonth, startDay),
    };
  }

  const sameMonthRange = text.match(
    /(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})/i,
  );

  if (sameMonthRange) {
    const [, startDay, endDay, monthName, year] = sameMonthRange;
    const month = monthNumber(monthName);

    return {
      endDate: month ? dateFromParts(year, String(month), endDay) : null,
      startDate: month ? dateFromParts(year, String(month), startDay) : null,
    };
  }

  const longRange = text.match(
    /(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})/i,
  );

  if (longRange) {
    const [, startDay, startMonthName, startYear, endDay, endMonthName, endYear] =
      longRange;
    const startMonth = monthNumber(startMonthName);
    const endMonth = monthNumber(endMonthName);

    return {
      endDate: endMonth ? dateFromParts(endYear, String(endMonth), endDay) : null,
      startDate: startMonth
        ? dateFromParts(startYear, String(startMonth), startDay)
        : null,
    };
  }

  const singleDate = text.match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})/i);

  if (singleDate) {
    const [, day, monthName, year] = singleDate;
    const month = monthNumber(monthName);
    const date = month ? dateFromParts(year, String(month), day) : null;

    return {
      endDate: date,
      startDate: date,
    };
  }

  return {
    endDate: null,
    startDate: null,
  };
}

function parseIfmDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfDay(value);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const parsedDate = new Date(text);

  if (!Number.isNaN(parsedDate.getTime())) {
    return startOfDay(parsedDate);
  }

  return parseDateRange(text).startDate;
}

function dateFromParts(year: string, month: string, day: string) {
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function monthNumber(value: string) {
  const months: Record<string, number> = {
    aralik: 12,
    aralık: 12,
    agustos: 8,
    ağustos: 8,
    eylül: 9,
    eylul: 9,
    ekim: 10,
    haziran: 6,
    kasım: 11,
    kasim: 11,
    mart: 3,
    mayis: 5,
    mayıs: 5,
    nisan: 4,
    ocak: 1,
    şubat: 2,
    subat: 2,
    temmuz: 7,
  };

  return months[value.toLocaleLowerCase("tr-TR")];
}

function normalizeWebsite(value: string | null) {
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function getFirstString(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function getObjectValue(object: Record<string, unknown>, keys: string[]) {
  const entry = Object.entries(object).find(([key]) =>
    keys.some((alias) => toSlug(key) === toSlug(alias)),
  );

  return entry?.[1] ?? null;
}

function getObjectString(object: Record<string, unknown>, keys: string[]) {
  const value = getObjectValue(object, keys);

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (value && typeof value === "object" && "name" in value) {
    return getFirstString(String((value as { name?: unknown }).name ?? ""));
  }

  return "";
}

function stripHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "\n");
}

function isGenericVenue(venue: string) {
  const normalizedVenue = toSlug(venue);

  return (
    !venue.trim() ||
    normalizedVenue === "istanbul" ||
    normalizedVenue === "fuar" ||
    normalizedVenue === "fuar-alani" ||
    normalizedVenue === "istanbul-fuar-alani"
  );
}

function toJsonObject(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);

  return nextDate;
}
