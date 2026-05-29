"use client";

import { type FormEvent, useState } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { TranslationKey } from "@/lib/i18n";

type IfmImportResult = {
  autoPublishedCount: number;
  createdCount: number;
  draftSavedCount: number;
  dryRun: boolean;
  duplicateMatchedCount: number;
  debug?: {
    errors: string[];
    failedDetailUrls: string[];
    firstDetailUrls: string[];
    parsedDetailPageCount: number;
    parsedRecordCount: number;
    renderedDetailLinkCount: number;
    warnings: string[];
  };
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

type IfmImportPreviewRow = {
  confidenceScore: number;
  detailUrl: string | null;
  duplicateDecision: "MATCHED_EXISTING" | "NEW_RECORD" | "SKIPPED" | "UNCERTAIN";
  endDate: string | null;
  errors: string[];
  imageSource:
    | "calendar-card"
    | "detail-page"
    | "image-src"
    | "json-ld"
    | "official-og"
    | "og-image"
    | "twitter-image"
    | null;
  imageStatus: "FOUND" | "GENERIC_REJECTED" | "NOT_FOUND";
  logoUrl: string | null;
  officialWebsite: string | null;
  matchedCategoryFromName: boolean;
  name: string;
  organizer: string | null;
  publishDecision:
    | "AUTO_PUBLISH"
    | "DRAFT"
    | "DRAFT_WOULD_BE_READY"
    | "PAST_AUTO_PUBLISH"
    | "PAST_DRAFT_WOULD_BE_READY"
    | "SKIP";
  reviewReasons: string[];
  reviewStatus: "NEEDS_REVIEW" | "READY_TO_PUBLISH" | "SKIPPED";
  rowNumber: number;
  slug: string;
  sourceUrl: string | null;
  startDate: string | null;
  suggestedCategorySlugs: string[];
  venue: string;
};

const checkboxClasses =
  "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600";
const textareaClasses =
  "min-h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const loadingSteps = [
  "adminIfm.loadingBrowserOpen",
  "adminIfm.loadingCards",
  "adminIfm.loadingDetails",
] as const;

