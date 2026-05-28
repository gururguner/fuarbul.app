export const fairStatusValues = [
  "DRAFT",
  "PUBLISHED",
  "UPDATED",
  "POSTPONED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export const sourceNameValues = ["TOBB", "IFM", "TUYAP", "MANUAL", "OTHER"] as const;

export const adminFairQuickFilterValues = [
  "upcoming",
  "past",
  "published",
  "drafts",
  "needs-review",
  "tobb",
  "istanbul-priority",
] as const;

export type FairStatusValue = (typeof fairStatusValues)[number];
export type SourceNameValue = (typeof sourceNameValues)[number];
export type AdminFairQuickFilterValue =
  (typeof adminFairQuickFilterValues)[number];

export type AdminFairFilters = {
  q?: string;
  quick?: AdminFairQuickFilterValue;
  status?: FairStatusValue | "ALL";
};
