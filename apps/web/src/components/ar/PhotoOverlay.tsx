"use client";

/**
 * Before/after («قبل/بعد») overlay: an old public-domain photograph of Dubai
 * is clipped over whatever lives behind it (camera feed or panorama). A
 * direction-aware reveal slider blends past and present.
 */

import { useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { isRtl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface OldPhoto {
  id: "creek" | "alras" | "sheikh";
  src: string;
}

/** Public-domain photographs (see page credits) committed under images/old. */
export const OLD_PHOTOS: OldPhoto[] = [
  { id: "creek", src: "/images/old/creek-1964.jpg" },
  { id: "alras", src: "/images/old/alras-1960s.jpg" },
  { id: "sheikh", src: "/images/old/sheikh-saeed-1950.jpg" },
];

export interface PhotoOverlayProps {
  onClose: () => void;
}

export function PhotoOverlay({ onClose }: PhotoOverlayProps) {
  const t = useTranslations("arx");
  const locale = useLocale();
  const rtl = isRtl(locale);
  const [photo, setPhoto] = useState<OldPhoto>(OLD_PHOTOS[0] ?? {
    id: "creek",
    src: "/images/old/creek-1964.jpg",
  });
  const [reveal, setReveal] = useState(55);
  const [broken, setBroken] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Reveal always grows from the reading-start side of the screen.
  const clipPath = rtl
    ? `inset(0 0 0 ${100 - reveal}%)`
    : `inset(0 ${100 - reveal}% 0 0)`;

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const ratio = (clientX - rect.left) / rect.width;
      const fromStart = rtl ? 1 - ratio : ratio;
      setReveal(Math.round(Math.min(1, Math.max(0, fromStart)) * 100));
    },
    [rtl],
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col" role="group" aria-label={t("overlay.title")}>
      {/* comparison surface */}
      <div
        ref={surfaceRef}
        className="relative flex-1 cursor-ew-resize touch-none overflow-hidden"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (dragging.current) updateFromPointer(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <div className="absolute inset-0" style={{ clipPath }}>
          {broken ? (
            <div className="flex h-full items-center justify-center bg-night-soft p-6 text-center text-sm text-sand/70">
              {t("sim.panoramaMissing")}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.src}
              alt={t(`archive.${photo.id}`)}
              onError={() => setBroken(true)}
              className="h-full w-full select-none object-cover"
              draggable={false}
            />
          )}
        </div>

        {/* divider */}
        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-gold"
          style={rtl ? { right: `${reveal}%` } : { left: `${reveal}%` }}
        />

        {/* top-16 clears the experience's floating top bar */}
        <span className="absolute top-16 start-4 rounded-pill border border-line bg-night-soft/70 px-3 py-1 text-xs text-gold-bright backdrop-blur-md">
          {t("overlay.before")}
        </span>
        <span className="absolute top-16 end-4 rounded-pill border border-line bg-night-soft/70 px-3 py-1 text-xs text-sand/80 backdrop-blur-md">
          {t("overlay.after")}
        </span>
      </div>

      {/* controls */}
      <div className="border-t border-line bg-night-soft/70 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={reveal}
            onChange={(event) => setReveal(Number(event.target.value))}
            aria-label={t("overlay.handle")}
            className="w-full accent-gold"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t("overlay.choose")}
            >
              {OLD_PHOTOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPhoto(item);
                    setBroken(false);
                  }}
                  aria-pressed={item.id === photo.id}
                  className={cn(
                    "rounded-pill border px-3 py-1 text-xs transition-colors duration-200 ease-heritage",
                    item.id === photo.id
                      ? "border-gold bg-gold/10 text-gold-bright"
                      : "border-line text-sand/70 hover:text-sand",
                  )}
                >
                  {t(`archive.${item.id}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs text-sand hover:border-gold hover:text-gold-bright"
            >
              <X className="size-3.5" aria-hidden />
              {t("overlay.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
