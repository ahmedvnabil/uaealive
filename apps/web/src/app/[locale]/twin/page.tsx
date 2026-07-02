import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TwinExperience } from "@/components/twin/TwinExperience";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "twin" });
  return { title: t("title"), description: t("intro") };
}

/**
 * /twin — stylized 3D digital twin of Al Fahidi generated from the real
 * OSM building footprints, with a time-travel era slider (1950 → today).
 */
export default async function TwinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "twin" });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24">
      <header className="flex flex-col gap-3 py-10 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          {t("kicker")}
        </p>
        <span aria-hidden className="h-px w-12 bg-gold" />
        <h1 className="text-4xl font-bold sm:text-5xl">{t("title")}</h1>
        <p className="max-w-2xl text-base leading-relaxed opacity-80">
          {t("intro")}
        </p>
      </header>

      <TwinExperience />
    </div>
  );
}
