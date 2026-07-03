import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8080";

/** Public routes worth indexing (admin + dynamic slug pages excluded). */
const PATHS = [
  "",
  "/map",
  "/twin",
  "/stories",
  "/characters",
  "/copilot",
  "/events",
  "/ar-experience",
  "/hunt",
  "/community",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
  );
}
