import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic redirect only — checks cookie presence, not validity.
 * This is NOT the authorization boundary; it just avoids a flash of the
 * dashboard before the real check in the layout / server actions kicks
 * in. See lib/auth/session.ts `requireSession()` for the real gate.
 */
export function proxy(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME;
  if (!cookieName) {
    throw new Error("Missing COOKIE_NAME environment variable.");
  }
  const hasCookie = request.cookies.has(cookieName);
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (hasCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
