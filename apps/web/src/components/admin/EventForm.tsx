"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EventOut, Localized } from "@/lib/types";
import type { EventInput } from "@/lib/adminApi";
import { BilingualField, Field, FormActions, inputClasses } from "./fields";

export interface EventFormProps {
  initial: EventOut | null;
  busy: boolean;
  error: string | null;
  onSubmit: (input: EventInput) => void;
  onCancel: () => void;
}

function localized(value: Localized | undefined): Localized {
  return { ar: value?.ar ?? "", en: value?.en ?? "" };
}

/** Bilingual create/edit form for an event (mirrors the API `EventIn` schema). */
export function EventForm({ initial, busy, error, onSubmit, onCancel }: EventFormProps) {
  const t = useTranslations("admin");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "");
  const [title, setTitle] = useState<Localized>(localized(initial?.title));
  const [description, setDescription] = useState<Localized>(
    localized(initial?.description),
  );
  const [location, setLocation] = useState<Localized>(localized(initial?.location));
  const [startsOn, setStartsOn] = useState(initial?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(initial?.ends_on ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const required = t("form.required");
    if (!slug.trim()) next.slug = required;
    if (!kind.trim()) next.kind = required;
    if (!title.ar.trim() || !title.en.trim()) next.title = required;
    if (!description.ar.trim() || !description.en.trim()) next.description = required;
    if (!location.ar.trim() || !location.en.trim()) next.location = required;
    if (!startsOn) next.startsOn = required;
    if (!endsOn) next.endsOn = required;
    if (startsOn && endsOn && endsOn < startsOn) {
      next.endsOn = t("events.errors.datesOrder");
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      slug: slug.trim(),
      kind: kind.trim(),
      title: { ar: title.ar.trim(), en: title.en.trim() },
      description: { ar: description.ar.trim(), en: description.en.trim() },
      starts_on: startsOn,
      ends_on: endsOn,
      location: { ar: location.ar.trim(), en: location.en.trim() },
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="event-slug" label={t("events.fields.slug")} error={errors.slug}>
          <input
            id="event-slug"
            type="text"
            dir="ltr"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field
          id="event-kind"
          label={t("events.fields.kind")}
          hint={t("events.fields.kindHint")}
          error={errors.kind}
        >
          <input
            id="event-kind"
            type="text"
            dir="ltr"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <BilingualField
        idBase="event-title"
        label={t("events.fields.title")}
        value={title}
        onChange={setTitle}
        error={errors.title}
      />
      <BilingualField
        idBase="event-description"
        label={t("events.fields.description")}
        value={description}
        onChange={setDescription}
        textarea
        error={errors.description}
      />
      <BilingualField
        idBase="event-location"
        label={t("events.fields.location")}
        value={location}
        onChange={setLocation}
        error={errors.location}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="event-starts"
          label={t("events.fields.startsOn")}
          error={errors.startsOn}
        >
          <input
            id="event-starts"
            type="date"
            dir="ltr"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field id="event-ends" label={t("events.fields.endsOn")} error={errors.endsOn}>
          <input
            id="event-ends"
            type="date"
            dir="ltr"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <FormActions busy={busy} error={error} onCancel={onCancel} />
    </form>
  );
}
