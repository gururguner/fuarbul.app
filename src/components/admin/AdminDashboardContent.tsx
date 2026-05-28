"use client";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type AdminDashboardContentProps = {
  stats: {
    archivedCount: number;
    draftCount: number;
    featuredCount: number;
    istanbulPriorityCount: number;
    publishedCount: number;
    totalCount: number;
  };
};

export function AdminDashboardContent({ stats }: AdminDashboardContentProps) {
  const { t } = useLanguage();
  const cards = [
    { label: t("adminPage.totalFairs"), value: stats.totalCount },
    { label: t("adminPage.publishedFairs"), value: stats.publishedCount },
    { label: t("adminPage.draftFairs"), value: stats.draftCount },
    { label: t("adminPage.archivedFairs"), value: stats.archivedCount },
    { label: t("adminPage.featuredFairs"), value: stats.featuredCount },
    {
      label: t("adminPage.istanbulPriorityFairs"),
      value: stats.istanbulPriorityCount,
    },
  ];

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <Badge variant="warning">{t("adminPage.badge")}</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {t("adminPage.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {t("adminPage.description")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button href="/admin/fairs">{t("adminPage.fairManagement")}</Button>
          <Button href="/admin/import/tobb" variant="outline">
            {t("adminImport.tobbTitle")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-950">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainContainer>
  );
}
