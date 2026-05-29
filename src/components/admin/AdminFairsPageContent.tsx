"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  adminFairQuickFilterValues,
  adminFairPageSizeValues,
  fairStatusValues,
  type AdminFairQuickFilterValue,
  type AdminFairFilters,
  type FairStatusValue,
} from "@/lib/admin-fair-options";
import type {
  AdminFairPagination,
  AdminFairQuickFilterCounts,
  AdminFairReviewReason,
  AdminFairReviewStatus,
} from "@/lib/admin-fair-queries";
import type { TranslationKey } from "@/lib/i18n";

type AdminFairListItem = {
  city: string;
  endDate: string;
  id: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isIstanbulPriority: boolean;
  isPastFair: boolean;
  isPublished: boolean;
  name: string;
  organizer: string | null;
  reviewStatus: AdminFairReviewStatus;
  slug: string;
  sourceNames: string[];
  startDate: string;
  status: FairStatusValue;
  updatedAt: string;
  venue: string;
};

type AdminFairsPageContentProps = {
  fairs: AdminFairListItem[];
  filters: AdminFairFilters;
  pagination: AdminFairPagination;
  quickFilterCounts: AdminFairQuickFilterCounts;
};

type CategoryBackfillResult = {
  addedRelationCount: number;
  scannedCount: number;
  stillMissingCount: number;
  updatedCount: number;
};

type ImageUpdateResult = {
  failedCount: number;
  scannedCount: number;
  skippedCount: number;
  updatedCount: number;
};

type BulkAction =
  | "archive"
  | "draft"
  | "markFeatured"
  | "markIstanbulPriority"
  | "publish"
  | "removeFeatured"
  | "removeIstanbulPriority";

