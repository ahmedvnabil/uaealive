"use client";

/**
 * Live mobile AR ("magic window"): the rear camera feeds the backdrop while
 * the device compass steers floating POI labels layered above it. From here
 * the visitor can open the before/after photo overlay or switch to MindAR
 * marker tracking. A drag fallback keeps it usable without a compass.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Compass, Images, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cardinalKey, normalizeHeading, type ArPoiLabel } from "./arData";
import { useDeviceHeading, useDragHeading } from "./useHeading";
import { LabelLayer } from "./LabelLayer";
import { PhotoOverlay } from "./PhotoOverlay";
import MarkerStage from "./MarkerStage";

type CameraStatus = "starting" | "live" | "error";

export interface ARExperienceProps {
  labels: ArPoiLabel[];
  labelsError: boolean;
  onClose: () => void;
  onSwitchToSimulator: () => void;
}

export default function ARExperience({
  labels,
  labelsError,
  onClose,
  onSwitchToSimulator,
}: ARExperienceProps) {
  const t = useTranslations("arx");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraStatus>("starting");
  const [heading, setHeading] = useState(20);
  const [selected, setSelected] = useState<ArPoiLabel | null>(null);
  const [comparing, setComparing] = useState(false);
  const [markerMode, setMarkerMode] = useState(false);

  const compass = useDeviceHeading(setHeading);
  const adjustHeading = useCallback((delta: number) => {
    setHeading((current) => normalizeHeading(current + delta));
  }, []);
  const drag = useDragHeading(adjustHeading);

  // Own camera stream only while in magic-window mode — MindAR manages its
  // own stream inside MarkerStage, and two streams can conflict on mobile.
  useEffect(() => {
    if (markerMode) return undefined;
    let cancelled = false;
    let stream: MediaStream | null = null;
    setCamera("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = mediaStream;
          video.play().catch(() => {
            /* autoplay policies: the feed still renders on interaction */
          });
        }
        setCamera("live");
      })
      .catch(() => {
        if (!cancelled) setCamera("error");
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [markerMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("live.title")}
      className="fixed inset-0 z-50 overflow-hidden bg-night text-sand"
    >
      {markerMode ? (
        <MarkerStage onExit={() => setMarkerMode(false)} />
      ) : (
        <>
          {/* camera backdrop */}
          <div
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            {...drag}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label={t("live.cameraLabel")}
              className="h-full w-full object-cover"
            />
            {camera === "starting" ? (
              <p className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-pill border border-line bg-night-soft/70 px-4 py-2 text-sm text-sand/90 backdrop-blur-md">
                {t("live.starting")}
              </p>
            ) : null}
          </div>

          {camera === "error" ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
              <div className="flex max-w-md flex-col items-center gap-4 rounded-md border border-clay/50 bg-night-soft/70 p-6 text-center backdrop-blur-md">
                <h2 className="text-lg font-bold">{t("live.cameraError")}</h2>
                <p className="text-sm leading-relaxed text-sand/80">
                  {t("live.cameraErrorHint")}
                </p>
                <Button onClick={onSwitchToSimulator}>{t("live.useSim")}</Button>
              </div>
            </div>
          ) : (
            <LabelLayer
              labels={labels}
              heading={heading}
              selected={selected}
              onSelect={setSelected}
            />
          )}

          {/* status notes */}
          <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-2 px-4">
            {labelsError ? (
              <p className="rounded-md border border-clay/40 bg-night-soft/70 px-4 py-2 text-center text-xs text-sand/90 backdrop-blur-md">
                {t("labels.empty")}
              </p>
            ) : null}
            {camera === "live" && !compass.active && !compass.needsPermission ? (
              <p className="rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-xs text-sand/70 backdrop-blur-md">
                {t("live.dragHint")}
              </p>
            ) : null}
          </div>

          {compass.needsPermission ? (
            <div className="absolute inset-x-4 bottom-24 z-30 mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-line bg-night-soft/70 p-4 text-center backdrop-blur-md">
              <p className="text-xs text-sand/80">{t("live.motionHint")}</p>
              <Button size="sm" onClick={compass.requestAccess}>
                {t("live.enableMotion")}
              </Button>
            </div>
          ) : null}

          {/* bottom controls */}
          {comparing ? (
            <PhotoOverlay onClose={() => setComparing(false)} />
          ) : (
            <footer className="absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-md border border-line bg-night-soft/70 p-3 backdrop-blur-md sm:inset-x-6">
              <button
                type="button"
                onClick={() => setComparing(true)}
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-sand hover:border-gold hover:text-gold-bright"
              >
                <Images className="size-4" aria-hidden />
                {t("live.photoToggle")}
              </button>
              <button
                type="button"
                onClick={() => setMarkerMode(true)}
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-sand hover:border-gold hover:text-gold-bright"
              >
                <ScanLine className="size-4" aria-hidden />
                {t("live.markerToggle")}
              </button>
            </footer>
          )}
        </>
      )}

      {/* top bar (shared with marker mode) */}
      <header className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-3 sm:inset-x-6">
        <span
          className="inline-flex items-center gap-2 rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-xs font-semibold text-gold-bright backdrop-blur-md"
          aria-label={t("live.compass")}
        >
          <Compass className="size-4" aria-hidden />
          <span className="tabular-nums" dir="ltr">
            {Math.round(heading)}°
          </span>
          <span>{t(`live.cardinal.${cardinalKey(heading)}`)}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="inline-flex items-center gap-2 rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-xs text-sand backdrop-blur-md hover:border-gold hover:text-gold-bright"
        >
          <X className="size-4" aria-hidden />
          {t("live.close")}
        </button>
      </header>
    </div>
  );
}
