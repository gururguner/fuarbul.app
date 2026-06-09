"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { FairVisual } from "@/components/fairs/FairVisual";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Fair } from "@/types/fair";

type FairDetailProps = {
  fair: Fair;
  isFollowing: boolean;
};

export function FairDetail({
  fair,
  isFollowing: initialIsFollowing,
}: FairDetailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const { categoryLabel, localizedFair, t, taxonomyLabel } = useLanguage();
  const displayFair = localizedFair(fair);
  const isAuthenticated = status === "authenticated";
  const visibleCategories = displayFair.categories?.length
    ? displayFair.categories
    : null;

  const toggleFollow = () => {
    startTransition(async () => {
      const response = await fetch(`/api/fairs/${fair.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        return;
      }

      setIsFollowing(!isFollowing);
      router.refresh();
    });
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {visibleCategories ? (
              visibleCategories.map((category) => (
                <Badge key={category.slug} variant="accent">
                  {taxonomyLabel(category)}
                </Badge>
              ))
            ) : (
              <Badge variant="accent">{categoryLabel(displayFair.category)}</Badge>
            )}
            <Badge variant="muted">{displayFair.city}</Badge>
            {fair.isPast ? (
              <Badge variant="warning">{t("common.pastFair")}</Badge>
            ) : null}
          </div>

          <div className="space-y-4">
            {fair.imageUrl ? (
              <FairVisual
                className="max-w-xl"
                fair={fair}
                localizedFair={displayFair}
                size="detail"
              />
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {displayFair.name}
            </h1>
          </div>

          <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <DetailItem label={t("common.date")} value={displayFair.dateRange} />
            <DetailItem label={t("common.city")} value={displayFair.city} />
            <DetailItem label={t("common.venue")} value={displayFair.venue} />
            {displayFair.hall ? (
              <DetailItem label={t("common.hall")} value={displayFair.hall} />
            ) : null}
            <DetailItem
              label={t("common.category")}
              value={
                visibleCategories
                  ? visibleCategories.map(taxonomyLabel).join(", ")
                  : categoryLabel(displayFair.category)
              }
            />
            <DetailItem
              label={t("common.organizer")}
              value={displayFair.organizer}
            />
          </dl>

          {displayFair.description ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                {t("fairDetail.aboutTitle")}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
                {splitDescriptionParagraphs(displayFair.description).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}

          {fair.isPast ? (
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {t("fairDetail.pastFairNote")}
            </p>
          ) : null}
        </section>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {t("fairDetail.actionsTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("fairDetail.actionsDescription")}
          </p>
          <div className="mt-5 grid gap-3">
            <Button external href={displayFair.website} variant="outline">
              {t("common.officialWebsite")}
            </Button>
            {fair.isPast ? (
              <Button disabled type="button" variant="outline">
                {t("fairDetail.pastFollowDisabled")}
              </Button>
            ) : isAuthenticated ? (
              <Button
                disabled={isPending}
                onClick={toggleFollow}
                type="button"
                variant={isFollowing ? "outline" : "secondary"}
              >
                {isFollowing ? t("common.unfollow") : t("common.follow")}
              </Button>
            ) : (
              <Button
                href={`/login?next=${encodeURIComponent(pathname)}`}
                variant="secondary"
              >
                {t("common.follow")}
              </Button>
            )}
          </div>
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800">
            {fair.isPast
              ? t("fairDetail.pastFollowDisabled")
              : isFollowing
                ? t("fairDetail.followingState")
                : t("fairDetail.followPrompt")}
          </p>
          {!isAuthenticated && !fair.isPast ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {t("fairDetail.followNote")}
            </p>
          ) : null}
        </aside>
      </div>
    </MainContainer>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function splitDescriptionParagraphs(description: string) {
  return description
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
