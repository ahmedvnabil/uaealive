import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapExperience } from "@/components/map/MapExperience";

interface MapPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ poi?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("meta.title"), description: t("meta.description") };
}

/**
 * `/map` — interactive district map. `?poi=<slug>` (deep link from the
 * stories pages) auto-opens that POI's drawer.
 */
export default async function MapPage({ params, searchParams }: MapPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { poi } = await searchParams;
  const initialPoi = typeof poi === "string" && poi.length > 0 ? poi : undefined;

  return <MapExperience initialPoi={initialPoi} />;
}
