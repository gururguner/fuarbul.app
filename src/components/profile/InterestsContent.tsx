"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { FairTaxonomy } from "@/types/fair";

type InterestCategory = FairTaxonomy & {
  id: string;
};

type InterestsContentProps = {
  categories: InterestCategory[];
  selectedCategoryIds: string[];
};

export function InterestsContent({
  categories,
  selectedCategoryIds,
}: InterestsContentProps) {
  const router = useRouter();
  const { t, taxonomyLabel } = useLanguage();
  const [selectedIds, setSelectedIds] = useState(() =>
    new Set(selectedCategoryIds),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | null>(
    null,
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
    setMessage("");
    setMessageType(null);
  };

  const saveInterests = async () => {
    const categoryIds = Array.from(selectedIds);

    if (!categoryIds.length) {
      setMessage(t("interestsPage.emptyValidation"));
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/interests", {
        body: JSON.stringify({ categoryIds }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (response.status === 401) {
        router.push("/login?next=/ilgi-alanlarim");
        return;
      }

      if (!response.ok) {
        setMessage(t("auth.genericError"));
        setMessageType("error");
        return;
      }

      setMessage(t("interestsPage.success"));
      setMessageType("success");
      router.refresh();
    } catch {
      setMessage(t("auth.genericError"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {t("nav.interests")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("interestsPage.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("interestsPage.description")}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isSelected = selectedIds.has(category.id);

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                )}
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                type="button"
              >
                {taxonomyLabel(category)}
              </button>
            );
          })}
        </div>

        {message ? (
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm",
              messageType === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isSubmitting} onClick={saveInterests} type="button">
            {t("interestsPage.save")}
          </Button>
        </div>
      </div>
    </MainContainer>
  );
}
