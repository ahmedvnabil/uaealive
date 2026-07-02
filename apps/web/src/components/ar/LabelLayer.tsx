"use client";

/**
 * Floating POI labels shared by the live camera experience and the desktop
 * simulator: each label sits at its real compass bearing and slides across
 * the viewport as the heading changes. Selecting a label opens a glass info
 * sheet with the summary and deep links (stories / map).
 */

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { bearingDelta, type ArPoiLabel } from "./arData";

/** Horizontal field of view (deg) mapped onto the viewport width. */
const DEFAULT_FOV = 100;
/** Staggered vertical anchors so neighbouring labels never collide. */
const TOP_SLOTS = [16, 32, 48] as const;

export interface LabelLayerProps {
  labels: ArPoiLabel[];
  heading: number;
  selected: ArPoiLabel | null;
  onSelect: (label: ArPoiLabel | null) => void;
  fov?: number;
}

export function LabelLayer({
  labels,
  heading,
  selected,
  onSelect,
  fov = DEFAULT_FOV,
}: LabelLayerProps) {
  const t = useTranslations("arx");

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        role="group"
        aria-label={t("labels.listLabel")}
      >
        {labels.map((label, index) => {
          const delta = bearingDelta(label.bearing, heading);
          if (Math.abs(delta) > fov / 2 + 8) return null;
          const x = 50 + (delta / fov) * 100;
          const top = TOP_SLOTS[index % TOP_SLOTS.length] ?? 32;
          return (
            <button
              key={label.slug}
              type="button"
              onClick={() => onSelect(label)}
              className="pointer-events-auto absolute flex -translate-x-1/2 flex-col items-center gap-1 rounded-md border border-line bg-night-soft/70 px-3 py-2 text-sand backdrop-blur-md transition-opacity duration-200 ease-heritage hover:border-gold focus-visible:border-gold"
              style={{ left: `${x}%`, top: `${top}%` }}
            >
              <span className="text-sm font-semibold leading-tight">
                {label.name}
              </span>
              <span className="text-[11px] text-gold-bright" dir="auto">
                {t("labels.distance", { m: label.distance })}
              </span>
            </button>
          );
        })}
      </div>

      <ArInfoSheet label={selected} onClose={() => onSelect(null)} />
    </>
  );
}

function ArInfoSheet({
  label,
  onClose,
}: {
  label: ArPoiLabel | null;
  onClose: () => void;
}) {
  const t = useTranslations("arx");
  const reducedMotion = useReducedMotion();
  const kindLabel = (kind: string) =>
    t.has(`labels.kinds.${kind}`) ? t(`labels.kinds.${kind}`) : kind;

  return (
    <AnimatePresence>
      {label ? (
        <motion.aside
          key={label.slug}
          initial={reducedMotion ? false : { y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { y: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-3 bottom-20 z-30 mx-auto max-w-lg rounded-md border border-line bg-night-soft/70 p-5 text-sand backdrop-blur-md sm:inset-x-6"
          aria-label={label.name}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Badge tone="gold" className="self-start">
                {kindLabel(label.kind)}
              </Badge>
              <h3 className="text-lg font-bold leading-snug">{label.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("labels.close")}
              className="rounded-md p-1.5 text-sand/70 hover:bg-mist hover:text-sand"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-sand/80">
            {label.summary}
          </p>
          <p className="mt-2 text-xs text-gold-bright" dir="auto">
            {t("labels.distance", { m: label.distance })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/stories/${label.slug}`}
              className={buttonClasses("primary", "sm")}
            >
              {t("labels.story")}
            </Link>
            <Link
              href={`/map?poi=${label.slug}`}
              className={buttonClasses(
                "outline",
                "sm",
                "border-line text-sand hover:text-gold-bright",
              )}
            >
              {t("labels.map")}
            </Link>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
