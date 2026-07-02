"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { getPoi, track } from "@/lib/api";
import { pickLocale } from "@/lib/utils";
import type { PoiOut } from "@/lib/types";

export interface PoiDrawerProps {
  poi: PoiOut | null;
  open: boolean;
  onClose: () => void;
}

const KIND_KEYS = [
  "museum",
  "house",
  "gallery",
  "cafe",
  "mosque",
  "landmark",
  "alley",
  "viewpoint",
] as const;

type KindKey = (typeof KIND_KEYS)[number];

function kindKey(kind: string): KindKey | null {
  return (KIND_KEYS as readonly string[]).includes(kind) ? (kind as KindKey) : null;
}

/** Editorial fallback block shown when the stylized SVG has not landed yet. */
function HeroFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/9] w-full items-center justify-center rounded-xs border border-line bg-mist"
    >
      <span className="px-6 text-center text-2xl font-bold text-gold">{label}</span>
    </div>
  );
}

/**
 * Glass side drawer with the selected POI: hero image, summary, accessibility
 * chips and deep links into stories + characters. Tracks `poi_view` on open.
 */
export function PoiDrawer({ poi, open, onClose }: PoiDrawerProps) {
  const locale = useLocale();
  const t = useTranslations("map");
  const [storiesCount, setStoriesCount] = useState<number | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  // New POI → reset image state, count stories, record the view.
  useEffect(() => {
    if (!open || !poi) return;
    setImageFailed(false);
    setStoriesCount(null);
    void track("poi_view", { slug: poi.slug });
    let cancelled = false;
    getPoi(poi.slug)
      .then((detail) => {
        if (!cancelled) setStoriesCount(detail.stories.length);
      })
      .catch(() => {
        if (!cancelled) setStoriesCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, poi]);

  if (!poi) return null;

  const name = pickLocale(poi.name, locale);
  const kind = kindKey(poi.kind);

  return (
    <Drawer open={open} onClose={onClose} title={name}>
      <article className="flex flex-col gap-5">
        {imageFailed ? (
          <HeroFallback label={name} />
        ) : (
          // Stylized SVG asset — plain <img>, generated in a parallel task.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poi.hero_image}
            alt={t("drawer.imageAlt", { name })}
            className="aspect-[16/9] w-full rounded-xs border border-line object-cover"
            onError={() => setImageFailed(true)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {kind && <Badge tone="gold">{t(`kinds.${kind}`)}</Badge>}
          {poi.era_built && (
            <Badge tone="sand">{t("drawer.era", { era: poi.era_built })}</Badge>
          )}
          {poi.accessibility.wheelchair && (
            <Badge tone="oasis">{t("drawer.wheelchair")}</Badge>
          )}
          {poi.accessibility.audio && (
            <Badge tone="sand">{t("drawer.audio")}</Badge>
          )}
        </div>

        <p className="text-base leading-relaxed opacity-90">
          {pickLocale(poi.summary, locale)}
        </p>

        {storiesCount !== null && (
          <p className="border-s-2 border-gold ps-3 text-sm text-gold-bright">
            {t("drawer.stories", { count: storiesCount })}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-3">
          <Link
            href={`/stories/${poi.slug}`}
            className={buttonClasses("primary", "md", "w-full")}
          >
            {t("drawer.readStory")}
          </Link>
          <Link
            href="/characters"
            className={buttonClasses("outline", "md", "w-full")}
          >
            {t("drawer.talkToCharacter")}
          </Link>
        </div>
      </article>
    </Drawer>
  );
}
