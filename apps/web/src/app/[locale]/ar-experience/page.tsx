import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ARGate } from "@/components/ar/ARGate";

const MARKER_SRC = "/markers/alfahidi-marker.png";

const ARCHIVE_PHOTOS = [
  { id: "creek", src: "/images/old/creek-1964.jpg" },
  { id: "alras", src: "/images/old/alras-1960s.jpg" },
  { id: "sheikh", src: "/images/old/sheikh-saeed-1950.jpg" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "arx" });
  return { title: t("title"), description: t("meta.description") };
}

export default async function ArExperiencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "arx" });
  const steps = ["step1", "step2", "step3", "step4"] as const;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-24 pt-12 sm:px-6">
      {/* hero */}
      <header className="flex max-w-3xl flex-col gap-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          {t("hero.kicker")}
        </p>
        <span aria-hidden className="h-px w-12 bg-gold" />
        <h1 className="text-display font-bold">{t("hero.headline")}</h1>
        <p className="max-w-2xl text-lg leading-relaxed opacity-80">
          {t("hero.intro")}
        </p>
      </header>

      {/* mode chooser (client) */}
      <ARGate />

      {/* how it works + marker */}
      <section
        aria-labelledby="arx-how-heading"
        className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16"
      >
        <div className="flex flex-col gap-8">
          <SectionHeading title={t("how.heading")} />
          <ol className="flex flex-col gap-6">
            {steps.map((step, index) => (
              <li key={step} className="flex items-baseline gap-4">
                <span
                  aria-hidden
                  className="text-2xl font-bold tabular-nums text-gold/50"
                >
                  {index + 1}
                </span>
                <p className="text-base leading-relaxed opacity-90">
                  {t(`how.${step}`)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-5">
          <SectionHeading title={t("marker.heading")} />
          <p className="text-sm leading-relaxed opacity-80">{t("marker.desc")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MARKER_SRC}
            alt={t("marker.alt")}
            width={280}
            height={280}
            className="w-56 rounded-xs border border-(--line-soft) bg-sand p-2"
          />
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={MARKER_SRC}
              download="alfahidi-marker.png"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-night transition-colors duration-200 ease-heritage hover:bg-gold-bright"
            >
              <Download className="size-4" aria-hidden />
              {t("marker.download")}
            </a>
            <p className="text-xs opacity-60">{t("marker.printHint")}</p>
          </div>
        </div>
      </section>

      {/* archive strip */}
      <section aria-labelledby="arx-archive-heading" className="flex flex-col gap-8">
        <SectionHeading
          title={t("archive.heading")}
          description={t("archive.desc")}
        />
        <div className="grid gap-6 sm:grid-cols-3">
          {ARCHIVE_PHOTOS.map(({ id, src }) => (
            <figure key={id} className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={t(`archive.${id}`)}
                className="aspect-[4/3] w-full rounded-xs border border-(--line-soft) object-cover"
              />
              <figcaption className="text-sm opacity-80">
                {t(`archive.${id}`)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* credits footer */}
      <footer
        aria-label={t("credits.heading")}
        className="border-t border-(--line-soft) pt-8"
      >
        <h2 className="text-sm font-semibold text-gold">
          {t("credits.heading")}
        </h2>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed opacity-70">
          {t("credits.body")}{" "}
          <a
            href="https://commons.wikimedia.org/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-gold/60 underline-offset-4 hover:text-gold-bright"
          >
            Wikimedia Commons
          </a>{" "}
          — {t("credits.license")}.
        </p>
      </footer>
    </div>
  );
}
