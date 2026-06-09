"use client";

import { useState } from "react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import type { Fair, LocalizedFair } from "@/types/fair";

type FairVisualProps = {
  className?: string;
  fair: Fair;
  localizedFair: LocalizedFair;
  size?: "card" | "detail";
};

export function FairVisual({
  className,
  fair,
  localizedFair,
  size = "card",
}: FairVisualProps) {
  const { t, taxonomyLabel } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(fair.imageUrl && !imageFailed);
  const placeholderClassName = getPlaceholderClassName(fair);
  const primaryCategory = fair.categories?.[0] ?? null;
  const placeholderLabel = primaryCategory
    ? t("fairVisual.categoryFallback").replace(
        "{category}",
        taxonomyLabel(primaryCategory),
      )
    : t("fairVisual.defaultFallback");

  return (
    <div
      className={cn(
        "relative flex overflow-hidden border-slate-100 bg-slate-50",
        size === "card"
          ? "h-40 items-center justify-center rounded-t-lg border-b px-5 py-4 sm:h-44"
          : "min-h-44 items-center justify-center rounded-lg border px-6 py-6 shadow-sm sm:min-h-56",
        hasImage ? "bg-gradient-to-br from-slate-50 to-white" : placeholderClassName,
        className,
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={localizedFair.name}
          className={cn(
            "h-auto w-auto object-contain drop-shadow-sm",
            size === "card"
              ? "min-w-28 max-h-[86%] max-w-[90%]"
              : "min-w-36 max-h-44 max-w-[88%] sm:max-h-56",
          )}
          onError={() => setImageFailed(true)}
          src={fair.imageUrl ?? ""}
        />
      ) : (
        <div className="flex flex-col items-center text-center">
          <span className="h-8 w-16 rounded-full border border-white/60 bg-white/65 shadow-sm" />
          <span className="mt-3 max-w-48 text-sm font-semibold text-slate-800">
            {placeholderLabel}
          </span>
          <span className="mt-2 text-[11px] font-semibold tracking-wide text-slate-500">
            fuarbul
          </span>
        </div>
      )}
    </div>
  );
}

function getPlaceholderClassName(fair: Fair) {
  const slugs = fair.categories?.map((category) => category.slug) ?? [];
  const slugText = slugs.join(" ");

  if (/teknoloji|yazilim|yapay-zeka|software/.test(slugText)) {
    return "bg-[linear-gradient(135deg,#dbeafe_0%,#ecfeff_52%,#f8fafc_100%)]";
  }

  if (/otomotiv|motosiklet|elektrikli-arac/.test(slugText)) {
    return "bg-[linear-gradient(135deg,#e5e7eb_0%,#f8fafc_50%,#d1d5db_100%)]";
  }

  if (/gida|tarim/.test(slugText)) {
    return "bg-[linear-gradient(135deg,#ffedd5_0%,#fef9c3_52%,#f8fafc_100%)]";
  }

  if (/turizm|mobilite|spor-outdoor/.test(slugText)) {
    return "bg-[linear-gradient(135deg,#dcfce7_0%,#dbeafe_58%,#f8fafc_100%)]";
  }

  return "bg-[linear-gradient(135deg,#f1f5f9_0%,#f8fafc_55%,#e2e8f0_100%)]";
}
