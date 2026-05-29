import "server-only";

import { statSync } from "node:fs";

import { Prisma } from "@prisma/client";

import { suggestFairCategorySlugs } from "@/lib/fair-category-matcher";
import { discoverImportImage } from "@/lib/fair-image-backfill";
import type { DiscoveredImageSource } from "@/lib/image-discovery";
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
  detailUrl?: string | null;
  endDate?: unknown;
  externalId?: string | null;
  hall?: string | null;
  imageCandidates?: IfmImageCandidate[];
  imageUrl?: string | null;
  logoUrl?: string | null;
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
  detailUrl: string | null;
  endDate: Date | null;
  errors: string[];
  externalId: string | null;
  hall: string | null;
  imageCandidates: IfmScoredImageCandidate[];
  imageRejectedReasons: string[];
  imageSource: IfmImageSource | null;
  imageStatus: IfmImageStatus;
  imageUrl: string | null;
  logoUrl: string | null;
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
  hall: string | null;
  id: string;
  imageUrl: string | null;
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
  detailUrl: string | null;
  duplicateDecision: DuplicateDecision;
  endDate: string | null;
  errors: string[];
  imageSource: IfmImageSource | null;
  imageStatus: IfmImageStatus;
  logoUrl: string | null;
  officialWebsite: string | null;
  matchedCategoryFromName: boolean;
  name: string;
  organizer: string | null;
  publishDecision: IfmPublishDecision;
  reviewReasons: string[];
  reviewStatus: IfmReviewStatus;
  rowNumber: number;
  slug: string;
  sourceUrl: string | null;
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
  debug?: IfmImportDebugInfo;
  errors: string[];
  failedCount: number;
  failedDetailPageCount: number;
  foundCount: number;
  importJobId?: string;
  needsReviewCount: number;
  parsedDetailPageCount: number;
  pastFairCount: number;
  preview: IfmImportPreviewRow[];
  readyToPublishCount: number;
  skippedCount: number;
  updatedCount: number;
  warningCount: number;
};

type IfmImportDebugInfo = {
  errors: string[];
  failedDetailUrls: string[];
  firstDetailUrls: string[];
  parsedDetailPageCount: number;
  parsedRecordCount: number;
  renderedDetailLinkCount: number;
  warnings: string[];
};

type BrowserCalendarCard = {
  dateText: string | null;
  detailUrl: string | null;
  imageCandidates: IfmImageCandidate[];
  imageUrl: string | null;
  logoUrl: string | null;
  name: string;
  organizer: string | null;
  sourceText: string;
};

type IfmImageSource =
  | "calendar-card"
  | "detail-page"
  | "json-ld"
  | "og-image"
  | DiscoveredImageSource;

type IfmImageStatus = "FOUND" | "GENERIC_REJECTED" | "NOT_FOUND";

type IfmImageCandidate = {
  alt?: string | null;
  className?: string | null;
  contextText?: string | null;
  height?: number | null;
  source: IfmImageSource;
  url: string | null;
  width?: number | null;
};

type IfmScoredImageCandidate = IfmImageCandidate & {
  rejectedReason: string | null;
  score: number;
  url: string;
};

type IfmImageSelection = {
  candidates: IfmScoredImageCandidate[];
  imageRejectedReasons: string[];
  imageSource: IfmImageSource | null;
  imageStatus: IfmImageStatus;
  imageUrl: string | null;
  rejectedReasons: string[];
  score: number;
};

type ImportIfmFairsOptions = {
  adminUserId: string;
  autoPublishHighConfidence?: boolean;
  dryRun?: boolean;
  sourceText: string;
  sourceUrl?: string | null;
};

