"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Localized } from "@/lib/types";

/** Shared input recipe for all admin forms (token-only styling). */
export const inputClasses = cn(
  "w-full rounded-xs border border-(--line-soft) bg-transparent px-3 py-2 text-sm",
  "transition-colors duration-200 ease-heritage",
  "focus:border-gold focus:outline-none placeholder:opacity-40",
);

export interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + optional hint/error wrapper. */
export function Field({ id, label, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide opacity-80">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs opacity-50">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface BilingualFieldProps {
  idBase: string;
  label: string;
  value: Localized;
  onChange: (value: Localized) => void;
  textarea?: boolean;
  rows?: number;
  error?: string;
}

/**
 * Side-by-side Arabic/English pair — the Arabic input is always RTL and the
 * English input always LTR, regardless of the page direction.
 */
export function BilingualField({
  idBase,
  label,
  value,
  onChange,
  textarea = false,
  rows = 4,
  error,
}: BilingualFieldProps) {
  const t = useTranslations("admin.form");
  const halves: Array<{ key: "ar" | "en"; dir: "rtl" | "ltr"; sub: string }> = [
    { key: "ar", dir: "rtl", sub: t("arabicLabel") },
    { key: "en", dir: "ltr", sub: t("englishLabel") },
  ];

  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 text-xs font-semibold tracking-wide opacity-80">
        {label}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {halves.map(({ key, dir, sub }) => {
          const id = `${idBase}-${key}`;
          const shared = {
            id,
            dir,
            value: value[key],
            className: inputClasses,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => onChange({ ...value, [key]: event.target.value }),
          };
          return (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-[11px] uppercase tracking-wider opacity-50">
                {sub}
              </label>
              {textarea ? (
                <textarea rows={rows} {...shared} />
              ) : (
                <input type="text" {...shared} />
              )}
            </div>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-clay">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface FormActionsProps {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
}

/** Save / cancel row with the submit-level error message. */
export function FormActions({ busy, error, onCancel }: FormActionsProps) {
  const t = useTranslations("admin.form");
  return (
    <div className="flex flex-col gap-3 border-t border-(--line-soft) pt-5">
      {error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-night",
            "transition-colors duration-200 ease-heritage hover:bg-gold-bright",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {busy ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-4 py-2.5 text-sm opacity-80 transition-colors duration-200 ease-heritage hover:bg-mist hover:opacity-100 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
