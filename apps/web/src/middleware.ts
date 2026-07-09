import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, files with an extension,
  // /fahidi (the static «خور النجوم» experience in public/fahidi),
  // and legacy /khor (redirected to /fahidi in next.config).
  matcher: "/((?!api|_next|_vercel|fahidi|khor|.*\\..*).*)",
};
