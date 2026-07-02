import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: AdminPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

/**
 * Admin CMS (`/admin`) — the entire panel is client-side: the session token
 * lives in `sessionStorage` and `AdminShell` redirects to `/admin/login`
 * when it is missing or rejected (401).
 */
export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminShell />;
}
