import "server-only";

import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";

/**
 * Recursively widen the literal string types produced by a JSON import
 * (e.g. `"Sign in"`) to plain `string`, so translated locale files whose
 * values differ from English are still structurally assignable while the
 * *shape* (set of keys) stays enforced.
 */
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

/** The translation dictionary shape, keyed off the English source file. */
export type Dictionary = DeepString<typeof en>;

// Compile-time guard: the Arabic file must have exactly the same key
// structure as English. A missing or misspelled key fails the build.
ar satisfies Dictionary;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
};

/**
 * Load the dictionary for a locale. Server-only: dictionaries are read in
 * server components and passed down to client components as a plain `dict`
 * prop, so translation JSON never bloats the client bundle.
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
