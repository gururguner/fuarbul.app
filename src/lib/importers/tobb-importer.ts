import "server-only";

import * as XLSX from "xlsx";

import { discoverImportImage } from "@/lib/fair-image-backfill";
import { prisma } from "@/lib/prisma";
import { suggestFairCategorySlugs } from "@/lib/fair-category-matcher";
import { toSlug } from "@/lib/slug";
import { normalizeTurkeyCity } from "@/lib/turkey-cities";

export type TobbReviewStatus = "READY_TO_PUBLISH" | "NEEDS_REVIEW" | "SKIPPED";
export type TobbPublishDecision =
  | "AUTO_PUBLISH"
  | "DRAFT"
  | "DRAFT_WOULD_BE_READY"
  | "PAST_AUTO_PUBLISH"
  | "PAST_DRAFT_WOULD_BE_READY"
  | "SKIP";

type RawTobbRow = Record<string, unknown> & {
  __rowNumber?: number;
};

export type NormalizedTobbFairRow = {
  city: string;
  description: string | null;
  endDate: Date | null;
  errors: string[];
  externalId: string | null;
  fairType: string | null;
  isIstanbulPriority: boolean;
  matchedCategoryFromName: boolean;
  name: string;
  officialWebsite: string | null;
  organizer: string | null;
  productGroups: string | null;
  rawCity: string;
  rawData: Record<string, string | number | boolean | null>;
  rowNumber: number;
  slug: string;
  startDate: Date | null;
  suggestedCategorySlugs: string[];
  topic: string | null;
  venue: string;
};

export type TobbImportResult = {
  autoPublishedCount: number;
  createdCount: number;
  draftSavedCount: number;
  dryRun: boolean;
  errors: string[];
  failedCount: number;
  foundCount: number;
  importJobId?: string;
  needsReviewCount: number;
  pastFairCount: number;
  preview: TobbImportPreviewRow[];
  readyToPublishCount: number;
  skippedCount: number;
  updatedCount: number;
};

export type TobbImportPreviewRow = {
  city: string;
  confidenceScore: number;
  endDate: string | null;
  errors: string[];
  externalId: string | null;
  isPastFair: boolean;
  matchedCategoryFromName: boolean;
  name: string;
  publishDecision: TobbPublishDecision;
  reviewReasons: string[];
  reviewStatus: TobbReviewStatus;
  rowNumber: number;
  slug: string;
  startDate: string | null;
  suggestedCategorySlugs: string[];
  venue: string;
};

type ImportTobbFairsOptions = {
  adminUserId: string;
  autoPublishHighConfidence?: boolean;
  buffer: Buffer;
  dryRun?: boolean;
  sourceUrl?: string | null;
};

type ExistingFairMatch = {
  id: string;
  imageUrl: string | null;
  isPublished: boolean;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "UPDATED" | "POSTPONED" | "CANCELLED" | "ARCHIVED";
};

type TobbRowAssessment = {
  confidenceScore: number;
  duplicateUncertain: boolean;
  isPastFair: boolean;
  publishDecision: TobbPublishDecision;
  reviewReasons: string[];
  reviewStatus: TobbReviewStatus;
};

const READY_TO_PUBLISH_THRESHOLD = 70;

const headerAliases = {
  endDate: ["BİTİŞ", "BITIS", "BİTIS", "BİTİS"],
  externalId: ["NO", "SIRA NO", "SIRA"],
  fairType: ["TÜRÜ", "TURU"],
  name: ["FUARIN ADI", "FUAR ADI", "ADI"],
  organizer: ["DÜZENLEYİCİ", "DUZENLEYICI", "ORGANİZATÖR", "ORGANIZATOR"],
  productGroups: [
    "BAŞLICA ÜRÜN HİZMET GRUPLARI",
    "BASLICA URUN HIZMET GRUPLARI",
    "ÜRÜN HİZMET GRUPLARI",
  ],
  startDate: ["BAŞLAMA", "BASLAMA", "BAŞLANGIÇ", "BASLANGIC"],
  topic: ["KONUSU", "KONU"],
  venue: ["YER", "FUAR ALANI", "MEKAN"],
  website: ["WEB", "WEBSITE", "WEB SİTESİ", "WEB SITESI"],
  city: ["ŞEHİR", "SEHIR", "İL", "IL"],
} as const;

