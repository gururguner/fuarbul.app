"use client";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const moduleKeys = [
  "adminPage.fairsModule",
  "adminPage.categoriesModule",
  "adminPage.usersModule",
] as const;

export default function AdminPage() {
  const { t } = useLanguage();

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="warning">{t("adminPage.badge")}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("adminPage.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("adminPage.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminPage.modulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {moduleKeys.map((key) => (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800"
              key={key}
            >
              {t(key)}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button href="/fairs" variant="outline">
          {t("adminPage.viewFairs")}
        </Button>
      </div>
    </MainContainer>
  );
}
