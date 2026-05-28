import type { Locale } from "@/lib/i18n";

export const professionOptions = [
  {
    label: {
      tr: "İçerik üreticisi",
      en: "Content Creator",
    },
    value: "content_creator",
  },
  {
    label: {
      tr: "Öğrenci",
      en: "Student",
    },
    value: "student",
  },
  {
    label: {
      tr: "Yazılımcı / Geliştirici",
      en: "Software Developer",
    },
    value: "software_developer",
  },
  {
    label: {
      tr: "Tasarımcı",
      en: "Designer",
    },
    value: "designer",
  },
  {
    label: {
      tr: "Mühendis",
      en: "Engineer",
    },
    value: "engineer",
  },
  {
    label: {
      tr: "Girişimci",
      en: "Entrepreneur",
    },
    value: "entrepreneur",
  },
  {
    label: {
      tr: "Pazarlama / Reklam",
      en: "Marketing / Advertising",
    },
    value: "marketing_advertising",
  },
  {
    label: {
      tr: "Satış / İş Geliştirme",
      en: "Sales / Business Development",
    },
    value: "sales_business_development",
  },
  {
    label: {
      tr: "E-ticaret",
      en: "E-commerce",
    },
    value: "e_commerce",
  },
  {
    label: {
      tr: "Akademisyen / Eğitimci",
      en: "Academic / Educator",
    },
    value: "academic_educator",
  },
  {
    label: {
      tr: "Sağlık sektörü",
      en: "Healthcare",
    },
    value: "healthcare",
  },
  {
    label: {
      tr: "Otomotiv sektörü",
      en: "Automotive Industry",
    },
    value: "automotive_industry",
  },
  {
    label: {
      tr: "Oyun / E-spor",
      en: "Gaming / Esports",
    },
    value: "gaming_esports",
  },
  {
    label: {
      tr: "Medya / Basın",
      en: "Media / Press",
    },
    value: "media_press",
  },
  {
    label: {
      tr: "Kamu / Savunma",
      en: "Public Sector / Defense",
    },
    value: "public_sector_defense",
  },
  {
    label: {
      tr: "Turizm",
      en: "Tourism",
    },
    value: "tourism",
  },
  {
    label: {
      tr: "Gıda / Tarım",
      en: "Food / Agriculture",
    },
    value: "food_agriculture",
  },
  {
    label: {
      tr: "Finans",
      en: "Finance",
    },
    value: "finance",
  },
  {
    label: {
      tr: "Perakende",
      en: "Retail",
    },
    value: "retail",
  },
  {
    label: {
      tr: "Diğer",
      en: "Other",
    },
    value: "other",
  },
] as const;

export type ProfessionValue = (typeof professionOptions)[number]["value"];

export function getProfessionLabel(value: string, locale: Locale) {
  const profession = professionOptions.find((option) => option.value === value);

  return profession?.label[locale] ?? value;
}

export function isProfessionValue(value: string): value is ProfessionValue {
  return professionOptions.some((option) => option.value === value);
}
