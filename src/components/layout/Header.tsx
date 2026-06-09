"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/", labelKey: "nav.home" },
  { href: "/fairs", labelKey: "nav.fairs" },
] as const;

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { t } = useLanguage();
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.role === "ADMIN";

  if (pathname === "/maintenance") {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link aria-label="fuarbul" className="flex items-center" href="/">
          <Image
            alt={t("brand.logoAlt")}
            className="h-32 w-auto translate-y-2"
            height={48}
            priority
            src="/logo.png"
            width={160}
          />
        </Link>

        <nav
          aria-label={t("nav.mainNavigation")}
          className="hidden items-center gap-6 md:flex"
        >
          {navItems.map((item) => (
            <Link
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Button href="/following" size="sm" variant="ghost">
                  {t("nav.following")}
                </Button>
                <Button href="/ilgi-alanlarim" size="sm" variant="ghost">
                  {t("nav.interests")}
                </Button>
                <Button href="/profile" size="sm" variant="ghost">
                  {t("common.myProfile")}
                </Button>
                {isAdmin ? (
                  <Button href="/admin" size="sm" variant="ghost">
                    {t("nav.admin")}
                  </Button>
                ) : null}
                <Button
                  onClick={() => signOut({ redirectTo: "/" })}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("common.logout")}
                </Button>
              </>
            ) : status === "unauthenticated" ? (
              <>
                <Button href="/login" size="sm" variant="ghost">
                  {t("nav.login")}
                </Button>
                <Button href="/register" size="sm" variant="secondary">
                  {t("nav.register")}
                </Button>
              </>
            ) : null}
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
