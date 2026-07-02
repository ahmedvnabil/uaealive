/**
 * UAE ALIVE design tokens — the single source of truth.
 *
 * These exact values are exposed as Tailwind utilities (bg-night, text-sand,
 * border-line, rounded-pill, text-display, ease-heritage, ...) via the
 * `@theme` block in `src/app/globals.css`. Keep both files in sync.
 *
 * Never hardcode hex values in components — import from here or use the
 * Tailwind utility classes.
 */

export const colors = {
  night: "#0B0E14",
  "night-soft": "#131826",
  sand: "#E8DCC8",
  gold: "#C9A227",
  "gold-bright": "#E6C15A",
  oasis: "#2E6E5E",
  clay: "#B0603E",
  mist: "rgba(232,220,200,0.08)",
  line: "rgba(232,220,200,0.14)",
} as const;

export const radii = {
  xs: "2px",
  md: "10px",
  pill: "999px",
} as const;

export const typeScale = {
  display: "clamp(2.5rem,6vw,4.5rem)",
} as const;

export const motion = {
  duration: {
    fast: 200,
    base: 400,
    slow: 700,
  },
  easing: "cubic-bezier(0.22,1,0.36,1)",
} as const;

/**
 * Glass accent recipe — ONLY for floating overlays (nav, drawers).
 * Never apply to content cards.
 */
export const glass = "backdrop-blur-md bg-night-soft/70 border border-line";

export const theme = { colors, radii, typeScale, motion, glass } as const;

export type ThemeColor = keyof typeof colors;

export default theme;
