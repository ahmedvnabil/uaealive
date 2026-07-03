"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LangSwitcher } from "./LangSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/map", key: "map" },
  { href: "/twin", key: "twin" },
  { href: "/stories", key: "stories" },
  { href: "/characters", key: "characters" },
  { href: "/copilot", key: "copilot" },
  { href: "/events", key: "events" },
  { href: "/ar-experience", key: "arx" },
  { href: "/hunt", key: "hunt" },
] as const;

/** Floating glass nav — glass accents live ONLY here and in drawers. */
export function Nav() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkClasses = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm transition-colors duration-200 ease-heritage",
      isActive(href)
        ? "font-semibold text-gold-bright"
        : "text-sand/80 hover:text-sand",
    );

  return (
    <nav
      aria-label={t("a11y.mainNav")}
      className="fixed inset-x-0 top-0 z-40 px-4 pt-4"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-md border border-line bg-night-soft/70 px-4 py-2 text-sand backdrop-blur-md">
        <Link
          href="/"
          className="flex items-baseline gap-2 px-1 font-bold"
          onClick={() => setMenuOpen(false)}
        >
          <span className="text-gold">{t("app.name")}</span>
          <span className="hidden text-xs font-normal text-sand/70 sm:inline">
            {t("app.district")}
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map(({ href, key }) => (
            <Link key={key} href={href} className={linkClasses(href)}>
              {t(`nav.${key}`)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LangSwitcher />
          <button
            type="button"
            className="rounded-md p-2 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="mx-auto mt-2 max-w-6xl rounded-md border border-line bg-night-soft/70 p-2 text-sand backdrop-blur-md lg:hidden">
          <ul className="flex flex-col">
            {LINKS.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className={cn("block", linkClasses(href))}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
