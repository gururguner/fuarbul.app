"use client";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Card, CardContent } from "@/components/ui/Card";

export function AdminUnauthorized() {
  const { t } = useLanguage();

  return (
    <MainContainer className="py-10 sm:py-14">
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-slate-950">
            {t("adminPage.unauthorized")}
          </p>
        </CardContent>
      </Card>
    </MainContainer>
  );
}
