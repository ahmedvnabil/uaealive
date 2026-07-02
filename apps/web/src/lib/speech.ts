/**
 * Web Speech API narration with graceful no-voice handling.
 *
 * `narrate(text, locale)` resolves `true` if narration started, `false` when
 * speech synthesis (or a usable voice) is unavailable — callers should hide
 * or disable the narration UI in that case.
 */

import type { Locale } from "./types";

export interface NarrationHandlers {
  onEnd?: () => void;
  onError?: () => void;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  return window.speechSynthesis;
}

/** Voices can load asynchronously; wait briefly for them if needed. */
function loadVoices(s: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const immediate = s.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(s.getVoices()), 1500);
    s.addEventListener(
      "voiceschanged",
      () => {
        clearTimeout(timer);
        resolve(s.getVoices());
      },
      { once: true },
    );
  });
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null {
  const prefix = locale === "ar" ? "ar" : "en";
  const normalized = voices.map((voice) => ({
    voice,
    lang: voice.lang.toLowerCase().replace("_", "-"),
  }));
  const regional = normalized.find((v) => v.lang.startsWith(`${prefix}-`));
  if (regional) return regional.voice;
  const generic = normalized.find((v) => v.lang.startsWith(prefix));
  return generic ? generic.voice : null;
}

/** True when the browser can narrate at all (voice list may still be empty). */
export function isNarrationSupported(): boolean {
  return synth() !== null;
}

/** Speak `text` in the given locale. Cancels any ongoing narration first. */
export async function narrate(
  text: string,
  locale: Locale,
  handlers: NarrationHandlers = {},
): Promise<boolean> {
  const s = synth();
  if (!s || !text.trim()) return false;

  stopNarration();
  const voices = await loadVoices(s);
  const voice = pickVoice(voices, locale);
  if (!voice && voices.length === 0) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? (locale === "ar" ? "ar-AE" : "en-US");
  utterance.rate = 0.95;
  if (handlers.onEnd) utterance.addEventListener("end", handlers.onEnd);
  if (handlers.onError) {
    utterance.addEventListener("error", handlers.onError);
  }
  s.speak(utterance);
  return true;
}

/** Stop any ongoing narration (safe to call anytime). */
export function stopNarration(): void {
  const s = synth();
  if (s) s.cancel();
}
