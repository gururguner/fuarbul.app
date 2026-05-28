import { AdminFairsPageContent } from "@/components/admin/AdminFairsPageContent";
import { getAdminFairs } from "@/lib/admin-fair-queries";
import {
  adminFairQuickFilterValues,
  fairStatusValues,
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
  const fairs = await getAdminFairs(filters);

  return (
    <AdminFairsPageContent
      fairs={fairs.map((fair) => ({
        ...fair,
        endDate: fair.endDate.toISOString(),
        startDate: fair.startDate.toISOString(),
        updatedAt: fair.updatedAt.toISOString(),
      }))}
      filters={filters}
    />
  );
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminFairFilters {
  const q = getParam(searchParams, "q");
  const quick = getParam(searchParams, "quick");
  const status = getParam(searchParams, "status");

  return {
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
