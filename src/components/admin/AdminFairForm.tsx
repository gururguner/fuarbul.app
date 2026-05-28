"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CitySelect } from "@/components/ui/CitySelect";
import { Input } from "@/components/ui/Input";
import {
  fairStatusValues,
  sourceNameValues,
  type FairStatusValue,
  type SourceNameValue,
} from "@/lib/admin-fair-options";
import type { TranslationKey } from "@/lib/i18n";
import { toSlug } from "@/lib/slug";

type TaxonomyItem = {
  id: string;
  nameEn: string;
  nameTr: string;
  slug: string;
};

type SubcategoryItem = TaxonomyItem & {
  categoryId: string;
};

type AdminFairFormProps = {
  fair?: AdminFairFormValue;
  mode: "create" | "edit";
  taxonomy: {
    categories: TaxonomyItem[];
    subcategories: SubcategoryItem[];
  };
};

type AdminFairFormValue = {
  categoryIds: string[];
  city: string;
  description: string;
  district: string;
  endDate: string;
  hall: string;
  id: string;
  isFeatured: boolean;
  isIstanbulPriority: boolean;
  isPublished: boolean;
  name: string;
  officialWebsite: string;
  organizer: string;
  slug: string;
  sourceName: SourceNameValue | "";
  sourceUrl: string;
  startDate: string;
  status: FairStatusValue;
  subcategoryIds: string[];
  venue: string;
};

const emptyFair: AdminFairFormValue = {
  categoryIds: [],
  city: "",
  description: "",
  district: "",
  endDate: "",
  hall: "",
  id: "",
  isFeatured: false,
  isIstanbulPriority: false,
  isPublished: false,
  name: "",
  officialWebsite: "",
  organizer: "",
  slug: "",
  sourceName: "",
  sourceUrl: "",
  startDate: "",
  status: "DRAFT",
  subcategoryIds: [],
  venue: "",
};

