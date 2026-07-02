"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { streamChat, track } from "@/lib/api";
import type { CharacterOut, ChatMessage, Locale } from "@/lib/types";
import { pickLocale } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CharacterAvatar } from "./CharacterAvatar";
import { MessageBubble, type DisplayMessage } from "./MessageBubble";

/** Server contract: max 20 messages per request, each ≤ 2000 chars. */
const MAX_HISTORY = 20;
const MAX_CHARS = 2000;

let messageIdCounter = 0;
function nextId(): number {
  messageIdCounter += 1;
  return messageIdCounter;
}

/** Completed turns only, greeting excluded, clipped to the last 20. */
function toApiMessages(list: DisplayMessage[]): ChatMessage[] {
  return list
    .filter((m) => !m.greeting && !m.streaming)
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_HISTORY);
}

function useSuggestions(slug: string): string[] {
  const t = useTranslations("chat");
  return (["q1", "q2", "q3"] as const)
    .map((n) => `suggestions.${slug}.${n}`)
    .filter((key) => t.has(key))
    .map((key) => t(key));
}

export interface ChatPanelProps {
  character: CharacterOut;
  locale: Locale;
}

/**
 * Streaming conversation with one historical character: greeting pre-filled,
 * Enter sends (Shift+Enter = newline), SSE deltas append token-by-token,
 * fallback replies get an offline chip, failures get a retry affordance.
 */
export function ChatPanel({ character, locale }: ChatPanelProps) {
  const t = useTranslations("chat");
  const inputId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const name = pickLocale(character.name, locale);
  const suggestions = useSuggestions(character.slug);

  const [messages, setMessages] = useState<DisplayMessage[]>(() => [
    {
      id: nextId(),
      role: "assistant",
      content: pickLocale(character.greeting, locale),
      greeting: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Keep the newest message in view as deltas stream in.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const runStream = useCallback(
    async (history: ChatMessage[], draftId: number) => {
      setBusy(true);
      setFailed(false);
      try {
        await streamChat(
          character.slug,
          history,
          locale,
          (delta) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === draftId ? { ...m, content: m.content + delta } : m,
              ),
            ),
          (source) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === draftId ? { ...m, streaming: false, source } : m,
              ),
            ),
        );
        // Stream closed without a terminal event — settle the draft as live.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId && m.streaming
              ? { ...m, streaming: false, source: "live" }
              : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== draftId));
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [character.slug, locale],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_CHARS);
      if (!text || busy) return;
      const history = [
        ...toApiMessages(messages),
        { role: "user" as const, content: text },
      ].slice(-MAX_HISTORY);
      const draftId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: text },
        { id: draftId, role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      void track("chat_message", { character: character.slug, locale });
      void runStream(history, draftId);
    },
    [busy, messages, character.slug, locale, runStream],
  );

  /** Resend the already-listed last user turn after a failed stream. */
  const retry = useCallback(() => {
    if (busy) return;
    const history = toApiMessages(messages);
    if (history[history.length - 1]?.role !== "user") return;
    const draftId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: draftId, role: "assistant", content: "", streaming: true },
    ]);
    void runStream(history, draftId);
  }, [busy, messages, runStream]);

  const showSuggestions =
    suggestions.length > 0 && !messages.some((m) => m.role === "user");

  return (
    <section
      aria-label={t("panel.conversationWith", { name })}
      className="flex h-[70dvh] min-h-[30rem] flex-col overflow-hidden rounded-md border border-(--line-soft) bg-(--surface)"
    >
      <header className="flex items-center gap-4 border-b border-(--line-soft) px-5 py-4">
        <CharacterAvatar
          src={character.avatar}
          name={name}
          className="size-12 rounded-pill text-lg"
        />
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">{name}</h2>
          <p className="truncate text-xs text-gold">
            {pickLocale(character.role, locale)}
          </p>
        </div>
      </header>

      <div
        ref={logRef}
        role="log"
        aria-busy={busy}
        aria-label={t("panel.conversationWith", { name })}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            authorName={message.role === "user" ? t("panel.you") : name}
          />
        ))}
      </div>

      {showSuggestions ? (
        <div className="border-t border-(--line-soft) px-5 py-4">
          <p className="mb-2.5 text-xs font-semibold tracking-[0.15em] text-gold uppercase">
            {t("panel.suggestionsLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => send(question)}
                className="rounded-pill border border-(--line-soft) px-4 py-1.5 text-sm transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-clay/40 bg-clay/10 px-5 py-3 text-sm"
        >
          <span>{t("panel.error")}</span>
          <Button variant="outline" size="sm" onClick={retry}>
            {t("panel.retry")}
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="border-t border-(--line-soft) px-5 py-4"
      >
        <div className="flex items-end gap-3">
          <label htmlFor={inputId} className="sr-only">
            {t("panel.inputLabel", { name })}
          </label>
          <textarea
            id={inputId}
            rows={1}
            maxLength={MAX_CHARS}
            value={input}
            placeholder={t("panel.placeholder")}
            onChange={(event) => {
              setInput(event.target.value);
              const el = event.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send(input);
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-(--line-soft) bg-transparent px-4 py-2.5 text-sm placeholder:opacity-50"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            <SendHorizontal className="size-4 rtl:-scale-x-100" aria-hidden />
            <span className="hidden sm:inline">{t("panel.send")}</span>
            <span className="sr-only sm:hidden">{t("panel.send")}</span>
          </Button>
        </div>
        <p className="mt-2 text-[11px] opacity-50">{t("panel.hint")}</p>
      </form>
    </section>
  );
}
