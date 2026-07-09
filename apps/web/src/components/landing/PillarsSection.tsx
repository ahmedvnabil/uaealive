"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";
import { HERITAGE_EASE, REVEAL_VIEWPORT } from "./reveal";

/**
 * The experience pillars as an editorial index — numbered rows with
 * hairline rules and gold accents, not an icon-card grid.
 */

const PILLARS = [
  { key: "map", href: "/map" },
  { key: "twin", href: "/twin" },
  { key: "characters", href: "/characters" },
  { key: "copilot", href: "/copilot" },
  { key: "arx", href: "/ar-experience" },
  { key: "hunt", href: "/hunt" },
  // خور النجوم: static experience outside the locale router (public/fahidi)
  { key: "khor", href: "/fahidi" },
] as const;

const STATIC_PILLARS: ReadonlySet<string> = new Set(["khor"]);

export function PillarsSection() {
  const t = useTranslations("landing.pillars");
  const locale = useLocale();
  const reduce = useReducedMotion() ?? false;

  const indexFor = (i: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      minimumIntegerDigits: 2,
    }).format(i + 1);

  return (
    <section
      aria-labelledby="pillars-title"
      className="mx-auto w-full max-w-6xl px-6 py-24"
    >
      <SectionIntro
        id="pillars-title"
        kicker={t("kicker")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-12">
        {PILLARS.map(({ key, href }, i) => (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={REVEAL_VIEWPORT}
            transition={{ duration: 0.55, delay: i * 0.05, ease: HERITAGE_EASE }}
            className={cn(
              "border-t border-(--line-soft)",
              i === PILLARS.length - 1 && "border-b",
            )}
          >
            {(() => {
              const rowClass =
                "group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 py-8 sm:grid-cols-[auto_1fr_auto]";
              const rowContent = (
                <>
                  <span
                    aria-hidden
                    className="text-sm font-semibold text-gold tabular-nums"
                  >
                    {indexFor(i)}
                  </span>
                  <h3 className="text-2xl font-bold transition-colors duration-200 ease-heritage group-hover:text-gold-bright sm:text-3xl">
                    {t(`items.${key}.title`)}
                  </h3>
                  <ArrowUpRight
                    aria-hidden
                    className="hidden size-6 self-center text-gold opacity-0 transition-opacity duration-200 ease-heritage group-hover:opacity-100 group-focus-visible:opacity-100 sm:block rtl:-scale-x-100"
                  />
                  <p className="col-start-2 max-w-2xl text-base leading-relaxed opacity-75">
                    {t(`items.${key}.description`)}
                  </p>
                </>
              );
              // static experiences (public/) bypass the locale-prefixed router
              return STATIC_PILLARS.has(key) ? (
                <a href={href} className={rowClass}>
                  {rowContent}
                </a>
              ) : (
                <Link href={href} className={rowClass}>
                  {rowContent}
                </Link>
              );
            })()}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