export function parseTobbExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    cellDates: true,
    type: "buffer",
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("no_sheet_found");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: "",
    header: 1,
    raw: true,
  });
  const headerRowIndex = rows.findIndex(isTobbHeaderRow);

  if (headerRowIndex < 0) {
    throw new Error("tobb_header_not_found");
  }

  const headers = rows[headerRowIndex].map((cell, index) => {
    const value = toCellString(cell);

    return value || `column_${index + 1}`;
  });

  return rows
    .slice(headerRowIndex + 1)
    .map((row, rowIndex) => {
      const rawRow: RawTobbRow = {
        __rowNumber: headerRowIndex + rowIndex + 2,
      };

      headers.forEach((header, index) => {
        rawRow[header] = row[index] ?? "";
      });

      return rawRow;
    })
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key !== "__rowNumber" && toCellString(value),
      ),
    );
}

export function normalizeTobbFairRow(row: RawTobbRow): NormalizedTobbFairRow {
  const externalId = getNullableCell(row, headerAliases.externalId);
  const name = getCell(row, headerAliases.name);
  const rawCity = getCell(row, headerAliases.city);
  const city = normalizeTurkeyCity(rawCity) ?? "";
  const venue = getCell(row, headerAliases.venue);
  const organizer = getNullableCell(row, headerAliases.organizer);
  const topic = getNullableCell(row, headerAliases.topic);
  const productGroups = getNullableCell(row, headerAliases.productGroups);
  const fairType = getNullableCell(row, headerAliases.fairType);
  const officialWebsite = normalizeWebsite(getNullableCell(row, headerAliases.website));
  const startDate = parseTobbDate(getRawCell(row, headerAliases.startDate));
  const endDate = parseTobbDate(getRawCell(row, headerAliases.endDate));
  const year = startDate?.getFullYear() ?? new Date().getFullYear();
  const slug = toSlug(`${name} ${year}`);
  const description = buildDescription({ fairType, productGroups, topic });
  const categorySuggestion = suggestFairCategorySlugs({
    description,
    fairType,
    name,
    organizer,
    productGroups,
    topic,
    venue,
  });
  const errors = [
    ...(!name ? ["missing_name"] : []),
    ...(!startDate ? ["missing_or_invalid_start_date"] : []),
    ...(!endDate ? ["missing_or_invalid_end_date"] : []),
    ...(!rawCity ? ["missing_city"] : []),
    ...(rawCity && !city ? ["invalid_city"] : []),
    ...(!venue ? ["missing_venue"] : []),
  ];

  return {
    city,
    description,
    endDate,
    errors,
    externalId,
    fairType,
    isIstanbulPriority: getIstanbulPriority(city, venue),
    matchedCategoryFromName: categorySuggestion.matchedFromName,
    name,
    officialWebsite,
    organizer,
    productGroups,
    rawCity,
    rawData: sanitizeRawRow(row),
    rowNumber: row.__rowNumber ?? 0,
    slug,
    startDate,
    suggestedCategorySlugs: categorySuggestion.slugs,
    topic,
    venue,
  };
}

