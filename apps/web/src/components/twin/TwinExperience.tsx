"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { getDistrictGeo, getPois, getTimeline, track } from "@/lib/api";
import type { DistrictGeo, PeriodKey, PeriodOut, PoiOut } from "@/lib/types";
import { colors } from "@/lib/theme";
import { cn, pickLocale } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EraSlider } from "./EraSlider";
import { BuildingInfo } from "./BuildingInfo";

// three/R3F stay out of the page chunk — canvas loads client-side only.
const TwinScene = dynamic(
  () => import("./TwinScene").then((module) => module.TwinScene),
  { ssr: false, loading: () => <StageStatus /> },
);

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      geo: DistrictGeo;
      periods: PeriodOut[];
      pois: PoiOut[];
    };

/** Palette used if the timeline has not loaded yet (token-derived). */
const FALLBACK_PALETTE = {
  sky: colors.night,
  ambient: colors["night-soft"],
  accent: colors.gold,
};

function StageStatus({ label }: { label?: string }) {
  const t = useTranslations("twin");
  return (
    <div
      className="flex h-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <p className="animate-pulse text-sm tracking-wide text-sand/80">
        {label ?? t("loading")}
      </p>
    </div>
  );
}

export function TwinExperience() {
  const t = useTranslations("twin");
  const locale = useLocale();
  const reduced = useReducedMotion() ?? false;

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [era, setEra] = useState<PeriodKey>("today");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [geo, periods, pois] = await Promise.all([
        getDistrictGeo(),
        getTimeline(),
        getPois(),
      ]);
      setState({ status: "ready", geo, periods, pois });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = state.status === "ready";
  const periods = ready ? state.periods : [];
  const period = periods.find((entry) => entry.key === era);

  /**
   * Only POIs with a real building footprint get in-twin interactions.
   * The two adjacent landmarks outside the district bbox
   * (dubai-museum-fort, sheikh-saeed-house) are skipped by design.
   */
  const twinPois = useMemo(() => {
    if (!ready) return [];
    const slugs = new Set<string>();
    for (const feature of state.geo.features) {
      const { kind, poi_slug: slug } = feature.properties;
      if (kind === "building" && typeof slug === "string") slugs.add(slug);
    }
    return state.pois
      .filter((poi) => slugs.has(poi.slug))
      .sort((a, b) => a.order - b.order);
  }, [ready, state]);

  const selectedPoi = ready
    ? (state.pois.find((poi) => poi.slug === selected) ?? null)
    : null;

  const changeEra = useCallback((key: PeriodKey) => {
    setEra(key);
    void track("era_change", { era: key });
  }, []);

  return (
    <div>
      <section
        aria-label={t("sceneLabel")}
        className="relative h-[70vh] min-h-[480px] overflow-hidden rounded-md border border-(--line-soft) bg-night"
      >
        {state.status === "loading" ? <StageStatus /> : null}
        {state.status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-sand/80">{t("error")}</p>
            <Button variant="outline" onClick={() => void load()}>
              {t("retry")}
            </Button>
          </div>
        ) : null}
        {ready ? (
          <TwinScene
            geo={state.geo}
            era={era}
            palette={period?.palette ?? FALLBACK_PALETTE}
            reduced={reduced}
            selectedSlug={selected}
            onSelect={setSelected}
          />
        ) : null}

        {selectedPoi ? (
          <BuildingInfo poi={selectedPoi} onClose={() => setSelected(null)} />
        ) : null}

        {ready && periods.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
            <EraSlider
              className="pointer-events-auto"
              periods={periods}
              value={era}
              onChange={changeEra}
            />
          </div>
        ) : null}
      </section>

      <p className="mt-3 text-sm opacity-70">{t("hint")}</p>

      {twinPois.length > 0 ? (
        <nav aria-label={t("flyTo")} className="mt-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            {t("flyTo")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {twinPois.map((poi) => {
              const active = poi.slug === selected;
              return (
                <li key={poi.slug}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(active ? null : poi.slug)}
                    className={cn(
                      "rounded-pill border px-4 py-1.5 text-sm transition-colors duration-200 ease-heritage",
                      active
                        ? "border-gold bg-gold text-night"
                        : "border-(--line-soft) text-(--app-fg) opacity-80 hover:border-gold hover:text-gold-bright hover:opacity-100",
                    )}
                  >
                    {pickLocale(poi.name, locale)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {period ? (
        <section className="mt-12" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={period.key}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card>
                <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                  {period.key === "today" ? t("eraToday") : period.key}
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {pickLocale(period.name, locale)}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-relaxed opacity-85">
                  {pickLocale(period.description, locale)}
                </p>
              </Card>
            </motion.div>
          </AnimatePresence>
        </section>
      ) : null}
    </div>
  );
}
