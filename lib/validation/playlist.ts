import {
  Categories,
  Classes,
  ContentTypes,
  LANGUAGES,
  PresentationStyles,
  type Language,
} from "@/types";
import type { PlaylistManualInput } from "@/lib/models/playlist";

/**
 * Input validation for playlist manual fields. YouTube-fetched data and
 * form input are both treated as untrusted — every value is checked
 * against the known enum ranges before it's written to Supabase.
 */

// TS numeric enums compile to an object with both forward (name -> number)
// and reverse (number -> name) mappings, so Object.values() includes both
// numbers and strings. Filter to the actual numeric members.
function numericEnumValues(e: Record<string, string | number>): number[] {
  return Object.values(e).filter((v): v is number => typeof v === "number");
}

const VALID_CATEGORIES = numericEnumValues(Categories);
const VALID_CLASSES = numericEnumValues(Classes);
const VALID_CONTENT_TYPES = numericEnumValues(ContentTypes);
const VALID_PRESENTATION_STYLES = numericEnumValues(PresentationStyles);

export function isValidLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.includes(value as Language);
}

export function isValidContentType(value: unknown): value is ContentTypes {
  return typeof value === "number" && VALID_CONTENT_TYPES.includes(value);
}

export function isValidPresentationStyle(
  value: unknown,
): value is PresentationStyles {
  return typeof value === "number" && VALID_PRESENTATION_STYLES.includes(value);
}

export function isValidCategory(value: unknown): value is Categories {
  return typeof value === "number" && VALID_CATEGORIES.includes(value);
}

export function isValidClass(value: unknown): value is Classes {
  return typeof value === "number" && VALID_CLASSES.includes(value);
}

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

/**
 * Validates the manual (editor-provided) fields of a playlist. Categories
 * is effectively required (matches the public CLI's behavior); classes
 * may be empty. Participants entries are trimmed and empty ones dropped.
 */
export function validatePlaylistManualInput(
  input: unknown,
): ValidationResult<PlaylistManualInput> {
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Invalid playlist data." };
  }

  const {
    name,
    thumbnailId,
    description,
    participants,
    language,
    type,
    style,
    categories,
    classes,
  } = input as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return { valid: false, error: "Name is required." };
  }

  if (typeof thumbnailId !== "string" || thumbnailId.trim().length === 0) {
    return { valid: false, error: "Thumbnail video ID is required." };
  }

  if (typeof description !== "string") {
    return { valid: false, error: "Description must be a string." };
  }

  if (!Array.isArray(participants) || !participants.every((p) => typeof p === "string")) {
    return { valid: false, error: "Participants must be a list of strings." };
  }

  if (!isValidLanguage(language)) {
    return { valid: false, error: `Invalid language: ${String(language)}.` };
  }

  if (!isValidContentType(type)) {
    return { valid: false, error: `Invalid content type: ${String(type)}.` };
  }

  if (!isValidPresentationStyle(style)) {
    return { valid: false, error: `Invalid presentation style: ${String(style)}.` };
  }

  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    !categories.every(isValidCategory)
  ) {
    return { valid: false, error: "At least one valid category is required." };
  }

  if (!Array.isArray(classes) || !classes.every(isValidClass)) {
    return { valid: false, error: "Invalid classes." };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      thumbnailId: thumbnailId.trim(),
      description,
      participants: participants.map((p) => p.trim()).filter(Boolean),
      language,
      type,
      style,
      categories,
      classes,
    },
  };
}
