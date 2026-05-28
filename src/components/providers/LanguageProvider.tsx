"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  defaultLocale,
  formatFairCount,
  getCategoryLabel,
  isLocale,
  type Locale,
  translate,
  type TranslationKey,
} from "@/lib/i18n";
import { getLocalizedFair, getTaxonomyLabel } from "@/lib/fairs";
import type { Fair, FairCategory, FairTaxonomy, LocalizedFair } from "@/types/fair";

const STORAGE_KEY = "fuarapp-language";

type LanguageContextValue = {
  categoryLabel: (category: FairCategory) => string;
  fairCount: (count: number) => string;
  localizedFair: (fair: Fair) => LocalizedFair;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  taxonomyLabel: (taxonomy: FairTaxonomy) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);

    if (!storedLocale || !isLocale(storedLocale)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLocaleState(storedLocale);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      categoryLabel: (category) => getCategoryLabel(category, locale),
      fairCount: (count) => formatFairCount(count, locale),
      localizedFair: (fair) => getLocalizedFair(fair, locale),
      locale,
      setLocale,
      t: (key) => translate(key, locale),
      taxonomyLabel: (taxonomy) => getTaxonomyLabel(taxonomy, locale),
    }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
