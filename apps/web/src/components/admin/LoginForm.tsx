"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { getAdminToken, loginAdmin } from "@/lib/adminApi";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { inputClasses } from "./fields";

type LoginError = "invalid" | "network" | null;

/** Password gate — verifies against the analytics endpoint, then stores the session token. */
export function LoginForm() {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LoginError>(null);

  // Already signed in this session → straight to the panel.
  useEffect(() => {
    if (getAdminToken()) router.replace("/admin");
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await loginAdmin(password);
      if (ok) {
        router.replace("/admin");
      } else {
        setError("invalid");
      }
    } catch {
      setError("network");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-stretch justify-center px-6 py-10">
      <Card className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span aria-hidden className="h-px w-12 bg-gold" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm opacity-70">{t("subtitle")}</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-password"
              className="text-xs font-semibold tracking-wide opacity-80"
            >
              {t("password")}
            </label>
            <input
              id="admin-password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClasses}
              aria-invalid={error === "invalid"}
              aria-describedby={error ? "admin-login-error" : undefined}
            />
          </div>

          {error ? (
            <p
              id="admin-login-error"
              role="alert"
              className="rounded-xs border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-clay"
            >
              {error === "invalid" ? t("invalid") : t("network")}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !password}
            className={cn(
              "inline-flex items-center justify-center rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-night",
              "transition-colors duration-200 ease-heritage hover:bg-gold-bright",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {busy ? t("checking") : t("submit")}
          </button>
        </form>

        <Link
          href="/"
          className="text-sm opacity-60 transition-opacity duration-200 ease-heritage hover:opacity-100"
        >
          {t("backHome")}
        </Link>
      </Card>
    </section>
  );
}
