"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AdminAuthError,
  approveSubmission,
  listSubmissions,
  rejectSubmission,
  type SubmissionAdmin,
  type SubmissionStatus,
} from "@/lib/adminApi";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface ModerationQueueProps {
  onAuthError: () => void;
}

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];
const KNOWN_TYPES = ["story", "photo", "memory", "document"] as const;

const TYPE_TONES: Record<string, BadgeTone> = {
  story: "gold",
  photo: "oasis",
  memory: "sand",
  document: "clay",
};

function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function payloadText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Community submissions review: status filter + approve/reject cards. */
export function ModerationQueue({ onAuthError }: ModerationQueueProps) {
  const t = useTranslations("admin.moderation");
  const tList = useTranslations("admin.list");
  const locale = useLocale();
  const [status, setStatus] = useState<SubmissionStatus>("pending");
  const [items, setItems] = useState<SubmissionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await listSubmissions(status));
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [status, onAuthError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const moderate = async (id: number, action: "approve" | "reject") => {
    setActingId(id);
    setActionError(false);
    try {
      await (action === "approve" ? approveSubmission(id) : rejectSubmission(id));
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setActionError(true);
    } finally {
      setActingId(null);
    }
  };

  const typeLabel = (type: string): string =>
    (KNOWN_TYPES as readonly string[]).includes(type)
      ? t(`types.${type as (typeof KNOWN_TYPES)[number]}`)
      : type;

  return (
    <section aria-label={t("filterLabel")}>
      <div
        role="group"
        aria-label={t("filterLabel")}
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        {STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-pill border px-4 py-1.5 text-sm transition-colors duration-200 ease-heritage",
              status === value
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-(--line-soft) opacity-70 hover:border-gold hover:opacity-100",
            )}
          >
            {t(`statuses.${value}`)}
          </button>
        ))}
      </div>

      {actionError ? (
        <p role="alert" className="mb-4 rounded-xs border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-clay">
          {tList("actionError")}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-md border border-(--line-soft) px-6 py-10 text-center text-sm opacity-60">
          {tList("loading")}
        </p>
      ) : loadError ? (
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
      ) : items.length === 0 ? (
        <p className="rounded-md border border-(--line-soft) px-6 py-10 text-center text-sm opacity-60">
          {t("empty")}
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TYPE_TONES[item.type] ?? "sand"}>
                    {typeLabel(item.type)}
                  </Badge>
                  <Badge>{t(`statuses.${item.status}`)}</Badge>
                  <span className="ms-auto text-xs opacity-50">
                    {t("submittedAt")}: {formatDateTime(item.created_at, locale)}
                  </span>
                </div>

                <dl className="flex flex-col gap-2 text-sm">
                  {Object.entries(item.payload).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <dt className="text-[11px] uppercase tracking-wider opacity-50">
                        {key}
                      </dt>
                      <dd className="break-words leading-relaxed">
                        {payloadText(value)}
                      </dd>
                    </div>
                  ))}
                  {item.contact ? (
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[11px] uppercase tracking-wider opacity-50">
                        {t("contact")}
                      </dt>
                      <dd dir="ltr" className="break-words text-start">
                        {item.contact}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {item.status === "pending" ? (
                  <div className="mt-auto flex items-center gap-3 border-t border-(--line-soft) pt-4">
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => void moderate(item.id, "approve")}
                      className="rounded-md bg-oasis px-4 py-2 text-sm font-medium text-sand transition-opacity duration-200 ease-heritage hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {actingId === item.id ? t("working") : t("approve")}
                    </button>
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => void moderate(item.id, "reject")}
                      className="rounded-md border border-clay/50 px-4 py-2 text-sm font-medium text-clay transition-colors duration-200 ease-heritage hover:bg-clay/10 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
