import type { Locale, Localized } from "./types";

/** Join conditional class names (tiny `clsx` stand-in). */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}

/** Pick the string for the active locale from a bilingual `{ar, en}` value. */
export function pickLocale(value: Localized, locale: string): string {
  return locale === "en" ? value.en : value.ar;
}

/** Whether a locale renders right-to-left. */
export function isRtl(locale: string): boolean {
  return locale === "ar";
}

/** `dir` attribute value for a locale. */
export function dirFor(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** Format an ISO date (`YYYY-MM-DD`) for display in the active locale. */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Clamp a number into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
