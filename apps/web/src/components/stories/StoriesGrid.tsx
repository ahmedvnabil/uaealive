"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { PoiOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StoryCard } from "./StoryCard";

const ALL = "all";

export interface StoriesGridProps {
  pois: PoiOut[];
}

/** Filterable editorial grid of POI stories (kind chips + cards). */
export function StoriesGrid({ pois }: StoriesGridProps) {
  const t = useTranslations("stories");
  const [activeKind, setActiveKind] = useState<string>(ALL);

  const kinds = useMemo(
    () => Array.from(new Set(pois.map((poi) => poi.kind))),
    [pois],
  );

  const labelFor = (kind: string): string =>
    t.has(`kinds.${kind}`) ? t(`kinds.${kind}`) : kind;

  const visible =
    activeKind === ALL ? pois : pois.filter((poi) => poi.kind === activeKind);

  return (
    <section>
      <div
        role="group"
        aria-label={t("filter.label")}
        className="mt-12 flex flex-wrap gap-2 border-b border-(--line-soft) pb-6"
      >
        {[ALL, ...kinds].map((kind) => {
          const active = kind === activeKind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveKind(kind)}
              className={cn(
                "rounded-pill border px-4 py-1.5 text-sm font-medium",
                "transition-colors duration-200 ease-heritage",
                active
                  ? "border-gold bg-gold text-night"
                  : "border-(--line-soft) opacity-75 hover:border-gold hover:text-gold-bright hover:opacity-100",
              )}
            >
              {kind === ALL ? t("filter.all") : labelFor(kind)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-14 text-base opacity-70">{t("empty")}</p>
      ) : (
        <ul className="mt-12 grid list-none gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((poi) => (
            <li key={poi.slug}>
              <StoryCard poi={poi} kindLabel={labelFor(poi.kind)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
