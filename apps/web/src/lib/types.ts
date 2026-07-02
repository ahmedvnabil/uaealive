/**
 * TypeScript mirrors of the API DTOs defined in the Interface Contracts
 * (docs/superpowers/plans/2026-07-02-uaealive-v1.md).
 */

export type Locale = "ar" | "en";

/** Bilingual string as returned by the API: `{ar, en}`. */
export interface Localized {
  ar: string;
  en: string;
}

/** Uniform API envelope: `{ok, data, error}`. */
export interface Envelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Content DTOs
// ---------------------------------------------------------------------------

export interface PoiAccessibility {
  wheelchair: boolean;
  audio: boolean;
}

export interface PoiOut {
  id: number;
  slug: string;
  kind: string;
  name: Localized;
  summary: Localized;
  /**
   * WARNING: not every POI sits inside the district building bbox
   * (25.2618, 55.2975, 25.2665, 55.3025). Adjacent landmarks
   * (`dubai-museum-fort`, `sheikh-saeed-house`) lie outside it — map
   * `maxBounds` and twin projections must derive bounds from the actual
   * POI coordinates (with padding), never from the geo bbox alone.
   */
  lat: number;
  lng: number;
  era_built: string;
  accessibility: PoiAccessibility;
  hero_image: string;
  order: number;
}

export type Audience = "tourist" | "kids" | "expert";

export interface StoryOut {
  id: number;
  poi_slug: string;
  audience: Audience;
  title: Localized;
  body: Localized;
  sources: string[];
}

/** POI detail = POI + its stories. */
export interface PoiDetailOut extends PoiOut {
  stories: StoryOut[];
}

/** Public character shape — persona_prompt is never exposed. */
export interface CharacterOut {
  slug: string;
  name: Localized;
  role: Localized;
  greeting: Localized;
  avatar: string;
}

export type PeriodKey = "1950" | "1970" | "1990" | "today";

export interface PeriodPalette {
  sky: string;
  ambient: string;
  accent: string;
}

export interface PeriodOut {
  key: PeriodKey;
  name: Localized;
  description: Localized;
  palette: PeriodPalette;
}

export interface EventOut {
  id: number;
  slug: string;
  kind: string;
  title: Localized;
  description: Localized;
  starts_on: string;
  ends_on: string;
  location: Localized;
}

// ---------------------------------------------------------------------------
// GeoJSON (raw, no envelope)
// ---------------------------------------------------------------------------

export interface DistrictFeatureProperties {
  kind: "building" | "alley" | "path" | "boundary";
  height?: number;
  barjeel?: boolean;
  poi_slug?: string;
  [key: string]: unknown;
}

export interface DistrictGeometry {
  type:
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon";
  coordinates: unknown;
}

export interface DistrictFeature {
  type: "Feature";
  geometry: DistrictGeometry;
  properties: DistrictFeatureProperties;
}

export interface DistrictGeo {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

// ---------------------------------------------------------------------------
// Hunt
// ---------------------------------------------------------------------------

export interface HuntStopOut {
  id: number;
  slug: string;
  poi_slug: string;
  title: Localized;
  hint: Localized;
  order: number;
}

export interface BadgeOut {
  slug: string;
  name: Localized;
  icon: string;
  threshold: number;
}

export interface HuntProgressCount {
  found: number;
  total: number;
}

export interface CheckinResult {
  correct: boolean;
  stop?: HuntStopOut;
  badge?: BadgeOut;
  progress: HuntProgressCount;
}

export interface HuntProgressOut {
  found: string[];
  badges: BadgeOut[];
}

// ---------------------------------------------------------------------------
// Community / analytics
// ---------------------------------------------------------------------------

export type SubmissionType = "story" | "photo" | "memory" | "document";

export interface SubmissionPayload {
  type: SubmissionType;
  payload: Record<string, unknown>;
  contact?: string;
}

export interface SubmissionResult {
  id: number;
  status: "pending";
}

export interface TrackResult {
  tracked: boolean;
}

// ---------------------------------------------------------------------------
// AI streaming (SSE)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TourRequest {
  interests: string[];
  duration_min: number;
  audience: string;
  locale: Locale;
}

/** `source` in the terminal SSE event: live LLM stream or canned fallback. */
export type StreamSource = "live" | "fallback";

export type OnDelta = (delta: string) => void;
export type OnDone = (source: StreamSource) => void;
