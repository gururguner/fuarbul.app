"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CitySelect } from "@/components/ui/CitySelect";
import { Input } from "@/components/ui/Input";
import { withNextParam } from "@/lib/auth-redirect";
import type { TranslationKey } from "@/lib/i18n";
import { professionOptions } from "@/lib/professions";

type RegisterFormProps = {
  nextPath: string;
};

const genderOptions = [
  { labelKey: "gender.male", value: "MALE" },
  { labelKey: "gender.female", value: "FEMALE" },
  { labelKey: "gender.other", value: "OTHER" },
  { labelKey: "gender.preferNotToSay", value: "PREFER_NOT_TO_SAY" },
] satisfies { labelKey: TranslationKey; value: string }[];

const inputGridClasses = "grid gap-4 sm:grid-cols-2";
const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function RegisterForm({ nextPath }: RegisterFormProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = getFormValue(formData, "email");
    const password = getFormValue(formData, "password");

    try {
      const response = await fetch("/api/auth/register", {
        body: JSON.stringify({
          birthDate: getFormValue(formData, "birthDate"),
          city: getFormValue(formData, "city"),
          email,
          gender: getFormValue(formData, "gender"),
          name: getFormValue(formData, "name"),
          password,
          phone: getFormValue(formData, "phone"),
          profession: getFormValue(formData, "profession"),
          surname: getFormValue(formData, "surname"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(getRegisterError(data.error, t));
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: nextPath,
      });

      if (result?.ok) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      router.push(withNextParam("/login", nextPath));
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t("registerPage.title")}</CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          {t("registerPage.description")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className={inputGridClasses}>
            <Input
              autoComplete="given-name"
              label={<RequiredLabel label={t("common.name")} />}
              name="name"
              required
            />
            <Input
              autoComplete="family-name"
              label={<RequiredLabel label={t("common.surname")} />}
              name="surname"
              required
            />
          </div>

          <div className={inputGridClasses}>
            <Input
              autoComplete="email"
              label={<RequiredLabel label={t("common.email")} />}
              name="email"
              placeholder={t("registerPage.emailPlaceholder")}
              required
              type="email"
            />
            <Input
              autoComplete="new-password"
              label={<RequiredLabel label={t("common.password")} />}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>

          <div className={inputGridClasses}>
            <CitySelect
              label={<RequiredLabel label={t("common.city")} />}
              name="city"
              placeholder={t("common.selectCity")}
              required
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                <RequiredLabel label={t("common.profession")} />
              </span>
              <select
                className={selectClasses}
                defaultValue=""
                name="profession"
                required
              >
                <option disabled value="">
                  {t("registerPage.professionPlaceholder")}
                </option>
                {professionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={inputGridClasses}>
            <Input
              autoComplete="tel"
              helperText={t("registerPage.phoneHelp")}
              label={t("common.phone")}
              name="phone"
              placeholder="05xx xxx xx xx"
              type="tel"
            />
            <Input
              label={t("common.birthDate")}
              name="birthDate"
              type="date"
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {t("common.gender")}
              </span>
              <select className={selectClasses} defaultValue="" name="gender">
                <option value="">{t("gender.unspecified")}</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            {t("registerPage.passwordHelp")}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {t("registerPage.requiredFieldsNote")}
          </p>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {t("registerPage.submit")}
          </Button>
        </form>

        <div className="mt-4 space-y-4">
          <Button
            className="w-full gap-2"
            onClick={() => signIn("google", { redirectTo: nextPath })}
            type="button"
            variant="outline"
          >
            <GoogleIcon className="h-4 w-4" />
            {t("common.continueWithGoogle")}
          </Button>
          <p className="text-center text-sm text-slate-600">
            {t("registerPage.haveAccount")}{" "}
            <Link
              className="font-medium text-slate-950 hover:underline"
              href={withNextParam("/login", nextPath)}
            >
              {t("nav.login")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
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

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getRegisterError(
  errorCode: string | undefined,
  t: (key: TranslationKey) => string,
) {
  if (errorCode === "email_exists") {
    return t("auth.emailExists");
  }

  if (errorCode === "weak_password") {
    return t("auth.weakPassword");
  }

  if (errorCode === "invalid_email") {
    return t("auth.invalidEmail");
  }

  if (errorCode === "invalid_city") {
    return t("auth.invalidCity");
  }

  if (errorCode === "missing_required_fields") {
    return t("auth.missingRequiredFields");
  }

  if (errorCode === "invalid_profession") {
    return t("auth.invalidProfession");
  }

  return t("auth.genericError");
}
