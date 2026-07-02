"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HERITAGE_EASE, REVEAL_VIEWPORT } from "./reveal";

/**
 * Hairline-grid stat band — big gold figures, quiet labels. The 1px grid
 * comes from `gap-px` over a line-toned background (no shadows, no cards).
 */

const STATS = ["buildings", "eras", "stories", "languages"] as const;

export function StatsBand() {
  const t = useTranslations("landing.stats");
  const reduce = useReducedMotion() ?? false;

  return (
    <section
      aria-labelledby="stats-title"
      className="border-y border-(--line-soft)"
    >
      <h2 id="stats-title" className="sr-only">
        {t("title")}
      </h2>
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-(--line-soft) lg:grid-cols-4">
        {STATS.map((key, i) => (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={REVEAL_VIEWPORT}
            transition={{ duration: 0.5, delay: i * 0.08, ease: HERITAGE_EASE }}
            className="flex flex-col items-center gap-2 bg-(--app-bg) px-4 py-12 text-center"
          >
            <dt className="order-2 text-sm leading-relaxed opacity-70">
              {t(`items.${key}.label`)}
            </dt>
            <dd className="order-1 text-4xl font-bold tracking-tight text-gold-bright sm:text-5xl">
              {t(`items.${key}.value`)}
            </dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}
