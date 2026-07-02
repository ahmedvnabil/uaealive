"use client";

/**
 * Community contribution form — POSTs to /api/v1/community/submissions via
 * `submitContribution`. Client validation mirrors the server DTO
 * (`SubmissionIn`): type ∈ {story, photo, memory, document}, payload well
 * under the 10 KB cap, contact ≤ 255 chars. Everything lands in the moderated
 * pending queue; success shows «شكراً — قيد المراجعة».
 */

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ApiError, submitContribution, track } from "@/lib/api";
import type { SubmissionResult, SubmissionType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Client-side limits — keep the JSON payload far below the server's 10 KB cap. */
const LIMITS = {
  title: 200,
  body: 4000,
  url: 1000,
  note: 500,
  contact: 255,
} as const;

const TYPES: SubmissionType[] = ["story", "photo", "memory", "document"];

/** Types whose main content is free text (vs. a link in v1). */
const TEXT_TYPES: ReadonlySet<SubmissionType> = new Set(["story", "memory"]);

type FieldKey = "title" | "body" | "url" | "contact";
type FieldErrors = Partial<Record<FieldKey, string>>;
type Status = "idle" | "submitting" | "success";

const INPUT_CLASSES = cn(
  "w-full rounded-md border bg-transparent px-4 py-3 text-base",
  "placeholder:opacity-40 transition-colors duration-200 ease-heritage",
  "focus:border-gold",
);

function fieldBorder(hasError: boolean): string {
  return hasError ? "border-clay" : "border-(--line-soft)";
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface FieldErrorProps {
  id: string;
  message?: string;
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-clay">
      {message}
    </p>
  );
}

export function SubmissionForm() {
  const t = useTranslations("community");
  const locale = useLocale();
  const reducedMotion = useReducedMotion();

  const [type, setType] = useState<SubmissionType>("story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const isTextType = TEXT_TYPES.has(type);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = t("form.errors.title");
    else if (title.trim().length > LIMITS.title)
      errors.title = t("form.errors.titleMax", { max: LIMITS.title });
    if (isTextType) {
      if (!body.trim()) errors.body = t("form.errors.body");
      else if (body.trim().length > LIMITS.body)
        errors.body = t("form.errors.bodyMax", { max: LIMITS.body });
    } else if (!isHttpUrl(url.trim()) || url.trim().length > LIMITS.url) {
      errors.url = t("form.errors.url");
    }
    if (contact.trim().length > LIMITS.contact)
      errors.contact = t("form.errors.contactMax", { max: LIMITS.contact });
    return errors;
  }

  function focusFirstInvalid(errors: FieldErrors) {
    const first = (["title", "body", "url", "contact"] as const).find(
      (key) => errors[key],
    );
    if (!first) return;
    requestAnimationFrame(() => {
      document.getElementById(`community-${first}`)?.focus();
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }
    setStatus("submitting");
    setApiError(null);
    const content: Record<string, unknown> = { title: title.trim(), locale };
    if (isTextType) content.body = body.trim();
    else {
      content.url = url.trim();
      if (note.trim()) content.note = note.trim();
    }
    try {
      const submitted = await submitContribution({
        type,
        payload: content,
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      });
      setResult(submitted);
      setStatus("success");
      void track("submission", { type });
      requestAnimationFrame(() => successHeadingRef.current?.focus());
    } catch (error: unknown) {
      setStatus("idle");
      const rateLimited = error instanceof ApiError && error.status === 429;
      setApiError(
        rateLimited ? t("form.errors.rateLimited") : t("form.errors.generic"),
      );
    }
  }

  function resetForm() {
    setType("story");
    setTitle("");
    setBody("");
    setUrl("");
    setNote("");
    setContact("");
    setFieldErrors({});
    setApiError(null);
    setResult(null);
    setStatus("idle");
  }

  if (status === "success" && result) {
    return (
      <motion.section
        aria-labelledby="community-success-title"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-md border border-oasis/50 bg-oasis/10 p-8 sm:p-10"
      >
        <span aria-hidden className="mb-6 block h-px w-12 bg-oasis" />
        <h2
          id="community-success-title"
          ref={successHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold outline-none sm:text-3xl"
        >
          {t("success.title")}
        </h2>
        <p className="mt-4 max-w-xl text-base opacity-80">{t("success.body")}</p>
        <p className="mt-2 text-sm font-medium tracking-wide text-gold">
          {t("success.reference", { id: result.id })}
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-8 inline-flex items-center rounded-md border border-(--line-soft) px-5 py-2.5 text-sm font-medium transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
        >
          {t("success.again")}
        </button>
      </motion.section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.2em] text-gold uppercase">
          {t("form.legendType")}
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TYPES.map((value) => {
            const checked = type === value;
            return (
              <label
                key={value}
                className={cn(
                  "block cursor-pointer rounded-md border p-4",
                  "transition-colors duration-200 ease-heritage",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-bright",
                  checked
                    ? "border-gold bg-mist"
                    : "border-(--line-soft) hover:border-gold/50",
                )}
              >
                <input
                  type="radio"
                  name="community-type"
                  value={value}
                  checked={checked}
                  onChange={() => setType(value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "block text-base font-bold",
                    checked && "text-gold-bright",
                  )}
                >
                  {t(`form.types.${value}.label`)}
                </span>
                <span className="mt-1 block text-sm opacity-70">
                  {t(`form.types.${value}.hint`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="community-title" className="text-sm font-semibold">
          {t("form.title.label")}
        </label>
        <input
          id="community-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={LIMITS.title}
          required
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "community-title-error" : undefined}
          placeholder={t("form.title.placeholder")}
          className={cn(INPUT_CLASSES, fieldBorder(Boolean(fieldErrors.title)))}
        />
        <FieldError id="community-title-error" message={fieldErrors.title} />
      </div>

      {isTextType ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="community-body" className="text-sm font-semibold">
            {t("form.body.label")}
          </label>
          <textarea
            id="community-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={LIMITS.body}
            required
            rows={7}
            aria-invalid={fieldErrors.body ? true : undefined}
            aria-describedby={fieldErrors.body ? "community-body-error" : undefined}
            placeholder={t("form.body.placeholder")}
            className={cn(
              INPUT_CLASSES,
              "resize-y",
              fieldBorder(Boolean(fieldErrors.body)),
            )}
          />
          <div className="flex items-baseline justify-between gap-4">
            <FieldError id="community-body-error" message={fieldErrors.body} />
            <p aria-hidden className="ms-auto text-xs tabular-nums opacity-50">
              {t("form.charsLeft", { count: LIMITS.body - body.length })}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="community-url" className="text-sm font-semibold">
              {t("form.url.label")}
            </label>
            <input
              id="community-url"
              type="url"
              dir="ltr"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={LIMITS.url}
              required
              aria-invalid={fieldErrors.url ? true : undefined}
              aria-describedby={
                fieldErrors.url
                  ? "community-url-error community-url-hint"
                  : "community-url-hint"
              }
              placeholder={t("form.url.placeholder")}
              className={cn(INPUT_CLASSES, fieldBorder(Boolean(fieldErrors.url)))}
            />
            <FieldError id="community-url-error" message={fieldErrors.url} />
            <p id="community-url-hint" className="text-sm opacity-60">
              {t("form.url.hint")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="community-note" className="text-sm font-semibold">
              {t("form.note.label")}
            </label>
            <textarea
              id="community-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={LIMITS.note}
              rows={3}
              placeholder={t("form.note.placeholder")}
              className={cn(INPUT_CLASSES, "resize-y", fieldBorder(false))}
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="community-contact" className="text-sm font-semibold">
          {t("form.contact.label")}
        </label>
        <input
          id="community-contact"
          type="text"
          dir="auto"
          autoComplete="email"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          maxLength={LIMITS.contact}
          aria-invalid={fieldErrors.contact ? true : undefined}
          aria-describedby={
            fieldErrors.contact
              ? "community-contact-error community-contact-hint"
              : "community-contact-hint"
          }
          placeholder={t("form.contact.placeholder")}
          className={cn(INPUT_CLASSES, fieldBorder(Boolean(fieldErrors.contact)))}
        />
        <FieldError id="community-contact-error" message={fieldErrors.contact} />
        <p id="community-contact-hint" className="text-sm opacity-60">
          {t("form.contact.hint")}
        </p>
      </div>

      {apiError ? (
        <p
          role="alert"
          className="rounded-md border border-clay/60 bg-clay/10 px-4 py-3 text-sm font-medium text-clay"
        >
          {apiError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "inline-flex items-center justify-center self-start rounded-md",
            "bg-gold px-7 py-3 text-base font-medium text-night",
            "transition-colors duration-200 ease-heritage hover:bg-gold-bright",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {status === "submitting" ? t("form.submitting") : t("form.submit")}
        </button>
        <p className="text-xs opacity-60">{t("form.moderationNote")}</p>
      </div>
    </form>
  );
}
