"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";
import { SectionIntro } from "./SectionIntro";
import { HERITAGE_EASE, REVEAL_VIEWPORT } from "./reveal";

/**
 * Stylized static snapshot of the district map — abstract sand footprints,
 * dashed alleys, the creek band and pulsing gold POI dots — linking to /map.
 * Always a night scene (it previews the map's dark heritage style).
 */

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  /** Gold-outlined barjeel building. */
  barjeel?: boolean;
}

const BLOCKS: Block[] = [
  { x: 60, y: 110, w: 44, h: 34, angle: -3 },
  { x: 120, y: 104, w: 36, h: 30, angle: 2 },
  { x: 170, y: 120, w: 48, h: 38, barjeel: true },
  { x: 70, y: 170, w: 40, h: 42, angle: 4 },
  { x: 130, y: 180, w: 52, h: 36, angle: -2 },
  { x: 240, y: 110, w: 42, h: 34, angle: 3 },
  { x: 300, y: 120, w: 50, h: 40, angle: -4 },
  { x: 370, y: 110, w: 44, h: 36, barjeel: true },
  { x: 430, y: 120, w: 36, h: 44, angle: 2 },
  { x: 250, y: 180, w: 44, h: 38, angle: -3 },
  { x: 320, y: 190, w: 56, h: 40, angle: 2 },
  { x: 400, y: 190, w: 40, h: 34, angle: -2 },
  { x: 120, y: 250, w: 48, h: 40, angle: 3 },
  { x: 200, y: 260, w: 56, h: 36, barjeel: true },
  { x: 300, y: 260, w: 44, h: 38, angle: -3 },
  { x: 390, y: 250, w: 48, h: 42, angle: 2 },
];

const ALLEYS = [
  "M52 156 L470 148",
  "M60 236 L468 228",
  "M110 92 L96 320",
  "M236 96 L228 318",
  "M356 100 L368 316",
];

const POIS = [
  { x: 150, y: 140 },
  { x: 330, y: 150 },
  { x: 250, y: 240 },
  { x: 410, y: 210 },
];

const LEGEND = ["houses", "alleys", "pois"] as const;

function LegendSwatch({ kind }: { kind: (typeof LEGEND)[number] }) {
  if (kind === "houses") {
    return (
      <span
        aria-hidden
        className="inline-block size-3 rounded-xs border border-sand/50 bg-sand/30"
      />
    );
  }
  if (kind === "alleys") {
    return (
      <span
        aria-hidden
        className="inline-block w-4 border-t-2 border-dashed border-sand/60"
      />
    );
  }
  return <span aria-hidden className="inline-block size-3 rounded-pill bg-gold" />;
}

export function MapTeaser() {
  const t = useTranslations("landing.map");
  const reduce = useReducedMotion() ?? false;

  return (
    <section
      aria-labelledby="map-title"
      className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[1fr_1.1fr]"
    >
      <div className="flex flex-col gap-8">
        <SectionIntro
          id="map-title"
          kicker={t("kicker")}
          title={t("title")}
          description={t("description")}
        />
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-80">
          {LEGEND.map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <LegendSwatch kind={kind} />
              {t(`legend.${kind}`)}
            </li>
          ))}
        </ul>
        <div>
          <Link href="/map" className={buttonClasses("primary", "md")}>
            {t("cta")}
          </Link>
        </div>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={REVEAL_VIEWPORT}
        transition={{ duration: 0.65, ease: HERITAGE_EASE }}
        className="overflow-hidden rounded-md border border-(--line-soft)"
      >
        <Link href="/map" aria-label={t("cta")} className="block">
          <svg
            viewBox="0 0 520 360"
            role="img"
            aria-label={t("figureLabel")}
            className="block h-auto w-full"
          >
            {/* Night canvas */}
            <rect width="520" height="360" className="fill-night" />

            {/* Creek band along the top */}
            <path
              d="M0 0 H520 V50 Q480 58 440 52 T360 54 T280 50 T200 56 T120 50 T40 54 L0 52 Z"
              className="fill-oasis/30"
            />

            {/* District boundary */}
            <path
              d="M36 84 L200 70 L340 78 L484 92 L492 210 L470 322 L300 336 L120 328 L30 300 Z"
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="5 7"
              className="stroke-gold/50"
            />

            {/* Alleys */}
            <g
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="stroke-sand/30"
            >
              {ALLEYS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>

            {/* Building footprints */}
            {BLOCKS.map(({ x, y, w, h, angle, barjeel }) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={w}
                height={h}
                transform={
                  angle
                    ? `rotate(${angle} ${x + w / 2} ${y + h / 2})`
                    : undefined
                }
                strokeWidth="1"
                className={
                  barjeel
                    ? "fill-sand/25 stroke-gold/70"
                    : "fill-sand/15 stroke-sand/25"
                }
              />
            ))}

            {/* POI markers with pulse */}
            {POIS.map(({ x, y }, i) => (
              <g key={`${x}-${y}`}>
                {reduce ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="none"
                    strokeWidth="1.5"
                    className="stroke-gold-bright/40"
                  />
                ) : (
                  <motion.circle
                    cx={x}
                    cy={y}
                    fill="none"
                    strokeWidth="1.5"
                    className="stroke-gold-bright"
                    animate={{ r: [6, 16], opacity: [0.6, 0] }}
                    transition={{
                      duration: 2.2,
                      delay: i * 0.45,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                )}
                <circle cx={x} cy={y} r={5} className="fill-gold" />
              </g>
            ))}
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
