"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PoiImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Stylized POI hero (SVG assets generated under `public/images/pois/`).
 * Falls back to a quiet night-gradient panel with a gold rule when the
 * asset is missing, so cards never show a broken-image glyph.
 */
export function PoiImage({ src, alt, className }: PoiImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-end bg-gradient-to-b from-night-soft to-night",
          className,
        )}
      >
        <span aria-hidden className="mb-6 ms-6 h-px w-12 bg-gold" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- stylized SVG asset, no optimization needed
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("bg-night-soft", className)}
    />
  );
}
