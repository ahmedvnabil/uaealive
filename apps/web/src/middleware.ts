import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, files with an extension,
  // and /khor (the static «خور النجوم» experience in public/khor).
  matcher: "/((?!api|_next|_vercel|khor|.*\\..*).*)",
};
