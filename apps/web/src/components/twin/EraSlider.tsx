"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PeriodKey, PeriodOut } from "@/lib/types";

export interface EraSliderProps {
  periods: PeriodOut[];
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  className?: string;
}

/**
 * Time-travel control: four era stops on a line (1950/1970/1990/today).
 * Native radios give arrow-key navigation for free; glass styling is
 * allowed here because the slider floats over the 3D stage.
 */
export function EraSlider({ periods, value, onChange, className }: EraSliderProps) {
  const t = useTranslations("twin");
  const groupName = useId();

  return (
    <fieldset
      className={cn(
        "rounded-pill border border-line bg-night-soft/70 px-6 py-3 backdrop-blur-md",
        className,
      )}
    >
      <legend className="sr-only">{t("eraLegend")}</legend>
      <div className="relative flex items-start gap-7 sm:gap-9">
        <span
          aria-hidden
          className="absolute inset-x-1 top-[8px] h-px bg-line"
        />
        {periods.map((period) => {
          const checked = period.key === value;
          const label = period.key === "today" ? t("eraToday") : period.key;
          return (
            <label
              key={period.key}
              className="relative z-10 flex cursor-pointer flex-col items-center gap-1.5"
            >
              <input
                type="radio"
                name={groupName}
                value={period.key}
                checked={checked}
                onChange={() => onChange(period.key)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "h-4 w-4 rounded-pill border-2 transition-colors duration-200 ease-heritage",
                  checked
                    ? "border-gold-bright bg-gold"
                    : "border-line bg-night-soft",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-gold-bright",
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide transition-colors duration-200",
                  checked ? "text-gold-bright" : "text-sand/70",
                )}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
