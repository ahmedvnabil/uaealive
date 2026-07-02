import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CharacterGrid } from "@/components/chat/CharacterGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/**
 * `/characters` — the neighbourhood majlis: pick a historical character and
 * hold a streaming, bilingual conversation. Roster + chat live in the
 * client-side `CharacterGrid`; this server shell renders the editorial header.
 */
export default async function CharactersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "chat" });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          {t("header.kicker")}
        </p>
        <span aria-hidden className="h-px w-12 bg-gold" />
        <h1 className="text-display">{t("header.title")}</h1>
        <p className="text-base leading-relaxed opacity-80 sm:text-lg">
          {t("header.intro")}
        </p>
      </header>
      <div className="mt-12 sm:mt-16">
        <CharacterGrid />
      </div>
    </div>
  );
}
