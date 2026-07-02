import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { StoryDetail } from "@/components/stories/StoryDetail";
import { ApiError, getPoi, getPois } from "@/lib/api";
import { pickLocale } from "@/lib/utils";

// Content comes from the live API — render per-request, not at build time.
export const dynamic = "force-dynamic";

type PageParams = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const poi = await getPoi(slug);
    return {
      title: pickLocale(poi.name, locale),
      description: pickLocale(poi.summary, locale),
    };
  } catch {
    return {};
  }
}

export default async function StoryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  try {
    const [poi, pois] = await Promise.all([getPoi(slug), getPois()]);
    const ordered = [...pois].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((item) => item.slug === slug);
    const prev = index > 0 ? ordered[index - 1] : null;
    const next =
      index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

    return <StoryDetail poi={poi} prev={prev} next={next} />;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
