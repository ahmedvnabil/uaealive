"use client";

import { useTranslations } from "next-intl";
import type { Audience } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUDIENCES: Audience[] = ["tourist", "kids", "expert"];

export interface AudienceToggleProps {
  value: Audience;
  /** Audiences this POI actually has stories for. */
  available: Audience[];
  onChange: (audience: Audience) => void;
}

/** Segmented control switching the story register (سائح / أطفال / خبير). */
export function AudienceToggle({
  value,
  available,
  onChange,
}: AudienceToggleProps) {
  const t = useTranslations("stories");

  return (
    <div
      role="group"
      aria-label={t("audience.label")}
      className="inline-flex rounded-pill border border-(--line-soft) p-1"
    >
      {AUDIENCES.map((audience) => {
        const active = audience === value;
        const enabled = available.includes(audience);
        return (
          <button
            key={audience}
            type="button"
            aria-pressed={active}
            disabled={!enabled}
            onClick={() => onChange(audience)}
            className={cn(
              "rounded-pill px-4 py-1.5 text-sm font-medium",
              "transition-colors duration-200 ease-heritage",
              "disabled:pointer-events-none disabled:opacity-35",
              active
                ? "bg-gold font-semibold text-night"
                : "opacity-70 hover:text-gold-bright hover:opacity-100",
            )}
          >
            {t(`audience.${audience}`)}
          </button>
        );
      })}
    </div>
  );
}
