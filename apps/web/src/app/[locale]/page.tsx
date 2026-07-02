import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Placeholder home — replaced by the cinematic landing page in Task 9.
 * Exists so the RTL shell (nav, footer, theme, fonts) renders end-to-end.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium tracking-widest text-gold">
        {t("app.district")}
      </p>
      <h1 className="text-display">{t("app.tagline")}</h1>
      <p className="max-w-2xl text-lg opacity-80">{t("app.description")}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <Link href="/map" className={buttonClasses("primary", "lg")}>
          {t("ui.startExperience")}
        </Link>
        <Link href="/ar-experience" className={buttonClasses("outline", "lg")}>
          {t("ui.tryAr")}
        </Link>
      </div>
    </section>
  );
}
