"use client";

import { useRef, useState } from "react";
import { Compass, MapPin, RotateCcw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { streamTour, track } from "@/lib/api";
import type { Locale, StreamSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";

const INTERESTS = [
  "history",
  "architecture",
  "art",
  "coffee",
  "food",
  "culture",
] as const;
const DURATIONS = [30, 60, 90, 120] as const;
const AUDIENCES = ["tourist", "family", "kids", "expert"] as const;

type Status = "idle" | "streaming" | "done" | "error";

/** Strip light markdown (**bold**, *italic*, `code`, leading #/-) the model
 *  may emit despite the plain-text instruction. */
function cleanLine(line: string): string {
  return line
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/(^|\s)\*(\S)/g, "$1$2")
    .replace(/(\S)\*(\s|$)/g, "$1$2")
    .trim();
}

/** True for markdown horizontal rules / empty separators. */
function isSeparator(line: string): boolean {
  return /^[-*_\s]{3,}$/.test(line.trim());
}

/** Split a numbered "1. Name — text" (or "Stop 1 — …") line for styled rendering. */
function parseStop(line: string): { n?: string; rest: string } {
  const numbered = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
  if (numbered) return { n: numbered[1], rest: numbered[2] };
  const stop = line.match(/^\s*Stop\s+(\d+)\s*[—:-]?\s*(.*)$/i);
  if (stop) return { n: stop[1], rest: stop[2] };
  return { rest: line };
}

export function TourPlanner() {
  const t = useTranslations("copilot");
  const locale = useLocale() as Locale;

  const [interests, setInterests] = useState<Set<string>>(new Set(["history"]));
  const [duration, setDuration] = useState<number>(60);
  const [audience, setAudience] = useState<string>("tourist");
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [source, setSource] = useState<StreamSource | null>(null);
  const [validation, setValidation] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const toggleInterest = (key: string) =>
    setInterests((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async () => {
    if (interests.size === 0) {
      setValidation(true);
      return;
    }
    setValidation(false);
    setStatus("streaming");
    setText("");
    setSource(null);
    void track("copilot_tour", {
      interests: [...interests].join(","),
      duration_min: duration,
      audience,
    });
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      await streamTour(
        {
          interests: [...interests],
          duration_min: duration,
          audience,
          locale,
        },
        (delta) => setText((current) => current + delta),
        (streamSource) => {
          setSource(streamSource);
          setStatus("done");
        },
      );
    } catch {
      setStatus("error");
    }
  };

  const busy = status === "streaming";
  const lines = text
    .split("\n")
    .map(cleanLine)
    .filter((line) => line.length > 0 && !isSeparator(line));

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      {/* --- Form --- */}
      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset>
          <legend className="text-base font-bold">
            {t("form.interestsLabel")}
          </legend>
          <p className="mt-1 text-sm opacity-60">{t("form.interestsHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {INTERESTS.map((key) => {
              const on = interests.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleInterest(key)}
                  className={cn(
                    "rounded-pill border px-4 py-2 text-sm transition-colors duration-200 ease-heritage",
                    on
                      ? "border-gold bg-gold/15 font-semibold text-gold-bright"
                      : "border-(--line-soft) opacity-80 hover:opacity-100",
                  )}
                >
                  {t(`form.interests.${key}`)}
                </button>
              );
            })}
          </div>
          {validation ? (
            <p role="alert" className="mt-3 text-sm text-clay">
              {t("form.needInterest")}
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold">
            {t("form.durationLabel")}
          </legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={duration === value}
                onClick={() => setDuration(value)}
                className={cn(
                  "rounded-xs border px-4 py-2 text-sm tabular-nums transition-colors duration-200 ease-heritage",
                  duration === value
                    ? "border-gold bg-gold/15 font-semibold text-gold-bright"
                    : "border-(--line-soft) opacity-80 hover:opacity-100",
                )}
              >
                {t(`form.duration.${value}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold">
            {t("form.audienceLabel")}
          </legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {AUDIENCES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={audience === value}
                onClick={() => setAudience(value)}
                className={cn(
                  "rounded-xs border px-4 py-2 text-sm transition-colors duration-200 ease-heritage",
                  audience === value
                    ? "border-gold bg-gold/15 font-semibold text-gold-bright"
                    : "border-(--line-soft) opacity-80 hover:opacity-100",
                )}
              >
                {t(`form.audience.${value}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <Button type="submit" size="lg" disabled={busy} className="self-start">
          {busy ? (
            <>
              <Sparkles aria-hidden className="size-4 animate-pulse" />
              {t("form.planning")}
            </>
          ) : status === "done" || status === "error" ? (
            <>
              <RotateCcw aria-hidden className="size-4" />
              {t("form.again")}
            </>
          ) : (
            <>
              <Compass aria-hidden className="size-4" />
              {t("form.submit")}
            </>
          )}
        </Button>
      </form>

      {/* --- Result --- */}
      <div ref={resultRef} aria-live="polite" className="min-h-[12rem]">
        {status === "idle" ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center rounded-md border border-dashed border-(--line-soft) p-8 text-center text-sm opacity-50">
            <span className="flex flex-col items-center gap-3">
              <Compass aria-hidden className="size-8 text-gold/50" />
              {t("hero.lede")}
            </span>
          </div>
        ) : status === "error" ? (
          <p role="alert" className="rounded-md border border-clay/40 bg-clay/10 p-6 text-sm">
            {t("result.error")}
          </p>
        ) : (
          <article className="rounded-md border border-(--line-soft) p-6 sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line-soft) pb-4">
              <h2 className="text-xl font-bold">{t("result.title")}</h2>
              {source ? (
                <span
                  className={cn(
                    "rounded-pill px-3 py-1 text-xs font-medium",
                    source === "live"
                      ? "bg-oasis/20 text-oasis"
                      : "bg-mist opacity-70",
                  )}
                >
                  {source === "live" ? t("result.live") : t("result.fallback")}
                </span>
              ) : (
                <Sparkles aria-hidden className="size-4 animate-pulse text-gold" />
              )}
            </header>

            <ol className="mt-6 flex flex-col gap-4">
              {lines.map((line, index) => {
                const { n, rest } = parseStop(line);
                if (!n) {
                  return (
                    <li
                      key={index}
                      className="text-base leading-relaxed opacity-80"
                    >
                      {rest}
                    </li>
                  );
                }
                return (
                  <li key={index} className="flex gap-4">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-pill border border-gold text-sm font-bold text-gold-bright tabular-nums"
                    >
                      {n}
                    </span>
                    <p className="text-base leading-relaxed">{rest}</p>
                  </li>
                );
              })}
            </ol>

            {status === "done" ? (
              <div className="mt-8 flex flex-wrap gap-3 border-t border-(--line-soft) pt-6">
                <Link
                  href="/map"
                  className={buttonClasses("outline", "sm")}
                >
                  <MapPin aria-hidden className="size-4" />
                  {t("result.openMap")}
                </Link>
                <Link
                  href="/stories"
                  className={buttonClasses("ghost", "sm")}
                >
                  {t("result.openStories")}
                </Link>
              </div>
            ) : null}
          </article>
        )}
      </div>
    </div>
  );
}
