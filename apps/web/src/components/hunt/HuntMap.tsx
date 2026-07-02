"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { pickLocale } from "@/lib/utils";
import type { HuntMarker } from "@/components/map/DistrictMap";
import type { DistrictGeo, HuntStopOut, PoiOut } from "@/lib/types";

const DistrictMap = dynamic(() => import("@/components/map/DistrictMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const t = useTranslations("hunt");
  return (
    <div className="flex h-full items-center justify-center">
      <p className="animate-pulse text-sm tracking-widest text-sand opacity-70">
        {t("map.loading")}
      </p>
    </div>
  );
}

export interface HuntMapProps {
  geo: DistrictGeo;
  stops: HuntStopOut[];
  pois: PoiOut[];
  /** Stop slugs already checked in. */
  found: ReadonlySet<string>;
  selectedPoi: string | null;
  onSelectPoi: (slug: string) => void;
}

/**
 * Mini district map for the treasure hunt — reuses DistrictMap with
 * `variant="hunt"`: numbered gold pins per stop, filled once found.
 */
export function HuntMap({
  geo,
  stops,
  pois,
  found,
  selectedPoi,
  onSelectPoi,
}: HuntMapProps) {
  const locale = useLocale();
  const t = useTranslations("hunt");

  const orderedStops = useMemo(
    () => [...stops].sort((a, b) => a.order - b.order),
    [stops],
  );

  // Stable while the hunt runs — `found` flips must NOT rebuild the map, so
  // the POI list depends only on stops + pois (see huntMarkers below).
  const stopPois = useMemo(() => {
    const bySlug = new Map(pois.map((poi) => [poi.slug, poi]));
    return orderedStops.flatMap((stop) => {
      const poi = bySlug.get(stop.poi_slug);
      return poi ? [poi] : []; // unmapped stop → simply no pin
    });
  }, [orderedStops, pois]);

  const huntMarkers = useMemo(() => {
    const markers: Record<string, HuntMarker> = {};
    for (const stop of orderedStops) {
      const isFound = found.has(stop.slug);
      markers[stop.poi_slug] = {
        number: stop.order,
        found: isFound,
        label: t(isFound ? "map.markerFound" : "map.markerPending", {
          number: String(stop.order),
          name: pickLocale(stop.title, locale),
        }),
      };
    }
    return markers;
  }, [orderedStops, found, locale, t]);

  return (
    <figure className="relative h-full w-full overflow-hidden rounded-md border border-line bg-night">
      <figcaption className="sr-only">{t("map.title")}</figcaption>
      <DistrictMap
        geo={geo}
        pois={stopPois}
        visibleKinds={null}
        selectedSlug={selectedPoi}
        onSelect={onSelectPoi}
        variant="hunt"
        huntMarkers={huntMarkers}
      />
      {/* Floating key — glass is allowed on floating overlays. */}
      <div className="pointer-events-none absolute bottom-3 start-3 z-10 flex items-center gap-4 rounded-md px-3 py-2 text-[11px] text-sand backdrop-blur-md bg-night-soft/70 border border-line">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-4 items-center justify-center rounded-pill border border-gold bg-gold text-[9px] font-bold leading-none text-night"
          >
            1
          </span>
          {t("map.legendFound")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-4 items-center justify-center rounded-pill border border-gold bg-night text-[9px] font-bold leading-none text-gold-bright"
          >
            2
          </span>
          {t("map.legendPending")}
        </span>
      </div>
    </figure>
  );
}
