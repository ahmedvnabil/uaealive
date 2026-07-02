"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface CharacterAvatarProps {
  /** SVG portrait path, e.g. `/images/characters/pearl-diver.svg`. */
  src: string;
  /** Localized character name — used for the fallback initial. */
  name: string;
  className?: string;
}

/**
 * Character portrait `<img>` with a graceful fallback: if the stylized SVG
 * asset is missing or fails to load, render the character's initial on a
 * mist surface instead of a broken-image glyph.
 *
 * The image itself is decorative (`alt=""`) — the character's name is always
 * present as adjacent text wherever the avatar appears.
 */
export function CharacterAvatar({ src, name, className }: CharacterAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center bg-mist font-bold text-gold",
          className,
        )}
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG asset, no optimization needed
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 object-cover", className)}
    />
  );
}
