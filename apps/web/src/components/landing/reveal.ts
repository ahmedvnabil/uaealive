/**
 * Shared motion grammar for landing sections.
 *
 * Mirrors the heritage easing token (`--ease-heritage` /
 * `motion.easing` in src/lib/theme.ts) for framer-motion transitions.
 */
export const HERITAGE_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

/** Reveal each block once, slightly before it fully enters the viewport. */
export const REVEAL_VIEWPORT = { once: true, margin: "-60px" } as const;
