import type { Metadata } from "next";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/nav/Footer";
import { dirFor } from "@/lib/utils";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-kufi",
  display: "swap",
});

/**
 * Dark-first: the shell ships with `class="dark"`; this inline snippet only
 * removes it when the visitor explicitly chose light mode earlier (before
 * hydration, to avoid a flash of the wrong theme).
 */
const THEME_INIT = `try{if(localStorage.getItem("uaealive_theme")==="light"){document.documentElement.classList.remove("dark")}}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: {
      default: `${t("app.name")} — ${t("app.district")}`,
      template: `%s — ${t("app.name")}`,
    },
    description: t("app.description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`dark ${inter.variable} ${notoKufi.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`flex min-h-dvh flex-col ${
          locale === "ar" ? "font-arabic" : "font-latin"
        }`}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:text-night"
          >
            {t("a11y.skipToContent")}
          </a>
          <Nav />
          <main id="main" className="flex-1 pt-20">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
