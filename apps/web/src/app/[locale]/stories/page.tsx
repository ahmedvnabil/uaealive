import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoriesGrid } from "@/components/stories/StoriesGrid";
import { getPois } from "@/lib/api";
import type { PoiOut } from "@/lib/types";

// Content comes from the live API — render per-request, not at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories" });
  return { title: t("title"), description: t("intro") };
}

export default async function StoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "stories" });

  let pois: PoiOut[] = [];
  let failed = false;
  try {
    pois = [...(await getPois())].sort((a, b) => a.order - b.order);
  } catch {
    failed = true;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24">
      <header className="max-w-3xl pt-10">
        <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-display">{t("title")}</h1>
        <p className="mt-5 text-lg leading-relaxed opacity-80">{t("intro")}</p>
      </header>

      {failed ? (
        <p
          role="alert"
          className="mt-14 max-w-xl rounded-md border border-clay/40 bg-clay/10 px-5 py-4 text-base"
        >
          {t("loadError")}
        </p>
      ) : (
        <StoriesGrid pois={pois} />
      )}
    </div>
  );
}