export function AdminIfmImportPageContent() {
  const { locale, t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IfmImportResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("dryRun", formData.get("dryRun") === "on" ? "true" : "false");
    formData.set(
      "autoPublishHighConfidence",
      formData.get("autoPublishHighConfidence") === "on" ? "true" : "false",
    );

    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/import/ifm", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        result?: IfmImportResult;
      };

      if (!response.ok || !data.result) {
        setError(getImportError(data.error, t));
        return;
      }

      setResult(data.result);
    } catch {
      setError(t("adminIfm.importFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="warning">{t("adminPage.badge")}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("adminIfm.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("adminIfm.description")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("adminIfm.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                disabled={isSubmitting}
                label={t("adminIfm.importFromUrl")}
                name="sourceUrl"
                placeholder="https://..."
                type="url"
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("adminIfm.manualPaste")}
                </span>
                <textarea
                  className={textareaClasses}
                  disabled={isSubmitting}
                  name="sourceText"
                  placeholder={t("adminIfm.manualPastePlaceholder")}
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <span>{t("adminIfm.dryRun")}</span>
                <input
                  className={checkboxClasses}
                  disabled={isSubmitting}
                  name="dryRun"
                  type="checkbox"
                />
              </label>

              <label className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
                  {t("adminIfm.autoPublishHighConfidence")}
                  <input
                    className={checkboxClasses}
                    disabled={isSubmitting}
                    name="autoPublishHighConfidence"
                    type="checkbox"
                  />
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {t("adminIfm.autoPublishHelp")}
                </span>
              </label>

              {isSubmitting ? (
                <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  {loadingSteps.map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                      <span>{t(step)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <Button disabled={isSubmitting} type="submit">
                {t("adminIfm.importButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminIfm.results")}</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <ResultItem label={t("adminIfm.foundCount")} value={result.foundCount} />
                  <ResultItem label={t("adminIfm.createdCount")} value={result.createdCount} />
                  <ResultItem label={t("adminIfm.updatedCount")} value={result.updatedCount} />
                  <ResultItem label={t("adminIfm.skippedCount")} value={result.skippedCount} />
                  <ResultItem label={t("adminIfm.failedCount")} value={result.failedCount} />
                  <ResultItem label={t("adminIfm.readyToPublishCount")} value={result.readyToPublishCount} />
                  <ResultItem label={t("adminIfm.pastFairCount")} value={result.pastFairCount} />
                  <ResultItem label={t("adminIfm.autoPublishedCount")} value={result.autoPublishedCount} />
                  <ResultItem label={t("adminIfm.duplicateMatchedCount")} value={result.duplicateMatchedCount} />
                  <ResultItem label={t("adminIfm.parsedDetailPageCount")} value={result.parsedDetailPageCount} />
                  <ResultItem label={t("adminIfm.failedDetailPageCount")} value={result.failedDetailPageCount} />
                  <ResultItem label={t("adminIfm.warningCount")} value={result.warningCount} />
                </div>
                {result.dryRun ? (
                  <Badge variant="accent">{t("adminIfm.dryRun")}</Badge>
                ) : null}
                {result.importJobId ? (
                  <p className="text-xs text-slate-500">
                    ImportJob: {result.importJobId}
                  </p>
                ) : null}
                {result.foundCount === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t("adminIfm.automaticReadFailed")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                {t("adminIfm.noResultsYet")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {process.env.NODE_ENV !== "production" && result?.debug ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>{t("adminIfm.debugTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <ResultItem
                label={t("adminIfm.renderedDetailLinkCount")}
                value={result.debug.renderedDetailLinkCount}
              />
              <ResultItem
                label={t("adminIfm.parsedRecordCount")}
                value={result.debug.parsedRecordCount}
              />
              <ResultItem
                label={t("adminIfm.parsedDetailPageCount")}
                value={result.debug.parsedDetailPageCount}
              />
            </div>
            {result.debug.firstDetailUrls.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {t("adminIfm.firstDetailUrls")}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {result.debug.firstDetailUrls.map((url) => (
                    <li key={url} className="break-all">
                      {url}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.debug.errors.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-red-500">
                  {t("adminIfm.errors")}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {result.debug.errors.slice(0, 10).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.debug.warnings.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-amber-600">
                  {t("adminIfm.warnings")}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  {result.debug.warnings.slice(0, 10).map((item) => (
                    <li key={item}>{formatIfmDiagnostic(item, t)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.debug.failedDetailUrls.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-red-500">
                  {t("adminIfm.failedDetailPageCount")}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {result.debug.failedDetailUrls.slice(0, 10).map((url) => (
                    <li key={url} className="break-all">
                      {url}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {result?.preview.length ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>{t("adminIfm.previewRows")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("adminIfm.logo")}</th>
                    <th className="px-3 py-2">{t("adminIfm.imageStatus")}</th>
                    <th className="px-3 py-2">{t("adminIfm.imageSource")}</th>
                    <th className="px-3 py-2">{t("common.name")}</th>
                    <th className="px-3 py-2">{t("common.date")}</th>
                    <th className="px-3 py-2">{t("common.venue")}</th>
                    <th className="px-3 py-2">{t("common.organizer")}</th>
                    <th className="px-3 py-2">{t("common.officialWebsite")}</th>
                    <th className="px-3 py-2">{t("adminIfm.sourceUrl")}</th>
                    <th className="px-3 py-2">{t("adminIfm.suggestedCategories")}</th>
                    <th className="px-3 py-2">{t("adminIfm.confidenceScore")}</th>
                    <th className="px-3 py-2">{t("adminIfm.reviewStatus")}</th>
                    <th className="px-3 py-2">{t("adminImport.reviewReason")}</th>
                    <th className="px-3 py-2">{t("adminIfm.publishDecision")}</th>
                    <th className="px-3 py-2">{t("adminIfm.duplicateDecision")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.preview.map((row) => (
                    <tr key={`${row.rowNumber}-${row.slug}`}>
                      <td className="px-3 py-3 text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-3">
                        {row.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-12 w-10 rounded border border-slate-200 object-cover"
                            src={row.logoUrl}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {getImageStatusLabel(row.imageStatus, t)}
                      </td>
                      <td className="px-3 py-3">
                        {getImageSourceLabel(row.imageSource, t)}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-950">
                        {row.name || "-"}
                      </td>
                      <td className="px-3 py-3">
                        {formatDate(row.startDate, locale)} -{" "}
                        {formatDate(row.endDate, locale)}
                      </td>
                      <td className="px-3 py-3">{row.venue}</td>
                      <td className="px-3 py-3">{row.organizer ?? "-"}</td>
                      <td className="px-3 py-3">
                        <PreviewLink
                          href={row.officialWebsite}
                          label={t("common.officialWebsite")}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <PreviewLink
                          href={row.sourceUrl ?? row.detailUrl}
                          label={t("adminIfm.sourceUrl")}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {row.suggestedCategorySlugs.length ? (
                          <>
                            {row.suggestedCategorySlugs.join(", ")}
                            {row.matchedCategoryFromName ? (
                              <span className="mt-1 block text-xs text-emerald-700">
                                {t("adminImport.matchedFromName")}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {row.confidenceScore}
                      </td>
                      <td className="px-3 py-3">
                        {getReviewStatusLabel(row.reviewStatus, t)}
                      </td>
                      <td className="px-3 py-3">
                        {row.reviewReasons.length
                          ? row.reviewReasons.map((reason) => getReviewReasonLabel(reason, t)).join(", ")
                          : "-"}
                      </td>
                      <td className="px-3 py-3">
                        {getPublishDecisionLabel(row.publishDecision, t)}
                      </td>
                      <td className="px-3 py-3">
                        {getDuplicateDecisionLabel(row.duplicateDecision, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result?.errors.length ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>{t("adminIfm.errors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-red-700">
              {result.errors.slice(0, 30).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </MainContainer>
  );
}

function ResultItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PreviewLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return "-";
  }

  return (
    <a
      className="text-emerald-700 underline-offset-4 hover:underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

function formatDate(value: string | null, locale: "en" | "tr") {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getReviewStatusLabel(
  status: IfmImportPreviewRow["reviewStatus"],
  t: (key: TranslationKey) => string,
) {
  const labels = {
    NEEDS_REVIEW: t("adminIfm.reviewNeedsReview"),
    READY_TO_PUBLISH: t("adminIfm.reviewReadyToPublish"),
    SKIPPED: t("adminIfm.reviewSkipped"),
  };

  return labels[status];
}

function getPublishDecisionLabel(
  decision: IfmImportPreviewRow["publishDecision"],
  t: (key: TranslationKey) => string,
) {
  const labels = {
    AUTO_PUBLISH: t("adminIfm.publishDecisionAutoPublish"),
    DRAFT: t("adminIfm.publishDecisionDraft"),
    DRAFT_WOULD_BE_READY: t("adminIfm.publishDecisionReadyDraft"),
    PAST_AUTO_PUBLISH: t("adminIfm.publishDecisionPastAutoPublish"),
    PAST_DRAFT_WOULD_BE_READY: t("adminIfm.publishDecisionPastReadyDraft"),
    SKIP: t("adminIfm.publishDecisionSkip"),
  };

  return labels[decision];
}

function getDuplicateDecisionLabel(
  decision: IfmImportPreviewRow["duplicateDecision"],
  t: (key: TranslationKey) => string,
) {
  const labels = {
    MATCHED_EXISTING: t("adminIfm.duplicateMatched"),
    NEW_RECORD: t("adminIfm.duplicateNew"),
    SKIPPED: t("adminIfm.duplicateSkipped"),
    UNCERTAIN: t("adminIfm.duplicateUncertain"),
  };

  return labels[decision];
}

function getImageStatusLabel(
  status: IfmImportPreviewRow["imageStatus"],
  t: (key: TranslationKey) => string,
) {
  const labels = {
    FOUND: t("adminIfm.imageFound"),
    GENERIC_REJECTED: t("adminIfm.imageGenericRejected"),
    NOT_FOUND: t("adminIfm.imageNotFound"),
  };

  return labels[status];
}

function getImageSourceLabel(
  source: IfmImportPreviewRow["imageSource"],
  t: (key: TranslationKey) => string,
) {
  if (!source) {
    return "-";
  }

  const labels = {
    "calendar-card": t("adminIfm.imageSourceCalendarCard"),
    "detail-page": t("adminIfm.imageSourceDetailPage"),
    "image-src": t("adminIfm.imageSourceImageSrc"),
    "json-ld": t("adminIfm.imageSourceJsonLd"),
    "official-og": t("adminIfm.imageSourceOfficialOg"),
    "og-image": t("adminIfm.imageSourceOgImage"),
    "twitter-image": t("adminIfm.imageSourceTwitterImage"),
  };

  return labels[source];
}

function getReviewReasonLabel(
  reason: string,
  t: (key: TranslationKey) => string,
) {
  const reasonMap: Record<string, TranslationKey> = {
    category_missing: "adminImport.reviewReasonCategoryMissing",
    city_missing: "adminImport.reviewReasonCityMissing",
    date_suspicious: "adminImport.reviewReasonDateSuspicious",
    duplicate_uncertain: "adminImport.reviewReasonDuplicateUncertain",
    invalid_date: "adminImport.reviewReasonInvalidDate",
    low_confidence: "adminImport.reviewReasonLowConfidence",
    name_missing: "adminImport.reviewReasonNameMissing",
    parse_errors: "adminImport.reviewReasonParseErrors",
    venue_missing: "adminImport.reviewReasonVenueMissing",
  };
  const key = reasonMap[reason];

  return key ? t(key) : reason;
}

function formatIfmDiagnostic(
  item: string,
  t: (key: TranslationKey) => string,
) {
  const diagnosticMap: Record<string, TranslationKey> = {
    calendar_selector_timeout_fallback: "adminIfm.calendarSelectorWarning",
    networkidle_timeout: "adminIfm.networkIdleWarning",
  };
  const key = diagnosticMap[item];

  return key ? t(key) : item;
}

function getImportError(
  errorCode: string | undefined,
  t: (key: TranslationKey) => string,
) {
  const errorMap: Record<string, TranslationKey> = {
    import_failed: "adminIfm.importFailed",
    invalid_url: "adminIfm.invalidUrl",
    missing_import_source: "adminIfm.missingImportSource",
    source_too_large: "adminIfm.sourceTooLarge",
    url_fetch_failed: "adminIfm.urlFetchFailed",
  };
  const key = errorCode ? errorMap[errorCode] : undefined;

  return key ? t(key) : t("adminIfm.importFailed");
}
