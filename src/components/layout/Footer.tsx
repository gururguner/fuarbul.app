"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/providers/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type FooterLink = {
  href: string;
  labelKey: TranslationKey;
};

const publicFooterLinks = [
  { href: "/fairs", labelKey: "nav.fairs" },
  { href: "/login", labelKey: "nav.login" },
  { href: "/register", labelKey: "nav.register" },
] satisfies FooterLink[];

const authenticatedFooterLinks = [
  { href: "/fairs", labelKey: "nav.fairs" },
  { href: "/following", labelKey: "nav.following" },
  { href: "/profile", labelKey: "common.myProfile" },
] satisfies FooterLink[];

const adminFooterLink = { href: "/admin", labelKey: "nav.admin" } satisfies FooterLink;

export function Footer() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { t } = useLanguage();
  const isAdmin = session?.user?.role === "ADMIN";

  if (pathname === "/maintenance") {
    return null;
  }

  const footerLinks: FooterLink[] =
    status === "authenticated"
      ? isAdmin
        ? [...authenticatedFooterLinks, adminFooterLink]
        : authenticatedFooterLinks
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
