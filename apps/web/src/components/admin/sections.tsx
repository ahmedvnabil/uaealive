"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { EventOut, PoiOut, StoryOut } from "@/lib/types";
import { getEvents, getPois, getStories } from "@/lib/api";
import {
  createEvent,
  createPoi,
  createStory,
  deleteEvent,
  deletePoi,
  deleteStory,
  updateEvent,
  updatePoi,
  updateStory,
} from "@/lib/adminApi";
import { formatDate, pickLocale } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ResourceManager } from "./ResourceManager";
import { PoiForm } from "./PoiForm";
import { StoryForm, type PoiOption } from "./StoryForm";
import { EventForm } from "./EventForm";

export interface SectionProps {
  onAuthError: () => void;
}

const slugCell = (value: string) => (
  <code dir="ltr" className="rounded-xs bg-mist px-1.5 py-0.5 font-mono text-xs">
    {value}
  </code>
);

/** POIs tab — public list + admin CRUD. */
export function PoisSection({ onAuthError }: SectionProps) {
  const t = useTranslations("admin.pois");
  const locale = useLocale();

  return (
    <ResourceManager<PoiOut, Parameters<typeof createPoi>[0]>
      title={t("addTitle")}
      addTitle={t("addTitle")}
      editTitle={t("editTitle")}
      load={() => getPois()}
      create={createPoi}
      update={updatePoi}
      remove={deletePoi}
      onAuthError={onAuthError}
      columns={[
        { key: "slug", header: t("columns.slug"), render: (row) => slugCell(row.slug) },
        { key: "kind", header: t("columns.kind"), render: (row) => <Badge>{row.kind}</Badge> },
        {
          key: "name",
          header: t("columns.name"),
          render: (row) => (
            <span className="font-medium">{pickLocale(row.name, locale)}</span>
          ),
        },
        {
          key: "coords",
          header: t("columns.coords"),
          render: (row) => (
            <span dir="ltr" className="font-mono text-xs opacity-70">
              {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
            </span>
          ),
        },
        {
          key: "order",
          header: t("columns.order"),
          render: (row) => <span className="tabular-nums">{row.order}</span>,
        },
      ]}
      renderForm={(props) => <PoiForm {...props} />}
    />
  );
}

/** Stories tab — needs the POI list for the "linked POI" select. */
export function StoriesSection({ onAuthError }: SectionProps) {
  const t = useTranslations("admin.stories");
  const locale = useLocale();
  const [poiOptions, setPoiOptions] = useState<PoiOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPois()
      .then((pois) => {
        if (cancelled) return;
        setPoiOptions(pois.map(({ slug, name }) => ({ slug, name })));
      })
      .catch(() => {
        // The form select stays empty; saving without a POI is blocked client-side.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResourceManager<StoryOut, Parameters<typeof createStory>[0]>
      title={t("addTitle")}
      addTitle={t("addTitle")}
      editTitle={t("editTitle")}
      load={() => getStories()}
      create={createStory}
      update={updateStory}
      remove={deleteStory}
      onAuthError={onAuthError}
      columns={[
        { key: "poi", header: t("columns.poi"), render: (row) => slugCell(row.poi_slug) },
        {
          key: "audience",
          header: t("columns.audience"),
          render: (row) => (
            <Badge tone="gold">
              {t(`audiences.${row.audience as "tourist" | "kids" | "expert"}`)}
            </Badge>
          ),
        },
        {
          key: "title",
          header: t("columns.title"),
          render: (row) => (
            <span className="font-medium">{pickLocale(row.title, locale)}</span>
          ),
        },
      ]}
      renderForm={(props) => <StoryForm {...props} poiOptions={poiOptions} />}
    />
  );
}

/** Events tab. */
export function EventsSection({ onAuthError }: SectionProps) {
  const t = useTranslations("admin.events");
  const locale = useLocale();

  return (
    <ResourceManager<EventOut, Parameters<typeof createEvent>[0]>
      title={t("addTitle")}
      addTitle={t("addTitle")}
      editTitle={t("editTitle")}
      load={() => getEvents()}
      create={createEvent}
      update={updateEvent}
      remove={deleteEvent}
      onAuthError={onAuthError}
      columns={[
        { key: "slug", header: t("columns.slug"), render: (row) => slugCell(row.slug) },
        { key: "kind", header: t("columns.kind"), render: (row) => <Badge>{row.kind}</Badge> },
        {
          key: "title",
          header: t("columns.title"),
          render: (row) => (
            <span className="font-medium">{pickLocale(row.title, locale)}</span>
          ),
        },
        {
          key: "dates",
          header: t("columns.dates"),
          render: (row) => (
            <span className="text-xs opacity-70">
              {formatDate(row.starts_on, locale as Locale)} —{" "}
              {formatDate(row.ends_on, locale as Locale)}
            </span>
          ),
        },
      ]}
      renderForm={(props) => <EventForm {...props} />}
    />
  );
}
