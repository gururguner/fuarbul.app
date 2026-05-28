export const fairStatusValues = [
  "DRAFT",
  "PUBLISHED",
  "UPDATED",
  "POSTPONED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export const sourceNameValues = ["TOBB", "IFM", "TUYAP", "MANUAL", "OTHER"] as const;

export type FairStatusValue = (typeof fairStatusValues)[number];
export type SourceNameValue = (typeof sourceNameValues)[number];

export type AdminFairFilters = {
  q?: string;
  status?: FairStatusValue | "ALL";
};
