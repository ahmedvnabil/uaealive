"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Logical side — `end` hugs the trailing edge (left in RTL, right in LTR). */
  side?: "start" | "end";
  children: React.ReactNode;
  className?: string;
}

/**
 * Floating side drawer — one of the two places glass accents are allowed
 * (nav + drawers). RTL-aware via logical inset utilities.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = "end",
  children,
  className,
}: DrawerProps) {
  const t = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t("ui.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-night/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 flex w-full max-w-md flex-col text-sand",
          "backdrop-blur-md bg-night-soft/70 border border-line",
          side === "end" ? "end-0" : "start-0",
          className,
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("ui.close")}
            className="rounded-md p-1 opacity-70 transition-opacity duration-200 ease-heritage hover:opacity-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