const inputGridClasses = "grid gap-4 md:grid-cols-2";
const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const textareaClasses =
  "min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminFairForm({ fair, mode, taxonomy }: AdminFairFormProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const initialFair = fair ?? emptyFair;
  const [name, setName] = useState(initialFair.name);
  const [slug, setSlug] = useState(initialFair.slug);
  const [status, setStatus] = useState<FairStatusValue>(initialFair.status);
  const [categoryIds, setCategoryIds] = useState(
    new Set(initialFair.categoryIds),
  );
  const [subcategoryIds, setSubcategoryIds] = useState(
    new Set(initialFair.subcategoryIds),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const subcategoriesByCategory = useMemo(
    () =>
      taxonomy.categories.map((category) => ({
        category,
        subcategories: taxonomy.subcategories.filter(
          (subcategory) => subcategory.categoryId === category.id,
        ),
      })),
    [taxonomy],
  );

  const handleNameBlur = () => {
    if (!slug && name) {
      setSlug(toSlug(name));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCategoryIds((current) => toggleSetValue(current, categoryId));
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setSubcategoryIds((current) => toggleSetValue(current, subcategoryId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      categoryIds: Array.from(categoryIds),
      city: getFormValue(formData, "city"),
      description: getFormValue(formData, "description"),
      district: getFormValue(formData, "district"),
      endDate: getFormValue(formData, "endDate"),
      hall: getFormValue(formData, "hall"),
      isFeatured: formData.get("isFeatured") === "on",
      isIstanbulPriority: formData.get("isIstanbulPriority") === "on",
      isPublished: formData.get("isPublished") === "on",
      name,
      officialWebsite: getFormValue(formData, "officialWebsite"),
      organizer: getFormValue(formData, "organizer"),
      slug,
      sourceName: getFormValue(formData, "sourceName"),
      sourceUrl: getFormValue(formData, "sourceUrl"),
      startDate: getFormValue(formData, "startDate"),
      status,
      subcategoryIds: Array.from(subcategoryIds),
      venue: getFormValue(formData, "venue"),
    };
    const response = await fetch(
      mode === "create" ? "/api/admin/fairs" : `/api/admin/fairs/${fair?.id}`,
      {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: mode === "create" ? "POST" : "PUT",
      },
    );
    const data = (await response.json()) as {
      error?: string;
      fair?: { id: string };
    };

    if (!response.ok) {
      setError(getAdminFormError(data.error, t));
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/fairs");
    router.refresh();
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {t("adminPage.fairManagement")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {mode === "create" ? t("adminPage.addFair") : t("adminPage.editFair")}
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mode === "edit" ? (
            <Button
              disabled={isSubmitting}
              form="admin-fair-form"
              type="submit"
            >
              {t("common.save")}
            </Button>
          ) : null}
          <Button href="/admin/fairs" variant="outline">
            {t("common.cancel")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? t("adminPage.addFair") : t("adminPage.editFair")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            id="admin-fair-form"
            onSubmit={handleSubmit}
          >
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className={inputGridClasses}>
              <Input
                label={<RequiredLabel label={t("common.name")} />}
                name="name"
                onBlur={handleNameBlur}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
              <Input
                label={<RequiredLabel label="Slug" />}
                name="slug"
                onChange={(event) => setSlug(toSlug(event.target.value))}
                required
                value={slug}
              />
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {t("adminPage.descriptionField")}
              </span>
              <textarea
                className={textareaClasses}
                defaultValue={initialFair.description}
                name="description"
              />
            </label>

            <div className={inputGridClasses}>
              <Input
                defaultValue={initialFair.startDate}
                label={<RequiredLabel label={t("adminPage.startDate")} />}
                name="startDate"
                required
                type="datetime-local"
              />
              <Input
                defaultValue={initialFair.endDate}
                label={<RequiredLabel label={t("adminPage.endDate")} />}
                name="endDate"
                required
                type="datetime-local"
              />
            </div>

            <div className={inputGridClasses}>
              <CitySelect
                defaultValue={initialFair.city}
                label={<RequiredLabel label={t("common.city")} />}
                name="city"
                placeholder={t("common.selectCity")}
                required
                showLegacyValue
              />
              <Input
                defaultValue={initialFair.district}
                label={t("adminPage.district")}
                name="district"
              />
              <Input
                defaultValue={initialFair.venue}
                label={<RequiredLabel label={t("common.venue")} />}
                name="venue"
                required
              />
              <Input
                defaultValue={initialFair.hall}
                label={t("adminPage.hall")}
                name="hall"
              />
            </div>

            <div className={inputGridClasses}>
              <Input
                defaultValue={initialFair.organizer}
                label={t("common.organizer")}
                name="organizer"
              />
              <Input
                defaultValue={initialFair.officialWebsite}
                label={t("common.officialWebsite")}
                name="officialWebsite"
                type="url"
              />
            </div>

            <div className={inputGridClasses}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  <RequiredLabel label={t("adminPage.status")} />
                </span>
                <select
                  className={selectClasses}
                  name="status"
                  onChange={(event) =>
                    setStatus(event.target.value as FairStatusValue)
                  }
                  value={status}
                >
                  {fairStatusValues.map((value) => (
                    <option key={value} value={value}>
                      {getStatusLabel(value, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("adminPage.sourceName")}
                </span>
                <select
                  className={selectClasses}
                  defaultValue={initialFair.sourceName}
                  name="sourceName"
                >
                  <option value="">{t("common.notAdded")}</option>
                  {sourceNameValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              defaultValue={initialFair.sourceUrl}
              label={t("adminPage.sourceUrl")}
              name="sourceUrl"
              type="url"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <Checkbox
                defaultChecked={initialFair.isPublished}
                label={t("adminPage.published")}
                name="isPublished"
              />
              <Checkbox
                defaultChecked={initialFair.isFeatured}
                label={t("common.featured")}
                name="isFeatured"
              />
              <Checkbox
                defaultChecked={initialFair.isIstanbulPriority}
                label={t("adminPage.istanbulPriority")}
                name="isIstanbulPriority"
              />
            </div>

            <TaxonomySection
              items={taxonomy.categories}
              label={t("adminPage.categories")}
              locale={locale}
              selectedIds={categoryIds}
              toggle={toggleCategory}
            />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-950">
                {t("adminPage.subcategories")}
              </p>
              <div className="grid gap-3">
                {subcategoriesByCategory.map(({ category, subcategories }) =>
                  subcategories.length ? (
                    <div
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      key={category.id}
                    >
                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        {getTaxonomyLabel(category, locale)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {subcategories.map((subcategory) => (
                          <TogglePill
                            isSelected={subcategoryIds.has(subcategory.id)}
                            key={subcategory.id}
                            label={getTaxonomyLabel(subcategory, locale)}
                            onClick={() => toggleSubcategory(subcategory.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isSubmitting} type="submit">
                {t("common.save")}
              </Button>
              <Button href="/admin/fairs" variant="outline">
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MainContainer>
  );
}

function TaxonomySection({
  items,
  label,
  locale,
  selectedIds,
  toggle,
}: {
  items: TaxonomyItem[];
  label: string;
  locale: "en" | "tr";
  selectedIds: Set<string>;
  toggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <TogglePill
            isSelected={selectedIds.has(item.id)}
            key={item.id}
            label={getTaxonomyLabel(item, locale)}
            onClick={() => toggle(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TogglePill({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        isSelected
          ? "border-emerald-600 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Checkbox({
  defaultChecked,
  label,
  name,
}: {
  defaultChecked: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

function RequiredLabel({ label }: { label: string }) {
  return (
    <>
      {label}
      <span aria-hidden="true" className="ml-1 text-red-500">
        *
      </span>
    </>
  );
}

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getTaxonomyLabel(item: TaxonomyItem, locale: "en" | "tr") {
  return locale === "tr" ? item.nameTr : item.nameEn;
}

function getStatusLabel(
  status: FairStatusValue,
  t: (key: TranslationKey) => string,
) {
  const labels = {
    ARCHIVED: t("adminPage.statusARCHIVED"),
    CANCELLED: t("adminPage.statusCANCELLED"),
    DRAFT: t("adminPage.statusDRAFT"),
    POSTPONED: t("adminPage.statusPOSTPONED"),
    PUBLISHED: t("adminPage.statusPUBLISHED"),
    UPDATED: t("adminPage.statusUPDATED"),
  };

  return labels[status];
}

function getAdminFormError(
  error: string | undefined,
  t: (key: TranslationKey) => string,
) {
  if (error === "slug_exists") {
    return t("adminPage.slugExists");
  }

  if (error === "missing_required_fields") {
    return t("auth.missingRequiredFields");
  }

  if (error === "invalid_city") {
    return t("auth.invalidCity");
  }

  return t("auth.genericError");
}
