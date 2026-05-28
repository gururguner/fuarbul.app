"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { withNextParam } from "@/lib/auth-redirect";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
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

      setError(t("auth.invalidCredentials"));
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("loginPage.title")}</CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          {t("loginPage.description")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            autoComplete="email"
            label={t("common.email")}
            name="email"
            placeholder={t("loginPage.emailPlaceholder")}
            required
            type="email"
          />
          <Input
            autoComplete="current-password"
            label={t("common.password")}
            name="password"
            required
            type="password"
          />
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {t("loginPage.submit")}
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
            {t("loginPage.noAccount")}{" "}
            <Link
              className="font-medium text-slate-950 hover:underline"
              href={withNextParam("/register", nextPath)}
            >
              {t("nav.register")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
