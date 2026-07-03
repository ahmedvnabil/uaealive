import type { EventOut, Locale } from "@/lib/types";
import { pickLocale } from "@/lib/utils";

type EventStatus = "live" | "upcoming" | "past";

export interface EventsTimelineProps {
  events: EventOut[];
  locale: Locale;
  labels: {
    kinds: Record<string, string>;
    status: Record<EventStatus, string>;
  };
  /** Epoch ms for "now" — resolved by the server page so this stays pure. */
  nowMs: number;
}

function statusOf(event: EventOut, nowMs: number): EventStatus {
  const start = Date.parse(event.starts_on);
  const end = Date.parse(`${event.ends_on}T23:59:59`);
  if (nowMs < start) return "upcoming";
  if (nowMs > end) return "past";
  return "live";
}

function formatRange(event: EventOut, locale: Locale): string {
  const intlLocale = locale === "ar" ? "ar-AE" : "en-GB";
  const fmt = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const start = new Date(event.starts_on);
  const end = new Date(event.ends_on);
  if (event.starts_on === event.ends_on) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

const STATUS_CLASSES: Record<EventStatus, string> = {
  live: "bg-oasis/20 text-oasis",
  upcoming: "bg-gold/15 text-gold-bright",
  past: "bg-mist opacity-60",
};

export function EventsTimeline({
  events,
  locale,
  labels,
  nowMs,
}: EventsTimelineProps) {
  return (
    <ol className="mt-4 flex flex-col">
      {events.map((event) => {
        const status = statusOf(event, nowMs);
        return (
          <li
            key={event.id}
            className="grid gap-4 border-t border-(--line-soft) py-8 first:border-t-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-10"
          >
            <div className="flex flex-col gap-3">
              <span className="font-mono text-sm tracking-[0.15em] text-gold tabular-nums uppercase">
                {formatRange(event, locale)}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill border border-(--line-soft) px-3 py-1 text-xs font-medium">
                  {labels.kinds[event.kind] ?? event.kind}
                </span>
                <span
                  className={`rounded-pill px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
                >
                  {labels.status[status]}
                </span>
              </span>
            </div>

            <div className={status === "past" ? "opacity-60" : undefined}>
              <h2 className="text-xl font-bold sm:text-2xl">
                {pickLocale(event.title, locale)}
              </h2>
              <p className="mt-1 text-sm text-gold/80">
                {pickLocale(event.location, locale)}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-relaxed opacity-80">
                {pickLocale(event.description, locale)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
