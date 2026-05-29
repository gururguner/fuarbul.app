import { AdminFairsPageContent } from "@/components/admin/AdminFairsPageContent";
import {
  getAdminFairQuickFilterCounts,
  getAdminFairs,
} from "@/lib/admin-fair-queries";
import {
  adminFairPageSizeValues,
  adminFairQuickFilterValues,
  fairStatusValues,
  type AdminFairPageSizeValue,
  type AdminFairQuickFilterValue,
  type AdminFairFilters,
  type FairStatusValue,
} from "@/lib/admin-fair-options";

type AdminFairsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminFairsPage({
  searchParams,
}: AdminFairsPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const [{ fairs, pagination }, quickFilterCounts] = await Promise.all([
    getAdminFairs(filters),
    getAdminFairQuickFilterCounts(),
  ]);

  return (
    <AdminFairsPageContent
      fairs={fairs.map((fair) => ({
        city: fair.city,
        endDate: fair.endDate.toISOString(),
        id: fair.id,
        imageUrl: fair.imageUrl,
        isFeatured: fair.isFeatured,
        isIstanbulPriority: fair.isIstanbulPriority,
        isPastFair: fair.isPastFair,
        isPublished: fair.isPublished,
        name: fair.name,
        organizer: fair.organizer,
        reviewStatus: fair.reviewStatus,
        slug: fair.slug,
        sourceNames: fair.sources.map((source) => source.sourceName),
        startDate: fair.startDate.toISOString(),
        status: fair.status,
        updatedAt: fair.updatedAt.toISOString(),
        venue: fair.venue,
      }))}
      filters={filters}
      pagination={pagination}
      quickFilterCounts={quickFilterCounts}
    />
  );
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminFairFilters {
  const q = getParam(searchParams, "q");
  const page = getParam(searchParams, "page");
  const pageSize = getParam(searchParams, "pageSize");
  const quick = getParam(searchParams, "quick");
  const status = getParam(searchParams, "status");

  return {
    page: parsePage(page),
    pageSize: parsePageSize(pageSize),
    q,
    quick: isAdminQuickFilter(quick) ? quick : undefined,
    status: isFairStatusFilter(status) ? status : status === "ALL" ? "ALL" : undefined,
  };
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  const rawValue = Array.isArray(value) ? value[0] : value;

  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function isFairStatusFilter(value: string): value is FairStatusValue {
  return fairStatusValues.includes(value as FairStatusValue);
}

function isAdminQuickFilter(value: string): value is AdminFairQuickFilterValue {
  return adminFairQuickFilterValues.includes(value as AdminFairQuickFilterValue);
}

function parsePage(value: string) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string): AdminFairPageSizeValue {
  const pageSize = Number(value);

  return adminFairPageSizeValues.includes(pageSize as AdminFairPageSizeValue)
    ? (pageSize as AdminFairPageSizeValue)
    : 20;
}
