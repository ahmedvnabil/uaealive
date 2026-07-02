"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PoiOut } from "@/lib/types";
import type { PoiInput } from "@/lib/adminApi";
import { BilingualField, Field, FormActions, inputClasses } from "./fields";

export interface PoiFormProps {
  initial: PoiOut | null;
  busy: boolean;
  error: string | null;
  onSubmit: (input: PoiInput) => void;
  onCancel: () => void;
}

interface PoiDraft {
  slug: string;
  kind: string;
  name: { ar: string; en: string };
  summary: { ar: string; en: string };
  lat: string;
  lng: string;
  eraBuilt: string;
  heroImage: string;
  order: string;
  wheelchair: boolean;
  audio: boolean;
}

function draftFrom(initial: PoiOut | null): PoiDraft {
  return {
    slug: initial?.slug ?? "",
    kind: initial?.kind ?? "",
    name: { ar: initial?.name.ar ?? "", en: initial?.name.en ?? "" },
    summary: { ar: initial?.summary.ar ?? "", en: initial?.summary.en ?? "" },
    lat: initial ? String(initial.lat) : "",
    lng: initial ? String(initial.lng) : "",
    eraBuilt: initial?.era_built ?? "",
    heroImage: initial?.hero_image ?? "",
    order: String(initial?.order ?? 0),
    wheelchair: initial?.accessibility.wheelchair ?? false,
    audio: initial?.accessibility.audio ?? false,
  };
}

function numberIn(value: string, min: number, max: number): number | null {
  const parsed = Number(value.trim());
  if (value.trim() === "" || Number.isNaN(parsed)) return null;
  return parsed >= min && parsed <= max ? parsed : null;
}

/** Bilingual create/edit form for a POI (mirrors the API `PoiIn` schema). */
export function PoiForm({ initial, busy, error, onSubmit, onCancel }: PoiFormProps) {
  const t = useTranslations("admin");
  const [draft, setDraft] = useState<PoiDraft>(() => draftFrom(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof PoiDraft>(key: K, value: PoiDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const required = t("form.required");
    if (!draft.slug.trim()) next.slug = required;
    if (!draft.kind.trim()) next.kind = required;
    if (!draft.name.ar.trim() || !draft.name.en.trim()) next.name = required;
    if (!draft.summary.ar.trim() || !draft.summary.en.trim()) next.summary = required;
    const lat = numberIn(draft.lat, -90, 90);
    const lng = numberIn(draft.lng, -180, 180);
    if (lat === null) next.lat = t("form.invalidNumber");
    if (lng === null) next.lng = t("form.invalidNumber");
    const order = Number.parseInt(draft.order, 10);
    if (Number.isNaN(order)) next.order = t("form.invalidNumber");
    setErrors(next);
    if (Object.keys(next).length > 0 || lat === null || lng === null) return;

    onSubmit({
      slug: draft.slug.trim(),
      kind: draft.kind.trim(),
      name: { ar: draft.name.ar.trim(), en: draft.name.en.trim() },
      summary: { ar: draft.summary.ar.trim(), en: draft.summary.en.trim() },
      lat,
      lng,
      era_built: draft.eraBuilt.trim() || null,
      accessibility: { wheelchair: draft.wheelchair, audio: draft.audio },
      hero_image: draft.heroImage.trim() || null,
      order,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="poi-slug" label={t("pois.fields.slug")} error={errors.slug}>
          <input
            id="poi-slug"
            type="text"
            dir="ltr"
            value={draft.slug}
            onChange={(event) => set("slug", event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field
          id="poi-kind"
          label={t("pois.fields.kind")}
          hint={t("pois.fields.kindHint")}
          error={errors.kind}
        >
          <input
            id="poi-kind"
            type="text"
            dir="ltr"
            value={draft.kind}
            onChange={(event) => set("kind", event.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <BilingualField
        idBase="poi-name"
        label={t("pois.fields.name")}
        value={draft.name}
        onChange={(value) => set("name", value)}
        error={errors.name}
      />
      <BilingualField
        idBase="poi-summary"
        label={t("pois.fields.summary")}
        value={draft.summary}
        onChange={(value) => set("summary", value)}
        textarea
        error={errors.summary}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="poi-lat" label={t("pois.fields.lat")} error={errors.lat}>
          <input
            id="poi-lat"
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={draft.lat}
            onChange={(event) => set("lat", event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field id="poi-lng" label={t("pois.fields.lng")} error={errors.lng}>
          <input
            id="poi-lng"
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={draft.lng}
            onChange={(event) => set("lng", event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field id="poi-order" label={t("pois.fields.order")} error={errors.order}>
          <input
            id="poi-order"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={draft.order}
            onChange={(event) => set("order", event.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="poi-era"
          label={`${t("pois.fields.eraBuilt")} (${t("form.optional")})`}
        >
          <input
            id="poi-era"
            type="text"
            value={draft.eraBuilt}
            onChange={(event) => set("eraBuilt", event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field
          id="poi-hero"
          label={`${t("pois.fields.heroImage")} (${t("form.optional")})`}
        >
          <input
            id="poi-hero"
            type="text"
            dir="ltr"
            value={draft.heroImage}
            onChange={(event) => set("heroImage", event.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-xs font-semibold tracking-wide opacity-80">
          {t("pois.fields.accessibility")}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.wheelchair}
            onChange={(event) => set("wheelchair", event.target.checked)}
            className="size-4 accent-gold"
          />
          {t("pois.fields.wheelchair")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.audio}
            onChange={(event) => set("audio", event.target.checked)}
            className="size-4 accent-gold"
          />
          {t("pois.fields.audio")}
        </label>
      </fieldset>

      <FormActions busy={busy} error={error} onCancel={onCancel} />
    </form>
  );
}
