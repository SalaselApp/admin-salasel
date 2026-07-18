/**
 * Locale configuration for the admin UI itself (distinct from the
 * per-playlist content `language` field). Mirrors the public Salasel
 * app's approach (`app/static.ts`): a small frozen list of supported
 * UI locales with display name + text direction, Arabic as the default.
 *
 * Kept free of `server-only` / React imports so it can be used from the
 * edge proxy, server components, and client components alike.
 */

export type Locale = "ar" | "en";

export type Direction = "rtl" | "ltr";

export interface LocaleConfig {
  code: Locale;
  /** Display name in its own language. */
  name: string;
  dir: Direction;
}

/** All supported admin UI locales. Arabic first = default. */
export const locales: readonly LocaleConfig[] = Object.freeze([
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "en", name: "English", dir: "ltr" },
]);

/** Default locale used when none is present in the URL. */
export const defaultLocale: Locale = "ar";

const localeMap: Readonly<Record<Locale, LocaleConfig>> = Object.freeze(
  locales.reduce(
    (acc, l) => {
      acc[l.code] = l;
      return acc;
    },
    {} as Record<Locale, LocaleConfig>,
  ),
);

/** Type guard: is this string one of our supported locale codes? */
export function isValidLocale(value: string): value is Locale {
  return value in localeMap;
}

/**
 * Resolve a locale config by code, falling back to the default locale
 * for anything unrecognized.
 */
export function getLocaleConfig(value: string): LocaleConfig {
  return isValidLocale(value) ? localeMap[value] : localeMap[defaultLocale];
}
