"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocale, useTranslations } from "next-intl";
import { colors } from "@/lib/theme";
import { isRtl, pickLocale } from "@/lib/utils";
import type { DistrictGeo, PoiOut } from "@/lib/types";

/** Per-stop marker state for the treasure-hunt variant. */
export interface HuntMarker {
  /** 1-based stop number rendered inside the pin. */
  number: number;
  found: boolean;
  /** Accessible label, precomputed by the caller (hunt namespace strings). */
  label: string;
}

export interface DistrictMapProps {
  geo: DistrictGeo;
  pois: PoiOut[];
  /** `null` = show every kind. */
  visibleKinds: readonly string[] | null;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  /**
   * `"hunt"` renders numbered gold stop pins (found = filled) instead of the
   * default dots; POIs without an entry in `huntMarkers` get no marker.
   * The default variant behavior is unchanged.
   */
  variant?: "default" | "hunt";
  /** Keyed by POI slug — required when `variant="hunt"`. */
  huntMarkers?: Readonly<Record<string, HuntMarker>>;
}

const CENTER: [number, number] = [55.2997, 25.2641];
/** Degrees of breathing room around the outermost POIs (~400 m). */
const BOUNDS_PADDING = 0.004;

/**
 * maxBounds derive from the actual POI coordinates plus padding — NOT the
 * tight building bbox. Two adjacent-landmark POIs (`dubai-museum-fort`,
 * `sheikh-saeed-house`) sit outside (25.2618, 55.2975, 25.2665, 55.3025)
 * and must never be clipped out of reach.
 */
function boundsFromPois(pois: PoiOut[]): [[number, number], [number, number]] {
  const lngs = pois.map((p) => p.lng);
  const lats = pois.map((p) => p.lat);
  return [
    [Math.min(...lngs) - BOUNDS_PADDING, Math.min(...lats) - BOUNDS_PADDING],
    [Math.max(...lngs) + BOUNDS_PADDING, Math.max(...lats) + BOUNDS_PADDING],
  ];
}

/** Dark-heritage style built inline from design tokens — no external tiles. */
function buildStyle(geo: DistrictGeo): maplibregl.StyleSpecification {
  const kindIs = (kind: string): maplibregl.FilterSpecification =>
    ["==", ["get", "kind"], kind] as maplibregl.FilterSpecification;
  return {
    version: 8,
    sources: {
      district: { type: "geojson", data: geo as GeoJSON.FeatureCollection },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": colors.night },
      },
      {
        id: "district-fill",
        type: "fill",
        source: "district",
        filter: kindIs("boundary"),
        paint: { "fill-color": colors.sand, "fill-opacity": 0.05 },
      },
      {
        id: "district-boundary",
        type: "line",
        source: "district",
        filter: kindIs("boundary"),
        paint: {
          "line-color": colors.gold,
          "line-width": 1.5,
          "line-opacity": 0.4,
          "line-dasharray": [4, 3],
        },
      },
      {
        id: "paths",
        type: "line",
        source: "district",
        filter: kindIs("path"),
        paint: {
          "line-color": colors.sand,
          "line-width": 1,
          "line-opacity": 0.16,
        },
      },
      {
        id: "alleys",
        type: "line",
        source: "district",
        filter: kindIs("alley"),
        paint: {
          "line-color": colors.sand,
          "line-width": 1.6,
          "line-opacity": 0.35,
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "district",
        filter: kindIs("building"),
        paint: {
          "fill-extrusion-color": colors.sand,
          "fill-extrusion-height": ["coalesce", ["get", "height"], 5],
          "fill-extrusion-opacity": 0.85,
        },
      },
      {
        id: "barjeel-outline",
        type: "line",
        source: "district",
        filter: [
          "all",
          ["==", ["get", "kind"], "building"],
          ["==", ["get", "barjeel"], true],
        ] as maplibregl.FilterSpecification,
        paint: {
          "line-color": colors.gold,
          "line-width": 1.4,
          "line-opacity": 0.9,
        },
      },
    ],
  };
}

/**
 * Gold pin: pulse halo on hover, brightened + enlarged when selected.
 * The root classes are applied ONCE at creation and never reassigned —
 * MapLibre adds its own `maplibregl-marker` class to the same element and
 * clobbering `className` afterwards would break marker positioning/lookup.
 */
const MARKER_ROOT_CLASSES =
  "group relative flex size-7 cursor-pointer items-center justify-center rounded-pill bg-transparent";

function markerChildClasses(selected: boolean): { halo: string; dot: string } {
  return {
    halo: `absolute inset-1 rounded-pill ${
      selected ? "bg-gold-bright/40" : "bg-gold/30"
    } group-hover:animate-ping group-focus-visible:animate-ping motion-reduce:group-hover:animate-none motion-reduce:group-focus-visible:animate-none`,
    dot: `relative block rounded-pill border border-night transition-transform duration-200 ease-heritage group-hover:scale-125 ${
      selected ? "size-4 bg-gold-bright ring-2 ring-gold-bright/50" : "size-3 bg-gold"
    }`,
  };
}

