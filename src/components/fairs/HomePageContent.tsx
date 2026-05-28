"use client";

import { useSession } from "next-auth/react";

import { FairCard } from "@/components/fairs/FairCard";
import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { popularCategories } from "@/lib/fairs";
import type { Fair } from "@/types/fair";

type HomePageContentProps = {
  featuredFairs: Fair[];
  hasSelectedInterests: boolean;
  recommendedFairs: Fair[];
  upcomingFairs: Fair[];
};

export function HomePageContent({
  featuredFairs,
  hasSelectedInterests,
  recommendedFairs,
  upcomingFairs,
}: HomePageContentProps) {
  const { status } = useSession();
  const { categoryLabel, fairCount, localizedFair, t } = useLanguage();
  const isAuthenticated = status === "authenticated";
  const secondaryCta =
    isAuthenticated
      ? { href: "/following", label: t("common.viewFollowing") }
      : status === "unauthenticated"
        ? { href: "/login", label: t("common.loginToFollow") }
        : null;
  const sectionFairs = featuredFairs.length ? featuredFairs : upcomingFairs;

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <MainContainer className="grid gap-10 py-14 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div className="space-y-6">
            <Badge variant="accent">{t("home.heroBadge")}</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                fuarbul
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {t("home.valueProposition")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/fairs" size="lg">
                {t("common.discoverFairs")}
              </Button>
              {secondaryCta ? (
                <Button href={secondaryCta.href} size="lg" variant="outline">
                  {secondaryCta.label}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    {t("home.upcomingEvents")}
                  </p>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {t("home.thisMonth")}
                  </h2>
                </div>
                <Badge variant="warning">{fairCount(upcomingFairs.length)}</Badge>
              </div>
              {upcomingFairs.length ? (
                <div className="space-y-3">
                  {upcomingFairs.map((fair) => {
                    const displayFair = localizedFair(fair);

                    return (
                      <div
                        className="rounded-lg border border-slate-200 p-4"
                        key={fair.slug}
                      >
                        <p className="font-medium text-slate-950">
                          {displayFair.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {displayFair.dateRange} · {displayFair.city}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description={t("home.emptyDescription")}
                  title={t("home.emptyTitle")}
                />
              )}
            </div>
          </div>
        </MainContainer>
      </section>

      {isAuthenticated ? (
        <section>
          <MainContainer className="py-12 sm:py-16">
            {hasSelectedInterests ? (
              <>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                      {t("nav.interests")}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {t("home.recommendedFairs")}
                    </h2>
                  </div>
                  <Button href="/ilgi-alanlarim" variant="outline">
                    {t("profilePage.editInterests")}
                  </Button>
                </div>
                {recommendedFairs.length ? (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {recommendedFairs.map((fair) => (
                      <FairCard fair={fair} key={fair.slug} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description={t("home.emptyDescription")}
                    title={t("home.emptyTitle")}
                  />
                )}
              </>
            ) : (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm font-medium leading-6 text-emerald-900">
                  {t("home.interestsCta")}
                </p>
                <Button
                  className="mt-4 sm:mt-0"
                  href="/ilgi-alanlarim"
                  variant="secondary"
                >
                  {t("home.chooseInterests")}
                </Button>
              </div>
            )}
          </MainContainer>
        </section>
      ) : null}

      <section>
        <MainContainer className="py-12 sm:py-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {t("common.upcoming")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t("home.featuredFairs")}
              </h2>
            </div>
            <Button href="/fairs" variant="outline">
              {t("common.seeAll")}
            </Button>
          </div>
          {sectionFairs.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sectionFairs.map((fair) => (
                <FairCard fair={fair} key={fair.slug} />
              ))}
            </div>
          ) : (
            <EmptyState
              description={t("home.emptyDescription")}
              title={t("home.emptyTitle")}
            />
          )}
        </MainContainer>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <MainContainer className="py-12 sm:py-16">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t("home.categories")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t("home.popularCategories")}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularCategories.map((category) => (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800"
                key={category}
              >
                {categoryLabel(category)}
              </div>
            ))}
          </div>
        </MainContainer>
      </section>
    </>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
