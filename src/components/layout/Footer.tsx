"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

import { useLanguage } from "@/components/providers/LanguageProvider";

const publicFooterLinks = [
  { href: "/fairs", labelKey: "nav.fairs" },
  { href: "/login", labelKey: "nav.login" },
  { href: "/register", labelKey: "nav.register" },
] as const;

const authenticatedFooterLinks = [
  { href: "/fairs", labelKey: "nav.fairs" },
  { href: "/following", labelKey: "nav.following" },
  { href: "/profile", labelKey: "common.myProfile" },
] as const;

export function Footer() {
  const { status } = useSession();
  const { t } = useLanguage();
  const footerLinks =
    status === "authenticated"
      ? authenticatedFooterLinks
      : status === "unauthenticated"
        ? publicFooterLinks
        : [];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>{t("footer.tagline")}</p>
        <div className="flex flex-wrap gap-4">
          {footerLinks.map((item) => (
            <Link
              className="hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
