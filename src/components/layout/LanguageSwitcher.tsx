"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import { locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      aria-label={t("language.label")}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="group"
    >
      {locales.map((item) => (
        <button
          aria-pressed={locale === item}
          className={cn(
            "h-8 min-w-9 rounded-md px-2 text-xs font-semibold transition-colors",
            locale === item
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900",
          )}
          key={item}
          onClick={() => setLocale(item as Locale)}
          type="button"
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
