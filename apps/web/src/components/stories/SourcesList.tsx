"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface SourcesListProps {
  sources: string[];
  className?: string;
}

/** Numbered list of verifiable sources for the active story. */
export function SourcesList({ sources, className }: SourcesListProps) {
  const t = useTranslations("stories");
  if (sources.length === 0) return null;

  return (
    <section className={cn("border-t border-(--line-soft) pt-8", className)}>
      <h2 className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
        {t("sources.title")}
      </h2>
      <ol className="mt-4 space-y-3">
        {sources.map((source, index) => (
          <li key={source} className="flex items-baseline gap-3 text-sm">
            <span aria-hidden className="tabular-nums font-semibold text-gold">
              {String(index + 1).padStart(2, "0")}
            </span>
            <a
              href={source}
              target="_blank"
              rel="noreferrer noopener"
              dir="ltr"
              className="break-all text-start underline decoration-(--line-soft) underline-offset-4 transition-colors duration-200 ease-heritage hover:text-gold-bright hover:decoration-gold"
            >
              {source}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
