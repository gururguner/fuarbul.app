import { FairsPageContent } from "@/components/fairs/FairsPageContent";
import {
  getActiveCategories,
  getAvailableFairCities,
  getFilteredFairs,
} from "@/lib/fair-queries";
import type { FairDateFilter, FairFilters } from "@/types/fair";

type FairsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFilterValues: FairDateFilter[] = [
  "all",
  "this-week",
  "this-month",
  "next-3-months",
  "upcoming",
];

export const dynamic = "force-dynamic";

export default async function FairsPage({ searchParams }: FairsPageProps) {
  const params = await searchParams;
  const filters = parseFairFilters(params);
  const [fairs, cities, categories] = await Promise.all([
    getFilteredFairs(filters),
    getAvailableFairCities(),
    getActiveCategories(),
  ]);

  return (
    <FairsPageContent
      categories={categories}
      cities={cities}
      fairs={fairs}
      filters={filters}
    />
  );
}

function parseFairFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FairFilters {
  const filters: FairFilters = {};
  const query = getParam(searchParams, "q");
  const city = getParam(searchParams, "city");
  const category = getParam(searchParams, "category");
  const date = getParam(searchParams, "date");
  const featured = getParam(searchParams, "featured");

  if (query) {
    filters.q = query;
  }

  if (city) {
    filters.city = city;
  }

  if (category) {
    filters.category = category;
  }

  if (date && isFairDateFilter(date)) {
    filters.date = date;
  }

  if (featured === "true") {
    filters.featured = true;
  }

  if (featured === "false") {
    filters.featured = false;
  }

  return filters;
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  const rawValue = Array.isArray(value) ? value[0] : value;

  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function isFairDateFilter(value: string): value is FairDateFilter {
  return dateFilterValues.includes(value as FairDateFilter);
}
