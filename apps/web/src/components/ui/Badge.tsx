import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "sand" | "gold" | "oasis" | "clay";

const TONE_CLASSES: Record<BadgeTone, string> = {
  sand: "border-(--line-soft) bg-mist text-(--app-fg)",
  gold: "border-gold/40 bg-gold/10 text-gold-bright",
  oasis: "border-oasis/40 bg-oasis/10 text-oasis",
  clay: "border-clay/40 bg-clay/10 text-clay",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Small pill chip for kinds, statuses and accessibility flags. */
export function Badge({ tone = "sand", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
