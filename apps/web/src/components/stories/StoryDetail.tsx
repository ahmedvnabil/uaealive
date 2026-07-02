"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { track } from "@/lib/api";
import type { Audience, Locale, PoiDetailOut, PoiOut } from "@/lib/types";
import { pickLocale } from "@/lib/utils";
import { AudienceToggle } from "./AudienceToggle";
import { NarrationPlayer } from "./NarrationPlayer";
import { PoiImage } from "./PoiImage";
import { SourcesList } from "./SourcesList";

export interface StoryDetailProps {
  poi: PoiDetailOut;
  prev: PoiOut | null;
  next: PoiOut | null;
}

const AUDIENCE_ORDER: Audience[] = ["tourist", "kids", "expert"];

function PoiNavLink({
  poi,
  label,
  align,
}: {
  poi: PoiOut;
  label: string;
  align: "start" | "end";
}) {
  const locale = useLocale();
  return (
    <Link
      href={`/stories/${poi.slug}`}
      className={`group flex flex-col gap-1 ${align === "end" ? "text-end sm:justify-self-end" : "text-start"}`}
    >
      <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
        {label}
      </span>
      <span className="text-lg font-bold transition-colors duration-200 ease-heritage group-hover:text-gold-bright">
        {pickLocale(poi.name, locale)}
      </span>
    </Link>
  );
}

/** Client half of the story page: audience state, narration, tracking. */
export function StoryDetail({ poi, prev, next }: StoryDetailProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("stories");

  const available = useMemo(
    () =>
      AUDIENCE_ORDER.filter((audience) =>
        poi.stories.some((story) => story.audience === audience),
      ),
    [poi.stories],
  );
  const [audience, setAudience] = useState<Audience>(
    available.includes("tourist") ? "tourist" : (available[0] ?? "tourist"),
  );

  useEffect(() => {
    void track("story_view", { poi: poi.slug, locale });
  }, [poi.slug, locale]);

  const story = poi.stories.find((item) => item.audience === audience);
  const name = pickLocale(poi.name, locale);
  const kindLabel = t.has(`kinds.${poi.kind}`) ? t(`kinds.${poi.kind}`) : poi.kind;
  const storyTitle = story ? pickLocale(story.title, locale) : "";
  const paragraphs = story
    ? pickLocale(story.body, locale).split(/\n+/).filter(Boolean)
    : [];

  return (
    <article className="mx-auto w-full max-w-6xl px-6 pb-24">
      <p className="pt-6">
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors duration-200 ease-heritage hover:text-gold-bright"
        >
          <ArrowRight aria-hidden className="size-4 ltr:-scale-x-100" />
          {t("detail.back")}
        </Link>
      </p>

      <header className="mt-8 grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
            {kindLabel} · {t("detail.era")} {poi.era_built}
          </p>
          <h1 className="mt-4 text-display">{name}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed opacity-80">
            {pickLocale(poi.summary, locale)}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {poi.accessibility.wheelchair ? (
              <Badge tone="oasis">{t("access.wheelchair")}</Badge>
            ) : null}
            {poi.accessibility.audio ? (
              <Badge tone="sand">{t("access.audio")}</Badge>
            ) : null}
            <Link
              href={`/map?poi=${poi.slug}`}
              className={buttonClasses("outline", "sm", "ms-2")}
            >
              <MapPin aria-hidden className="size-4" />
              {t("detail.viewOnMap")}
            </Link>
          </div>
        </div>
        <PoiImage
          src={poi.hero_image}
          alt={name}
          className="aspect-[4/3] w-full rounded-xs border border-(--line-soft) object-cover"
        />
      </header>

      <section className="mt-14 max-w-3xl">
        <AudienceToggle
          value={audience}
          available={available}
          onChange={setAudience}
        />
        {story ? (
          <>
            <NarrationPlayer
              text={`${storyTitle}. ${pickLocale(story.body, locale)}`}
              locale={locale}
              className="mt-5"
            />
            <h2 className="mt-10 text-2xl font-bold sm:text-3xl">{storyTitle}</h2>
            <div className="mt-5 space-y-5 text-base leading-8 opacity-90">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <SourcesList sources={story.sources} className="mt-12" />
          </>
        ) : (
          <p className="mt-8 text-base opacity-70">{t("empty")}</p>
        )}
      </section>

      {prev || next ? (
        <nav
          aria-label={t("detail.pagination")}
          className="mt-16 grid gap-6 border-t border-(--line-soft) pt-8 sm:grid-cols-2"
        >
          {prev ? (
            <PoiNavLink poi={prev} label={t("detail.prev")} align="start" />
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <PoiNavLink poi={next} label={t("detail.next")} align="end" />
          ) : null}
        </nav>
      ) : null}
    </article>
  );
}
