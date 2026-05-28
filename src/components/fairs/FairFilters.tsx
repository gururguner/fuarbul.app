"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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
  const [query, setQuery] = useState(filters.q ?? "");
  const [city, setCity] = useState(filters.city ? toSlug(filters.city) : "");
  const [category, setCategory] = useState(filters.category ?? "");
  const [date, setDate] = useState<string>(filters.date ?? "upcoming");
  const [featured, setFeatured] = useState<string>(
    typeof filters.featured === "boolean" ? String(filters.featured) : "",
  );

  useEffect(() => {
    setQuery(filters.q ?? "");
    setCity(filters.city ? toSlug(filters.city) : "");
    setCategory(filters.category ?? "");
    setDate(filters.date ?? "upcoming");
    setFeatured(
      typeof filters.featured === "boolean" ? String(filters.featured) : "",
    );
  }, [
    filters.category,
    filters.city,
    filters.date,
    filters.featured,
    filters.q,
  ]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (city) {
      params.set("city", city);
    }

    if (category) {
      params.set("category", category);
    }

    if (date && date !== "upcoming") {
      params.set("date", date);
    }

    if (featured === "true" || featured === "false") {
      params.set("featured", featured);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const clearFilters = () => {
    setQuery("");
    setCity("");
    setCategory("");
    setDate("upcoming");
    setFeatured("");
    router.push(pathname);
  };

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
        <Input
          label={t("common.search")}
          name="q"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("fairsPage.searchPlaceholder")}
          type="search"
          value={query}
        />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.city")}
          </span>
          <select
            className={selectClasses}
            name="city"
            onChange={(event) => setCity(event.target.value)}
            value={city}
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
            name="category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
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
            name="date"
            onChange={(event) => setDate(event.target.value)}
            value={date}
          >
            <option value="upcoming">{t("common.upcomingFairs")}</option>
            <option value="past">{t("common.pastFairs")}</option>
            <option value="all">{t("common.allFairs")}</option>
            <option value="this-week">{t("common.thisWeek")}</option>
            <option value="this-month">{t("common.thisMonth")}</option>
            <option value="next-3-months">{t("common.nextThreeMonths")}</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {t("common.featuredOnly")}
          </span>
          <select
            className={selectClasses}
            name="featured"
            onChange={(event) => setFeatured(event.target.value)}
            value={featured}
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
