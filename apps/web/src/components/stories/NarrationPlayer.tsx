"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { isNarrationSupported, narrate, stopNarration } from "@/lib/speech";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "playing" | "paused";

/** Static bar heights when the equalizer can't animate (reduced motion). */
const STATIC_BARS = ["h-2", "h-4", "h-3", "h-5", "h-2.5"];

function Equalizer() {
  const reduceMotion = useReducedMotion();

  return (
    <span aria-hidden className="flex h-5 items-end gap-1">
      {STATIC_BARS.map((height, index) =>
        reduceMotion ? (
          <span
            key={index}
            className={cn("w-1 rounded-pill bg-gold", height)}
          />
        ) : (
          <motion.span
            key={index}
            className="h-5 w-1 origin-bottom rounded-pill bg-gold"
            animate={{ scaleY: [0.2, 1, 0.35, 0.75, 0.2] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.13,
            }}
          />
        ),
      )}
    </span>
  );
}

export interface NarrationPlayerProps {
  /** Full text to narrate (story title + body). */
  text: string;
  locale: Locale;
  /** Pre-rendered narration MP3 — preferred over speech synthesis when set. */
  audioSrc?: string;
  className?: string;
}

/**
 * Narration controls (play / pause / stop) with an animated equalizer.
 * Plays a pre-rendered MP3 when `audioSrc` is given (falling back to Web
 * Speech if it fails to load); otherwise uses speech synthesis. Renders
 * nothing when neither engine is usable.
 */
export function NarrationPlayer({ text, locale, audioSrc, className }: NarrationPlayerProps) {
  const t = useTranslations("stories");
  const [status, setStatus] = useState<Status>("idle");
  const [supported, setSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Which engine the current playback runs on (audio survives a mid-play
  // fallback; speech pause/stop must not touch a dead audio element).
  const engineRef = useRef<"audio" | "speech">("speech");

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
  };

  useEffect(() => {
    setSupported(Boolean(audioSrc) || isNarrationSupported());
    return () => {
      stopNarration();
      stopAudio();
    };
  }, [audioSrc]);

  // Switching audience (new text/source) invalidates the current playback.
  useEffect(() => {
    stopNarration();
    stopAudio();
    setStatus("idle");
  }, [text, audioSrc]);

  if (!supported) return null;

  const playSpeech = async () => {
    engineRef.current = "speech";
    const started = await narrate(text, locale, {
      onEnd: () => setStatus("idle"),
      onError: () => setStatus("idle"),
    });
    if (!started) {
      // No usable voice for this browser — hide the whole player.
      setSupported(false);
      setStatus("idle");
    }
  };

  const play = async () => {
    setStatus("playing");
    if (!audioSrc) {
      await playSpeech();
      return;
    }
    engineRef.current = "audio";
    const el = new Audio(audioSrc);
    audioRef.current = el;
    el.onended = () => setStatus("idle");
    el.onerror = () => {
      // Missing/corrupt file — degrade to speech synthesis mid-flight.
      audioRef.current = null;
      void playSpeech();
    };
    try {
      await el.play();
    } catch {
      audioRef.current = null;
      await playSpeech();
    }
  };

  const pause = () => {
    if (engineRef.current === "audio") audioRef.current?.pause();
    else window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    if (engineRef.current === "audio") void audioRef.current?.play();
    else window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    stopNarration();
    stopAudio();
    setStatus("idle");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-(--line-soft) px-4 py-3",
        className,
      )}
    >
      <Volume2 aria-hidden className="size-4 text-gold" />
      <span className="text-sm font-medium">{t("narration.label")}</span>
      {status === "playing" ? (
        <span className="sr-only" role="status">
          {t("narration.playing")}
        </span>
      ) : null}
      <span className="ms-auto flex items-center gap-2">
        {status === "playing" ? <Equalizer /> : null}
        {status === "idle" ? (
          <Button variant="outline" size="sm" onClick={play}>
            <Play aria-hidden className="size-4" />
            {t("narration.play")}
          </Button>
        ) : null}
        {status === "playing" ? (
          <Button variant="outline" size="sm" onClick={pause}>
            <Pause aria-hidden className="size-4" />
            {t("narration.pause")}
          </Button>
        ) : null}
        {status === "paused" ? (
          <Button variant="outline" size="sm" onClick={resume}>
            <Play aria-hidden className="size-4" />
            {t("narration.resume")}
          </Button>
        ) : null}
        {status !== "idle" ? (
          <Button variant="ghost" size="sm" onClick={stop}>
            <Square aria-hidden className="size-4" />
            {t("narration.stop")}
          </Button>
        ) : null}
      </span>
    </div>
  );
}
