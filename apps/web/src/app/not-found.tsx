import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

/**
 * Global 404. In this next-intl "locale-as-root" setup there is no root
 * layout, so an unmatched path renders this standalone shell (its own
 * <html>/<body>). Bilingual and locale-neutral — Arabic lead, English sub.
 */
const dubai = localFont({
  src: [
    { path: "../fonts/Dubai-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Dubai-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dubai",
  display: "swap",
});

export default function NotFound() {
  return (
    <html lang="ar" dir="rtl" className={`dark ${dubai.variable}`}>
      <body className="min-h-dvh bg-night text-sand">
        <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={72} height={72} className="opacity-90" />
          <p aria-hidden className="mt-8 text-6xl font-bold text-gold/40">
            404
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            ضاع الطريق في الأزقّة
          </h1>
          <p className="mt-2 text-lg opacity-70">Lost in the alleys</p>
          <p className="mt-5 max-w-md leading-relaxed opacity-60">
            هذا المسار لا يقود إلى أي مكان في الحي. لنُعِدك إلى البداية.
            <span className="mt-1 block text-sm">
              This path doesn&apos;t lead anywhere in the district.
            </span>
          </p>
          <Link
            href="/ar"
            className="mt-8 rounded-md bg-gold px-6 py-3 font-semibold text-night transition-opacity duration-200 hover:opacity-90"
          >
            العودة إلى الحي · Back to the district
          </Link>
        </main>
      </body>
    </html>
  );
}
