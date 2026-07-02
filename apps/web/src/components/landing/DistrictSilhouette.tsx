"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HERITAGE_EASE } from "./reveal";

/**
 * Animated SVG skyline of Al Fahidi drawn from the real barjeel elevation:
 * flat-roofed courtyard houses with stepped corner parapets, punctuated by
 * four-fin wind towers (cap slab, corner finials, central mullion and the
 * crossed fin diagonals visible in the tower head).
 *
 * Purely decorative (`aria-hidden`); gold line-work "draws" itself on mount
 * unless the visitor prefers reduced motion.
 */

const BASE_Y = 300;

interface House {
  x: number;
  w: number;
  h: number;
  /** Raised central parapet block (some Bastakiya houses have one). */
  center?: boolean;
}

interface Tower {
  x: number;
  w: number;
  h: number;
}

/** Distant row — soft mass behind the detailed skyline. */
const BACK_BLOCKS: House[] = [
  { x: 60, w: 140, h: 120 },
  { x: 260, w: 120, h: 140 },
  { x: 520, w: 160, h: 130 },
  { x: 760, w: 130, h: 150 },
  { x: 1000, w: 150, h: 125 },
];

const BACK_TOWERS: Tower[] = [
  { x: 330, w: 44, h: 210 },
  { x: 618, w: 42, h: 198 },
  { x: 866, w: 44, h: 222 },
];

/** Front row — stepped-parapet houses along the alley line. */
const HOUSES: House[] = [
  { x: 0, w: 150, h: 80 },
  { x: 150, w: 110, h: 105, center: true },
  { x: 275, w: 150, h: 88 },
  { x: 425, w: 115, h: 118 },
  { x: 555, w: 160, h: 95, center: true },
  { x: 715, w: 120, h: 112 },
  { x: 850, w: 150, h: 84 },
  { x: 1000, w: 110, h: 108, center: true },
  { x: 1110, w: 90, h: 76 },
];

/** Barjeel wind towers rising above the front row. */
const TOWERS: Tower[] = [
  { x: 180, w: 58, h: 235 },
  { x: 445, w: 56, h: 255 },
  { x: 735, w: 58, h: 240 },
  { x: 1015, w: 56, h: 225 },
];

/** Warm lit windows scattered along the front houses. */
const WINDOWS: Array<{ x: number; y: number }> = [
  { x: 60, y: 250 },
  { x: 205, y: 232 },
  { x: 330, y: 244 },
  { x: 480, y: 224 },
  { x: 615, y: 238 },
  { x: 670, y: 238 },
  { x: 765, y: 226 },
  { x: 910, y: 246 },
  { x: 1052, y: 230 },
  { x: 1150, y: 252 },
];

const PARAPET_BLOCK = 16;
const PARAPET_DROP = 10;

/** Closed silhouette of a house incl. its stepped parapet profile. */
function housePath({ x, w, h, center }: House): string {
  const roof = BASE_Y - h;
  const inner = roof + PARAPET_DROP;
  const b = PARAPET_BLOCK;
  const cx = x + w / 2;
  const parts = [
    `M${x} ${BASE_Y}`,
    `L${x} ${roof}`,
    `L${x + b} ${roof}`,
    `L${x + b} ${inner}`,
  ];
  if (center) {
    parts.push(
      `L${cx - 13} ${inner}`,
      `L${cx - 13} ${roof}`,
      `L${cx + 13} ${roof}`,
      `L${cx + 13} ${inner}`,
    );
  }
  parts.push(
    `L${x + w - b} ${inner}`,
    `L${x + w - b} ${roof}`,
    `L${x + w} ${roof}`,
    `L${x + w} ${BASE_Y}`,
    "Z",
  );
  return parts.join(" ");
}

/** Open trace of the same parapet profile (gold line-work). */
function parapetTrace({ x, w, h, center }: House): string {
  const roof = BASE_Y - h;
  const inner = roof + PARAPET_DROP;
  const b = PARAPET_BLOCK;
  const cx = x + w / 2;
  const parts = [
    `M${x} ${roof}`,
    `L${x + b} ${roof}`,
    `L${x + b} ${inner}`,
  ];
  if (center) {
    parts.push(
      `L${cx - 13} ${inner}`,
      `L${cx - 13} ${roof}`,
      `L${cx + 13} ${roof}`,
      `L${cx + 13} ${inner}`,
    );
  }
  parts.push(`L${x + w - b} ${inner}`, `L${x + w - b} ${roof}`, `L${x + w} ${roof}`);
  return parts.join(" ");
}

