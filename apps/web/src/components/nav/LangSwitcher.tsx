"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";

/** Switches between ar/en while preserving the current path. */
export function LangSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={other}
      aria-label={t("lang.label")}
      className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-sand/80 transition-colors duration-200 ease-heritage hover:text-sand"
    >
      <Languages className="size-4" aria-hidden />
      <span>{t("lang.other")}</span>
    </Link>
  );
}
