"use client";

import { type FormEvent, useState } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { TranslationKey } from "@/lib/i18n";

type TobbImportResult = {
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

type CategoryBackfillResult = {
  addedRelationCount: number;
  scannedCount: number;
  stillMissingCount: number;
  updatedCount: number;
};

type TobbImportPreviewRow = {
  city: string;
  confidenceScore: number;
  endDate: string | null;
  errors: string[];
  externalId: string | null;
  isPastFair: boolean;
  matchedCategoryFromName: boolean;
  name: string;
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
  startDate: string | null;
  suggestedCategorySlugs: string[];
  venue: string;
};

const checkboxClasses =
  "h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600";

export function AdminTobbImportPageContent() {
  const { locale, t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"dryRun" | "import" | null>(
    null,
  );
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] =
    useState<CategoryBackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState("");
  const [result, setResult] = useState<TobbImportResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const isDryRun = formData.get("dryRun") === "on";
    formData.set("dryRun", isDryRun ? "true" : "false");
    formData.set(
      "autoPublishHighConfidence",
      formData.get("autoPublishHighConfidence") === "on" ? "true" : "false",
    );
    setLoadingMode(isDryRun ? "dryRun" : "import");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/import/tobb", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        result?: TobbImportResult;
      };

      if (!response.ok || !data.result) {
        setError(getImportError(data.error, t));
        return;
      }

      setResult(data.result);
    } catch {
      setError(t("adminImport.tobbImportFailed"));
    } finally {
      setIsSubmitting(false);
      setLoadingMode(null);
    }
  };

  const handleBackfillCategories = async () => {
    if (isBackfilling) {
      return;
    }

    setBackfillError("");
    setBackfillResult(null);
    setIsBackfilling(true);

    try {
      const response = await fetch("/api/admin/fairs/backfill-categories", {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        result?: CategoryBackfillResult;
      };

      if (!response.ok || !data.result) {
        setBackfillError(t("adminImport.categoryBackfillFailed"));
        return;
      }

      setBackfillResult(data.result);
    } catch {
      setBackfillError(t("adminImport.categoryBackfillFailed"));
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="warning">{t("adminPage.badge")}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("adminImport.tobbTitle")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("adminImport.tobbDescription")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("adminImport.tobbTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("adminImport.uploadExcel")}
                </span>
                <input
                  accept=".xlsx,.xls"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                  disabled={isSubmitting}
                  name="file"
                  type="file"
                />
              </label>

              <Input
                label={t("adminImport.importFromUrl")}
                name="sourceUrl"
                placeholder="https://..."
                disabled={isSubmitting}
                type="url"
              />

              <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <span>{t("adminImport.dryRun")}</span>
                <input
                  className={checkboxClasses}
                  disabled={isSubmitting}
                  name="dryRun"
                  type="checkbox"
                />
              </label>

              <label className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
                  {t("adminImport.autoPublishHighConfidence")}
                  <input
                    className={checkboxClasses}
                    disabled={isSubmitting}
                    name="autoPublishHighConfidence"
                    type="checkbox"
                  />
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {t("adminImport.autoPublishHelp")}
                </span>
              </label>

              {loadingMode ? <ImportLoadingPanel mode={loadingMode} /> : null}

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                {t("adminImport.saveAsDraft")}
              </p>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <Button disabled={isSubmitting} type="submit">
                {t("adminImport.importButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminImport.results")}</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <ResultItem label={t("adminImport.foundCount")} value={result.foundCount} />
                  <ResultItem label={t("adminImport.createdCount")} value={result.createdCount} />
                  <ResultItem label={t("adminImport.updatedCount")} value={result.updatedCount} />
                  <ResultItem label={t("adminImport.skippedCount")} value={result.skippedCount} />
                  <ResultItem label={t("adminImport.failedCount")} value={result.failedCount} />
                  <ResultItem label={t("adminImport.readyToPublishCount")} value={result.readyToPublishCount} />
                  <ResultItem label={t("adminImport.needsReviewCount")} value={result.needsReviewCount} />
                  <ResultItem label={t("adminImport.pastFairCount")} value={result.pastFairCount} />
                  <ResultItem label={t("adminImport.autoPublishedCount")} value={result.autoPublishedCount} />
                  <ResultItem label={t("adminImport.draftSavedCount")} value={result.draftSavedCount} />
                </div>
                {result.dryRun ? (
                  <Badge variant="accent">{t("adminImport.dryRun")}</Badge>
                ) : null}
                {result.importJobId ? (
                  <p className="text-xs text-slate-500">
                    ImportJob: {result.importJobId}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                {t("adminImport.noResultsYet")}
              </p>
            )}

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">
                {t("adminImport.categoryBackfillTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t("adminImport.categoryBackfillDescription")}
              </p>
              <Button
                className="mt-3"
                disabled={isBackfilling}
                onClick={handleBackfillCategories}
                size="sm"
                type="button"
                variant="outline"
              >
                {isBackfilling
                  ? t("adminImport.categoryBackfillRunning")
                  : t("adminImport.suggestMissingCategories")}
              </Button>
              {backfillError ? (
                <p className="mt-3 text-sm text-red-700">{backfillError}</p>
              ) : null}
              {backfillResult ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <ResultItem
                    label={t("adminImport.scannedCount")}
                    value={backfillResult.scannedCount}
                  />
                  <ResultItem
                    label={t("adminImport.updatedCount")}
                    value={backfillResult.updatedCount}
                  />
                  <ResultItem
                    label={t("adminImport.addedRelationCount")}
                    value={backfillResult.addedRelationCount}
                  />
                  <ResultItem
                    label={t("adminImport.stillMissingCount")}
                    value={backfillResult.stillMissingCount}
                  />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <div className="mt-5 grid gap-5">
          {result.preview.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("adminImport.previewRows")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">{t("common.name")}</th>
                        <th className="px-3 py-2">{t("common.city")}</th>
                        <th className="px-3 py-2">{t("common.venue")}</th>
                        <th className="px-3 py-2">{t("common.date")}</th>
                        <th className="px-3 py-2">{t("adminImport.suggestedCategories")}</th>
                        <th className="px-3 py-2">{t("adminImport.confidenceScore")}</th>
                        <th className="px-3 py-2">{t("adminImport.reviewStatus")}</th>
                        <th className="px-3 py-2">{t("adminImport.reviewReason")}</th>
                        <th className="px-3 py-2">{t("adminImport.publishDecision")}</th>
                        <th className="px-3 py-2">{t("adminImport.errors")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.preview.map((row) => (
                        <tr key={`${row.rowNumber}-${row.slug}`}>
                          <td className="px-3 py-3 text-slate-500">{row.rowNumber}</td>
                          <td className="px-3 py-3 font-medium text-slate-950">
                            {row.name || "-"}
                          </td>
                          <td className="px-3 py-3">{row.city || "-"}</td>
                          <td className="px-3 py-3">{row.venue || "-"}</td>
                          <td className="px-3 py-3">
                            {formatDate(row.startDate, locale)} -{" "}
                            {formatDate(row.endDate, locale)}
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
                            {getReviewStatusLabel(row, t)}
                          </td>
                          <td className="px-3 py-3">
                            {formatReviewReasons(row.reviewReasons, t)}
                          </td>
                          <td className="px-3 py-3">
                            {getPublishDecisionLabel(row.publishDecision, t)}
                          </td>
                          <td className="px-3 py-3 text-red-700">
                            {row.errors.length ? row.errors.join(", ") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {result.errors.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("adminImport.errors")}</CardTitle>
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
        </div>
      ) : null}
    </MainContainer>
  );
}

function ImportLoadingPanel({ mode }: { mode: "dryRun" | "import" }) {
  const { t } = useLanguage();
  const steps =
    mode === "dryRun"
      ? [
          t("adminImport.loadingDryRunRead"),
          t("adminImport.loadingDryRunAnalyze"),
          t("adminImport.loadingDryRunPreview"),
        ]
      : [
          t("adminImport.loadingImportDownload"),
          t("adminImport.loadingImportRead"),
          t("adminImport.loadingImportCheck"),
          t("adminImport.loadingImportCompare"),
          t("adminImport.loadingImportSave"),
          t("adminImport.loadingImportResults"),
        ];

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700"
        />
        <p className="text-sm font-semibold text-emerald-950">{steps[0]}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
      </div>
      <ol className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <li
            className="flex items-center gap-2 text-sm leading-6 text-emerald-900"
            key={step}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                index === 0 ? "animate-pulse bg-emerald-700" : "bg-emerald-300"
              }`}
            />
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-5 text-emerald-800">
        {t("adminImport.loadingNote")}
      </p>
    </div>
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

function getImportError(
  errorCode: string | undefined,
  t: (key: TranslationKey) => string,
) {
  const errorMap: Record<string, TranslationKey> = {
    file_too_large: "adminImport.fileTooLarge",
    import_failed: "adminImport.tobbImportFailed",
    invalid_file_type: "adminImport.invalidFileType",
    invalid_url: "adminImport.invalidUrl",
    missing_import_source: "adminImport.missingImportSource",
    no_sheet_found: "adminImport.noSheetFound",
    tobb_header_not_found: "adminImport.headerNotFound",
    url_fetch_failed: "adminImport.urlFetchFailed",
  };
  const key = errorCode ? errorMap[errorCode] : undefined;

  return key ? t(key) : t("adminImport.tobbImportFailed");
}

function getReviewStatusLabel(
  row: TobbImportPreviewRow,
  t: (key: TranslationKey) => string,
) {
  if (row.reviewStatus === "READY_TO_PUBLISH" && row.isPastFair) {
    return t("adminImport.reviewPastReadyToPublish");
  }

  const labels = {
    NEEDS_REVIEW: t("adminImport.reviewNeedsReview"),
    READY_TO_PUBLISH: t("adminImport.reviewReadyToPublish"),
    SKIPPED: t("adminImport.reviewSkipped"),
  };

  return labels[row.reviewStatus];
}

function getPublishDecisionLabel(
  decision: TobbImportPreviewRow["publishDecision"],
  t: (key: TranslationKey) => string,
) {
  const labels = {
    AUTO_PUBLISH: t("adminImport.publishDecisionAutoPublish"),
    DRAFT: t("adminImport.publishDecisionDraft"),
    DRAFT_WOULD_BE_READY: t("adminImport.publishDecisionReadyDraft"),
    PAST_AUTO_PUBLISH: t("adminImport.publishDecisionPastAutoPublish"),
    PAST_DRAFT_WOULD_BE_READY: t("adminImport.publishDecisionPastReadyDraft"),
    SKIP: t("adminImport.publishDecisionSkip"),
  };

  return labels[decision];
}

function formatReviewReasons(
  reasons: string[],
  t: (key: TranslationKey) => string,
) {
  if (!reasons.length) {
    return "-";
  }

  return reasons.map((reason) => getReviewReasonLabel(reason, t)).join(", ");
}

function getReviewReasonLabel(
  reason: string,
  t: (key: TranslationKey) => string,
) {
  const labels: Record<string, TranslationKey> = {
    category_missing: "adminImport.reviewReasonCategoryMissing",
    city_missing: "adminImport.reviewReasonCityMissing",
    date_suspicious: "adminImport.reviewReasonDateSuspicious",
    duplicate_uncertain: "adminImport.reviewReasonDuplicateUncertain",
    invalid_date: "adminImport.reviewReasonInvalidDate",
    low_confidence: "adminImport.reviewReasonLowConfidence",
    name_missing: "adminImport.reviewReasonNameMissing",
    parse_errors: "adminImport.reviewReasonParseErrors",
    past_date: "adminImport.reviewReasonPastDate",
    venue_missing: "adminImport.reviewReasonVenueMissing",
  };
  const key = labels[reason];

  return key ? t(key) : reason;
}
