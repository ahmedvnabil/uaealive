"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StreamSource } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A chat message as rendered in the panel (API `ChatMessage` + UI state). */
export interface DisplayMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  /** True while SSE deltas are still arriving for this message. */
  streaming?: boolean;
  /** Set by the terminal SSE event — `fallback` shows the offline chip. */
  source?: StreamSource;
  /** Pre-filled character greeting — display-only, never sent to the API. */
  greeting?: boolean;
}

function TypingDots({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1 py-1">
      <span className="sr-only">{label}</span>
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="size-1.5 animate-bounce rounded-pill bg-gold"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export interface MessageBubbleProps {
  message: DisplayMessage;
  /** Localized display name: the character for assistant turns, "you" for user turns. */
  authorName: string;
}

/**
 * Single chat turn — editorial, geometric bubbles (sharp logical corner
 * toward the author), token-by-token streaming caret, and a subtle offline
 * chip when the reply came from the server-side fallback.
 */
export function MessageBubble({ message, authorName }: MessageBubbleProps) {
  const t = useTranslations("chat");
  const isUser = message.role === "user";
  const isTyping = Boolean(message.streaming) && message.content.length === 0;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5",
        isUser ? "items-end" : "items-start",
      )}
    >
      <p className="px-1 text-[11px] font-medium tracking-wide opacity-60">
        {authorName}
      </p>
      <div
        className={cn(
          "max-w-[88%] rounded-md border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "rounded-ee-xs border-gold/35 bg-gold/10"
            : "rounded-ss-xs border-(--line-soft) bg-(--app-bg)",
        )}
      >
        {isTyping ? <TypingDots label={t("panel.typing")} /> : message.content}
        {message.streaming && !isTyping ? (
          <span
            aria-hidden
            className="ms-1 inline-block h-[1em] w-0.5 animate-pulse bg-gold align-middle"
          />
        ) : null}
      </div>
      {message.source === "fallback" ? (
        <p
          title={t("panel.offlineHint")}
          className="flex items-center gap-1.5 px-1 text-[11px] text-clay"
        >
          <WifiOff className="size-3" aria-hidden />
          {t("panel.offline")}
        </p>
      ) : null}
    </div>
  );
}
