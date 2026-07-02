/**
 * Typed client for the Bearer-protected admin API (`/api/v1/admin`).
 *
 * The admin password doubles as the bearer token. It lives ONLY in
 * `sessionStorage` (cleared when the tab closes) and is attached to every
 * request by `adminRequest`. A 401 clears the stored token and throws
 * `AdminAuthError` so callers can redirect to `/admin/login`.
 */

import type {
  Audience,
  Envelope,
  EventOut,
  Localized,
  PoiAccessibility,
  PoiOut,
  StoryOut,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_BASE = `${API_URL}/api/v1/admin`;
const TOKEN_KEY = "uaealive_admin_token";

export class AdminAuthError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "AdminAuthError";
  }
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

// ---------------------------------------------------------------------------
// Token storage (sessionStorage only — never cookies/localStorage)
// ---------------------------------------------------------------------------

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode quota) — login will simply not persist.
  }
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore — nothing to clear.
  }
}

// ---------------------------------------------------------------------------
// Write payloads (mirror the API's PoiIn / StoryIn / EventIn schemas)
// ---------------------------------------------------------------------------

export interface PoiInput {
  slug: string;
  kind: string;
  name: Localized;
  summary: Localized;
  lat: number;
  lng: number;
  era_built: string | null;
  accessibility: PoiAccessibility;
  hero_image: string | null;
  order: number;
}

export interface StoryInput {
  poi_slug: string;
  audience: Audience;
  title: Localized;
  body: Localized;
  sources: string[];
}

export interface EventInput {
  slug: string;
  kind: string;
  title: Localized;
  description: Localized;
  /** ISO date `YYYY-MM-DD`. */
  starts_on: string;
  ends_on: string;
  location: Localized;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionAdmin {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  contact: string | null;
  status: SubmissionStatus;
  created_at: string;
}

export interface PageCount {
  page: string;
  count: number;
}

export interface PoiCount {
  poi: string;
  count: number;
}

export interface LangCount {
  lang: string;
  count: number;
}

export interface AnalyticsSummary {
  total_events: number;
  by_page: PageCount[];
  top_pois: PoiCount[];
  by_lang: LangCount[];
  chat_messages: number;
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

function authedFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${ADMIN_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new AdminAuthError("missing_token");
  const res = await authedFetch(path, token, init);
  if (res.status === 401) {
    clearAdminToken();
    throw new AdminAuthError();
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new AdminApiError(`invalid_response_${res.status}`, res.status);
  }
  if (!res.ok || !body.ok || body.data === null) {
    throw new AdminApiError(body.error ?? `request_failed_${res.status}`, res.status);
  }
  return body.data;
}

/**
 * Verify the password against a protected endpoint; on success store it as
 * the session token. Returns `false` for a wrong password, throws
 * `AdminApiError` on network/server trouble.
 */
export async function loginAdmin(password: string): Promise<boolean> {
  let res: Response;
  try {
    res = await authedFetch("/analytics/summary", password);
  } catch {
    throw new AdminApiError("network_error");
  }
  if (res.status === 401) return false;
  if (!res.ok) throw new AdminApiError(`login_failed_${res.status}`, res.status);
  setAdminToken(password);
  return true;
}

export function logoutAdmin(): void {
  clearAdminToken();
}

// ---------------------------------------------------------------------------
// Content CRUD
// ---------------------------------------------------------------------------

export function createPoi(input: PoiInput): Promise<PoiOut> {
  return adminRequest<PoiOut>("/pois", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePoi(id: number, input: PoiInput): Promise<PoiOut> {
  return adminRequest<PoiOut>(`/pois/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deletePoi(id: number): Promise<{ deleted: boolean }> {
  return adminRequest<{ deleted: boolean }>(`/pois/${id}`, { method: "DELETE" });
}

export function createStory(input: StoryInput): Promise<StoryOut> {
  return adminRequest<StoryOut>("/stories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStory(id: number, input: StoryInput): Promise<StoryOut> {
  return adminRequest<StoryOut>(`/stories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteStory(id: number): Promise<{ deleted: boolean }> {
  return adminRequest<{ deleted: boolean }>(`/stories/${id}`, {
    method: "DELETE",
  });
}

export function createEvent(input: EventInput): Promise<EventOut> {
  return adminRequest<EventOut>("/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEvent(id: number, input: EventInput): Promise<EventOut> {
  return adminRequest<EventOut>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteEvent(id: number): Promise<{ deleted: boolean }> {
  return adminRequest<{ deleted: boolean }>(`/events/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Moderation + analytics
// ---------------------------------------------------------------------------

export function listSubmissions(
  status?: SubmissionStatus,
): Promise<SubmissionAdmin[]> {
  const qs = status ? `?status=${status}` : "";
  return adminRequest<SubmissionAdmin[]>(`/submissions${qs}`);
}

export function approveSubmission(
  id: number,
): Promise<{ id: number; status: string }> {
  return adminRequest<{ id: number; status: string }>(
    `/submissions/${id}/approve`,
    { method: "POST" },
  );
}

export function rejectSubmission(
  id: number,
): Promise<{ id: number; status: string }> {
  return adminRequest<{ id: number; status: string }>(
    `/submissions/${id}/reject`,
    { method: "POST" },
  );
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return adminRequest<AnalyticsSummary>("/analytics/summary");
}