const READY_TO_PUBLISH_THRESHOLD = 70;
const MAX_IFM_DETAIL_PAGES = 100;
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

  const detailRow = parseIfmDetailPage(trimmedText, null, 1);

  if (detailRow) {
    return [detailRow];
  }

  const htmlRows = parseIfmHtmlRows(trimmedText);

  if (htmlRows.length) {
    return htmlRows;
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
  const hall = getFirstString(row.hall, getObjectString(row.rawData, ["hall", "salon"]));
  const imageSelection = selectIfmImageCandidate({
    candidates: [
      ...(row.imageCandidates ?? []),
      ...imageCandidatesFromUnknown(
        getObjectValue(row.rawData, ["image", "imageUrl"]),
        "json-ld",
      ),
      ...imageCandidatesFromUnknown(
        getObjectValue(row.rawData, ["logo", "logoUrl"]),
        "detail-page",
      ),
      {
        contextText: row.sourceText ?? row.name ?? "",
        source: "calendar-card" as const,
        url: row.logoUrl ?? null,
      },
      {
        contextText: row.sourceText ?? row.name ?? "",
        source: "detail-page" as const,
        url: row.imageUrl ?? null,
      },
    ],
    fairName: name,
  });
  const imageUrl = imageSelection.imageUrl;
  const logoUrl = imageSelection.imageUrl;
  const officialWebsite = normalizeWebsite(
    getFirstString(row.officialWebsite, row.url, getObjectString(row.rawData, ["url", "website"])),
  );
  const detailUrl = normalizeIfmDetailUrl(
    getFirstString(
      row.detailUrl,
      getObjectString(row.rawData, ["detailUrl", "detailUrlAbsolute"]),
    ),
  );
  const parsedDateRange = resolveIfmDateRange(row);
  const startDate = parsedDateRange.startDate;
  const endDate = parsedDateRange.endDate;
  const year = startDate?.getFullYear() ?? new Date().getFullYear();
  const slug = toSlug(`${name} ${year}`);
  const sourceText = [
    row.sourceText,
    name,
    description,
    hall,
    organizer,
    officialWebsite,
    detailUrl,
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
    detailUrl,
    endDate,
    errors,
    externalId: getFirstString(row.externalId, getObjectString(row.rawData, ["id", "externalId", "slug"])),
    hall: hall || null,
    imageCandidates: imageSelection.candidates,
    imageRejectedReasons: imageSelection.rejectedReasons,
    imageSource: imageSelection.imageSource,
    imageStatus: imageSelection.imageStatus,
    imageUrl,
    logoUrl,
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

function resolveIfmDateRange(row: RawIfmRow) {
  const explicitStartDate = parseIfmDate(row.startDate);
  const explicitEndDate = parseIfmDate(row.endDate);

  if (isValidDateRange(explicitStartDate, explicitEndDate)) {
    return {
      endDate: explicitEndDate,
      startDate: explicitStartDate,
    };
  }

  const fallbackTexts = [
    getFirstString(row.dateText),
    getObjectString(row.rawData, ["dateText", "date", "calendarDateText"]),
    getFirstString(row.sourceText),
  ].filter(Boolean);

  for (const text of fallbackTexts) {
    const fallbackRange = parseDateRange(text);

    if (isValidDateRange(fallbackRange.startDate, fallbackRange.endDate)) {
      return fallbackRange;
    }
  }

  return {
    endDate: explicitEndDate ?? explicitStartDate,
    startDate: explicitStartDate,
  };
}

async function parseIfmRowsForImport({
  sourceText,
  sourceUrl,
}: {
  sourceText: string;
  sourceUrl: string | null;
}) {
  const parserErrors: string[] = [];
  const parserWarnings: string[] = [];
  const failedDetailUrls: string[] = [];
  const debug: IfmImportDebugInfo = {
    errors: parserErrors,
    failedDetailUrls,
    firstDetailUrls: [],
    parsedDetailPageCount: 0,
    parsedRecordCount: 0,
    renderedDetailLinkCount: 0,
    warnings: parserWarnings,
  };

  if (sourceUrl && !sourceText && isIfmDetailUrl(sourceUrl)) {
    const detailHtml = await fetchIfmText(sourceUrl);
    const detailRow = parseIfmDetailPage(detailHtml, sourceUrl, 1);

    debug.renderedDetailLinkCount = 1;
    debug.firstDetailUrls = [sourceUrl];
    debug.parsedDetailPageCount = detailRow ? 1 : 0;
    debug.parsedRecordCount = detailRow ? 1 : 0;

    return {
      debug,
      errors: detailRow ? parserErrors : ["ifm_auto_read_failed"],
      rows: detailRow ? [detailRow] : [],
    };
  }

  if (sourceUrl && sourceText && isIfmDetailUrl(sourceUrl)) {
    const detailRow = parseIfmDetailPage(sourceText, sourceUrl, 1);

    debug.renderedDetailLinkCount = 1;
    debug.firstDetailUrls = [sourceUrl];
    debug.parsedDetailPageCount = detailRow ? 1 : 0;
    debug.parsedRecordCount = detailRow ? 1 : 0;

    return {
      debug,
      errors: detailRow ? parserErrors : ["ifm_auto_read_failed"],
      rows: detailRow ? [detailRow] : parseIfmCalendar(sourceText),
    };
  }

  if (sourceUrl && !sourceText) {
    const renderedCalendar = await fetchIfmCalendarWithBrowser(sourceUrl);
    const detailUrls = renderedCalendar.detailUrls.slice(
      0,
      MAX_IFM_DETAIL_PAGES,
    );

    parserErrors.push(...renderedCalendar.errors);
    parserWarnings.push(...renderedCalendar.warnings);
    debug.renderedDetailLinkCount = renderedCalendar.detailUrls.length;
    debug.firstDetailUrls = detailUrls.slice(0, 5);

    const rows = await parseIfmDetailRows(detailUrls, {
      cardByUrl: renderedCalendar.cardByUrl,
      failedDetailUrls,
      parserErrors,
    });

    debug.parsedDetailPageCount = rows.length;
    debug.parsedRecordCount = rows.length;

    if (rows.length) {
      return {
        debug,
        errors: parserErrors,
        rows,
      };
    }
  }

  if (sourceUrl && sourceText) {
    const detailUrls = extractIfmDetailUrls(sourceText, sourceUrl).slice(
      0,
      MAX_IFM_DETAIL_PAGES,
    );

    debug.renderedDetailLinkCount = detailUrls.length;
    debug.firstDetailUrls = detailUrls.slice(0, 5);

    if (detailUrls.length) {
      const rows = await parseIfmDetailRows(detailUrls, {
        cardByUrl: new Map(),
        failedDetailUrls,
        parserErrors,
      });

      debug.parsedDetailPageCount = rows.length;
      debug.parsedRecordCount = rows.length;

      if (rows.length) {
        return {
          debug,
          errors: parserErrors,
          rows,
        };
      }
    }
  }

  const rows = parseIfmCalendar(sourceText);

  debug.parsedRecordCount = rows.length;
  debug.parsedDetailPageCount = rows.length;

  return {
    debug,
    errors: sourceUrl && !rows.length ? ["ifm_auto_read_failed"] : parserErrors,
    rows,
  };
}

async function parseIfmDetailRows(
  detailUrls: string[],
  {
    cardByUrl,
    failedDetailUrls,
    parserErrors,
  }: {
    cardByUrl: Map<string, BrowserCalendarCard>;
    failedDetailUrls: string[];
    parserErrors: string[];
  },
) {
  const rows: RawIfmRow[] = [];

  for (const detailUrl of detailUrls) {
    try {
      const detailHtml = await fetchIfmText(detailUrl);
      const detailRow = parseIfmDetailPage(
        detailHtml,
        detailUrl,
        rows.length + 1,
        cardByUrl.get(detailUrl),
      );

      if (detailRow) {
        rows.push(detailRow);
      } else {
        parserErrors.push(`${detailUrl}: detail_parse_failed`);
      }
    } catch (error) {
      failedDetailUrls.push(detailUrl);
      parserErrors.push(
        `${detailUrl}: ${
          error instanceof Error ? error.message : "detail_fetch_failed"
        }`,
      );
    }
  }

  return rows;
}

export async function fetchIfmCalendarWithBrowser(url: string) {
  if (!isIfmUrl(url)) {
    throw new Error("invalid_ifm_url");
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const browser = await launchIfmBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        height: 1200,
        width: 1440,
      },
    });
    await page.goto(url, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    await page
      .waitForLoadState("networkidle", {
        timeout: 15000,
      })
      .catch(() => {
        warnings.push("networkidle_timeout");
      });
    await page
      .waitForSelector(".fuar-card, #fuarListesiTable, a[href*='/tr/fuarlar/']", {
        timeout: 15000,
      })
      .catch(() => {
        warnings.push("calendar_selector_timeout_fallback");
      });
    await page.waitForTimeout(750);

    const extracted = await page.evaluate(() => {
      const toAbsoluteUrl = (value: string | null) => {
        if (!value) {
          return null;
        }

        try {
          return new URL(value, window.location.origin).toString();
        } catch {
          return null;
        }
      };
      const cleanText = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();
      const parseSrcset = (value: string | null) =>
        (value ?? "")
          .split(",")
          .map((item) => item.trim().split(/\s+/)[0])
          .filter(Boolean);
      const extractCssUrls = (value: string | null) =>
        Array.from((value ?? "").matchAll(/url\(["']?([^"')]+)["']?\)/gi))
          .map((match) => match[1])
          .filter(Boolean);
      const addCandidate = (
        candidates: Array<{
          alt: string | null;
          className: string | null;
          contextText: string | null;
          height: number | null;
          source: "calendar-card";
          url: string | null;
          width: number | null;
        }>,
        value: string | null,
        element: Element | null,
        contextText: string,
      ) => {
        const absoluteUrl = toAbsoluteUrl(value);

        if (!absoluteUrl) {
          return;
        }

        const image = element instanceof HTMLImageElement ? element : null;
        candidates.push({
          alt: element?.getAttribute("alt") ?? null,
          className: element?.getAttribute("class") ?? null,
          contextText,
          height:
            Number(element?.getAttribute("height")) ||
            image?.naturalHeight ||
            (element as HTMLElement | null)?.clientHeight ||
            null,
          source: "calendar-card",
          url: absoluteUrl,
          width:
            Number(element?.getAttribute("width")) ||
            image?.naturalWidth ||
            (element as HTMLElement | null)?.clientWidth ||
            null,
        });
      };
      const cards = Array.from(document.querySelectorAll(".fuar-card")).map(
        (card) => {
          const detailLink =
            card.querySelector<HTMLAnchorElement>("a.fair-detail") ??
            Array.from(card.querySelectorAll<HTMLAnchorElement>("a[href*='/tr/fuarlar/']")).at(0) ??
            null;
          const image = card.querySelector<HTMLImageElement>("img");
          const section = card.closest("section");
          const sectionYear = cleanText(section?.querySelector("time")?.textContent)
            .match(/\d{4}/)?.[0] ?? "";
          const name = cleanText(card.querySelector(".fair-area")?.textContent);
          const sourceText = cleanText(card.textContent);
          const days = Array.from(card.querySelectorAll(".date .day")).map((day) =>
            cleanText(day.textContent),
          );
          const month = cleanText(card.querySelector(".date .month")?.textContent);
          const dateText =
            days.length >= 2 && month && sectionYear
              ? `${days[0]} - ${days[1]} ${month} ${sectionYear}`
              : null;
          const imageCandidates: Array<{
            alt: string | null;
            className: string | null;
            contextText: string | null;
            height: number | null;
            source: "calendar-card";
            url: string | null;
            width: number | null;
          }> = [];

          for (const item of Array.from(card.querySelectorAll("img, source"))) {
            addCandidate(imageCandidates, (item as HTMLImageElement).currentSrc ?? null, item, name || sourceText);
            addCandidate(imageCandidates, item.getAttribute("src"), item, name || sourceText);
            addCandidate(imageCandidates, item.getAttribute("data-src"), item, name || sourceText);
            addCandidate(imageCandidates, item.getAttribute("data-lazy-src"), item, name || sourceText);
            addCandidate(imageCandidates, item.getAttribute("data-original"), item, name || sourceText);

            for (const srcsetUrl of parseSrcset(item.getAttribute("srcset"))) {
              addCandidate(imageCandidates, srcsetUrl, item, name || sourceText);
            }
          }

          for (const item of Array.from(card.querySelectorAll<HTMLElement>("*"))) {
            for (const backgroundUrl of extractCssUrls(getComputedStyle(item).backgroundImage)) {
              addCandidate(imageCandidates, backgroundUrl, item, name || sourceText);
            }
          }

          const imageUrl = imageCandidates[0]?.url ?? toAbsoluteUrl(image?.getAttribute("src") ?? null);

          return {
            dateText,
            detailUrl: toAbsoluteUrl(detailLink?.getAttribute("href") ?? null),
            imageCandidates,
            imageUrl,
            logoUrl: imageUrl,
            name,
            organizer: cleanText(card.querySelector(".label")?.textContent) || null,
            sourceText,
          };
        },
      );
      const detailUrls = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("a[href*='/tr/fuarlar/']"),
      )
        .map((link) => toAbsoluteUrl(link.getAttribute("href")))
        .filter((item): item is string => Boolean(item));

      return {
        cards,
        detailUrls,
        renderedText: cleanText(document.body?.innerText),
      };
    });
    const cardByUrl = new Map<string, BrowserCalendarCard>();

    for (const card of extracted.cards) {
      if (card.detailUrl && card.name) {
        cardByUrl.set(card.detailUrl, card);
      }
    }

    const detailUrls = Array.from(
      new Set([
        ...extracted.cards
          .map((card) => card.detailUrl)
          .filter((item): item is string => Boolean(item)),
        ...extracted.detailUrls,
      ]),
    ).filter(isIfmDetailUrl);

    if (!detailUrls.length && extracted.renderedText) {
      errors.push("no_detail_links_found");
    }

    return {
      cardByUrl,
      detailUrls,
      errors,
      warnings,
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
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
    const {
      debug,
      errors: parserErrors,
      rows: rawRows,
    } = await parseIfmRowsForImport({
      sourceText,
      sourceUrl,
    });
    const normalizedRows = rawRows.map(normalizeIfmFairRow);
    const result: IfmImportResult = {
      autoPublishedCount: 0,
      createdCount: 0,
      draftSavedCount: 0,
      dryRun,
      duplicateMatchedCount: 0,
      debug,
      errors: parserErrors,
      failedCount: 0,
      failedDetailPageCount: debug.failedDetailUrls.length,
      foundCount: normalizedRows.length,
      importJobId: importJob?.id,
      needsReviewCount: 0,
      parsedDetailPageCount: debug.parsedDetailPageCount,
      pastFairCount: 0,
      preview: [],
      readyToPublishCount: 0,
      skippedCount: 0,
      updatedCount: 0,
      warningCount: debug.warnings.length,
    };

    const officialImageCache = new Map<string, Promise<string | null>>();

    for (let row of normalizedRows) {
      const existingFair = row.errors.length ? null : await findExistingFair(row);
      row = await enrichIfmRowWithOfficialImage(
        row,
        existingFair?.imageUrl,
        officialImageCache,
      );
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
        const hasValidDateRange = isValidDateRange(row.startDate, row.endDate);
        const slug = await resolveImportSlug(
          row.slug,
          existingFair?.id,
          row.externalId ?? String(row.rowNumber),
        );
        const fair = existingFair
          ? await updateExistingFair(existingFair, row, {
              hasValidDateRange,
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
    hasValidDateRange,
    shouldPublish,
    slug,
  }: {
    hasValidDateRange: boolean;
    shouldPublish: boolean;
    slug: string;
  },
) {
  const isPublished = hasValidDateRange
    ? existingFair.isPublished || shouldPublish
    : false;
  const status = !hasValidDateRange
    ? "DRAFT"
    : existingFair.isPublished
    ? existingFair.status
    : shouldPublish
      ? "PUBLISHED"
      : "DRAFT";
  const imageUpdate = getExistingFairImageUpdate(
    existingFair.imageUrl,
    row,
  );

  return prisma.fair.update({
    data: {
      ...(isGenericVenue(existingFair.venue) ? { venue: row.venue } : {}),
      ...(existingFair.hall || !row.hall ? {} : { hall: row.hall }),
      ...(existingFair.officialWebsite ? {} : { officialWebsite: row.officialWebsite }),
      ...(imageUpdate.shouldUpdate ? { imageUrl: imageUpdate.imageUrl } : {}),
      ...(existingFair.organizer ? {} : { organizer: row.organizer }),
      ...(hasValidDateRange
        ? { endDate: row.endDate!, startDate: row.startDate! }
        : {}),
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
      imageUrl: row.imageUrl ?? row.logoUrl,
      lastChangedAt: new Date(),
      lastCheckedAt: new Date(),
      hall: row.hall,
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

async function enrichIfmRowWithOfficialImage(
  row: NormalizedIfmFairRow,
  existingImageUrl: string | null | undefined,
  cache: Map<string, Promise<string | null>>,
): Promise<NormalizedIfmFairRow> {
  if (!row.officialWebsite || row.imageUrl) {
    return row;
  }

  if (!cache.has(row.officialWebsite)) {
    cache.set(
      row.officialWebsite,
      discoverImportImage({
        currentImageUrl: row.imageUrl,
        existingImageUrl,
        officialWebsite: row.officialWebsite,
      }),
    );
  }

  const imageUrl = await cache.get(row.officialWebsite)!;

  if (!imageUrl || imageUrl === row.imageUrl || imageUrl === existingImageUrl) {
    return row;
  }

  return {
    ...row,
    imageSource: "official-og",
    imageStatus: "FOUND",
    imageUrl,
    logoUrl: imageUrl,
  };
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
  hall: true,
  id: true,
  imageUrl: true,
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
      detailUrl: row.detailUrl,
      imageCandidates: row.imageCandidates.slice(0, 12).map((candidate) => ({
        alt: candidate.alt ?? null,
        height: candidate.height ?? null,
        rejectedReason: candidate.rejectedReason,
        score: candidate.score,
        source: candidate.source,
        url: candidate.url,
        width: candidate.width ?? null,
      })),
      imageRejectedReasons: row.imageRejectedReasons,
      imageSource: row.imageSource,
      imageStatus: row.imageStatus,
      imageUrl: row.imageUrl,
      logoUrl: row.logoUrl,
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
    sourceUrl: row.detailUrl ?? sourceUrl,
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
    detailUrl: row.detailUrl,
    duplicateDecision: assessment.duplicateDecision,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    errors: row.errors,
    imageSource: row.imageSource,
    imageStatus: row.imageStatus,
    logoUrl: row.logoUrl ?? row.imageUrl,
    officialWebsite: row.officialWebsite,
    matchedCategoryFromName: row.matchedCategoryFromName,
    name: row.name,
    organizer: row.organizer,
    publishDecision: assessment.publishDecision,
    reviewReasons: assessment.reviewReasons,
    reviewStatus: assessment.reviewStatus,
    rowNumber: row.rowNumber,
    slug: row.slug,
    sourceUrl: row.detailUrl,
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

function parseIfmDetailPage(
  text: string,
  detailUrl: string | null,
  rowNumber: number,
  calendarCard?: BrowserCalendarCard,
): RawIfmRow | null {
  const fields = parseIfmDetailFields(text);
  const name = getIfmDetailName(text, detailUrl, calendarCard?.name);
  const startDate = getFieldValue(fields, [
    "baslangic-tarihi",
    "baslama-tarihi",
    "fuar-baslangic-tarihi",
    "baslangic",
    "start-date",
  ]);
  const endDate = getFieldValue(fields, [
    "bitis-tarihi",
    "fuar-bitis-tarihi",
    "bitis",
    "end-date",
  ]);
  const hall = getFieldValue(fields, ["fuar-salonu", "salon"]);
  const topic = getFieldValue(fields, [
    "fuarin-konusu",
    "fuar-konusu",
    "konu",
  ]);
  const organizer = getFieldValue(fields, ["organizator", "organizer"]);
  const officialWebsite = getFieldValue(fields, [
    "web",
    "website",
    "fuarin-web-sitesi",
    "fuar-web-sitesi",
  ]);
  const imageSelection = selectIfmImageCandidate({
    candidates: [
      ...(calendarCard?.imageCandidates ?? []),
      {
        contextText: calendarCard?.sourceText ?? calendarCard?.name ?? "",
        source: "calendar-card" as const,
        url: calendarCard?.logoUrl ?? null,
      },
      {
        contextText: calendarCard?.sourceText ?? calendarCard?.name ?? "",
        source: "calendar-card" as const,
        url: calendarCard?.imageUrl ?? null,
      },
      ...getIfmDetailImageCandidates(text, name),
    ],
    fairName: name,
  });
  const imageUrl = imageSelection.imageUrl;
  const logoUrl = imageSelection.imageUrl;

  if (!name && !startDate && !endDate && !organizer && !topic) {
    return null;
  }

  return {
    dateText: [startDate, endDate].filter(Boolean).join(" - ") || calendarCard?.dateText,
    description: topic || getMetaContent(text, "description"),
    detailUrl,
    endDate,
    externalId: getExternalIdFromUrl(detailUrl),
    hall,
    imageCandidates: imageSelection.candidates,
    imageUrl,
    logoUrl,
    name,
    officialWebsite,
    organizer: organizer || calendarCard?.organizer,
    rawData: {
      detailUrl,
      fields,
      imageCandidates: imageSelection.candidates.slice(0, 12),
      imageRejectedReasons: imageSelection.rejectedReasons,
      imageSource: imageSelection.imageSource,
      imageStatus: imageSelection.imageStatus,
      imageUrl,
      logoUrl,
      source: "ifm-detail-page",
    },
    rowNumber,
    sourceText: [calendarCard?.sourceText, cleanHtmlText(text).slice(0, 4000)]
      .filter(Boolean)
      .join(" "),
    startDate,
    url: officialWebsite,
  };
}

function parseIfmDetailFields(text: string) {
  const fields: Record<string, string> = {};
  const fieldMatches = Array.from(
    text.matchAll(/<div class=["']category-item["'][^>]*>([\s\S]*?)<\/div>/gi),
  );

  fieldMatches.forEach((match) => {
    const block = match[1];
    const label = cleanHtmlText(
      block.match(/<h6[^>]*class=["']category-title["'][^>]*>([\s\S]*?)<\/h6>/i)?.[1] ?? "",
    ).replace(/:$/, "");
    const valueHtml =
      block.match(/<p[^>]*class=["']category-desc["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const href = decodeHtmlEntities(
      valueHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "",
    );
    const value = href || cleanHtmlText(valueHtml);
    const key = toSlug(label);

    if (key && value) {
      fields[key] = value;
    }
  });

  return fields;
}

function getIfmDetailName(
  text: string,
  detailUrl: string | null,
  calendarName?: string | null,
) {
  const candidates = [
    cleanHtmlText(text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""),
    calendarName ?? "",
    getMetaContent(text, "og:title"),
    cleanHtmlText(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/\s*\|\s*İFM.*$/i, "")
      .replace(/\s*\|\s*IFM.*$/i, ""),
    titleFromDetailUrl(detailUrl),
  ];

  return (
    candidates.find((candidate) => {
      const normalizedCandidate = toSlug(candidate);

      return (
        candidate &&
        normalizedCandidate !== "ifm-fuar-takvimi" &&
        normalizedCandidate !== "fuar-takvimi" &&
        normalizedCandidate !== "ifm"
      );
    }) ?? ""
  );
}

function getMetaContent(text: string, metaName: string) {
  const metaTags = Array.from(text.matchAll(/<meta\b[^>]*>/gi)).map(
    (match) => match[0],
  );
  const targetSlug = toSlug(metaName);
  const tag = metaTags.find((item) => {
    const property = item.match(/\bproperty=["']([^"']+)["']/i)?.[1] ?? "";
    const name = item.match(/\bname=["']([^"']+)["']/i)?.[1] ?? "";

    return toSlug(property) === targetSlug || toSlug(name) === targetSlug;
  });

  if (!tag) {
    return "";
  }

  return cleanHtmlText(tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "");
}

function getIfmDetailImageCandidates(
  text: string,
  fairName: string,
): IfmImageCandidate[] {
  const candidates: IfmImageCandidate[] = [
    {
      contextText: fairName,
      source: "og-image",
      url: getMetaContent(text, "og:image"),
    },
    {
      contextText: fairName,
      source: "og-image",
      url: getMetaContent(text, "twitter:image"),
    },
    ...extractJsonLdImageCandidates(text, fairName),
  ];

  for (const match of text.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const attributes = getHtmlAttributes(tag);
    const contextText = cleanHtmlText(
      text.slice(Math.max(0, match.index - 500), match.index + 700),
    );

    for (const key of ["src", "currentSrc", "data-src", "data-lazy-src", "data-original"]) {
      candidates.push({
        alt: attributes.alt ?? null,
        className: attributes.class ?? null,
        contextText: contextText || fairName,
        height: parseOptionalNumber(attributes.height),
        source: "detail-page",
        url: attributes[key] ?? null,
        width: parseOptionalNumber(attributes.width),
      });
    }

    for (const srcsetUrl of parseSrcsetUrls(attributes.srcset ?? null)) {
      candidates.push({
        alt: attributes.alt ?? null,
        className: attributes.class ?? null,
        contextText: contextText || fairName,
        height: parseOptionalNumber(attributes.height),
        source: "detail-page",
        url: srcsetUrl,
        width: parseOptionalNumber(attributes.width),
      });
    }
  }

  return candidates;
}

function selectIfmImageCandidate({
  candidates,
  fairName,
}: {
  candidates: IfmImageCandidate[];
  fairName: string;
}): IfmImageSelection {
  const seenUrls = new Set<string>();
  const scoredCandidates = candidates
    .map((candidate) => scoreIfmImageCandidate(candidate, fairName))
    .filter((candidate): candidate is IfmScoredImageCandidate => Boolean(candidate))
    .filter((candidate) => {
      const key = candidate.url.split("?")[0].toLowerCase();

      if (seenUrls.has(key)) {
        return false;
      }

      seenUrls.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);
  const selectedCandidate =
    scoredCandidates.find((candidate) => !candidate.rejectedReason) ?? null;
  const rejectedReasons = Array.from(
    new Set(
      scoredCandidates
        .map((candidate) => candidate.rejectedReason)
        .filter((reason): reason is string => Boolean(reason)),
    ),
  );

  return {
    candidates: scoredCandidates.slice(0, 16),
    imageRejectedReasons: rejectedReasons,
    imageSource: selectedCandidate?.source ?? null,
    imageStatus: selectedCandidate
      ? "FOUND"
      : scoredCandidates.length
        ? "GENERIC_REJECTED"
        : "NOT_FOUND",
    imageUrl: selectedCandidate?.url ?? null,
    rejectedReasons,
    score: selectedCandidate?.score ?? 0,
  };
}

function scoreIfmImageCandidate(
  candidate: IfmImageCandidate,
  fairName: string,
): IfmScoredImageCandidate | null {
  const url = normalizeIfmAssetUrl(candidate.url);

  if (!url) {
    return null;
  }

  const scoredCandidate: IfmScoredImageCandidate = {
    ...candidate,
    rejectedReason: null,
    score: 0,
    url,
  };
  const rejectedReason = getGenericImageRejectReason(scoredCandidate, fairName);

  if (rejectedReason) {
    return {
      ...scoredCandidate,
      rejectedReason,
      score: -100,
    };
  }

  let score =
    candidate.source === "calendar-card"
      ? 120
      : candidate.source === "detail-page"
        ? 80
        : candidate.source === "json-ld"
          ? 60
          : 35;
  const normalizedUrl = toSlug(decodeURIComponent(url));
  const combinedText = toSlug(
    [
      url,
      candidate.alt,
      candidate.className,
      candidate.contextText,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const fairWords = getMeaningfulFairWords(fairName);

  if (/\/media\/fuar-logo/i.test(url)) {
    score += 120;
  } else if (/\/media\//i.test(url)) {
    score += 20;
  }

  if (/\/fuarlar?\//i.test(url) || /event|fair|fuar|logo/i.test(url)) {
    score += 20;
  }

  for (const word of fairWords) {
    if (normalizedUrl.includes(word)) {
      score += 18;
    }

    if (combinedText.includes(word)) {
      score += 8;
    }
  }

  if (
    (candidate.width && candidate.width >= 160) ||
    (candidate.height && candidate.height >= 160)
  ) {
    score += 8;
  }

  if (candidate.source === "og-image" && score < 60) {
    return {
      ...scoredCandidate,
      rejectedReason: "generic_og_image",
      score: -20,
    };
  }

  return {
    ...scoredCandidate,
    score,
  };
}

function getGenericImageRejectReason(
  candidate: IfmImageCandidate & { url: string },
  fairName: string,
) {
  const decodedUrl = decodeURIComponent(candidate.url).toLowerCase();
  const sluggedText = toSlug(
    [
      decodedUrl,
      candidate.alt,
      candidate.className,
      candidate.contextText,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const path = getUrlPath(candidate.url);
  const hasFairWordMatch = getMeaningfulFairWords(fairName).some((word) =>
    sluggedText.includes(word),
  );
  const genericPatterns = [
    "logo-ifm",
    "ifm-logo",
    "favicon",
    "placeholder",
    "default",
    "no-image",
    "empty",
    "icon",
    "sosyal",
    "social",
    "instagram",
    "facebook",
    "linkedin",
    "youtube",
    "whatsapp",
    "arrow",
    "date-area",
  ];

  if (
    path.includes("/assets/icons/") ||
    path.includes("/icons/") ||
    path.includes("/svg/") ||
    path.endsWith(".svg")
  ) {
    return "generic_icon";
  }

  if (path.includes("/ifm/img/") && !path.includes("/media/fuar-logo")) {
    return "site_asset";
  }

  if (genericPatterns.some((pattern) => sluggedText.includes(pattern))) {
    return "generic_asset";
  }

  if (sluggedText.includes("banner") && !hasFairWordMatch && !path.includes("/media/fuar-logo")) {
    return "generic_banner";
  }

  if (
    (typeof candidate.width === "number" && candidate.width > 0 && candidate.width < 80) ||
    (typeof candidate.height === "number" && candidate.height > 0 && candidate.height < 40)
  ) {
    return "too_small";
  }

  return null;
}

function getExistingFairImageUpdate(
  existingImageUrl: string | null,
  row: NormalizedIfmFairRow,
) {
  if (!existingImageUrl) {
    return {
      imageUrl: row.imageUrl,
      shouldUpdate: Boolean(row.imageUrl),
    };
  }

  const existingCandidate = scoreIfmImageCandidate(
    {
      contextText: row.name,
      source: "detail-page",
      url: existingImageUrl,
    },
    row.name,
  );

  if (existingCandidate?.rejectedReason) {
    return {
      imageUrl: row.imageUrl,
      shouldUpdate: true,
    };
  }

  if (!row.imageUrl) {
    return {
      imageUrl: null,
      shouldUpdate: false,
    };
  }

  const selectedCandidate = row.imageCandidates.find(
    (candidate) => candidate.url === row.imageUrl,
  );

  if (!selectedCandidate || !isIfmUrl(existingImageUrl)) {
    return {
      imageUrl: null,
      shouldUpdate: false,
    };
  }

  return {
    imageUrl: row.imageUrl,
    shouldUpdate: selectedCandidate.score > (existingCandidate?.score ?? 0) + 35,
  };
}

function imageCandidatesFromUnknown(
  value: unknown,
  source: IfmImageSource,
): IfmImageCandidate[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [
      {
        source,
        url: String(value),
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => imageCandidatesFromUnknown(item, source));
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const url = getFirstString(
      getObjectString(object, ["url"]),
      getObjectString(object, ["contentUrl"]),
      getObjectString(object, ["@id"]),
      getObjectString(object, ["src"]),
    );

    return [
      {
        alt: getObjectString(object, ["alt", "caption", "name"]),
        height: parseOptionalNumber(getObjectString(object, ["height"])),
        source,
        url,
        width: parseOptionalNumber(getObjectString(object, ["width"])),
      },
    ];
  }

  return [];
}

function extractJsonLdImageCandidates(
  text: string,
  fairName: string,
): IfmImageCandidate[] {
  const scripts = Array.from(
    text.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  return scripts.flatMap((match) => {
    try {
      const parsed = JSON.parse(stripHtml(match[1]));

      return findJsonLdImageValues(parsed).flatMap((value) =>
        imageCandidatesFromUnknown(value, "json-ld").map((candidate) => ({
          ...candidate,
          contextText: fairName,
        })),
      );
    } catch {
      return [];
    }
  });
}

function findJsonLdImageValues(value: unknown): unknown[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(findJsonLdImageValues);
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
    toSlug(key) === "image"
      ? [nestedValue]
      : findJsonLdImageValues(nestedValue),
  );
}

function parseSrcsetUrls(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractHtmlImageCandidates(
  html: string,
  source: IfmImageSource,
  contextText: string,
): IfmImageCandidate[] {
  return Array.from(html.matchAll(/<(?:img|source)\b[^>]*>/gi)).flatMap((match) => {
    const attributes = getHtmlAttributes(match[0]);
    const urls = [
      attributes.currentSrc,
      attributes.src,
      attributes["data-src"],
      attributes["data-lazy-src"],
      attributes["data-original"],
      ...parseSrcsetUrls(attributes.srcset ?? null),
    ].filter(Boolean);

    return urls.map((url) => ({
      alt: attributes.alt ?? null,
      className: attributes.class ?? null,
      contextText,
      height: parseOptionalNumber(attributes.height),
      source,
      url,
      width: parseOptionalNumber(attributes.width),
    }));
  });
}

function getHtmlAttributes(tag: string) {
  const attributes: Record<string, string> = {};

  for (const match of tag.matchAll(/([a-zA-Z0-9:-]+)=["']([^"']*)["']/g)) {
    attributes[match[1]] = decodeHtmlEntities(match[2]);
  }

  return attributes;
}

function parseOptionalNumber(value: string | number | null | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getMeaningfulFairWords(fairName: string) {
  const ignoredWords = new Set([
    "2026",
    "fuar",
    "fuari",
    "fuarı",
    "uluslararasi",
    "uluslararası",
    "istanbul",
    "turkiye",
    "türkiye",
    "expo",
    "show",
  ]);

  return toSlug(fairName)
    .split("-")
    .filter((word) => word.length >= 3 && !ignoredWords.has(word))
    .slice(0, 8);
}

function getUrlPath(value: string) {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function getFieldValue(fields: Record<string, string>, aliases: string[]) {
  const aliasSet = new Set(aliases.map(toSlug));
  const entry = Object.entries(fields).find(([key]) => aliasSet.has(toSlug(key)));

  return entry?.[1] ?? "";
}

function extractIfmDetailUrls(text: string, sourceUrl: string) {
  const urls = new Set<string>();

  if (isIfmDetailUrl(sourceUrl)) {
    urls.add(new URL(sourceUrl).toString());
  }

  for (const match of text.matchAll(/\bhref=["']([^"']*\/tr\/fuarlar\/[^"']+)["']/gi)) {
    const url = normalizeIfmDetailUrl(decodeHtmlEntities(match[1]));

    if (url && isIfmDetailUrl(url)) {
      urls.add(url);
    }
  }

  return Array.from(urls);
}

async function fetchIfmText(url: string) {
  if (!isIfmUrl(url)) {
    throw new Error("invalid_ifm_url");
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "Mozilla/5.0 (compatible; fuarbul-importer/1.0; +https://fuarbul.app)",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error("detail_fetch_failed");
  }

  return response.text();
}

async function launchIfmBrowser() {
  const [{ chromium: playwrightChromium }, chromiumPackage] = await Promise.all([
    import("playwright-core"),
    import("@sparticuz/chromium"),
  ]);
  const chromium = chromiumPackage.default;
  const packagedExecutablePath = await chromium.executablePath().catch(() => "");
  const executablePath =
    process.platform !== "win32" &&
    packagedExecutablePath &&
    isExecutableFile(packagedExecutablePath)
      ? packagedExecutablePath
      : getLocalBrowserPath();

  if (!executablePath) {
    throw new Error("chromium_executable_not_found");
  }

  return playwrightChromium.launch({
    args: [
      ...chromium.args,
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
    ],
    executablePath,
    headless: true,
  });
}

function getLocalBrowserPath() {
  const candidates =
    typeof process !== "undefined" && process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : [
          "/usr/bin/google-chrome-stable",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
        ];

  return candidates.find(isExecutableFile);
}

function isExecutableFile(path: string) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isIfmDetailUrl(value: string) {
  try {
    const url = new URL(value);

    return isIfmUrl(url.toString()) && url.pathname.startsWith("/tr/fuarlar/");
  } catch {
    return false;
  }
}

function isIfmUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      ["http:", "https:"].includes(url.protocol) &&
      (hostname === "ifm.com.tr" || hostname === "www.ifm.com.tr")
    );
  } catch {
    return false;
  }
}

function parseIfmHtmlRows(text: string): RawIfmRow[] {
  const listRows = parseIfmListRows(text);

  if (listRows.length) {
    return listRows;
  }

  return parseIfmCardRows(text);
}

function parseIfmListRows(text: string): RawIfmRow[] {
  const rowMatches = Array.from(
    text.matchAll(
      /<div class=["']row border-bottom mb-3["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    ),
  );
  const rows: RawIfmRow[] = [];

  rowMatches.forEach((match) => {
    const block = match[0];
    const linkMatch = block.match(
      /<h3>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<br>\s*<small>([\s\S]*?)<\/small>\s*<\/h3>/i,
    );

    if (!linkMatch) {
      return;
    }

    const [, href, nameHtml, dateTextHtml] = linkMatch;
    const name = cleanHtmlText(nameHtml);

    if (!name) {
      return;
    }

    const dateText = cleanHtmlText(dateTextHtml);
    const detailUrl = normalizeIfmDetailUrl(decodeHtmlEntities(href));
    const description = getParagraphs(block)[0] ?? "";
    const organizerMatch = block.match(/<p>\s*<i>([\s\S]*?)<\/i>\s*<\/p>/i);
    const organizer = organizerMatch ? cleanHtmlText(organizerMatch[1]) : null;

    rows.push({
      dateText,
      description,
      detailUrl,
      externalId: getExternalIdFromUrl(detailUrl),
      imageCandidates: [],
      imageUrl: null,
      logoUrl: null,
      name,
      organizer,
      rawData: {
        dateText,
        description,
        detailUrl,
        organizer,
        source: "ifm-list-row",
      },
      rowNumber: rows.length + 1,
      sourceText: cleanHtmlText(block),
    });
  });

  return rows;
}

function parseIfmCardRows(text: string): RawIfmRow[] {
  const sectionMatches = Array.from(
    text.matchAll(
      /<section class=["'][^"']*ifm-fuar[^"']*["'][^>]*>([\s\S]*?)(?=<section class=["']|<\/main>)/gi,
    ),
  );
  const rows: RawIfmRow[] = [];

  sectionMatches.forEach((sectionMatch) => {
    const section = sectionMatch[1];
    const sectionYear = cleanHtmlText(
      section.match(/<time[^>]*>\s*(\d{4})/i)?.[1] ?? "",
    );
    const cardMatches = Array.from(
      section.matchAll(
        /<div class=["']fuar-card["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi,
      ),
    );

    cardMatches.forEach((cardMatch) => {
      const card = cardMatch[0];
      const link = card.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
      const name = cleanHtmlText(
        card.match(/<h4 class=["']fair-area["'][^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? "",
      );
      const organizer = cleanHtmlText(
        card.match(/<h6 class=["']label["'][^>]*>([\s\S]*?)<\/h6>/i)?.[1] ?? "",
      );
      const days = Array.from(
        card.matchAll(/<span class=["']day["']>([\s\S]*?)<\/span>/gi),
      )
        .map((day) => cleanHtmlText(day[1]))
        .filter(Boolean);
      const month = cleanHtmlText(
        card.match(/<span class=["']month["']>([\s\S]*?)<\/span>/i)?.[1] ?? "",
      );
      const dateText =
        days.length >= 2 && month && sectionYear
          ? `${days[0]} - ${days[1]} ${month} ${sectionYear}`
          : null;
      const detailUrl = normalizeIfmDetailUrl(decodeHtmlEntities(link));
      const imageCandidates = extractHtmlImageCandidates(card, "calendar-card", name);
      const imageUrl = imageCandidates[0]?.url ?? null;

      if (!name) {
        return;
      }

      rows.push({
        dateText,
        detailUrl,
        externalId: getExternalIdFromUrl(detailUrl),
        imageCandidates,
        imageUrl,
        logoUrl: imageUrl,
        name,
        organizer: organizer || null,
        rawData: {
          dateText,
          detailUrl,
          imageCandidates,
          imageUrl,
          logoUrl: imageUrl,
          organizer,
          source: "ifm-card",
        },
        rowNumber: rows.length + 1,
        sourceText: cleanHtmlText(card),
      });
    });
  });

  return rows;
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
    detailUrl: getObjectString(rawData, ["detailUrl", "detailUrlAbsolute"]),
    endDate,
    externalId: getObjectString(rawData, ["id", "externalId", "slug"]),
    hall: getObjectString(rawData, ["hall", "salon"]),
    imageCandidates: [
      ...imageCandidatesFromUnknown(getObjectValue(rawData, ["image", "imageUrl"]), "json-ld"),
      ...imageCandidatesFromUnknown(getObjectValue(rawData, ["logo", "logoUrl"]), "detail-page"),
    ],
    imageUrl: getObjectString(rawData, ["imageUrl", "image"]),
    logoUrl: getObjectString(rawData, ["logoUrl", "logo"]),
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
        imageCandidates: [],
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
  const modernIsoRange = text.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s*[-–—]\s*(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (modernIsoRange) {
    const [
      ,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
    ] = modernIsoRange;

    return {
      endDate: dateFromParts(endYear, endMonth, endDay),
      startDate: dateFromParts(startYear, startMonth, startDay),
    };
  }

  const isoRange = text.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s*(?:-|–|—)\s*(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (isoRange) {
    const [
      ,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
    ] = isoRange;

    return {
      endDate: dateFromParts(endYear, endMonth, endDay),
      startDate: dateFromParts(startYear, startMonth, startDay),
    };
  }

  const modernNumericRange = text.match(
    /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*[-–—]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/,
  );

  if (modernNumericRange) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] =
      modernNumericRange;

    return {
      endDate: dateFromParts(endYear, endMonth, endDay),
      startDate: dateFromParts(startYear, startMonth, startDay),
    };
  }

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

  const singleNumericDate = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);

  if (singleNumericDate) {
    const [, day, month, year] = singleNumericDate;
    const date = dateFromParts(year, month, day);

    return {
      endDate: date,
      startDate: date,
    };
  }

  const crossMonthRange = text.match(
    /(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s*[-–—]\s*(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})/i,
  );

  if (crossMonthRange) {
    const [, startDay, startMonthName, endDay, endMonthName, year] =
      crossMonthRange;
    const startMonth = monthNumber(startMonthName);
    const endMonth = monthNumber(endMonthName);

    return {
      endDate: endMonth ? dateFromParts(year, String(endMonth), endDay) : null,
      startDate: startMonth
        ? dateFromParts(year, String(startMonth), startDay)
        : null,
    };
  }

  const modernSameMonthRange = text.match(
    /(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})/i,
  );

  if (modernSameMonthRange) {
    const [, startDay, endDay, monthName, year] = modernSameMonthRange;
    const month = monthNumber(monthName);

    return {
      endDate: month ? dateFromParts(year, String(month), endDay) : null,
      startDate: month ? dateFromParts(year, String(month), startDay) : null,
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

  const compactSameMonthRange = text.match(
    /(\d{1,2})\s+(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})/i,
  );

  if (compactSameMonthRange) {
    const [, startDay, endDay, monthName, year] = compactSameMonthRange;
    const month = monthNumber(monthName);

    return {
      endDate: month ? dateFromParts(year, String(month), endDay) : null,
      startDate: month ? dateFromParts(year, String(month), startDay) : null,
    };
  }

  const fullLongRange = text.match(
    /(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})\s*[-–—]\s*(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})/i,
  );

  if (fullLongRange) {
    const [, startDay, startMonthName, startYear, endDay, endMonthName, endYear] =
      fullLongRange;
    const startMonth = monthNumber(startMonthName);
    const endMonth = monthNumber(endMonthName);

    return {
      endDate: endMonth ? dateFromParts(endYear, String(endMonth), endDay) : null,
      startDate: startMonth
        ? dateFromParts(startYear, String(startMonth), startDay)
        : null,
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

  const modernSingleDate = text.match(
    /(\d{1,2})\s+([a-zA-ZçÇğĞıİöÖşŞüÜ]+)\s+(\d{4})/i,
  );

  if (modernSingleDate) {
    const [, day, monthName, year] = modernSingleDate;
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

  const explicitDate = parseDateRange(text).startDate;

  if (explicitDate) {
    return explicitDate;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}(?:T|\b)/.test(text)) {
    const parsedDate = new Date(text);

    if (!Number.isNaN(parsedDate.getTime())) {
      return startOfDay(parsedDate);
    }
  }

  return null;
}

function dateFromParts(year: string, month: string, day: string) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const date = new Date(numericYear, numericMonth - 1, numericDay);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== numericYear ||
    date.getMonth() !== numericMonth - 1 ||
    date.getDate() !== numericDay
  ) {
    return null;
  }

  return startOfDay(date);
}

function monthNumber(value: string) {
  const months: Record<string, number> = {
    ara: 12,
    agu: 8,
    aÄŸu: 8,
    eki: 10,
    eyl: 9,
    haz: 6,
    kas: 11,
    may: 5,
    nis: 4,
    oca: 1,
    ÅŸub: 2,
    tem: 7,
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

  const normalizedValue = value.toLocaleLowerCase("tr-TR");

  return months[normalizedValue] ?? months[toSlug(value)];
}

function isValidDateRange(startDate: Date | null, endDate: Date | null) {
  return Boolean(startDate && endDate && endDate >= startDate);
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

function cleanHtmlText(text: string) {
  return decodeHtmlEntities(stripHtml(text)).replace(/\s+/g, " ").trim();
}

function getParagraphs(block: string) {
  return Array.from(block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => match[1])
    .filter((paragraph) => !/<i[\s>]/i.test(paragraph))
    .map(cleanHtmlText)
    .filter(Boolean);
}

function normalizeIfmDetailUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).toString();
    }

    return new URL(value, "https://ifm.com.tr").toString();
  } catch {
    return null;
  }
}

function normalizeIfmAssetUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).toString();
    }

    return new URL(value, "https://ifm.com.tr").toString();
  } catch {
    return null;
  }
}

function getExternalIdFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

function titleFromDetailUrl(value: string | null) {
  const slug = getExternalIdFromUrl(value);

  if (!slug) {
    return "";
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function decodeHtmlEntities(text: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#(\d+);/g, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, value: string) => namedEntities[value] ?? match);
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