/** Repaint selection state — touches ONLY the child spans, never the root. */
function paintMarker(el: HTMLButtonElement, selected: boolean): void {
  const c = markerChildClasses(selected);
  const [halo, dot] = Array.from(el.children) as HTMLElement[];
  if (halo) halo.className = c.halo;
  if (dot) dot.className = c.dot;
}

/** Root classes for hunt stop pins — applied once (see MARKER_ROOT_CLASSES). */
const HUNT_ROOT_CLASSES =
  "group relative flex size-9 cursor-pointer items-center justify-center rounded-pill bg-transparent";

function huntDiscClasses(found: boolean, selected: boolean): string {
  return [
    "flex size-7 items-center justify-center rounded-pill border-2 border-gold",
    "text-xs font-bold leading-none",
    "transition-transform duration-200 ease-heritage group-hover:scale-110",
    found ? "bg-gold text-night" : "bg-night text-gold-bright",
    selected ? "scale-125 ring-2 ring-gold-bright/60" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Repaint a numbered hunt pin — touches ONLY the child disc, never the root. */
function paintHuntMarker(
  el: HTMLButtonElement,
  state: HuntMarker,
  selected: boolean,
): void {
  const [disc] = Array.from(el.children) as HTMLElement[];
  if (!disc) return;
  disc.className = huntDiscClasses(state.found, selected);
  disc.textContent = String(state.number);
  el.setAttribute("aria-label", state.label);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * MapLibre canvas — client-only (dynamically imported with `ssr: false`).
 * Markers are real `<button>`s so they are keyboard-focusable and Enter/Space
 * opens the drawer natively.
 */
export default function DistrictMap({
  geo,
  pois,
  visibleKinds,
  selectedSlug,
  onSelect,
  variant = "default",
  huntMarkers,
}: DistrictMapProps) {
  const locale = useLocale();
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Labels are only read at marker-creation time; refs keep the init effect
  // from re-running (and rebuilding the map) if hook identities change.
  const labelRef = useRef({ locale, t });
  labelRef.current = { locale, t };
  // Hunt state is read via ref at creation; later `found` flips only repaint
  // (the effect below) instead of rebuilding the whole map.
  const huntRef = useRef(huntMarkers);
  huntRef.current = huntMarkers;

  // Map + markers lifecycle (once per mount; strict-mode safe via cleanup).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: buildStyle(geo),
      center: CENTER,
      zoom: 17,
      pitch: 45,
      maxBounds: boundsFromPois(pois),
      minZoom: 14.5,
      attributionControl: false,
    });
    const { locale: lang, t: label } = labelRef.current;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      isRtl(lang) ? "top-right" : "top-left",
    );
    mapRef.current = map;
    const markers = markersRef.current;

    for (const poi of pois) {
      const hunt = variant === "hunt" ? huntRef.current?.[poi.slug] : undefined;
      if (variant === "hunt" && !hunt) continue; // hunt map pins stops only
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.kind = poi.kind;
      el.dataset.slug = poi.slug;
      if (hunt) {
        el.className = HUNT_ROOT_CLASSES;
        el.dataset.variant = "hunt";
        const disc = document.createElement("span");
        el.append(disc);
        paintHuntMarker(el, hunt, false);
      } else {
        el.className = MARKER_ROOT_CLASSES;
        const name = pickLocale(poi.name, lang);
        el.setAttribute("aria-label", label("canvas.markerLabel", { name }));
        const halo = document.createElement("span");
        halo.setAttribute("aria-hidden", "true");
        const dot = document.createElement("span");
        dot.setAttribute("aria-hidden", "true");
        el.append(halo, dot);
        paintMarker(el, false);
      }
      el.addEventListener("click", () => onSelectRef.current(poi.slug));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);
      markers.set(poi.slug, { marker, el });
    }

    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [geo, pois, variant]);

  // Kind filter → toggle marker visibility.
  useEffect(() => {
    markersRef.current.forEach(({ el }) => {
      const visible =
        visibleKinds === null || visibleKinds.includes(el.dataset.kind ?? "");
      el.style.display = visible ? "" : "none";
    });
  }, [visibleKinds]);

  // Selection (or hunt `found` flip) → repaint markers + fly to the POI.
  useEffect(() => {
    markersRef.current.forEach(({ el }, slug) => {
      if (el.dataset.variant === "hunt") {
        const hunt = huntMarkers?.[slug];
        if (hunt) paintHuntMarker(el, hunt, slug === selectedSlug);
      } else {
        paintMarker(el, slug === selectedSlug);
      }
    });
    const map = mapRef.current;
    const poi = pois.find((p) => p.slug === selectedSlug);
    if (!map || !poi) return;
    const target = {
      center: [poi.lng, poi.lat] as [number, number],
      zoom: Math.max(map.getZoom(), 17),
    };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.flyTo({ ...target, speed: 1.4, essential: true });
  }, [selectedSlug, pois, huntMarkers]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t("canvas.regionLabel")}
      // NOTE: maplibre-gl.css forces `.maplibregl-map { position: relative }`,
      // so size with h-full/w-full rather than absolute insets.
      className="h-full w-full"
      dir="ltr"
    />
  );
}
