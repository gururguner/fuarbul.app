"use client";

import { FairCard } from "@/components/fairs/FairCard";
import { FairFilters } from "@/components/fairs/FairFilters";
import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type {
  Fair,
  FairFilters as FairFilterValues,
  FairTaxonomy,
} from "@/types/fair";

type FairsPageContentProps = {
  categories: FairTaxonomy[];
  cities: string[];
  fairs: Fair[];
  filters: FairFilterValues;
};

export function FairsPageContent({
  categories,
  cities,
  fairs,
  filters,
}: FairsPageContentProps) {
  const { fairCount, t } = useLanguage();
  const hasActiveFilters = Boolean(
    filters.q ||
      filters.city ||
      filters.category ||
      (filters.date && filters.date !== "all") ||
      typeof filters.featured === "boolean",
  );

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {t("fairsPage.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("fairsPage.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("fairsPage.description")}
        </p>
      </div>

      <div className="space-y-6">
        <FairFilters
          categories={categories}
          cities={cities}
          filters={filters}
        />
        <p className="text-sm font-medium text-slate-600">
          {t("common.result")}: {fairCount(fairs.length)}
        </p>
        {fairs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {fairs.map((fair) => (
              <FairCard fair={fair} key={fair.slug} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5">
            <p className="font-medium text-slate-950">
              {hasActiveFilters
                ? t("fairsPage.noFilterResults")
                : t("fairsPage.emptyTitle")}
            </p>
            {!hasActiveFilters ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("fairsPage.emptyDescription")}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </MainContainer>
  );
}
