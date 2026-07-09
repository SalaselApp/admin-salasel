/**
 * Shared domain types and enums for Salasel Admin.
 *
 * These mirror the public Salasel app's enum values verbatim — do not
 * change the numeric values, they are persisted in the shared Supabase
 * database (`playlists.type`, `.style`, `.categories`, `.classes`).
 */

export enum Categories {
  Nature = 0,
  Self = 1,
  Religion = 2,
}

export enum ContentTypes {
  Educational = 0,
  Awareness = 1,
  Purification = 2,
}

export enum PresentationStyles {
  Narration = 0,
  Lecture = 1,
  Podcast = 2,
  Story = 3,
}

export enum Classes {
  Kids = 0,
  Female = 1,
  Married = 2,
  Parents = 3,
}

export type Language = "ar" | "en" | "ja";

export const LANGUAGES: Language[] = ["ar", "en", "ja"];

export const CATEGORY_LABELS: Record<Categories, string> = {
  [Categories.Nature]: "Nature",
  [Categories.Self]: "Self",
  [Categories.Religion]: "Religion",
};

export const CONTENT_TYPE_LABELS: Record<ContentTypes, string> = {
  [ContentTypes.Educational]: "Educational",
  [ContentTypes.Awareness]: "Awareness",
  [ContentTypes.Purification]: "Purification",
};

export const PRESENTATION_STYLE_LABELS: Record<PresentationStyles, string> = {
  [PresentationStyles.Narration]: "Narration",
  [PresentationStyles.Lecture]: "Lecture",
  [PresentationStyles.Podcast]: "Podcast",
  [PresentationStyles.Story]: "Story",
};

export const CLASS_LABELS: Record<Classes, string> = {
  [Classes.Kids]: "Kids",
  [Classes.Female]: "Female",
  [Classes.Married]: "Married",
  [Classes.Parents]: "Parents",
};
