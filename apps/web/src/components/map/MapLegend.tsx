"use client";

import { useTranslations } from "next-intl";

/**
 * Floating map key — glass is allowed here (floating overlay). Sits at the
 * logical start/bottom corner; hidden on small screens to keep the map clear.
 */
export function MapLegend() {
  const t = useTranslations("map");

  return (
    <aside
      aria-label={t("legend.title")}
      className="pointer-events-none absolute bottom-4 start-4 z-10 hidden w-56 rounded-md p-4 text-sand backdrop-blur-md bg-night-soft/70 border border-line sm:block"
    >
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold">
        {t("legend.title")}
      </h3>
      <ul className="flex flex-col gap-2.5 text-xs">
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="flex w-6 justify-center">
            <span className="size-2.5 rounded-pill bg-gold" />
          </span>
          {t("legend.poi")}
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="flex w-6 justify-center">
            <span className="size-3 rounded-xs border border-gold bg-sand/30" />
          </span>
          {t("legend.barjeel")}
        </li>
        <li className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-6 border-t-2 border-dashed border-sand/50"
          />
          {t("legend.alley")}
        </li>
        <li className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-6 border-t border-dashed border-gold/70"
          />
          {t("legend.boundary")}
        </li>
      </ul>
      <p className="mt-3 border-t border-line pt-2 text-[10px] leading-snug opacity-60">
        {t("legend.credit")}
      </p>
    </aside>
  );
}
