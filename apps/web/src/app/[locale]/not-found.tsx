"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p aria-hidden className="text-display font-bold text-gold/30">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
        {t("notFound.title")}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed opacity-70">
        {t("notFound.body")}
      </p>
      <Link href="/" className={`${buttonClasses("primary", "lg")} mt-8`}>
        {t("notFound.home")}
      </Link>
    </div>
  );
}
