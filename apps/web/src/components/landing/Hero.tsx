"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DistrictSilhouette } from "./DistrictSilhouette";
import { HERITAGE_EASE } from "./reveal";

/**
 * Cinematic full-viewport hero: night-sky gradient, deterministic star
 * field with gentle parallax, and the animated barjeel skyline anchored to
 * the horizon. All motion is disabled under `prefers-reduced-motion`.
 *
 * The hero is a deliberate night scene — it keeps the night palette even in
 * light mode, so all text inside uses explicit sand/gold tokens.
 */

const fract = (n: number) => n - Math.floor(n);

/** Deterministic pseudo-random star field (identical on server + client). */
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: Math.round(fract(Math.sin((i + 1) * 12.9898) * 43758.5453) * 1200),
  y: Math.round(fract(Math.sin((i + 1) * 78.233) * 12543.123) * 380) + 12,
  r: Math.round((0.6 + fract(Math.sin((i + 1) * 3.7) * 971.31) * 1.1) * 100) / 100,
  delay: Math.round(fract(Math.sin((i + 1) * 9.13) * 331.7) * 400) / 100,
  duration:
    Math.round((2.6 + fract(Math.sin((i + 1) * 5.31) * 731.7) * 3) * 100) / 100,
}));

const riseIn = (reduce: boolean, delay: number) =>
  ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: HERITAGE_EASE },
  }) as const;

export function Hero() {
  const t = useTranslations("landing.hero");
  const locale = useLocale();
  const reduce = useReducedMotion() ?? false;

  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const starsY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const silhouetteY = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative -mt-20 flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-night via-night to-night-soft text-sand"
    >
      {/* Star field */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={reduce ? undefined : { y: starsY }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          {STARS.map((star, i) =>
            reduce ? (
              <circle
                key={i}
                cx={star.x}
                cy={star.y}
                r={star.r}
                className="fill-sand"
                opacity={0.5}
              />
            ) : (
              <motion.circle
                key={i}
                cx={star.x}
                cy={star.y}
                r={star.r}
                className="fill-sand"
                animate={{ opacity: [0.12, 0.75, 0.12] }}
                transition={{
                  duration: star.duration,
                  delay: star.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ),
          )}
        </svg>
      </motion.div>

      {/* Horizon glow behind the skyline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-gold/10 to-transparent"
      />

      {/* Headline block */}
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 pt-32 pb-10 text-center"
        style={reduce ? undefined : { opacity: contentOpacity }}
      >
        <motion.p
          {...riseIn(reduce, 0.05)}
          className={cn(
            "text-sm font-semibold text-gold",
            locale === "en" && "tracking-[0.3em] uppercase",
          )}
        >
          {t("kicker")}
        </motion.p>
        <motion.h1
          {...riseIn(reduce, 0.15)}
          id="hero-title"
          className="text-display text-balance"
        >
          {t("title")}
        </motion.h1>
        <motion.p
          {...riseIn(reduce, 0.3)}
          className="max-w-2xl text-base leading-relaxed text-pretty text-sand/80 sm:text-lg"
        >
          {t("subtitle")}
        </motion.p>
        <motion.div
          {...riseIn(reduce, 0.45)}
          className="mt-4 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/map" className={buttonClasses("primary", "lg")}>
            {t("ctaPrimary")}
          </Link>
          {/* Explicit night-scene outline (adaptive outline tokens would
              flip to dark-on-dark in light mode). */}
          <Link
            href="/ar-experience"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-7 py-3 text-base font-medium text-sand transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
          >
            {t("ctaSecondary")}
          </Link>
        </motion.div>
      </motion.div>

      {/* Skyline anchored to the horizon */}
      <motion.div
        className="relative z-[5] mt-auto w-full"
        style={reduce ? undefined : { y: silhouetteY }}
      >
        <DistrictSilhouette className="block h-auto w-full" />
      </motion.div>
    </section>
  );
}
