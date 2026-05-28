export type FairCategory =
  | "Technology"
  | "Gaming"
  | "Automotive"
  | "Motorcycle"
  | "Artificial Intelligence"
  | "Electric Vehicles";

export type FairLocale = "tr" | "en";

export type FairDateFilter =
  | "all"
  | "past"
  | "this-week"
  | "this-month"
  | "next-3-months"
  | "upcoming";

export type FairFilters = {
  category?: string;
  city?: string;
  date?: FairDateFilter;
  featured?: boolean;
  q?: string;
};

export type LocalizedFairFields = {
  name: string;
  summary: string;
  description: string;
  dateRange: string;
  city: string;
  venue: string;
  organizer: string;
};

export type FairTaxonomy = {
  slug: string;
  nameTr: string;
  nameEn: string;
};

export type Fair = {
  id: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  category: FairCategory;
  categories?: FairTaxonomy[];
  subcategories?: FairTaxonomy[];
  translations: Record<FairLocale, LocalizedFairFields>;
  website: string;
  isFeatured?: boolean;
  isPast: boolean;
};

export type LocalizedFair = Omit<Fair, "translations"> & LocalizedFairFields;
