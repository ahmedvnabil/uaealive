import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  title: string;
  /** Small gold overline label above the title. */
  kicker?: string;
  description?: string;
  align?: "start" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  kicker,
  description,
  align = "start",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        centered && "items-center text-center",
        className,
      )}
    >
      {kicker ? (
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          {kicker}
        </p>
      ) : null}
      <span aria-hidden className="h-px w-12 bg-gold" />
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-base opacity-80">{description}</p>
      ) : null}
    </header>
  );
}
