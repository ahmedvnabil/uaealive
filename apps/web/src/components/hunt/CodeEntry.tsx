"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonClasses } from "@/components/ui/Button";
import { checkin } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { cn, pickLocale } from "@/lib/utils";
import type { CheckinResult } from "@/lib/types";

/** Every seeded stop code is exactly six A–Z / 0–9 characters. */
export const CODE_LENGTH = 6;

type Status = "idle" | "checking" | "wrong" | "failed" | "correct";

const CONFETTI_TONES = [
  "bg-gold",
  "bg-gold-bright",
  "bg-sand",
  "bg-oasis",
  "bg-clay",
] as const;

/** CSS-transform confetti burst — skipped entirely under reduced motion. */
function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const distance = 52 + (i % 3) * 26;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 34,
      rotate: (i % 2 ? 1 : -1) * (130 + i * 12),
      delay: (i % 6) * 0.03,
      tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
    };
  });
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute start-1/2 top-1/2 block h-2 w-1 rounded-xs",
            piece.tone,
          )}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: piece.x,
            y: piece.y,
            rotate: piece.rotate,
            scale: 0.5,
          }}
          transition={{ duration: 0.9, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export interface CodeEntryProps {
  /** Stop title (active locale) — labels the input group. */
  stopTitle: string;
  /** Fired for every server verdict; the parent applies correct check-ins. */
  onResult: (result: CheckinResult) => void;
  /** Close the entry after a successful check-in. */
  onDismiss: () => void;
}

/**
 * Segmented six-character code input («وصلت! أدخل الرمز»). Wrong code →
 * inline error (+ shake unless reduced motion); right code → confetti,
 * success note and a continue button.
 */
export function CodeEntry({ stopTitle, onResult, onDismiss }: CodeEntryProps) {
  const locale = useLocale();
  const t = useTranslations("hunt");
  const reduceMotion = useReducedMotion();
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [foundName, setFoundName] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (status === "correct") continueRef.current?.focus();
  }, [status]);

  const complete = chars.every((char) => char !== "");

  /** Write sanitized characters starting at `index` (handles paste). */
  function writeChars(index: number, raw: string): void {
    const sanitized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setStatus("idle");
    setChars((prev) => {
      const next = [...prev];
      if (!sanitized) {
        next[index] = "";
        return next;
      }
      for (let i = 0; i < sanitized.length && index + i < CODE_LENGTH; i += 1) {
        next[index + i] = sanitized[i]!;
      }
      return next;
    });
    if (sanitized) {
      const target = Math.min(index + sanitized.length, CODE_LENGTH - 1);
      inputsRef.current[target]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      event.preventDefault();
      setStatus("idle");
      setChars((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    if (event.key === "Enter" && complete && status !== "checking") {
      event.preventDefault();
      void submit();
    }
  }

  async function submit(): Promise<void> {
    if (!complete || status === "checking" || status === "correct") return;
    setStatus("checking");
    try {
      const result = await checkin(getDeviceId(), chars.join(""));
      if (result.correct) {
        setFoundName(result.stop ? pickLocale(result.stop.title, locale) : stopTitle);
        setStatus("correct");
      } else {
        setStatus("wrong");
      }
      onResult(result);
    } catch {
      setStatus("failed");
    }
  }

  const inputTone =
    status === "wrong" || status === "failed"
      ? "border-clay"
      : status === "correct"
        ? "border-oasis"
        : "border-(--line-soft)";

  return (
    <div className="relative mt-5 rounded-md border border-(--line-soft) bg-(--surface) p-5">
      {status === "correct" && !reduceMotion && <ConfettiBurst />}

      <div role="group" aria-label={t("code.label", { title: stopTitle })}>
        <p className="text-sm font-medium">{t("code.label", { title: stopTitle })}</p>
        <p className="mt-1 text-xs opacity-70">{t("code.hint")}</p>

        <motion.div
          dir="ltr"
          className="mt-4 flex justify-center gap-2 sm:justify-start"
          animate={
            status === "wrong" && !reduceMotion
              ? { x: [0, -8, 8, -5, 5, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.4 }}
        >
          {chars.map((char, index) => (
            <input
              key={index}
              ref={(node) => {
                inputsRef.current[index] = node;
              }}
              type="text"
              value={char}
              maxLength={CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={status === "correct" || status === "checking"}
              aria-label={t("code.charLabel", {
                position: String(index + 1),
                total: String(CODE_LENGTH),
              })}
              onChange={(event) => writeChars(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.target.select()}
              className={cn(
                "h-12 w-9 rounded-xs border bg-transparent text-center text-lg font-bold uppercase sm:w-10",
                "text-(--app-fg) transition-colors duration-200 ease-heritage",
                "disabled:opacity-60",
                inputTone,
              )}
            />
          ))}
        </motion.div>
      </div>

      {/* Persistent live region so verdicts are announced. */}
      <p
        role="status"
        className={cn(
          "mt-3 min-h-5 text-sm",
          (status === "wrong" || status === "failed") && "text-clay",
          status === "correct" && "font-medium text-oasis",
        )}
      >
        {status === "wrong" && t("code.wrong")}
        {status === "failed" && t("code.failed")}
        {status === "correct" && foundName && t("code.correct", { name: foundName })}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        {status === "correct" ? (
          // Native button: needs a ref for post-success focus handoff.
          <button
            ref={continueRef}
            type="button"
            onClick={onDismiss}
            className={buttonClasses("outline", "sm")}
          >
            {t("code.continue")}
          </button>
        ) : (
          <Button
            size="sm"
            disabled={!complete || status === "checking"}
            onClick={() => void submit()}
          >
            {status === "checking" ? t("code.checking") : t("code.submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
