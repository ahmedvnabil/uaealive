import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// NEXT_DIST_DIR lets parallel build agents use isolated dist dirs (defaults to .next)
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    // «خور النجوم» — static 3D experience living in public/khor
    return [{ source: "/khor", destination: "/khor/index.html" }];
  },
};

export default withNextIntl(nextConfig);
