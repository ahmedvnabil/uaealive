"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { getDistrictGeo, getPois } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MapLegend } from "./MapLegend";
import { PoiDrawer } from "./PoiDrawer";
import type { DistrictGeo, PoiOut } from "@/lib/types";

const DistrictMap = dynamic(() => import("./DistrictMap"), {
  ssr: false,
  loading: () => <MapStatus messageKey="state.loading" />,
});

/** Filter chips → the POI kinds each one reveals (`null` = everything). */
const FILTERS = {
  all: null,
  museums: ["museum"],
  houses: ["house"],
  art: ["gallery", "alley"],
  cafes: ["cafe"],
  landmarks: ["landmark", "mosque", "viewpoint"],
} as const;

type FilterKey = keyof typeof FILTERS;

const FILTER_KEYS = Object.keys(FILTERS) as FilterKey[];

function MapStatus({ messageKey }: { messageKey: "state.loading" | "state.error" }) {
  const t = useTranslations("map");
  return (
    <div className="flex h-full items-center justify-center">
      <p className="animate-pulse text-sm tracking-widest opacity-70">
        {t(messageKey)}
      </p>
    </div>
  );
}

export interface MapExperienceProps {
  /** From `/map?poi=<slug>` — auto-opens the drawer once POIs load. */
  initialPoi?: string;
}

/**
 * Client orchestrator for `/map`: loads GeoJSON + POIs from the API, owns
 * filter/selection state, and composes the MapLibre canvas, floating legend
 * and POI drawer.
 */
export function MapExperience({ initialPoi }: MapExperienceProps) {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const [geo, setGeo] = useState<DistrictGeo | null>(null);
  const [pois, setPois] = useState<PoiOut[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([getDistrictGeo(), getPois()])
      .then(([geoData, poiData]) => {
        if (cancelled) return;
        setGeo(geoData);
        setPois(poiData);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Deep link (`?poi=`): open the drawer once, after POIs are known.
  useEffect(() => {
    if (!initialPoi || !pois) return;
    if (pois.some((poi) => poi.slug === initialPoi)) {
      setSelectedSlug(initialPoi);
      setDrawerOpen(true);
    }
  }, [initialPoi, pois]);

  const handleSelect = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedSlug(null);
  }, []);

  const visibleKinds = FILTERS[filter];
  const selectedPoi = pois?.find((poi) => poi.slug === selectedSlug) ?? null;

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line px-6 py-5 md:px-10">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            {t("header.kicker")}
          </p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            {t("header.title")}
          </h1>
          <p className="mt-2 hidden text-sm leading-relaxed opacity-70 md:block">
            {t("header.subtitle")}
          </p>
        </div>
        <div
          role="group"
          aria-label={t("filters.label")}
          className="flex flex-wrap items-center gap-2"
        >
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-pill border px-4 py-1.5 text-xs font-medium",
                "transition-colors duration-200 ease-heritage",
                filter === key
                  ? "border-gold bg-gold text-night"
                  : "border-(--line-soft) text-(--app-fg) opacity-80 hover:border-gold hover:text-gold-bright hover:opacity-100",
              )}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="relative flex-1 min-h-0 bg-night">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="max-w-md text-sm leading-relaxed opacity-80">
              {t("state.error")}
            </p>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              {tc("ui.retry")}
            </Button>
          </div>
        ) : geo && pois ? (
          <>
            <DistrictMap
              geo={geo}
              pois={pois}
              visibleKinds={visibleKinds}
              selectedSlug={selectedSlug}
              onSelect={handleSelect}
            />
            <MapLegend />
          </>
        ) : (
          <MapStatus messageKey="state.loading" />
        )}
        <PoiDrawer poi={selectedPoi} open={drawerOpen} onClose={handleClose} />
      </div>
    </div>
  );
}
