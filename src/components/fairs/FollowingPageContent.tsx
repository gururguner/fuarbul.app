"use client";

import { FairCard } from "@/components/fairs/FairCard";
import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Fair } from "@/types/fair";

type FollowingPageContentProps = {
  fairs: Fair[];
};

export function FollowingPageContent({ fairs }: FollowingPageContentProps) {
  const { fairCount, t } = useLanguage();

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {t("followingPage.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("followingPage.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("followingPage.description")}
        </p>
      </div>

      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-600">
          {t("common.result")}: {fairCount(fairs.length)}
        </p>
        {fairs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {fairs.map((fair) => (
              <FairCard fair={fair} isFollowing key={fair.slug} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5">
            <p className="font-medium text-slate-950">
              {t("followingPage.emptyTitle")}
            </p>
          </div>
        )}
      </div>
    </MainContainer>
  );
}
