import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the default inner padding (e.g. for edge-to-edge media). */
  flush?: boolean;
}

/**
 * Content card — solid surface, NO glass/blur (glass is reserved for
 * floating overlays like the nav and drawers).
 */
export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-(--line-soft) bg-(--surface)",
        !flush && "p-6",
        className,
      )}
      {...props}
    />
  );
}
