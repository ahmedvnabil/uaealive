"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Award, Bird, Compass, Gem, Wind, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { pickLocale } from "@/lib/utils";
import type { BadgeOut } from "@/lib/types";

/** Seed badge icon slugs → lucide glyphs (Award = safe fallback). */
const BADGE_ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  pearl: Gem,
  barjeel: Wind,
  falcon: Bird,
};

function badgeIcon(slug: string): LucideIcon {
  return BADGE_ICONS[slug] ?? Award;
}

export interface BadgeShelfProps {
  /** Earned badges — persisted server-side per device_id. */
  badges: BadgeOut[];
}

/** Earned-badges band: gold discs + names + award thresholds. */
export function BadgeShelf({ badges }: BadgeShelfProps) {
  const locale = useLocale();
  const t = useTranslations("hunt");

  return (
    <section aria-labelledby="badge-shelf-title" className="border-t border-line pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="badge-shelf-title"
          className="text-xs font-bold uppercase tracking-[0.25em] text-gold"
        >
          {t("badges.title")}
        </h2>
        <p className="text-xs opacity-70">
          {t("badges.count", { count: badges.length })}
        </p>
      </div>

      {badges.length === 0 ? (
        <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-70">
          {t("badges.empty")}
        </p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-5">
          {badges.map((badge) => {
            const Icon = badgeIcon(badge.icon);
            return (
              <li key={badge.slug} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-pill border-2 border-gold bg-gold/10 text-gold-bright"
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">
                    {pickLocale(badge.name, locale)}
                  </span>
                  <span className="block text-xs opacity-60">
                    {t("badges.threshold", { count: badge.threshold })}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export interface BadgeAwardModalProps {
  badge: BadgeOut | null;
  onClose: () => void;
}

/**
 * Celebration dialog shown when a check-in grants a new badge. Floating
 * overlay → glass recipe allowed. Escape / backdrop / button all close it.
 */
export function BadgeAwardModal({ badge, onClose }: BadgeAwardModalProps) {
  const locale = useLocale();
  const t = useTranslations("hunt");
  const tc = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!badge) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [badge, onClose]);

  if (!badge) return null;

  const Icon = badgeIcon(badge.icon);
  const name = pickLocale(badge.name, locale);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label={tc("ui.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-night/70"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("badges.modal.title")}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm rounded-md p-8 text-center text-sand backdrop-blur-md bg-night-soft/70 border border-line"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("ui.close")}
          className="absolute end-3 top-3 rounded-md p-1 opacity-70 transition-opacity duration-200 ease-heritage hover:opacity-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <span
          aria-hidden="true"
          className="mx-auto flex size-20 items-center justify-center rounded-pill border-2 border-gold bg-gold/10 text-gold-bright"
        >
          <Icon className="size-9" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-gold">
          {t("badges.modal.title")}
        </p>
        <p className="mt-2 text-2xl font-bold">{name}</p>
        <p className="mt-2 text-sm opacity-75">{t("badges.modal.subtitle")}</p>
        <button
          type="button"
          onClick={onClose}
          className={buttonClasses("primary", "md", "mt-6 w-full")}
        >
          {t("badges.modal.continue")}
        </button>
      </motion.div>
    </div>
  );
}
