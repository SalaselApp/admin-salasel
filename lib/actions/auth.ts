"use server";

import { timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  clearAttempts,
  isLockedOut,
  recordFailedAttempt,
} from "@/lib/auth/rate-limit";
import { getLocaleConfig } from "@/lib/i18n/config";
import { localeHref } from "@/lib/i18n/navigation";

export type LoginErrorCode = "incorrect" | "locked";

export interface LoginState {
  /** Error code translated by the client form, if any. */
  errorCode?: LoginErrorCode;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Buffers must be equal length for timingSafeEqual; pad to avoid
  // leaking length via an early throw, then compare a length flag too.
  const maxLen = Math.max(bufA.length, bufB.length, 1);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  const contentsEqual = timingSafeEqual(paddedA, paddedB);
  return contentsEqual && bufA.length === bufB.length;
}

async function getClientKey(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for") ??
    headerList.get("x-real-ip") ??
    "unknown"
  );
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const clientKey = await getClientKey();
  const locale = getLocaleConfig(String(formData.get("locale") ?? "")).code;

  if (isLockedOut(clientKey)) {
    return { errorCode: "locked" };
  }

  const password = formData.get("password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("Missing ADMIN_PASSWORD environment variable.");
  }

  if (
    typeof password !== "string" ||
    !constantTimeEquals(password, adminPassword)
  ) {
    recordFailedAttempt(clientKey);
    return { errorCode: "incorrect" };
  }

  clearAttempts(clientKey);
  await setSessionCookie();
  redirect(localeHref(locale, "/"));
}

export async function logout(formData: FormData): Promise<void> {
  const locale = getLocaleConfig(String(formData.get("locale") ?? "")).code;
  await clearSessionCookie();
  redirect(localeHref(locale, "/login"));
}
