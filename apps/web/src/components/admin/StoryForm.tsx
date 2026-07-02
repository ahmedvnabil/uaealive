"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Audience, Localized, StoryOut } from "@/lib/types";
import type { StoryInput } from "@/lib/adminApi";
import { pickLocale } from "@/lib/utils";
import { BilingualField, Field, FormActions, inputClasses } from "./fields";

export interface PoiOption {
  slug: string;
  name: Localized;
}

export interface StoryFormProps {
  initial: StoryOut | null;
  busy: boolean;
  error: string | null;
  onSubmit: (input: StoryInput) => void;
  onCancel: () => void;
  /** POIs available for the "linked POI" select. */
  poiOptions: PoiOption[];
}

const AUDIENCES: Audience[] = ["tourist", "kids", "expert"];

/** Bilingual create/edit form for a story (mirrors the API `StoryIn` schema). */
export function StoryForm({
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
  poiOptions,
}: StoryFormProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [poiSlug, setPoiSlug] = useState(
    initial?.poi_slug ?? poiOptions[0]?.slug ?? "",
  );
  const [audience, setAudience] = useState<Audience>(
    initial?.audience ?? "tourist",
  );
  const [title, setTitle] = useState<Localized>({
    ar: initial?.title.ar ?? "",
    en: initial?.title.en ?? "",
  });
  const [body, setBody] = useState<Localized>({
    ar: initial?.body.ar ?? "",
    en: initial?.body.en ?? "",
  });
  const [sources, setSources] = useState(initial?.sources.join("\n") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const required = t("form.required");
    if (!poiSlug) next.poi = required;
    if (!title.ar.trim() || !title.en.trim()) next.title = required;
    if (!body.ar.trim() || !body.en.trim()) next.body = required;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      poi_slug: poiSlug,
      audience,
      title: { ar: title.ar.trim(), en: title.en.trim() },
      body: { ar: body.ar.trim(), en: body.en.trim() },
      sources: sources
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="story-poi" label={t("stories.fields.poi")} error={errors.poi}>
          <select
            id="story-poi"
            value={poiSlug}
            onChange={(event) => setPoiSlug(event.target.value)}
            className={inputClasses}
          >
            {poiOptions.map((poi) => (
              <option key={poi.slug} value={poi.slug}>
                {pickLocale(poi.name, locale)} — {poi.slug}
              </option>
            ))}
          </select>
        </Field>
        <Field id="story-audience" label={t("stories.fields.audience")}>
          <select
            id="story-audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as Audience)}
            className={inputClasses}
          >
            {AUDIENCES.map((value) => (
              <option key={value} value={value}>
                {t(`stories.audiences.${value}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <BilingualField
        idBase="story-title"
        label={t("stories.fields.title")}
        value={title}
        onChange={setTitle}
        error={errors.title}
      />
      <BilingualField
        idBase="story-body"
        label={t("stories.fields.body")}
        value={body}
        onChange={setBody}
        textarea
        rows={8}
        error={errors.body}
      />

      <Field
        id="story-sources"
        label={t("stories.fields.sources")}
        hint={t("stories.fields.sourcesHint")}
      >
        <textarea
          id="story-sources"
          rows={3}
          dir="ltr"
          value={sources}
          onChange={(event) => setSources(event.target.value)}
          className={inputClasses}
        />
      </Field>

      <FormActions busy={busy} error={error} onCancel={onCancel} />
    </form>
  );
}
