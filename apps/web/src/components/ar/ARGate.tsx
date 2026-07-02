"use client";

/**
 * Entry gate for the AR page: detects device capability, loads the real POIs,
 * and launches one of the two modes — live camera AR or the desktop
 * simulator (the guaranteed projector-safe demo path).
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { getPois, track } from "@/lib/api";
import type { PoiOut } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { buildLabels } from "./arData";

const ARExperience = dynamic(() => import("./ARExperience"), { ssr: false });
const ARSimulator = dynamic(() => import("./ARSimulator"), { ssr: false });

type Mode = "live" | "sim" | null;

export function ARGate() {
  const t = useTranslations("arx");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [pois, setPois] = useState<PoiOut[]>([]);
  const [poisError, setPoisError] = useState(false);

  useEffect(() => {
    setHasCamera(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function",
    );
    let cancelled = false;
    getPois()
      .then((items) => {
        if (!cancelled) setPois(items);
      })
      .catch(() => {
        if (!cancelled) setPoisError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const labels = useMemo(() => buildLabels(pois, locale), [pois, locale]);

  const start = (next: Exclude<Mode, null>) => {
    setMode(next);
    void track("ar_open", { mode: next });
  };

  const modeRows = [
    {
      key: "live" as const,
      available: hasCamera,
      onStart: () => start("live"),
    },
    {
      key: "sim" as const,
      available: true,
      onStart: () => start("sim"),
    },
  ];

  return (
    <section aria-labelledby="arx-modes-heading">
      <h2 id="arx-modes-heading" className="sr-only">
        {t("modes.heading")}
      </h2>
      <div className="divide-y divide-(--line-soft) border-y border-(--line-soft)">
        {modeRows.map(({ key, available, onStart }) => (
          <article
            key={key}
            className="grid gap-4 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8"
          >
            <span
              aria-hidden
              className="text-5xl font-bold tabular-nums text-gold/40"
            >
              {t(`modes.${key}.index`)}
            </span>
            <div className="flex max-w-2xl flex-col gap-2">
              <h3 className="text-2xl font-bold">{t(`modes.${key}.title`)}</h3>
              <p className="text-sm leading-relaxed opacity-80">
                {t(`modes.${key}.desc`)}
              </p>
              <p className="text-xs text-gold">
                {available
                  ? t(`modes.${key}.note`)
                  : t("modes.live.unavailable")}
              </p>
            </div>
            <Button
              size="lg"
              variant={key === "sim" ? "primary" : "outline"}
              disabled={!available}
              onClick={onStart}
              className="justify-self-start sm:justify-self-end"
            >
              {t(`modes.${key}.cta`)}
            </Button>
          </article>
        ))}
      </div>

      {mode === "live" ? (
        <ARExperience
          labels={labels}
          labelsError={poisError}
          onClose={() => setMode(null)}
          onSwitchToSimulator={() => start("sim")}
        />
      ) : null}
      {mode === "sim" ? (
        <ARSimulator
          labels={labels}
          labelsError={poisError}
          onClose={() => setMode(null)}
        />
      ) : null}
    </section>
  );
}
