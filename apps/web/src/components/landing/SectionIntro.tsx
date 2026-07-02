"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export interface SectionIntroProps {
  /** id placed on the `<h2>` so sections can use `aria-labelledby`. */
  id: string;
  kicker: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  className?: string;
}

/**
 * Editorial section opener: gold kicker, hairline rule, display title.
 *
 * Letter-spacing is applied to the kicker ONLY in Latin — tracking breaks
 * the joined letterforms of Arabic script, so `ar` renders it plain.
 */
export function SectionIntro({
  id,
  kicker,
  title,
  description,
  align = "start",
  className,
}: SectionIntroProps) {
  const locale = useLocale();
  const centered = align === "center";

  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        centered && "items-center text-center",
        className,
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold text-gold",
          locale === "en" && "tracking-[0.25em] uppercase",
        )}
      >
        {kicker}
      </p>
      <span aria-hidden className="h-px w-12 bg-gold" />
      <h2 id={id} className="text-3xl font-bold text-balance sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-pretty opacity-75">
          {description}
        </p>
      ) : null}
    </header>
  );
}
