import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Closing call-to-action — quiet, typographic, server-rendered.
 */
export function CTASection() {
  const t = useTranslations("landing.cta");

  return (
    <section aria-labelledby="cta-title" className="border-t border-(--line-soft)">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
        <span aria-hidden className="h-10 w-px bg-gold" />
        <h2 id="cta-title" className="text-4xl font-bold text-balance sm:text-5xl">
          {t("title")}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-pretty opacity-75 sm:text-lg">
          {t("subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="/map" className={buttonClasses("primary", "lg")}>
            {t("primary")}
          </Link>
          <Link href="/community" className={buttonClasses("outline", "lg")}>
            {t("secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
