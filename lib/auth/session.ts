import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Password-only session handling for Salasel Admin.
 *
 * There is exactly one admin "user" — access is gated by a single shared
 * password (ADMIN_PASSWORD). On successful login we issue a signed JWT
 * (via SESSION_SECRET) stored in an httpOnly cookie. The JWT payload
 * carries no secret data, just a role claim + expiry; the cookie's
 * signature is what makes it unforgeable.
 *
 * `requireSession()` is the real authorization boundary: every server
 * action / route handler that touches Supabase must call it first.
 */

interface SessionPayload extends JWTPayload {
  role: "admin";
}

function getCookieName(): string {
  const name = process.env.COOKIE_NAME;
  if (!name) {
    throw new Error("Missing COOKIE_NAME environment variable.");
  }
  return name;
}

/** Session lifetime in days, read from SESSION_DURATION (e.g. "7"). */
function getSessionDurationDays(): number {
  const raw = process.env.SESSION_DURATION;
  const days = Number(raw);
  if (!raw || Number.isNaN(days) || days <= 0) {
    throw new Error(
      "Missing or invalid SESSION_DURATION environment variable (expected a positive number of days).",
    );
  }
  return days;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  const payload: SessionPayload = { role: "admin" };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${getSessionDurationDays()}d`)
    .sign(getSessionSecret());
}

async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin") return null;
    return { role: "admin" };
  } catch {
    return null;
  }
}

export async function setSessionCookie(): Promise<void> {
  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(getCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * getSessionDurationDays(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
}

/**
 * Returns true if the current request has a valid, unexpired session
 * cookie. Does not throw — use this for optimistic / UI-only checks.
 */
export async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  if (!token) return false;
  const payload = await verifySessionToken(token);
  return payload !== null;
}

/**
 * The real authorization gate. Every server action and route handler
 * that writes to Supabase (or reads privileged data) must call this
 * first. Throws if there is no valid session, since actions are
 * reachable directly via POST regardless of the UI.
 */
export async function requireSession(): Promise<void> {
  const valid = await hasValidSession();
  if (!valid) {
    throw new Error("Unauthorized");
  }
}
