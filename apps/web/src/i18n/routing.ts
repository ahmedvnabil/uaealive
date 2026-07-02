import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

/** Locale-aware navigation APIs — always import these, never next/link. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
