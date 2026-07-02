"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  getDistrictGeo,
  getHuntProgress,
  getHuntStops,
  getPois,
  track,
} from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { BadgeAwardModal, BadgeShelf } from "./BadgeShelf";
import { HuntMap } from "./HuntMap";
import { StopCard } from "./StopCard";
import type {
  BadgeOut,
  CheckinResult,
  DistrictGeo,
  HuntStopOut,
  PoiOut,
} from "@/lib/types";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * Client orchestrator for `/hunt`: loads stops + per-device progress + the
 * district map data, owns found/badge state, and composes the stops list,
 * mini hunt map, badge shelf and award modal.
 */
export function HuntExperience() {
  const t = useTranslations("hunt");
  const tc = useTranslations("common");
  const [stops, setStops] = useState<HuntStopOut[] | null>(null);
  const [pois, setPois] = useState<PoiOut[] | null>(null);
  const [geo, setGeo] = useState<DistrictGeo | null>(null);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [badges, setBadges] = useState<BadgeOut[]>([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<string | null>(null);
  const [awardedBadge, setAwardedBadge] = useState<BadgeOut | null>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void track("hunt_open");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([
      getHuntStops(),
      getHuntProgress(getDeviceId()),
      getPois(),
      getDistrictGeo(),
    ])
      .then(([stopData, progress, poiData, geoData]) => {
        if (cancelled) return;
        setStops([...stopData].sort((a, b) => a.order - b.order));
        setFound(new Set(progress.found));
        setBadges(progress.badges);
        setPois(poiData);
        setGeo(geoData);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleResult = useCallback((result: CheckinResult) => {
    void track("hunt_checkin", {
      correct: result.correct,
      stop: result.stop?.slug,
    });
    if (!result.correct || !result.stop) return;
    const stopSlug = result.stop.slug;
    setFound((prev) => {
      const next = new Set(prev);
      next.add(stopSlug);
      return next;
    });
    const badge = result.badge;
    if (badge) {
      setBadges((prev) =>
        prev.some((b) => b.slug === badge.slug) ? prev : [...prev, badge],
      );
      setAwardedBadge(badge);
    }
  }, []);

  // Mini-map pin click → highlight + bring that stop's card into view.
  const handleSelectPoi = useCallback(
    (poiSlug: string) => {
      setSelectedPoi(poiSlug);
      const stop = stops?.find((s) => s.poi_slug === poiSlug);
      if (!stop) return;
      document
        .getElementById(`hunt-stop-${stop.slug}`)
        ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    },
    [stops],
  );

  // «أظهر على الخريطة» → select the pin and (on mobile) scroll to the map.
  const handleShowOnMap = useCallback((poiSlug: string) => {
    setSelectedPoi(poiSlug);
    mapBoxRef.current?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "nearest",
    });
  }, []);

  const loaded = stops !== null && pois !== null && geo !== null;
  const total = stops?.length ?? 0;
  const foundCount = found.size;
  const complete = total > 0 && foundCount >= total;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24">
      <header className="max-w-3xl pt-10">
        <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
          {t("header.kicker")}
        </p>
        <h1 className="mt-4 text-display">{t("header.title")}</h1>
        <p className="mt-5 text-lg leading-relaxed opacity-80">
          {t("header.intro")}
        </p>
      </header>

      {failed ? (
        <div className="mt-14 flex max-w-xl flex-col items-start gap-5">
          <p
            role="alert"
            className="w-full rounded-md border border-clay/40 bg-clay/10 px-5 py-4 text-base"
          >
            {t("state.error")}
          </p>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {tc("ui.retry")}
          </Button>
        </div>
      ) : !loaded ? (
        <p className="mt-16 animate-pulse text-sm tracking-widest opacity-70">
          {t("state.loading")}
        </p>
      ) : (
        <>
          <section
            aria-label={t("progress.label")}
            className="mt-12 max-w-3xl"
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
                {t("progress.label")}
              </p>
              <p className="text-sm font-bold text-gold-bright" dir="ltr">
                {foundCount} / {total}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={foundCount}
              aria-label={t("progress.label")}
              className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-mist"
            >
              <div
                className="h-full rounded-pill bg-gold transition-all duration-700 ease-heritage"
                style={{ width: `${total ? (foundCount / total) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-3 text-sm opacity-80" aria-live="polite">
              {complete
                ? t("progress.complete")
                : t("progress.summary", {
                    found: foundCount,
                    foundText: String(foundCount),
                    totalText: String(total),
                  })}
            </p>
          </section>

          <div className="mt-10">
            <BadgeShelf badges={badges} />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
            <section aria-label={t("stops.title")} className="order-2 lg:order-1">
              <h2 className="sr-only">{t("stops.title")}</h2>
              <ol className="flex flex-col gap-6">
                {stops.map((stop) => (
                  <StopCard
                    key={stop.slug}
                    stop={stop}
                    found={found.has(stop.slug)}
                    active={activeStop === stop.slug}
                    highlighted={selectedPoi === stop.poi_slug}
                    onToggle={() =>
                      setActiveStop((prev) =>
                        prev === stop.slug ? null : stop.slug,
                      )
                    }
                    onResult={handleResult}
                    onDismiss={() => setActiveStop(null)}
                    onShowOnMap={() => handleShowOnMap(stop.poi_slug)}
                  />
                ))}
              </ol>
            </section>

            <div
              ref={mapBoxRef}
              className="order-1 h-72 scroll-mt-24 lg:order-2 lg:sticky lg:top-24 lg:h-[32rem]"
            >
              <HuntMap
                geo={geo}
                stops={stops}
                pois={pois}
                found={found}
                selectedPoi={selectedPoi}
                onSelectPoi={handleSelectPoi}
              />
            </div>
          </div>
        </>
      )}

      <BadgeAwardModal
        badge={awardedBadge}
        onClose={() => setAwardedBadge(null)}
      />
    </div>
  );
}