/**
 * Gold detail of a barjeel head: cap slab outline, head base line, central
 * mullion and the two crossed fin diagonals (the four-fin X seen in plan).
 */
function towerDetail({ x, w, h }: Tower): string {
  const top = BASE_Y - h;
  const capBottom = top + 7;
  const headBottom = top + 59;
  const cx = x + w / 2;
  return [
    `M${x - 7} ${capBottom} L${x - 7} ${top} L${x + w + 7} ${top} L${x + w + 7} ${capBottom}`,
    `M${cx} ${capBottom} L${cx} ${headBottom}`,
    `M${x + 5} ${capBottom + 5} L${cx - 5} ${headBottom - 5}`,
    `M${x + w - 5} ${capBottom + 5} L${cx + 5} ${headBottom - 5}`,
    `M${x} ${headBottom} L${x + w} ${headBottom}`,
  ].join(" ");
}

function TowerMass({ tower }: { tower: Tower }) {
  const { x, w, h } = tower;
  const top = BASE_Y - h;
  return (
    <g>
      <rect x={x - 7} y={top} width={w + 14} height={7} />
      <rect x={x} y={top + 7} width={w} height={h - 7} />
      {/* corner + center finials */}
      <rect x={x - 7} y={top - 8} width={6} height={8} />
      <rect x={x + w / 2 - 3} y={top - 11} width={6} height={11} />
      <rect x={x + w + 1} y={top - 8} width={6} height={8} />
    </g>
  );
}

export function DistrictSilhouette({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 1200 320"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Luminance mask carving the crescent — white/black are functional
            mask values, not palette colors. */}
        <mask id="ua-moon-mask">
          <rect x="920" y="16" width="120" height="112" fill="white" />
          <circle cx="990" cy="62" r="21" fill="black" />
        </mask>
      </defs>

      {/* Crescent moon */}
      <motion.circle
        cx="978"
        cy="70"
        r="24"
        mask="url(#ua-moon-mask)"
        className="fill-gold-bright/70"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.2 }}
      />

      {/* Distant row */}
      <motion.g
        className="fill-night-soft"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1, delay: 0.15, ease: HERITAGE_EASE }}
      >
        {BACK_BLOCKS.map((block) => (
          <rect
            key={`bb-${block.x}`}
            x={block.x}
            y={BASE_Y - block.h}
            width={block.w}
            height={block.h}
          />
        ))}
        {BACK_TOWERS.map(({ x, w, h }) => (
          <g key={`bt-${x}`}>
            <rect x={x - 5} y={BASE_Y - h} width={w + 10} height={6} />
            <rect x={x} y={BASE_Y - h + 6} width={w} height={h - 6} />
          </g>
        ))}
      </motion.g>

      {/* Front skyline mass */}
      <motion.g
        className="fill-night"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: HERITAGE_EASE }}
      >
        {HOUSES.map((house) => (
          <path key={`h-${house.x}`} d={housePath(house)} />
        ))}
        {TOWERS.map((tower) => (
          <TowerMass key={`t-${tower.x}`} tower={tower} />
        ))}
      </motion.g>

      {/* Gold line-work drawing itself in */}
      <g
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d={HOUSES.map(parapetTrace).join(" ")}
          className="stroke-gold"
          opacity="0.65"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 0.35, ease: "easeInOut" }}
        />
        {TOWERS.map((tower, i) => (
          <motion.path
            key={`td-${tower.x}`}
            d={towerDetail(tower)}
            className="stroke-gold-bright"
            opacity="0.9"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 1.1,
              delay: 0.5 + i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </g>

      {/* Lit windows */}
      <motion.g
        className="fill-gold"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 0.8, delay: 1.4 }}
      >
        {WINDOWS.map((w) => (
          <rect
            key={`w-${w.x}`}
            x={w.x}
            y={w.y}
            width={5}
            height={8}
            rx={1}
          />
        ))}
      </motion.g>

      {/* Ground line */}
      <motion.line
        x1="0"
        y1={BASE_Y}
        x2="1200"
        y2={BASE_Y}
        className="stroke-gold/40"
        strokeWidth="2"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, delay: 0.2, ease: "easeInOut" }}
      />
    </svg>
  );
}
