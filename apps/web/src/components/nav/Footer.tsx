import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const EXPLORE_LINKS = [
  { href: "/map", key: "map" },
  { href: "/twin", key: "twin" },
  { href: "/stories", key: "stories" },
] as const;

const EXPERIENCE_LINKS = [
  { href: "/characters", key: "characters" },
  { href: "/ar-experience", key: "arx" },
  { href: "/hunt", key: "hunt" },
] as const;

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="mt-16 border-t border-(--line-soft)">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <p className="font-bold text-gold">{t("app.name")}</p>
          <p className="max-w-sm text-sm leading-relaxed opacity-80">
            {t("footer.about")}
          </p>
        </div>
        <nav aria-label={t("a11y.footerNav")} className="contents">
          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              {t("footer.explore")}
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {EXPLORE_LINKS.map(({ href, key }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="opacity-80 transition-opacity duration-200 ease-heritage hover:opacity-100"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              {t("footer.experience")}
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {EXPERIENCE_LINKS.map(({ href, key }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="opacity-80 transition-opacity duration-200 ease-heritage hover:opacity-100"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
      <div className="border-t border-(--line-soft)">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs opacity-70">
          <p>{t("footer.rights")}</p>
          <p>{t("footer.madeFor")}</p>
        </div>
      </div>
    </footer>
  );
}
