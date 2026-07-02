"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { getAdminToken, logoutAdmin } from "@/lib/adminApi";
import { cn, isRtl } from "@/lib/utils";
import { AnalyticsDash } from "./AnalyticsDash";
import { ModerationQueue } from "./ModerationQueue";
import { EventsSection, PoisSection, StoriesSection } from "./sections";

type TabKey = "pois" | "stories" | "events" | "moderation" | "analytics";

const TABS: TabKey[] = ["pois", "stories", "events", "moderation", "analytics"];

/**
 * Admin CMS shell: session guard, tabbed navigation
 * (POIs / stories / events / moderation / analytics), logout.
 */
export function AdminShell() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<TabKey>("pois");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const toLogin = useCallback(() => {
    logoutAdmin();
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    if (getAdminToken()) {
      setReady(true);
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  /** Roving arrow-key navigation for the tablist (direction-aware). */
  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const forwardKey = isRtl(locale) ? "ArrowLeft" : "ArrowRight";
    const backwardKey = isRtl(locale) ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === forwardKey) next = (index + 1) % TABS.length;
    if (event.key === backwardKey) next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  if (!ready) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            {t("kicker")}
          </p>
          <span aria-hidden className="h-px w-12 bg-gold" />
          <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-sm opacity-70">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={toLogin}
          className="rounded-md border border-(--line-soft) px-4 py-2 text-sm transition-colors duration-200 ease-heritage hover:border-clay hover:text-clay"
        >
          {t("logout")}
        </button>
      </header>

      <div
        role="tablist"
        aria-label={t("tabs.label")}
        className="mb-8 flex flex-wrap gap-1 border-b border-(--line-soft)"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`admin-tab-${tab}`}
            aria-selected={active === tab}
            aria-controls={`admin-panel-${tab}`}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ease-heritage",
              active === tab
                ? "border-gold text-gold-bright"
                : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`admin-panel-${active}`}
        aria-labelledby={`admin-tab-${active}`}
      >
        {active === "pois" ? <PoisSection onAuthError={toLogin} /> : null}
        {active === "stories" ? <StoriesSection onAuthError={toLogin} /> : null}
        {active === "events" ? <EventsSection onAuthError={toLogin} /> : null}
        {active === "moderation" ? <ModerationQueue onAuthError={toLogin} /> : null}
        {active === "analytics" ? <AnalyticsDash onAuthError={toLogin} /> : null}
      </div>
    </div>
  );
}
