"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { PoiOut } from "@/lib/types";
import { pickLocale } from "@/lib/utils";
import { PoiImage } from "./PoiImage";

export interface StoryCardProps {
  poi: PoiOut;
  /** Pre-localized kind label (resolved once by the grid). */
  kindLabel: string;
}

/**
 * Editorial story card: image, numbered kicker (kind · era), title and a
 * two-line summary — typography-first, no icon clutter.
 */
export function StoryCard({ poi, kindLabel }: StoryCardProps) {
  const locale = useLocale();
  const t = useTranslations("stories");
  const name = pickLocale(poi.name, locale);

  return (
    <article className="group">
      <Link href={`/stories/${poi.slug}`} className="block">
        <div className="overflow-hidden rounded-xs border border-(--line-soft)">
          <PoiImage
            src={poi.hero_image}
            alt={name}
            className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-heritage group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        </div>
        <p className="mt-5 flex items-baseline gap-3 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          <span aria-hidden className="tabular-nums">
            {String(poi.order).padStart(2, "0")}
          </span>
          <span>
            {kindLabel} · {poi.era_built}
          </span>
        </p>
        <h3 className="mt-2 text-xl font-bold transition-colors duration-200 ease-heritage group-hover:text-gold-bright">
          {name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-75">
          {pickLocale(poi.summary, locale)}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold">
          {t("card.readStory")}
          <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </span>
      </Link>
    </article>
  );
}
