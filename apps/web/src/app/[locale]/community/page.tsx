import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmissionForm } from "@/components/community/SubmissionForm";

/**
 * Community contribution page — editorial two-column layout: how the
 * moderation pipeline works (aside) next to the submission form. Every
 * submission lands in the admin pending queue (Task 17 ModerationQueue).
 */

const STEP_KEYS = ["one", "two", "three"] as const;
const STEP_NUMERALS: Record<(typeof STEP_KEYS)[number], string> = {
  one: "01",
  two: "02",
  three: "03",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "community" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "community" });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-gold uppercase">
          {t("hero.kicker")}
        </p>
        <span aria-hidden className="mt-4 block h-px w-12 bg-gold" />
        <h1 className="mt-5 text-display">{t("hero.title")}</h1>
        <p className="mt-6 text-lg leading-relaxed opacity-80">{t("hero.lede")}</p>
      </header>

      <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
        <aside aria-labelledby="community-how-title" className="lg:order-first">
          <h2
            id="community-how-title"
            className="text-xl font-bold sm:text-2xl"
          >
            {t("aside.title")}
          </h2>
          <ol className="mt-8 flex flex-col">
            {STEP_KEYS.map((key) => (
              <li
                key={key}
                className="border-t border-(--line-soft) py-6 first:border-t-0 first:pt-0"
              >
                <span
                  aria-hidden
                  className="block font-mono text-sm font-semibold tracking-[0.2em] text-gold"
                >
                  {STEP_NUMERALS[key]}
                </span>
                <h3 className="mt-2 text-base font-bold">
                  {t(`aside.steps.${key}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed opacity-70">
                  {t(`aside.steps.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-(--line-soft) pt-6 text-sm leading-relaxed opacity-60">
            {t("aside.note")}
          </p>
        </aside>

        <section aria-label={t("form.legendType")}>
          <SubmissionForm />
        </section>
      </div>
    </div>
  );
}
