"use client";

import {
  Categories,
  CATEGORY_LABELS,
  Classes,
  CLASS_LABELS,
  ContentTypes,
  CONTENT_TYPE_LABELS,
  LANGUAGES,
  PresentationStyles,
  PRESENTATION_STYLE_LABELS,
  type Language,
} from "@/types";

const CATEGORY_OPTIONS = Object.values(Categories).filter(
  (v): v is Categories => typeof v === "number",
);
const CLASS_OPTIONS = Object.values(Classes).filter(
  (v): v is Classes => typeof v === "number",
);
const CONTENT_TYPE_OPTIONS = Object.values(ContentTypes).filter(
  (v): v is ContentTypes => typeof v === "number",
);
const PRESENTATION_STYLE_OPTIONS = Object.values(PresentationStyles).filter(
  (v): v is PresentationStyles => typeof v === "number",
);

/**
 * Editor-provided manual fields shared by the add and edit playlist
 * screens. `name` and `thumbnailId` are managed by the parent (they sit
 * alongside the thumbnail picker), so this component only owns the
 * remaining metadata fields.
 */
export interface ManualFieldsState {
  description: string;
  participants: string; // comma-separated in the UI, split on submit
  language: Language;
  type: ContentTypes;
  style: PresentationStyles;
  categories: Set<Categories>;
  classes: Set<Classes>;
}

export function emptyManualFields(): ManualFieldsState {
  return {
    description: "",
    participants: "",
    language: "ar",
    type: ContentTypes.Educational,
    style: PresentationStyles.Narration,
    categories: new Set(),
    classes: new Set(),
  };
}

export function inputClasses(): string {
  return "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
}

export function labelClasses(): string {
  return "text-sm font-medium text-gray-700 dark:text-slate-300";
}

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function PlaylistFields({
  value,
  onChange,
}: {
  value: ManualFieldsState;
  onChange: (next: ManualFieldsState) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClasses()}>Description</label>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
          className={inputClasses()}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClasses()}>Participants (comma-separated)</label>
        <input
          type="text"
          value={value.participants}
          onChange={(e) => onChange({ ...value, participants: e.target.value })}
          className={inputClasses()}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClasses()}>
            Language
            <RequiredMark />
          </label>
          <select
            value={value.language}
            onChange={(e) =>
              onChange({ ...value, language: e.target.value as Language })
            }
            className={inputClasses()}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClasses()}>
            Content type
            <RequiredMark />
          </label>
          <select
            value={value.type}
            onChange={(e) =>
              onChange({ ...value, type: Number(e.target.value) as ContentTypes })
            }
            className={inputClasses()}
          >
            {CONTENT_TYPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {CONTENT_TYPE_LABELS[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClasses()}>
            Presentation style
            <RequiredMark />
          </label>
          <select
            value={value.style}
            onChange={(e) =>
              onChange({
                ...value,
                style: Number(e.target.value) as PresentationStyles,
              })
            }
            className={inputClasses()}
          >
            {PRESENTATION_STYLE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {PRESENTATION_STYLE_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={labelClasses()}>
          Categories
          <RequiredMark />
        </legend>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_OPTIONS.map((v) => (
            <label
              key={v}
              className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300"
            >
              <input
                type="checkbox"
                checked={value.categories.has(v)}
                onChange={() =>
                  onChange({
                    ...value,
                    categories: toggleSetValue(value.categories, v),
                  })
                }
                className="accent-primary"
              />
              {CATEGORY_LABELS[v]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={labelClasses()}>Classes</legend>
        <div className="flex flex-wrap gap-3">
          {CLASS_OPTIONS.map((v) => (
            <label
              key={v}
              className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300"
            >
              <input
                type="checkbox"
                checked={value.classes.has(v)}
                onChange={() =>
                  onChange({
                    ...value,
                    classes: toggleSetValue(value.classes, v),
                  })
                }
                className="accent-primary"
              />
              {CLASS_LABELS[v]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
