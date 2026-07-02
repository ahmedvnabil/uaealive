"use client";

/**
 * Desktop / no-camera AR simulator — the guaranteed demo path. A panoramic
 * district backdrop wraps 360° behind the same floating labels and hotspots
 * as the live experience; drag, arrow keys or the angle slider look around.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Images, X } from "lucide-react";
import { normalizeHeading, PANORAMA_SRC, type ArPoiLabel } from "./arData";
import { useDragHeading } from "./useHeading";
import { LabelLayer } from "./LabelLayer";
import { PhotoOverlay } from "./PhotoOverlay";

export interface ARSimulatorProps {
  labels: ArPoiLabel[];
  labelsError: boolean;
  onClose: () => void;
}

export default function ARSimulator({
  labels,
  labelsError,
  onClose,
}: ARSimulatorProps) {
  const t = useTranslations("arx");
  const [heading, setHeading] = useState(20);
  const [selected, setSelected] = useState<ArPoiLabel | null>(null);
  const [comparing, setComparing] = useState(false);
  const [panoWidth, setPanoWidth] = useState(0);
  const [panoBroken, setPanoBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const adjustHeading = useCallback((delta: number) => {
    setHeading((current) => normalizeHeading(current + delta));
  }, []);
  const drag = useDragHeading(adjustHeading);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const measure = useCallback(() => {
    const width = imgRef.current?.getBoundingClientRect().width ?? 0;
    if (width > 0) setPanoWidth(width);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const offset = panoWidth > 0 ? (heading / 360) * panoWidth : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("sim.title")}
      className="fixed inset-0 z-50 overflow-hidden bg-night text-sand"
    >
      {/* panorama backdrop (wraps seamlessly with a duplicated strip) */}
      <div
        aria-hidden={panoBroken}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        {...drag}
      >
        {panoBroken ? (
          <div className="h-full w-full bg-gradient-to-b from-night via-night-soft to-night" />
        ) : (
          <div
            className="flex h-full"
            style={{ transform: `translateX(${-offset}px)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={PANORAMA_SRC}
              alt={t("sim.backdropAlt")}
              onLoad={measure}
              onError={() => setPanoBroken(true)}
              className="h-full w-auto max-w-none select-none"
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PANORAMA_SRC}
              alt=""
              aria-hidden
              className="h-full w-auto max-w-none select-none"
              draggable={false}
            />
          </div>
        )}
      </div>

      <LabelLayer
        labels={labels}
        heading={heading}
        selected={selected}
        onSelect={setSelected}
      />

      {/* top bar */}
      <header className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-3 sm:inset-x-6">
        <span className="rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-gold-bright backdrop-blur-md">
          {t("sim.title")}
        </span>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="inline-flex items-center gap-2 rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-xs text-sand backdrop-blur-md hover:border-gold hover:text-gold-bright"
        >
          <X className="size-4" aria-hidden />
          {t("sim.close")}
        </button>
      </header>

      {/* status notes */}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-2 px-4">
        {labelsError ? (
          <p className="rounded-md border border-clay/40 bg-night-soft/70 px-4 py-2 text-center text-xs text-sand/90 backdrop-blur-md">
            {t("labels.empty")}
          </p>
        ) : null}
        {panoBroken ? (
          <p className="rounded-md border border-line bg-night-soft/70 px-4 py-2 text-center text-xs text-sand/70 backdrop-blur-md">
            {t("sim.panoramaMissing")}
          </p>
        ) : null}
      </div>

      {/* bottom controls */}
      {comparing ? (
        <PhotoOverlay onClose={() => setComparing(false)} />
      ) : (
        <footer className="absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-2xl flex-col gap-2 rounded-md border border-line bg-night-soft/70 p-4 backdrop-blur-md sm:inset-x-6">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="sim-heading"
              className="shrink-0 text-xs text-sand/70"
            >
              {t("sim.headingLabel")}
            </label>
            <input
              id="sim-heading"
              type="range"
              min={0}
              max={359}
              value={Math.round(heading)}
              onChange={(event) => setHeading(Number(event.target.value))}
              className="w-full accent-gold"
              dir="ltr"
            />
            <span
              className="w-12 shrink-0 text-end text-xs tabular-nums text-gold-bright"
              dir="ltr"
            >
              {Math.round(heading)}°
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-sand/60">{t("sim.hint")}</p>
            <button
              type="button"
              onClick={() => setComparing(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs text-sand hover:border-gold hover:text-gold-bright"
            >
              <Images className="size-4" aria-hidden />
              {t("live.photoToggle")}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
