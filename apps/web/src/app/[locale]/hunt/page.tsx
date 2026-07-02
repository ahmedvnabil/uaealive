import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HuntExperience } from "@/components/hunt/HuntExperience";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hunt" });
  return { title: t("meta.title"), description: t("meta.description") };
}

/**
 * `/hunt` — treasure hunt: riddle hints, numbered stops on a mini district
 * map, on-site code check-ins and a per-device badge shelf.
 */
export default async function HuntPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HuntExperience />;
}
