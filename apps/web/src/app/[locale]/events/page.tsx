import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventsTimeline } from "@/components/events/EventsTimeline";
import { getEvents } from "@/lib/api";
import type { EventOut, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "events" });

  let events: EventOut[] = [];
  let failed = false;
  try {
    events = await getEvents();
  } catch {
    failed = true;
  }

  const labels = {
    kinds: {
      exhibition: t("kinds.exhibition"),
      festival: t("kinds.festival"),
      market: t("kinds.market"),
      "national-day": t("kinds.national-day"),
      ramadan: t("kinds.ramadan"),
    },
    status: {
      live: t("status.live"),
      upcoming: t("status.upcoming"),
      past: t("status.past"),
    },
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-10 sm:pt-16">
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

      <section className="mt-12">
        {failed ? (
          <p role="alert" className="rounded-md border border-clay/40 bg-clay/10 p-6 text-sm">
            {t("error")}
          </p>
        ) : events.length === 0 ? (
          <p className="rounded-md border border-dashed border-(--line-soft) p-8 text-center text-sm opacity-60">
            {t("empty")}
          </p>
        ) : (
          <EventsTimeline
            events={events}
            locale={locale as Locale}
            labels={labels}
            nowMs={Date.now()}
          />
        )}
      </section>
    </div>
  );
}
