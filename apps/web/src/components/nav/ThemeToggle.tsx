"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "uaealive_theme";

/** Dark-first theme toggle; persists the choice for the layout init script. */
export function ThemeToggle() {
  const t = useTranslations("common");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage unavailable (private mode) — the toggle still works for the session.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("theme.light") : t("theme.dark")}
      title={t("theme.toggle")}
      className="rounded-md p-2 text-sand/80 transition-colors duration-200 ease-heritage hover:text-sand"
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
