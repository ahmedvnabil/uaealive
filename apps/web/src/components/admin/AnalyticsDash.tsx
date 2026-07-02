"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AdminAuthError,
  getAnalyticsSummary,
  type AnalyticsSummary,
} from "@/lib/adminApi";
import { Card } from "@/components/ui/Card";
import { cn, isRtl } from "@/lib/utils";

export interface AnalyticsDashProps {
  onAuthError: () => void;
}

interface BarItem {
  label: string;
  count: number;
}

/** One horizontal SVG bar (no chart lib) — flipped so it grows from the start edge in RTL. */
function BarRow({ item, max, rtl }: { item: BarItem; max: number; rtl: boolean }) {
  const pct = max > 0 ? Math.max((item.count / max) * 100, 2) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
      <span dir="ltr" className="truncate text-sm text-start opacity-80">
        {item.label}
      </span>
      <svg
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden
        className={cn("h-2 w-full", rtl && "-scale-x-100")}
      >
        <rect x="0" y="0" width="100" height="8" rx="1" className="fill-mist" />
        <rect x="0" y="0" width={pct} height="8" rx="1" className="fill-gold" />
      </svg>
      <span className="text-sm font-semibold tabular-nums text-gold-bright">
        {item.count}
      </span>
    </li>
  );
}

function BarList({
  title,
  items,
  emptyLabel,
  rtl,
}: {
  title: string;
  items: BarItem[];
  emptyLabel: string;
  rtl: boolean;
}) {
  const max = items.reduce((acc, item) => Math.max(acc, item.count), 0);
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm opacity-50">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <BarRow key={item.label} item={item} max={max} rtl={rtl} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatTile({ label, value, locale }: { label: string; value: number; locale: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="text-4xl font-bold tabular-nums text-gold-bright">
        {new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-GB").format(value)}
      </p>
    </Card>
  );
}

/** Usage analytics: stat tiles + lightweight SVG bar lists. */
export function AnalyticsDash({ onAuthError }: AnalyticsDashProps) {
  const t = useTranslations("admin.analytics");
  const tList = useTranslations("admin.list");
  const locale = useLocale();
  const rtl = isRtl(locale);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setSummary(await getAnalyticsSummary());
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <p className="rounded-md border border-(--line-soft) px-6 py-10 text-center text-sm opacity-60">
        {tList("loading")}
      </p>
    );
  }

  if (loadError || summary === null) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-(--line-soft) px-6 py-10">
        <p role="alert" className="text-sm text-clay">
          {tList("loadError")}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-(--line-soft) px-4 py-2 text-sm transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
        >
          {tList("retry")}
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-(--line-soft) px-4 py-2 text-sm transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
        >
          {t("refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label={t("totalEvents")} value={summary.total_events} locale={locale} />
        <StatTile label={t("chatMessages")} value={summary.chat_messages} locale={locale} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarList
          title={t("byPage")}
          items={summary.by_page.map((row) => ({ label: row.page, count: row.count }))}
          emptyLabel={t("empty")}
          rtl={rtl}
        />
        <BarList
          title={t("topPois")}
          items={summary.top_pois.map((row) => ({ label: row.poi, count: row.count }))}
          emptyLabel={t("empty")}
          rtl={rtl}
        />
        <BarList
          title={t("byLang")}
          items={summary.by_lang.map((row) => ({ label: row.lang, count: row.count }))}
          emptyLabel={t("empty")}
          rtl={rtl}
        />
      </div>
    </section>
  );
}
