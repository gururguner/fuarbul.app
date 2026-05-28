"use client";

import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toSlug } from "@/lib/slug";
import type { FairFilters as FairFilterValues, FairTaxonomy } from "@/types/fair";

type FairFiltersProps = {
  categories: FairTaxonomy[];
  cities: string[];
  filters: FairFilterValues;
};

const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function FairFilters({ categories, cities, filters }: FairFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, taxonomyLabel } = useLanguage();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const query = getFormValue(formData, "q");
    const city = getFormValue(formData, "city");
    const category = getFormValue(formData, "category");
    const date = getFormValue(formData, "date");
    const featured = getFormValue(formData, "featured");

    if (query) {
      params.set("q", query);
    }

    if (city) {
      params.set("city", city);
    }

    if (category) {
      params.set("category", category);
    }

    if (date && date !== "all") {
      params.set("date", date);
    }

    if (featured === "true" || featured === "false") {
      params.set("featured", featured);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
        <Input
          defaultValue={filters.q ?? ""}
          label={t("common.search")}
          name="q"
          placeholder={t("fairsPage.searchPlaceholder")}
          type="search"
        />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.city")}
          </span>
          <select
            className={selectClasses}
            defaultValue={filters.city ? toSlug(filters.city) : ""}
            name="city"
          >
            <option value="">{t("common.allCities")}</option>
            {cities.map((city) => (
              <option key={city} value={toSlug(city)}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.category")}
          </span>
          <select
            className={selectClasses}
            defaultValue={filters.category ?? ""}
            name="category"
          >
            <option value="">{t("common.allCategories")}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {taxonomyLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.date")}
          </span>
          <select
            className={selectClasses}
            defaultValue={filters.date ?? "all"}
            name="date"
          >
            <option value="all">{t("common.allDates")}</option>
            <option value="this-week">{t("common.thisWeek")}</option>
            <option value="this-month">{t("common.thisMonth")}</option>
            <option value="next-3-months">{t("common.nextThreeMonths")}</option>
            <option value="upcoming">{t("common.upcomingFairs")}</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.featuredOnly")}
          </span>
          <select
            className={selectClasses}
            defaultValue={
              typeof filters.featured === "boolean"
                ? String(filters.featured)
                : ""
            }
            name="featured"
          >
            <option value="">{t("common.allFairs")}</option>
            <option value="true">{t("common.featuredOnly")}</option>
            <option value="false">{t("common.notFeatured")}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit">{t("common.filter")}</Button>
        <Button onClick={clearFilters} type="button" variant="outline">
          {t("common.clearFilters")}
        </Button>
      </div>
    </form>
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
