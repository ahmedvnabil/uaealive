"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { getCharacters } from "@/lib/api";
import type { CharacterOut, Locale } from "@/lib/types";
import { cn, pickLocale } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CharacterAvatar } from "./CharacterAvatar";
import { ChatPanel } from "./ChatPanel";

const HERITAGE_EASE = [0.22, 1, 0.36, 1] as const;

function GridSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-md bg-mist pb-24">
            <div className="aspect-4/5 w-full rounded-md bg-mist" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CharacterCardProps {
  character: CharacterOut;
  locale: Locale;
  index: number;
  reduced: boolean;
  ctaLabel: string;
  onSelect: (slug: string) => void;
}

function CharacterCard({
  character,
  locale,
  index,
  reduced,
  ctaLabel,
  onSelect,
}: CharacterCardProps) {
  const name = pickLocale(character.name, locale);
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: HERITAGE_EASE, delay: index * 0.06 }}
    >
      <button
        type="button"
        onClick={() => onSelect(character.slug)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-md border border-(--line-soft) bg-(--surface) text-start transition-colors duration-200 ease-heritage hover:border-gold"
      >
        <CharacterAvatar
          src={character.avatar}
          name={name}
          className="aspect-4/5 w-full text-display"
        />
        <span className="flex flex-1 flex-col gap-2 p-5">
          <span className="text-lg font-bold">{name}</span>
          <span className="text-xs leading-relaxed text-gold">
            {pickLocale(character.role, locale)}
          </span>
          <span className="line-clamp-2 text-sm leading-relaxed opacity-70">
            {pickLocale(character.greeting, locale)}
          </span>
          <span className="mt-auto flex items-center gap-2 pt-2 text-sm font-medium text-gold-bright underline-offset-4 group-hover:underline">
            {ctaLabel}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </span>
        </span>
      </button>
    </motion.div>
  );
}

interface CharacterRailProps {
  characters: CharacterOut[];
  selectedSlug: string;
  locale: Locale;
  onSelect: (slug: string) => void;
}

function CharacterRail({
  characters,
  selectedSlug,
  locale,
  onSelect,
}: CharacterRailProps) {
  const t = useTranslations("chat");
  return (
    <nav aria-label={t("grid.listLabel")} className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
      {characters.map((character) => {
        const name = pickLocale(character.name, locale);
        const active = character.slug === selectedSlug;
        return (
          <button
            key={character.slug}
            type="button"
            aria-pressed={active}
            aria-label={t("panel.switchTo", { name })}
            onClick={() => onSelect(character.slug)}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors duration-200 ease-heritage",
              active
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-(--line-soft) hover:border-gold",
            )}
          >
            <CharacterAvatar
              src={character.avatar}
              name={name}
              className="size-9 rounded-pill text-sm"
            />
            <span className="whitespace-nowrap font-medium">{name}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The interactive majlis: loads the character roster from the API, shows
 * editorial portrait cards, and swaps to a rail + streaming ChatPanel once
 * a character is chosen. Client-fetched so the page never depends on the
 * API at build time.
 */
export function CharacterGrid() {
  const t = useTranslations("chat");
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const reduced = useReducedMotion() ?? false;

  const [characters, setCharacters] = useState<CharacterOut[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    setCharacters(null);
    try {
      setCharacters(await getCharacters());
    } catch {
      setLoadFailed(true);
      setCharacters([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (characters === null) return <GridSkeleton label={t("grid.loading")} />;

  if (loadFailed || characters.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-clay/40 bg-clay/10 p-6">
        <p className="font-bold">{t("grid.empty")}</p>
        <p className="text-sm opacity-80">{t("grid.emptyHint")}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          {t("panel.retry")}
        </Button>
      </div>
    );
  }

  const selected = characters.find((c) => c.slug === selectedSlug);

  if (selected) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: HERITAGE_EASE }}
        className="flex flex-col gap-6 lg:grid lg:grid-cols-[260px_1fr] lg:items-start"
      >
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSlug(null)}
            className="self-start"
          >
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("panel.backToAll")}
          </Button>
          <CharacterRail
            characters={characters}
            selectedSlug={selected.slug}
            locale={locale}
            onSelect={setSelectedSlug}
          />
        </div>
        <ChatPanel key={selected.slug} character={selected} locale={locale} />
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character, index) => (
        <CharacterCard
          key={character.slug}
          character={character}
          locale={locale}
          index={index}
          reduced={reduced}
          ctaLabel={t("grid.startChat")}
          onSelect={setSelectedSlug}
        />
      ))}
    </div>
  );
}
