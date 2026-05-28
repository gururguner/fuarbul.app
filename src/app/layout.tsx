import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "fuarbul",
    template: "%s | fuarbul",
  },
  description:
    "Türkiye'deki fuarları keşfet, ilgini çekenleri takip et ve zamanı gelince haberdar ol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
              <Footer />
              <MobileNav />
            </div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
