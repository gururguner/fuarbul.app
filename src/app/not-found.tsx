"use client";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <MainContainer className="flex min-h-[70vh] flex-col items-start justify-center py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        {t("notFound.eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {t("notFound.title")}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
        {t("notFound.description")}
      </p>
      <Button className="mt-6" href="/fairs">
        {t("notFound.backToFairs")}
      </Button>
    </MainContainer>
  );
}
