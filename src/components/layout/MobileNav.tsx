"use client";

import {
  CalendarDays,
  Heart,
  Home,
  LogIn,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/providers/LanguageProvider";

const publicMobileItems = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/fairs", icon: CalendarDays, labelKey: "nav.fairs" },
  { href: "/login", icon: LogIn, labelKey: "nav.login" },
  { href: "/register", icon: UserPlus, labelKey: "nav.register" },
] as const;

const authenticatedMobileItems = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/fairs", icon: CalendarDays, labelKey: "nav.fairs" },
  { href: "/following", icon: Heart, labelKey: "nav.following" },
  { href: "/profile", icon: UserRound, labelKey: "nav.profile" },
] as const;

export function MobileNav() {
  const { status } = useSession();
  const pathname = usePathname();
  const { t } = useLanguage();
  const isAuthenticated = status === "authenticated";
  const mobileItems =
    isAuthenticated ? authenticatedMobileItems : publicMobileItems;

  if (pathname === "/maintenance" || status === "loading") {
    return null;
  }

  return (
    <nav
      aria-label={t("nav.mobileNavigation")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-1.5 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div
        className="mx-auto grid max-w-md grid-cols-4 gap-1"
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-center text-[11px] font-medium leading-none text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
