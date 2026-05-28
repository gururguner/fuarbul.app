"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { Fair } from "@/types/fair";

type FairCardProps = {
  fair: Fair;
  isFollowing?: boolean;
};

export function FairCard({ fair, isFollowing = false }: FairCardProps) {
  const { categoryLabel, localizedFair, t, taxonomyLabel } = useLanguage();
  const displayFair = localizedFair(fair);
  const visibleCategories = displayFair.categories?.length
    ? displayFair.categories.slice(0, 2)
    : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {visibleCategories ? (
            visibleCategories.map((category) => (
              <Badge key={category.slug} variant="accent">
                {taxonomyLabel(category)}
              </Badge>
            ))
          ) : (
            <Badge variant="accent">{categoryLabel(displayFair.category)}</Badge>
          )}
          {fair.isFeatured ? (
            <Badge variant="warning">{t("common.featured")}</Badge>
          ) : null}
          {isFollowing ? (
            <Badge variant="muted">{t("nav.following")}</Badge>
          ) : null}
        </div>
        <CardTitle>{displayFair.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm leading-6 text-slate-600">{displayFair.summary}</p>
        <dl className="grid gap-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-slate-500">{t("common.date")}</dt>
            <dd className="text-right">{displayFair.dateRange}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-slate-500">{t("common.city")}</dt>
            <dd className="text-right">{displayFair.city}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-slate-500">{t("common.venue")}</dt>
            <dd className="text-right">{displayFair.venue}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Button className="w-full sm:w-auto" href={`/fair/${fair.slug}`}>
          {t("common.viewDetails")}
        </Button>
      </CardFooter>
    </Card>
  );
}