export async function importTobbFairs({
  adminUserId,
  autoPublishHighConfidence = false,
  buffer,
  dryRun = false,
  sourceUrl = null,
}: ImportTobbFairsOptions): Promise<TobbImportResult> {
  const startedAt = new Date();
  const importJob = dryRun
    ? null
    : await prisma.importJob.create({
        data: {
          sourceName: "TOBB",
          startedAt,
          status: "RUNNING",
        },
        select: {
          id: true,
        },
      });

  try {
    const rawRows = parseTobbExcel(buffer);
    const normalizedRows = rawRows.map(normalizeTobbFairRow);
    const result: TobbImportResult = {
      autoPublishedCount: 0,
      createdCount: 0,
      draftSavedCount: 0,
      dryRun,
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

    if (dryRun) {
      for (const row of normalizedRows) {
        const existingFair = row.errors.length ? null : await findExistingFair(row);
        const duplicateUncertain = await getDuplicateUncertainty(row, existingFair);
        const assessment = assessTobbRow(row, {
          autoPublishHighConfidence,
          duplicateUncertain,
        });

        updateAssessmentCounts(result, assessment);

        if (result.preview.length < 20) {
          result.preview.push(toPreviewRow(row, assessment));
        }

        if (assessment.reviewStatus === "SKIPPED") {
          result.skippedCount += 1;
          continue;
        }

        if (existingFair) {
          result.updatedCount += 1;
        } else {
          result.createdCount += 1;
        }

      }

      return result;
    }

    const officialImageCache = new Map<string, Promise<string | null>>();

    for (const row of normalizedRows) {
      const existingFair = row.errors.length ? null : await findExistingFair(row);
      const duplicateUncertain = await getDuplicateUncertainty(row, existingFair);
      const assessment = assessTobbRow(row, {
        autoPublishHighConfidence,
        duplicateUncertain,
      });

      updateAssessmentCounts(result, assessment);

      if (result.preview.length < 20) {
        result.preview.push(toPreviewRow(row, assessment));
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
        const slug = await resolveImportSlug(
          row.slug,
          existingFair?.id,
          row.externalId ?? String(row.rowNumber),
        );
        const shouldPublish =
          assessment.publishDecision === "AUTO_PUBLISH" ||
          assessment.publishDecision === "PAST_AUTO_PUBLISH";
        const isPublished = existingFair?.isPublished ? true : shouldPublish;
        const status = existingFair?.isPublished
          ? existingFair.status
          : shouldPublish
            ? "PUBLISHED"
            : "DRAFT";
        const imageUrl = await getTobbImportImage(
          row,
          existingFair,
          officialImageCache,
        );
        const fairData = {
          city: row.city,
          description: row.description,
          endDate: row.endDate,
          imageUrl,
          isFeatured: false,
          isIstanbulPriority: row.isIstanbulPriority,
          isPublished,
          lastChangedAt: new Date(),
          lastCheckedAt: new Date(),
          name: row.name,
          officialWebsite: row.officialWebsite,
          organizer: row.organizer,
          slug,
          startDate: row.startDate,
          status,
          venue: row.venue,
        };
        const fair = existingFair
          ? await prisma.fair.update({
              data: fairData,
              where: {
                id: existingFair.id,
              },
              select: {
                id: true,
              },
            })
          : await prisma.fair.create({
              data: fairData,
              select: {
                id: true,
              },
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
                externalId: row.externalId,
                confidenceScore: assessment.confidenceScore,
                isPastFair: assessment.isPastFair,
                matchedCategoryFromName: row.matchedCategoryFromName,
                publishDecision: assessment.publishDecision,
                reviewReasons: assessment.reviewReasons,
                reviewStatus: assessment.reviewStatus,
                rowNumber: row.rowNumber,
                sourceName: "TOBB",
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

function assessTobbRow(
  row: NormalizedTobbFairRow,
  {
    autoPublishHighConfidence,
    duplicateUncertain,
  }: {
    autoPublishHighConfidence: boolean;
    duplicateUncertain: boolean;
  },
): TobbRowAssessment {
  const today = startOfDay(new Date());
  const hasValidDates = Boolean(row.startDate && row.endDate);
  const isPastFair = Boolean(row.endDate && row.endDate < today);
  const dateSuspicious = Boolean(
    row.startDate && row.endDate && row.endDate < row.startDate,
  );
  let confidenceScore = 0;

  if (row.name && row.name.length >= 5 && row.name.length <= 180) {
    confidenceScore += 20;
  } else if (!row.name) {
    confidenceScore -= 25;
  }

  if (hasValidDates) {
    confidenceScore += 15;
  } else {
    confidenceScore -= 30;
  }

  if (row.startDate) {
    confidenceScore += 10;
  }

  if (row.city) {
    confidenceScore += 10;
  } else {
    confidenceScore -= 20;
  }

  if (row.venue) {
    confidenceScore += 10;
  } else {
    confidenceScore -= 15;
  }

  if (row.organizer) {
    confidenceScore += 10;
  }

  if (row.officialWebsite) {
    confidenceScore += 10;
  } else {
    confidenceScore -= 10;
  }

  if (row.suggestedCategorySlugs.length) {
    confidenceScore += 15;
  } else {
    confidenceScore -= 15;
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
    ...(!row.city ? ["city_missing"] : []),
    ...(!row.venue ? ["venue_missing"] : []),
    ...(!row.suggestedCategorySlugs.length ? ["category_missing"] : []),
    ...(duplicateUncertain ? ["duplicate_uncertain"] : []),
    ...(dateSuspicious ? ["date_suspicious"] : []),
    ...(row.errors.length ? ["parse_errors"] : []),
  ];

  if (!reviewReasons.length && confidenceScore < READY_TO_PUBLISH_THRESHOLD) {
    reviewReasons.push("low_confidence");
  }

  const needsReview = reviewReasons.length > 0;
  const reviewStatus: TobbReviewStatus = row.errors.length
    ? "SKIPPED"
    : needsReview
      ? "NEEDS_REVIEW"
      : "READY_TO_PUBLISH";
  const publishDecision: TobbPublishDecision =
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
    duplicateUncertain,
    isPastFair,
    publishDecision,
    reviewReasons,
    reviewStatus,
  };
}

function updateAssessmentCounts(
  result: TobbImportResult,
  assessment: TobbRowAssessment,
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

async function getTobbImportImage(
  row: NormalizedTobbFairRow,
  existingFair: ExistingFairMatch | null,
  cache: Map<string, Promise<string | null>>,
) {
  if (!row.officialWebsite) {
    return existingFair?.imageUrl ?? null;
  }

  if (!cache.has(row.officialWebsite)) {
    cache.set(
      row.officialWebsite,
      discoverImportImage({
        existingImageUrl: existingFair?.imageUrl,
        officialWebsite: row.officialWebsite,
      }),
    );
  }

  return cache.get(row.officialWebsite)!;
}

async function getDuplicateUncertainty(
  row: NormalizedTobbFairRow,
  existingFair: ExistingFairMatch | null,
) {
  if (existingFair || !row.name || !row.city || !row.startDate) {
    return false;
  }

  const sameSlugFair = await prisma.fair.findUnique({
    where: {
      slug: row.slug,
    },
    select: {
      id: true,
    },
  });

  if (sameSlugFair) {
    return true;
  }

  const looseMatch = await prisma.fair.findFirst({
    where: {
      city: {
        equals: row.city,
        mode: "insensitive",
      },
      name: {
        contains: row.name.slice(0, Math.min(row.name.length, 24)),
        mode: "insensitive",
      },
      startDate: {
        gte: addDays(startOfDay(row.startDate), -2),
        lte: addDays(endOfDay(row.startDate), 2),
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(looseMatch);
}

function isTobbHeaderRow(row: unknown[]) {
  const headers = new Set(row.map((cell) => normalizeHeader(toCellString(cell))));

  return (
    headers.has("fuarinadi") &&
    (headers.has("baslama") || headers.has("baslangic")) &&
    (headers.has("bitis") || headers.has("bitis"))
  );
}

function getCell(row: RawTobbRow, aliases: readonly string[]) {
  return toCellString(getRawCell(row, aliases));
}

function getNullableCell(row: RawTobbRow, aliases: readonly string[]) {
  return getCell(row, aliases) || null;
}

function getRawCell(row: RawTobbRow, aliases: readonly string[]) {
  const aliasSet = new Set(aliases.map(normalizeHeader));
  const entry = Object.entries(row).find(([key]) => aliasSet.has(normalizeHeader(key)));

  return entry?.[1] ?? "";
}

function normalizeHeader(value: string) {
  return toSlug(value).replace(/-/g, "");
}

function toCellString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value ?? "").trim();
}

function parseTobbDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfDay(value);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const stringValue = toCellString(value);

  if (!stringValue) {
    return null;
  }

  const dayFirstMatch = stringValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);

  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsedDate = new Date(stringValue);

  return Number.isNaN(parsedDate.getTime()) ? null : startOfDay(parsedDate);
}

function buildDescription({
  fairType,
  productGroups,
  topic,
}: {
  fairType: string | null;
  productGroups: string | null;
  topic: string | null;
}) {
  const parts = [
    topic ? `Konusu: ${topic}` : null,
    productGroups ? `Başlıca ürün/hizmet grupları: ${productGroups}` : null,
    fairType ? `Türü: ${fairType}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n") : null;
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

function getIstanbulPriority(city: string, venue: string) {
  const normalizedVenue = toSlug(venue);

  return (
    city === "İstanbul" ||
    normalizedVenue.includes("istanbul-fuar-merkezi") ||
    normalizedVenue.includes("tuyap") ||
    normalizedVenue.includes("lutfi-kirdar") ||
    normalizedVenue.includes("ifm")
  );
}

function suggestCategorySlugs(text: string) {
  const normalizedText = createSearchableText(text);
  const slugs = new Set<string>();

  addIfIncludes(
    slugs,
    normalizedText,
    [
      "teknoloji",
      "bilisim",
      "bilişim",
      "digital",
      "dijital",
      "elektronik",
      "consumer electronics",
      "donanim",
      "donanım",
      "bilgisayar",
      "robotic",
      "robotik",
    ],
    ["teknoloji"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["software", "yazilim", "yazılım"],
    ["teknoloji", "yazilim"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "yapay zeka",
      "artificial intelligence",
      "ai",
      "generative ai",
      "otomasyon",
      "automation",
    ],
    ["yapay-zeka"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["oyun", "gaming", "e-spor", "esport", "esports", "video game", "console", "konsol"],
    ["oyun"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "otomotiv",
      "automotive",
      "araç",
      "arac",
      "vehicle",
      "auto",
      "tuning",
      "yedek parça",
      "spare parts",
    ],
    ["otomotiv"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["motosiklet", "motorcycle", "motobike", "scooter", "kask", "motor ekipman"],
    ["motosiklet"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "elektrikli araç",
      "elektrikli arac",
      "electric vehicle",
      "ev",
      "e-mobility",
      "emobility",
      "şarj",
      "sarj",
      "charging",
    ],
    ["elektrikli-araclar"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "mobilite",
      "mobility",
      "ulaşım",
      "ulasim",
      "transport",
      "transportation",
      "karavan",
      "caravan",
      "kamp",
      "camping",
      "outdoor",
    ],
    ["mobilite"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "food",
      "gida",
      "gıda",
      "içecek",
      "icecek",
      "beverage",
      "horeca",
      "restaurant",
      "restoran",
      "cafe",
      "kafe",
      "pastacilik",
      "pastacılık",
      "dondurma",
    ],
    ["gida"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["ambalaj", "packaging"],
    ["gida", "ambalaj"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["turizm", "tourism", "hotel", "otel", "hospitality", "accommodation", "konaklama", "horeca", "travel", "seyahat"],
    ["turizm"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["caravan", "karavan", "camping", "kamp"],
    ["turizm", "mobilite"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["tarım", "tarim", "agriculture", "sera", "hayvancilik", "hayvancılık", "livestock", "agro", "agrotech"],
    ["tarim"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["health", "sağlık", "saglik", "medical", "medikal", "dental", "pharma", "hastane", "hospital"],
    ["saglik"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["kozmetik", "cosmetic", "beauty", "güzellik", "guzellik", "personal care", "kişisel bakım", "kisisel bakim"],
    ["kozmetik"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    [
      "mobilya",
      "furniture",
      "dekorasyon",
      "decoration",
      "carpet",
      "halı",
      "hali",
      "flooring",
      "zemin",
      "home textile",
      "ev tekstili",
      "interior",
      "iç mimari",
      "ic mimari",
    ],
    ["mobilya-dekorasyon"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["kitap", "book", "yayın", "yayin", "publishing", "kültür", "kultur", "literature", "edebiyat"],
    ["kitap-kultur"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["eğitim", "egitim", "education", "school", "okul", "university", "üniversite", "kariyer", "career"],
    ["egitim"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["savunma", "defense", "defence", "military", "güvenlik", "guvenlik", "security"],
    ["savunma-sanayi"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["e-ticaret", "ecommerce", "e-commerce", "online retail", "pazaryeri", "marketplace"],
    ["e-ticaret"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["girişim", "girisim", "startup", "entrepreneur", "yatırım", "yatirim", "investor"],
    ["girisimcilik"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["fotoğraf", "fotograf", "photography", "camera", "kamera", "video", "broadcast", "yayıncılık", "yayincilik"],
    ["fotograf-video"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["3d", "3d baskı", "3d baski", "printer", "yazıcı", "yazici", "maker", "additive manufacturing"],
    ["3d-baski-maker"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["yapı", "yapi", "inşaat", "insaat", "construction", "building"],
    ["yapi-insaat"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["evcil hayvan", "pet", "petzoo", "veteriner", "veterinary"],
    ["evcil-hayvan"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["tekstil", "textile", "moda", "fashion", "apparel", "clothing", "hazır giyim", "hazir giyim"],
    ["tekstil-moda"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["endüstri", "endustri", "industry", "industrial", "makine", "machinery", "machine", "imalat", "manufacturing"],
    ["endustri-makine"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["denizcilik", "maritime", "marine", "boat", "tekne", "yacht", "yat"],
    ["denizcilik"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["enerji", "energy", "renewable", "yenilenebilir", "solar", "güneş", "gunes", "wind", "rüzgar", "ruzgar"],
    ["enerji"],
  );
  addIfIncludes(
    slugs,
    normalizedText,
    ["spor", "sport", "sports", "outdoor", "fitness"],
    ["spor-outdoor"],
  );

  return Array.from(slugs);
}

function createSearchableText(text: string) {
  return ` ${toSlug(text).replace(/-/g, " ")} `;
}

function textIncludesTerm(text: string, term: string) {
  const normalizedTerm = toSlug(term).replace(/-/g, " ").trim();

  if (!normalizedTerm) {
    return false;
  }

  if (normalizedTerm.length <= 5) {
    return text.includes(` ${normalizedTerm} `);
  }

  return text.includes(normalizedTerm);
}

function addIfIncludes(
  slugs: Set<string>,
  text: string,
  needles: string[],
  categorySlugs: string[],
) {
  if (needles.some((needle) => textIncludesTerm(text, needle))) {
    categorySlugs.forEach((slug) => slugs.add(slug));
  }
}

function sanitizeRawRow(row: RawTobbRow) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key !== "__rowNumber")
      .map(([key, value]) => {
        if (value instanceof Date) {
          return [key, value.toISOString()];
        }

        if (typeof value === "number" || typeof value === "boolean") {
          return [key, value];
        }

        return [key, toCellString(value) || null];
      }),
  );
}

async function findExistingFair(row: NormalizedTobbFairRow): Promise<ExistingFairMatch | null> {
  if (row.externalId) {
    const source = await prisma.fairSource.findFirst({
      where: {
        externalId: row.externalId,
        sourceName: "TOBB",
      },
      select: {
        fair: {
          select: {
            id: true,
            imageUrl: true,
            isPublished: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (source?.fair) {
      return source.fair;
    }
  }

  if (!row.startDate || !row.city || !row.name) {
    return null;
  }

  return prisma.fair.findFirst({
    where: {
      city: {
        equals: row.city,
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
    select: {
      id: true,
      imageUrl: true,
      isPublished: true,
      slug: true,
      status: true,
    },
  });
}

async function resolveImportSlug(
  baseSlug: string,
  fairId?: string,
  suffixSeed = "tobb",
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

  const suffix = toSlug(`tobb-${suffixSeed}`).slice(0, 24) || "tobb";

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
  row: NormalizedTobbFairRow,
  sourceUrl: string | null,
  assessment: TobbRowAssessment,
) {
  const existingSource = await prisma.fairSource.findFirst({
    where: row.externalId
      ? {
          externalId: row.externalId,
          sourceName: "TOBB",
        }
      : {
          fairId,
          sourceName: "TOBB",
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
      ...row.rawData,
      fuarbulImport: {
        confidenceScore: assessment.confidenceScore,
        duplicateUncertain: assessment.duplicateUncertain,
        isPastFair: assessment.isPastFair,
        matchedCategoryFromName: row.matchedCategoryFromName,
        publishDecision: assessment.publishDecision,
        reviewReasons: assessment.reviewReasons,
        reviewStatus: assessment.reviewStatus,
        suggestedCategorySlugs: row.suggestedCategorySlugs,
      },
    },
    sourceName: "TOBB" as const,
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
  row: NormalizedTobbFairRow,
  assessment: TobbRowAssessment,
): TobbImportPreviewRow {
  return {
    city: row.city || row.rawCity,
    confidenceScore: assessment.confidenceScore,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    errors: row.errors,
    externalId: row.externalId,
    isPastFair: assessment.isPastFair,
    matchedCategoryFromName: row.matchedCategoryFromName,
    name: row.name,
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

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}
