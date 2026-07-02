import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * One namespace per page so parallel agents never touch the same file.
 * Each `src/messages/{locale}/{namespace}.json` is merged under its
 * namespace key: `useTranslations("common")`, `useTranslations("map")`, ...
 */
const NAMESPACES = [
  "common",
  "landing",
  "map",
  "twin",
  "stories",
  "chat",
  "arx",
  "hunt",
  "community",
  "admin",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(
      async (namespace) =>
        [
          namespace,
          (await import(`../messages/${locale}/${namespace}.json`)).default,
        ] as const,
    ),
  );

  return { locale, messages: Object.fromEntries(entries) };
});