const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminFairsPageContent({
  fairs,
  filters,
  pagination,
  quickFilterCounts,
}: AdminFairsPageContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] =
    useState<CategoryBackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState("");
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  const [imageUpdateResult, setImageUpdateResult] =
    useState<ImageUpdateResult | null>(null);
  const [imageUpdateError, setImageUpdateError] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<AdminFairListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const queryString = searchParams.toString();
  const currentPageIds = fairs.map((fair) => fair.id);
  const isCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((fairId) => selectedIds.has(fairId));
  const selectedCount = selectedIds.size;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [queryString]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const q = getFormValue(formData, "q");
    const status = getFormValue(formData, "status");

    if (q) {
      params.set("q", q);
    }

    if (status && status !== "ALL") {
      params.set("status", status);
    }

    if (filters.quick) {
      params.set("quick", filters.quick);
    }

    if (filters.pageSize !== 20) {
      params.set("pageSize", String(filters.pageSize));
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const runAction = (fairId: string, action: string) => {
    startTransition(async () => {
      setActionError("");
      setActionMessage("");

      const response = await fetch(`/api/admin/fairs/${fairId}`, {
        body: JSON.stringify({ action }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        setActionError(t("adminPage.actionFailed"));
      }

      router.refresh();
    });
  };

  const deleteFair = async () => {
    if (!deleteCandidate || isDeleting) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/fairs/${deleteCandidate.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setActionError(t("adminPage.deleteFailed"));
        return;
      }

      setActionMessage(t("adminPage.deleteSuccess"));
      setDeleteCandidate(null);
      router.refresh();
    } catch {
      setActionError(t("adminPage.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFairSelection = (fairId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(fairId)) {
        next.delete(fairId);
      } else {
        next.add(fairId);
      }

      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (isCurrentPageSelected) {
        currentPageIds.forEach((fairId) => next.delete(fairId));
      } else {
        currentPageIds.forEach((fairId) => next.add(fairId));
      }

      return next;
    });
  };

  const runBulkAction = async (action: BulkAction) => {
    if (!selectedIds.size || isBulkUpdating) {
      return;
    }

    if (
      (action === "archive" || action === "draft") &&
      !window.confirm(t("adminPage.bulkConfirm"))
    ) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsBulkUpdating(true);

    try {
      const response = await fetch("/api/admin/fairs/bulk", {
        body: JSON.stringify({
          action,
          fairIds: Array.from(selectedIds),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as {
        count?: number;
        error?: string;
      };

      if (!response.ok || typeof data.count !== "number") {
        setActionError(t("adminPage.bulkUpdateFailed"));
        return;
      }

      setActionMessage(formatCountMessage(t("adminPage.bulkUpdateSuccess"), data.count));
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setActionError(t("adminPage.bulkUpdateFailed"));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handlePageSizeChange = (pageSize: string) => {
    router.push(
      getAdminFairsHref(pathname, filters, {
        page: 1,
        pageSize: Number(pageSize),
      }),
    );
  };

  const runCategoryBackfill = async () => {
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
        setBackfillError(t("adminPage.categoryBackfillFailed"));
        return;
      }

      setBackfillResult(data.result);
      router.refresh();
    } catch {
      setBackfillError(t("adminPage.categoryBackfillFailed"));
    } finally {
      setIsBackfilling(false);
    }
  };

  const runImageUpdate = async () => {
    if (isUpdatingImages) {
      return;
    }

    setImageUpdateError("");
    setImageUpdateResult(null);
    setIsUpdatingImages(true);

    try {
      const response = await fetch("/api/admin/fairs/update-images", {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        result?: ImageUpdateResult;
      };

      if (!response.ok || !data.result) {
        setImageUpdateError(t("adminPage.imageUpdateFailed"));
        return;
      }

      setImageUpdateResult(data.result);
      router.refresh();
    } catch {
      setImageUpdateError(t("adminPage.imageUpdateFailed"));
    } finally {
      setIsUpdatingImages(false);
    }
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {t("adminPage.title")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {t("adminPage.fairManagement")}
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={isBackfilling}
            onClick={runCategoryBackfill}
            type="button"
            variant="outline"
          >
            {isBackfilling
              ? t("adminPage.categoryBackfillRunning")
              : t("adminPage.suggestMissingCategories")}
          </Button>
          <Button
            disabled={isUpdatingImages}
            onClick={runImageUpdate}
            type="button"
            variant="outline"
          >
            {isUpdatingImages
              ? t("adminPage.imageUpdateRunning")
              : t("adminPage.updateImages")}
          </Button>
          <Button href="/admin/fairs/new">{t("adminPage.addFair")}</Button>
        </div>
      </div>

      {backfillResult || backfillError || imageUpdateResult || imageUpdateError ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          {backfillResult ? (
            <p className="font-medium text-emerald-800">
              {formatBackfillResult(backfillResult, t)}
            </p>
          ) : null}
          {backfillError ? (
            <p className="font-medium text-red-700">{backfillError}</p>
          ) : null}
          {imageUpdateResult ? (
            <p className="font-medium text-emerald-800">
              {formatImageUpdateResult(imageUpdateResult, t)}
            </p>
          ) : null}
          {imageUpdateError ? (
            <p className="font-medium text-red-700">{imageUpdateError}</p>
          ) : null}
        </div>
      ) : null}

      {actionMessage || actionError ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          {actionMessage ? (
            <p className="font-medium text-emerald-800">{actionMessage}</p>
          ) : null}
          {actionError ? (
            <p className="font-medium text-red-700">{actionError}</p>
          ) : null}
        </div>
      ) : null}

      <form
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <Input
            defaultValue={filters.q ?? ""}
            label={t("common.search")}
            name="q"
            placeholder={t("adminPage.searchPlaceholder")}
            type="search"
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              {t("adminPage.status")}
            </span>
            <select
              className={selectClasses}
              defaultValue={filters.status ?? "ALL"}
              name="status"
            >
              <option value="ALL">{t("adminPage.allStatuses")}</option>
              {fairStatusValues.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status, t)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">{t("common.filter")}</Button>
        </div>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {adminFairQuickFilterValues.map((quickFilter) => (
          <Button
            className="gap-1"
            href={getQuickFilterHref(pathname, filters, quickFilter)}
            key={quickFilter}
            size="sm"
            variant={filters.quick === quickFilter ? "secondary" : "outline"}
          >
            <span>{getQuickFilterLabel(quickFilter, t)}</span>
            <span className="text-xs opacity-80">
              ({quickFilterCounts[quickFilter]})
            </span>
          </Button>
        ))}
        {filters.quick ? (
          <Button href={pathname} size="sm" variant="ghost">
            {t("common.clearFilters")}
          </Button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            checked={isCurrentPageSelected}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
            disabled={!currentPageIds.length}
            onChange={toggleCurrentPageSelection}
            type="checkbox"
          />
          {t("adminPage.selectPage")}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {t("adminPage.perPage")}
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => handlePageSizeChange(event.target.value)}
              value={filters.pageSize}
            >
              {adminFairPageSizeValues.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm font-medium text-slate-500">
            {formatPageIndicator(
              t("adminPage.pageIndicator"),
              pagination.page,
              pagination.totalPages,
            )}
          </p>
        </div>
      </div>

      {selectedCount ? (
        <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-emerald-950">
            {formatCountMessage(t("adminPage.selectedFairs"), selectedCount)}
          </div>
          <div className="flex flex-wrap gap-2">
            {getBulkActions(t).map((action) => (
              <Button
                disabled={isBulkUpdating}
                key={action.value}
                onClick={() => runBulkAction(action.value)}
                size="sm"
                type="button"
                variant="outline"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {fairs.map((fair) => (
          <Card key={fair.id}>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <input
                    checked={selectedIds.has(fair.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    onChange={() => toggleFairSelection(fair.id)}
                    type="checkbox"
                  />
                  {fair.imageUrl ? (
                    <div className="hidden h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={fair.name}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.parentElement?.classList.add("hidden");
                        }}
                        src={fair.imageUrl}
                      />
                    </div>
                  ) : null}
                  <div>
                    <CardTitle>{fair.name}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{fair.slug}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={fair.isPublished ? "accent" : "muted"}>
                    {fair.isPublished
                      ? t("adminPage.published")
                      : t("adminPage.notPublished")}
                  </Badge>
                  <Badge variant="muted">
                    {getStatusLabel(fair.status, t)}
                  </Badge>
                  {fair.isFeatured ? (
                    <Badge variant="warning">{t("common.featured")}</Badge>
                  ) : null}
                  {fair.isPastFair ? (
                    <Badge variant="muted">{t("common.pastFair")}</Badge>
                  ) : null}
                  {fair.reviewStatus.status === "NEEDS_REVIEW" ? (
                    <Badge variant="warning">{t("adminPage.needsReview")}</Badge>
                  ) : null}
                  {fair.reviewStatus.status === "MISSING_INFO" ? (
                    <Badge variant="muted">{t("adminPage.missingInfo")}</Badge>
                  ) : null}
                  {fair.isIstanbulPriority ? (
                    <Badge variant="accent">
                      {t("adminPage.istanbulPriority")}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                <AdminFairMeta label={t("common.city")} value={fair.city} />
                <AdminFairMeta label={t("common.venue")} value={fair.venue} />
                <AdminFairMeta
                  label={t("common.organizer")}
                  value={fair.organizer ?? "-"}
                />
                <AdminFairMeta
                  label={t("common.date")}
                  value={`${formatDate(fair.startDate, locale)} - ${formatDate(
                    fair.endDate,
                    locale,
                  )}`}
                />
                <AdminFairMeta
                  label={t("adminPage.updatedAt")}
                  value={formatDate(fair.updatedAt, locale)}
                />
              </dl>

              {fair.reviewStatus.status === "NEEDS_REVIEW" &&
              fair.reviewStatus.reasons.length ? (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-medium text-amber-800">
                    {t("adminPage.reviewReasons")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fair.reviewStatus.reasons.map((reason) => (
                      <Badge key={reason} variant="warning">
                        {getReviewReasonLabel(reason, t)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {getDraftReasons(fair, t).length ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium text-slate-600">
                    {t("adminPage.draftReasonLabel")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getDraftReasons(fair, t).map((reason) => (
                      <Badge key={reason} variant="muted">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={`/admin/fairs/${fair.id}/edit`} size="sm">
                  {t("adminPage.edit")}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => runAction(fair.id, "publish")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("adminPage.publish")}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => runAction(fair.id, "draft")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("adminPage.moveToDraft")}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => runAction(fair.id, "toggleFeatured")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {fair.isFeatured
                    ? t("adminPage.removeFeatured")
                    : t("adminPage.markFeatured")}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => runAction(fair.id, "toggleIstanbulPriority")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {fair.isIstanbulPriority
                    ? t("adminPage.removeIstanbulPriority")
                    : t("adminPage.istanbulPriority")}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => runAction(fair.id, "archive")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("adminPage.archive")}
                </Button>
                <Button
                  className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                  disabled={isPending}
                  onClick={() => setDeleteCandidate(fair)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("adminPage.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationControls
        filters={filters}
        pagination={pagination}
        pathname={pathname}
        t={t}
      />

      {deleteCandidate ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-950">
              {t("adminPage.delete")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("adminPage.deleteConfirm")}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {deleteCandidate.name}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isDeleting}
                onClick={() => setDeleteCandidate(null)}
                type="button"
                variant="outline"
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
                disabled={isDeleting}
                onClick={deleteFair}
                type="button"
              >
                {isDeleting
                  ? t("adminPage.delete")
                  : t("adminPage.deletePermanently")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </MainContainer>
  );
}

function AdminFairMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function formatDate(value: string, locale: "en" | "tr") {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getStatusLabel(
  status: FairStatusValue,
  t: (key: TranslationKey) => string,
) {
  const labels = {
    ARCHIVED: t("adminPage.statusARCHIVED"),
    CANCELLED: t("adminPage.statusCANCELLED"),
    DRAFT: t("adminPage.statusDRAFT"),
    POSTPONED: t("adminPage.statusPOSTPONED"),
    PUBLISHED: t("adminPage.statusPUBLISHED"),
    UPDATED: t("adminPage.statusUPDATED"),
  };

  return labels[status];
}

function PaginationControls({
  filters,
  pagination,
  pathname,
  t,
}: {
  filters: AdminFairFilters;
  pagination: AdminFairPagination;
  pathname: string;
  t: (key: TranslationKey) => string;
}) {
  const hasPrevious = pagination.page > 1;
  const hasNext = pagination.page < pagination.totalPages;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        {formatPageIndicator(
          t("adminPage.pageIndicator"),
          pagination.page,
          pagination.totalPages,
        )}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Button
            href={getAdminFairsHref(pathname, filters, {
              page: pagination.page - 1,
            })}
            size="sm"
            variant="outline"
          >
            {t("adminPage.previousPage")}
          </Button>
        ) : (
          <Button disabled size="sm" type="button" variant="outline">
            {t("adminPage.previousPage")}
          </Button>
        )}
        {hasNext ? (
          <Button
            href={getAdminFairsHref(pathname, filters, {
              page: pagination.page + 1,
            })}
            size="sm"
            variant="outline"
          >
            {t("adminPage.nextPage")}
          </Button>
        ) : (
          <Button disabled size="sm" type="button" variant="outline">
            {t("adminPage.nextPage")}
          </Button>
        )}
      </div>
    </div>
  );
}

function getQuickFilterHref(
  pathname: string,
  filters: AdminFairFilters,
  quick: AdminFairQuickFilterValue,
) {
  return getAdminFairsHref(pathname, filters, {
    page: 1,
    quick,
  });
}

function getQuickFilterLabel(
  quick: AdminFairQuickFilterValue,
  t: (key: TranslationKey) => string,
) {
  const labels = {
    drafts: t("adminPage.quickDrafts"),
    "istanbul-priority": t("adminPage.quickIstanbulPriority"),
    "needs-review": t("adminPage.quickNeedsReview"),
    past: t("adminPage.quickPast"),
    published: t("adminPage.quickPublished"),
    tobb: t("adminPage.quickTobb"),
    upcoming: t("adminPage.quickUpcoming"),
  };

  return labels[quick];
}

function getBulkActions(t: (key: TranslationKey) => string) {
  return [
    {
      label: t("adminPage.publish"),
      value: "publish",
    },
    {
      label: t("adminPage.moveToDraft"),
      value: "draft",
    },
    {
      label: t("adminPage.archive"),
      value: "archive",
    },
    {
      label: t("adminPage.bulkMarkIstanbulPriority"),
      value: "markIstanbulPriority",
    },
    {
      label: t("adminPage.bulkRemoveIstanbulPriority"),
      value: "removeIstanbulPriority",
    },
    {
      label: t("adminPage.markFeatured"),
      value: "markFeatured",
    },
    {
      label: t("adminPage.removeFeatured"),
      value: "removeFeatured",
    },
  ] satisfies Array<{
    label: string;
    value: BulkAction;
  }>;
}

function getReviewReasonLabel(
  reason: AdminFairReviewReason,
  t: (key: TranslationKey) => string,
) {
  const labels: Record<AdminFairReviewReason, TranslationKey> = {
    duplicate_uncertain: "adminPage.reviewReasonDuplicateUncertain",
    import_error: "adminPage.reviewReasonImportError",
    invalid_date: "adminPage.reviewReasonInvalidDate",
    missing_category: "adminPage.reviewReasonMissingCategory",
    missing_city: "adminPage.reviewReasonMissingCity",
    missing_name: "adminPage.reviewReasonMissingName",
    missing_official_website: "adminPage.reviewReasonMissingWebsite",
    missing_organizer: "adminPage.reviewReasonMissingOrganizer",
    missing_venue: "adminPage.reviewReasonMissingVenue",
  };

  return t(labels[reason]);
}

function getDraftReasons(
  fair: AdminFairListItem,
  t: (key: TranslationKey) => string,
) {
  if (fair.isPublished && fair.status !== "DRAFT") {
    return [];
  }

  const reasonKeys = new Set<TranslationKey>();

  if (fair.reviewStatus.reasons.includes("missing_category")) {
    reasonKeys.add("adminPage.draftReasonMissingCategory");
  }

  if (fair.reviewStatus.status === "NEEDS_REVIEW") {
    reasonKeys.add("adminPage.draftReasonNeedsReview");
  }

  if (fair.isPastFair && !fair.isPublished) {
    reasonKeys.add("adminPage.draftReasonPastWaiting");
  }

  if (fair.sourceNames.includes("TOBB") && !fair.isPublished) {
    reasonKeys.add("adminPage.draftReasonImportDraft");
  }

  if (!fair.isPublished) {
    reasonKeys.add("adminPage.draftReasonNotPublished");
  }

  return Array.from(reasonKeys).map((key) => t(key));
}

function formatBackfillResult(
  result: CategoryBackfillResult,
  t: (key: TranslationKey) => string,
) {
  return t("adminPage.categoryBackfillResult")
    .replace("{addedRelationCount}", String(result.addedRelationCount))
    .replace("{scannedCount}", String(result.scannedCount))
    .replace("{updatedCount}", String(result.updatedCount))
    .replace("{stillMissingCount}", String(result.stillMissingCount));
}

function formatImageUpdateResult(
  result: ImageUpdateResult,
  t: (key: TranslationKey) => string,
) {
  return t("adminPage.imageUpdateResult")
    .replace("{scannedCount}", String(result.scannedCount))
    .replace("{updatedCount}", String(result.updatedCount));
}

function getAdminFairsHref(
  pathname: string,
  filters: AdminFairFilters,
  overrides: Partial<{
    page: number;
    pageSize: number;
    quick: AdminFairQuickFilterValue;
  }> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.status && next.status !== "ALL") {
    params.set("status", next.status);
  }

  if (next.quick) {
    params.set("quick", next.quick);
  }

  if (next.page && next.page > 1) {
    params.set("page", String(next.page));
  }

  if (next.pageSize && next.pageSize !== 20) {
    params.set("pageSize", String(next.pageSize));
  }

  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

function formatCountMessage(template: string, count: number) {
  return template.replace("{count}", String(count));
}

function formatPageIndicator(
  template: string,
  page: number,
  totalPages: number,
) {
  return template
    .replace("{page}", String(page))
    .replace("{totalPages}", String(totalPages));
}
