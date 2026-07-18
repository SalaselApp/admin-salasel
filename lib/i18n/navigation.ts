import type { Locale } from "./config";

/**
 * Build a locale-prefixed internal path.
 *
 * Every internal link / redirect in the admin must go through this so the
 * active locale is preserved across navigation. Never hardcode paths like
 * "/" or "/playlists/new" once locale routing exists.
 *
 * @example
 *   localeHref("ar", "/")                 // "/ar"
 *   localeHref("en", "/playlists/new")    // "/en/playlists/new"
 *   localeHref("ar", "playlists/abc")     // "/ar/playlists/abc"
 */
export function localeHref(locale: Locale, path = "/"): string {
  const normalized = path === "/" ? "" : `/${path.replace(/^\/+/, "")}`;
  return `/${locale}${normalized}`;
}
