import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { defaultLocale, isValidLocale } from "@/lib/i18n/config";

/**
 * Combined locale + auth redirect, computed in a single pass so we never
 * emit two chained redirects (which previously risked a redirect loop).
 *
 * 1. Ensure the path is locale-prefixed; if not, pick a locale (cookie
 *    hint → Accept-Language → default) and redirect once.
 * 2. Apply the optimistic auth rule against the locale-stripped path:
 *    logged-out users go to `/{locale}/login`, logged-in users are kept
 *    off `/{locale}/login`.
 *
 * This is NOT the authorization boundary — it only checks cookie
 * presence, not validity. `requireSession()` is the real gate.
 */
const LOCALE_COOKIE = "NEXT_LOCALE";

function pickLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }
  const accept = request.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (code && isValidLocale(code)) {
      return code;
    }
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME;
  if (!cookieName) {
    throw new Error("Missing COOKIE_NAME environment variable.");
  }

  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(cookieName);

  // Determine the current locale from the leading path segment.
  const segments = pathname.split("/");
  const maybeLocale = segments[1] ?? "";
  const hasLocalePrefix = isValidLocale(maybeLocale);

  // 1. No locale prefix → redirect once to the chosen locale, carrying
  //    the auth decision so we don't redirect again on the next request.
  if (!hasLocalePrefix) {
    const locale = pickLocale(request);
    const rest = pathname === "/" ? "" : pathname;
    const target = hasSession ? `/${locale}${rest}` : `/${locale}/login`;
    const url = request.nextUrl.clone();
    url.pathname = target;
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/" });
    return res;
  }

  const locale = maybeLocale;
  // The path after the locale segment, e.g. "/ar/playlists/x" → "/playlists/x".
  const rest = "/" + segments.slice(2).join("/");
  const isLoginPath = rest === "/login";

  // The login page is always reachable. We deliberately do NOT redirect
  // away from it when a cookie is merely *present*: the proxy only checks
  // presence, while the layout checks cookie *validity*. A stale/expired
  // cookie would otherwise loop (proxy: cookie present → leave /login;
  // layout: cookie invalid → back to /login). The login page itself does
  // the "already signed in → dashboard" redirect using the real check.
  if (isLoginPath) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
