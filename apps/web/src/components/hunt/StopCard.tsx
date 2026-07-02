"use client";

import { Check, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cn, pickLocale } from "@/lib/utils";
import { CodeEntry } from "./CodeEntry";
import type { CheckinResult, HuntStopOut } from "@/lib/types";

export interface StopCardProps {
  stop: HuntStopOut;
  found: boolean;
  /** Whether this stop's code entry is expanded. */
  active: boolean;
  /** Pin on the mini map currently selected → subtle highlight. */
  highlighted: boolean;
  onToggle: () => void;
  onResult: (result: CheckinResult) => void;
  onDismiss: () => void;
  onShowOnMap: () => void;
}

/**
 * One hunt stop: number, title, riddle-style hint, «وصلت! أدخل الرمز» →
 * inline CodeEntry, and a link that spotlights the pin on the mini map.
 */
export function StopCard({
  stop,
  found,
  active,
  highlighted,
  onToggle,
  onResult,
  onDismiss,
  onShowOnMap,
}: StopCardProps) {
  const locale = useLocale();
  const t = useTranslations("hunt");
  const title = pickLocale(stop.title, locale);

  return (
    <li id={`hunt-stop-${stop.slug}`} className="scroll-mt-28 list-none">
      <article
        className={cn(
          "rounded-md border p-6 transition-colors duration-400 ease-heritage",
          found ? "border-gold/50 bg-gold/5" : "border-(--line-soft) bg-(--surface)",
          highlighted && "ring-1 ring-gold/50",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-pill border-2 border-gold text-sm font-bold leading-none",
                found ? "bg-gold text-night" : "text-gold-bright",
              )}
            >
              {stop.order}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                {t("stops.stopNumber", { number: String(stop.order) })}
              </p>
              <h3 className="mt-1 text-xl font-bold">{title}</h3>
            </div>
          </div>
          {found && (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-oasis/50 bg-oasis/10 px-3 py-1 text-xs font-medium text-oasis">
              <Check className="size-3.5" aria-hidden="true" />
              {t("stops.foundChip")}
            </span>
          )}
        </div>

        <p className="mt-4 border-s-2 border-gold/40 ps-4 text-base leading-relaxed opacity-85">
          {pickLocale(stop.hint, locale)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {!found && (
            <Button
              variant={active ? "outline" : "primary"}
              size="sm"
              aria-expanded={active}
              onClick={onToggle}
            >
              {active ? t("stops.hideEntry") : t("stops.arrivedCta")}
            </Button>
          )}
          <button
            type="button"
            onClick={onShowOnMap}
            className="inline-flex items-center gap-1.5 rounded-xs text-sm text-gold-bright underline-offset-4 transition-opacity duration-200 ease-heritage hover:underline"
          >
            <MapPin className="size-4" aria-hidden="true" />
            {t("stops.showOnMap")}
          </button>
        </div>

        {active && (
          <CodeEntry stopTitle={title} onResult={onResult} onDismiss={onDismiss} />
        )}
      </article>
    </li>
  );
}
