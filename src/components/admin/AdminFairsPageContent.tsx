"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  adminFairQuickFilterValues,
  fairStatusValues,
  type AdminFairQuickFilterValue,
  type AdminFairFilters,
  type FairStatusValue,
} from "@/lib/admin-fair-options";
import type { TranslationKey } from "@/lib/i18n";

type AdminFairListItem = {
  city: string;
  endDate: string;
  id: string;
  isFeatured: boolean;
  isIstanbulPriority: boolean;
  isPublished: boolean;
  name: string;
  organizer: string | null;
  slug: string;
  startDate: string;
  status: FairStatusValue;
  updatedAt: string;
  venue: string;
};

type AdminFairsPageContentProps = {
  fairs: AdminFairListItem[];
  filters: AdminFairFilters;
};

const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminFairsPageContent({
  fairs,
  filters,
}: AdminFairsPageContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [isPending, startTransition] = useTransition();

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

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const runAction = (fairId: string, action: string) => {
    startTransition(async () => {
      await fetch(`/api/admin/fairs/${fairId}`, {
        body: JSON.stringify({ action }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      router.refresh();
    });
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
        <Button href="/admin/fairs/new">{t("adminPage.addFair")}</Button>
      </div>

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
            href={getQuickFilterHref(pathname, quickFilter)}
            key={quickFilter}
            size="sm"
            variant={filters.quick === quickFilter ? "secondary" : "outline"}
          >
            {getQuickFilterLabel(quickFilter, t)}
          </Button>
        ))}
        {filters.quick ? (
          <Button href={pathname} size="sm" variant="ghost">
            {t("common.clearFilters")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {fairs.map((fair) => (
          <Card key={fair.id}>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>{fair.name}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{fair.slug}</p>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

function getQuickFilterHref(pathname: string, quick: AdminFairQuickFilterValue) {
  const params = new URLSearchParams();
  params.set("quick", quick);

  return `${pathname}?${params.toString()}`;
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
