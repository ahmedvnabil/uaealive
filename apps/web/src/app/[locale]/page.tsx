import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/landing/Hero";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { StatsBand } from "@/components/landing/StatsBand";
import { CharactersTeaser } from "@/components/landing/CharactersTeaser";
import { MapTeaser } from "@/components/landing/MapTeaser";
import { CTASection } from "@/components/landing/CTASection";

/**
 * Cinematic landing page (Task 9): full-viewport hero with the animated
 * barjeel skyline, the five experience pillars, district stats, character
 * and map teasers, and a closing CTA.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <PillarsSection />
      <StatsBand />
      <CharactersTeaser />
      <MapTeaser />
      <CTASection />
    </>
  );
}
