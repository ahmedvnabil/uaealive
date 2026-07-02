/**
 * Anonymous device identity (v1 has no accounts): a client-generated UUID v4
 * persisted in localStorage.
 */

const STORAGE_KEY = "uaealive_device_id";

function uuidV4Fallback(): string {
  // RFC 4122 v4 via crypto.getRandomValues (for non-secure contexts where
  // crypto.randomUUID is unavailable).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidV4Fallback();
}

/**
 * Returns the stable anonymous device id, creating it on first call.
 * Server-side (SSR) callers get a throwaway id that is never persisted.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = generateId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private-mode / blocked storage: still return a usable (ephemeral) id.
    return generateId();
  }
}
