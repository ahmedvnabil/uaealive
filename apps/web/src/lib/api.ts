/**
 * Typed API client for the UAE ALIVE backend (`/api/v1`).
 *
 * Function names follow the Interface Contracts verbatim. All JSON endpoints
 * use the `{ok, data, error}` envelope; `/geo/district` returns raw GeoJSON;
 * chat/copilot stream SSE (`data: {"delta": ...}` / `data: {"done": true}`).
 */

import type {
  CharacterOut,
  ChatMessage,
  CheckinResult,
  DistrictGeo,
  Envelope,
  EventOut,
  HuntProgressOut,
  HuntStopOut,
  Locale,
  OnDelta,
  OnDone,
  PeriodOut,
  PoiDetailOut,
  PoiOut,
  StoryOut,
  StreamSource,
  SubmissionPayload,
  SubmissionResult,
  TourRequest,
} from "./types";
import { getDeviceId } from "./device";

// Server-side rendering (RSC/route handlers) inside Docker must reach the API
// over the internal network (http://api:8000); the browser must use the public
// origin baked into NEXT_PUBLIC_API_URL. API_INTERNAL_URL is a server-only
// runtime var — undefined in the browser bundle, so the window branch always
// falls through to the public URL.
const SERVER_API_URL =
  typeof window === "undefined" ? process.env.API_INTERNAL_URL : undefined;
const API_URL =
  SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toQuery(params?: Record<string, string | boolean | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`invalid_response_${res.status}`, res.status);
  }
  if (!res.ok || !body.ok || body.data === null) {
    throw new ApiError(body.error ?? `request_failed_${res.status}`, res.status);
  }
  return body.data;
}

// ---------------------------------------------------------------------------
// Content reads
// ---------------------------------------------------------------------------

export function getPois(params?: { kind?: string; lang?: string }): Promise<PoiOut[]> {
  return request<PoiOut[]>(`/pois${toQuery(params)}`);
}

export function getPoi(slug: string): Promise<PoiDetailOut> {
  return request<PoiDetailOut>(`/pois/${encodeURIComponent(slug)}`);
}

export function getStories(params?: {
  poi?: string;
  audience?: string;
}): Promise<StoryOut[]> {
  return request<StoryOut[]>(`/stories${toQuery(params)}`);
}

export function getTimeline(): Promise<PeriodOut[]> {
  return request<PeriodOut[]>("/timeline");
}

export function getCharacters(): Promise<CharacterOut[]> {
  return request<CharacterOut[]>("/characters");
}

export function getEvents(params?: { upcoming?: boolean }): Promise<EventOut[]> {
  return request<EventOut[]>(`/events${toQuery(params)}`);
}

/** Raw GeoJSON FeatureCollection — the one endpoint without the envelope. */
export async function getDistrictGeo(): Promise<DistrictGeo> {
  const res = await fetch(`${BASE}/geo/district`);
  if (!res.ok) throw new ApiError(`geo_failed_${res.status}`, res.status);
  return (await res.json()) as DistrictGeo;
}

// ---------------------------------------------------------------------------
// Hunt
// ---------------------------------------------------------------------------

export function checkin(deviceId: string, code: string): Promise<CheckinResult> {
  return request<CheckinResult>("/hunt/checkin", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId, code }),
  });
}

export function getHuntStops(): Promise<HuntStopOut[]> {
  return request<HuntStopOut[]>("/hunt/stops");
}

export function getHuntProgress(deviceId: string): Promise<HuntProgressOut> {
  return request<HuntProgressOut>(
    `/hunt/progress${toQuery({ device_id: deviceId })}`,
  );
}

// ---------------------------------------------------------------------------
// Community + analytics
// ---------------------------------------------------------------------------

export function submitContribution(
  payload: SubmissionPayload,
): Promise<SubmissionResult> {
  return request<SubmissionResult>("/community/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Fire-and-forget analytics; never throws (a failed ping must not break UX). */
export async function track(
  event: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await request<{ tracked: boolean }>("/analytics/track", {
      method: "POST",
      body: JSON.stringify({ device_id: getDeviceId(), event, meta: meta ?? {} }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("analytics track failed", event, error);
    }
  }
}

// ---------------------------------------------------------------------------
// SSE streaming (chat + tour copilot)
// ---------------------------------------------------------------------------

function handleSseEvent(rawEvent: string, onDelta: OnDelta, onDone: OnDone): boolean {
  for (const line of rawEvent.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    let parsed: { delta?: string; done?: boolean; source?: StreamSource };
    try {
      parsed = JSON.parse(payload) as typeof parsed;
    } catch {
      continue;
    }
    if (parsed.done) {
      onDone(parsed.source ?? "live");
      return true;
    }
    if (typeof parsed.delta === "string") onDelta(parsed.delta);
  }
  return false;
}

async function streamSse(
  path: string,
  body: unknown,
  onDelta: OnDelta,
  onDone: OnDone,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new ApiError(`stream_failed_${res.status}`, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      if (handleSseEvent(rawEvent, onDelta, onDone)) finished = true;
      separator = buffer.indexOf("\n\n");
    }
  }
  if (!finished && buffer.trim()) handleSseEvent(buffer, onDelta, onDone);
}

/** Stream a character chat reply. */
export function streamChat(
  slug: string,
  messages: ChatMessage[],
  locale: Locale,
  onDelta: OnDelta,
  onDone: OnDone,
): Promise<void> {
  return streamSse(
    `/chat/${encodeURIComponent(slug)}`,
    { messages, locale },
    onDelta,
    onDone,
  );
}

/** Stream a personalized tour plan from the copilot. */
export function streamTour(
  body: TourRequest,
  onDelta: OnDelta,
  onDone: OnDone,
): Promise<void> {
  return streamSse("/copilot/tour", body, onDelta, onDone);
}
