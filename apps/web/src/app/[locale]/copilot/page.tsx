import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TourPlanner } from "@/components/copilot/TourPlanner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "copilot" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function CopilotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "copilot" });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-gold uppercase">
          {t("hero.kicker")}
        </p>
        <span aria-hidden className="mt-4 block h-px w-12 bg-gold" />
        <h1 className="mt-5 text-display">{t("hero.title")}</h1>
        <p className="mt-6 text-lg leading-relaxed opacity-80">
          {t("hero.lede")}
        </p>
      </header>

      <section className="mt-14">
        <TourPlanner />
      </section>
    </div>
  );
}
