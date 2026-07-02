"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";
import { pickLocale } from "@/lib/utils";
import type { PoiOut } from "@/lib/types";

const KNOWN_KINDS = new Set([
  "museum",
  "gallery",
  "cafe",
  "house",
  "mosque",
  "landmark",
  "alley",
  "viewpoint",
]);

export interface BuildingInfoProps {
  poi: PoiOut;
  onClose: () => void;
}

/**
 * Floating card shown when a POI building is clicked in the twin.
 * Glass recipe is allowed — this is a floating overlay on the 3D stage.
 */
export function BuildingInfo({ poi, onClose }: BuildingInfoProps) {
  const t = useTranslations("twin");
  const locale = useLocale();
  const cardRef = useRef<HTMLElement>(null);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    setImageOk(true);
    cardRef.current?.focus({ preventScroll: true });
  }, [poi.slug]);

  const name = pickLocale(poi.name, locale);
  const kindLabel = KNOWN_KINDS.has(poi.kind) ? t(`kinds.${poi.kind}`) : poi.kind;

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      aria-label={name}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="absolute start-4 top-4 z-10 w-72 max-w-[calc(100%-2rem)] rounded-md border border-line bg-night-soft/70 p-4 text-sand backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
            {kindLabel}
          </p>
          <h2 className="mt-1 text-lg leading-snug font-bold">{name}</h2>
          {poi.era_built ? (
            <p className="mt-1 text-xs text-sand/70">
              {t("info.builtIn", { era: poi.era_built })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("info.close")}
          className="shrink-0 rounded-xs p-1 text-sand/70 transition-colors duration-200 hover:bg-mist hover:text-sand"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {imageOk && poi.hero_image ? (
        // Stylized SVG hero — plain <img>, hidden gracefully if missing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poi.hero_image}
          alt=""
          loading="lazy"
          onError={() => setImageOk(false)}
          className="mt-3 h-24 w-full rounded-xs border border-line bg-mist object-cover"
        />
      ) : null}

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-sand/85">
        {pickLocale(poi.summary, locale)}
      </p>

      <Link
        href={`/stories/${poi.slug}`}
        className={buttonClasses("primary", "sm", "mt-4 w-full")}
      >
        {t("info.openStory")}
      </Link>
    </section>
  );
}
