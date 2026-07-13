"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { fetchPlaylistPreview, createPlaylist } from "@/lib/actions/playlists";
import type { FetchedPlaylist, FetchedVideo } from "@/lib/youtube/fetch";
import { videoThumbnailUrl } from "@/lib/youtube/thumbnail";
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
import { PlaylistThumbnail } from "./playlist-thumbnail";
import { VideoListEditor, type EditableVideo } from "./video-list-editor";

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

interface ManualFieldsState {
  description: string;
  participants: string; // comma-separated in the UI, split on submit
  language: Language;
  type: ContentTypes;
  style: PresentationStyles;
  categories: Set<Categories>;
  classes: Set<Classes>;
}

function initialManualFields(): ManualFieldsState {
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

function toEditableVideos(videos: FetchedVideo[]): EditableVideo[] {
  return videos.map((v) => ({ ...v, included: true }));
}

function inputClasses(): string {
  return "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
}

function labelClasses(): string {
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

export function AddPlaylistForm() {
  const router = useRouter();
  const [urlOrId, setUrlOrId] = useState("");
  const [preview, setPreview] = useState<FetchedPlaylist | null>(null);
  const [name, setName] = useState("");
  const [thumbnailId, setThumbnailId] = useState("");
  const [videos, setVideos] = useState<EditableVideo[]>([]);
  const [manual, setManual] = useState<ManualFieldsState>(initialManualFields);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isSaving, startSave] = useTransition();

  function handleFetch(formData: FormData) {
    setError(null);
    const value = String(formData.get("urlOrId") ?? "");
    startFetch(async () => {
      const result = await fetchPlaylistPreview(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
      setName(result.data.name);
      setThumbnailId(result.data.thumbnailId);
      setVideos(toEditableVideos(result.data.videos));
    });
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

  function handleSave() {
    if (!preview) return;
    setError(null);

    if (manual.categories.size === 0) {
      setError("Select at least one category.");
      return;
    }

    const includedVideos = videos.filter((v) => v.included);
    if (includedVideos.length === 0) {
      setError("At least one video must be included.");
      return;
    }

    startSave(async () => {
      const result = await createPlaylist(
        preview.id,
        {
          name: name.trim(),
          thumbnailId: thumbnailId.trim(),
          description: manual.description,
          participants: manual.participants
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          language: manual.language,
          type: manual.type,
          style: manual.style,
          categories: Array.from(manual.categories),
          classes: Array.from(manual.classes),
        },
        includedVideos.map(({ id, title, duration, uploadedAt }) => ({
          id,
          title,
          duration,
          uploadedAt,
        })),
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/");
    });
  }

  if (!preview) {
    return (
      <div className="mx-auto w-full max-w-md">
        <form
          action={handleFetch}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-surface-light p-6 shadow-sm dark:border-slate-700 dark:bg-surface-dark"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="urlOrId" className={labelClasses()}>
              YouTube playlist URL or ID
            </label>
            <input
              id="urlOrId"
              name="urlOrId"
              type="text"
              required
              value={urlOrId}
              onChange={(e) => setUrlOrId(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className={inputClasses()}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isFetching}
            className="flex items-center justify-center gap-1.5 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <span className="material-icons-round text-base">
              {isFetching ? "hourglass_empty" : "cloud_download"}
            </span>
            {isFetching ? "Fetching…" : "Fetch from YouTube"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: thumbnail preview + picker */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-gray-200 bg-surface-light p-4 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
          <p className={`${labelClasses()} mb-2`}>Thumbnail</p>
          <PlaylistThumbnail videoId={thumbnailId} alt={name} />

          <p className="mb-2 mt-4 text-xs font-medium text-gray-500 dark:text-slate-400">
            Pick from playlist videos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setThumbnailId(v.id)}
                aria-label={`Use "${v.title}" as thumbnail`}
                className={`relative aspect-video overflow-hidden rounded-md border-2 transition-colors ${
                  thumbnailId === v.id
                    ? "border-primary"
                    : "border-transparent hover:border-primary/50"
                }`}
              >
                <Image
                  src={videoThumbnailUrl(v.id)}
                  alt={v.title}
                  fill
                  sizes="100px"
                  className="object-cover"
                />
                {thumbnailId === v.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="material-icons-round text-lg leading-none text-white">
                      check_circle
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form fields + video list */}
      <div className="flex-1 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-surface-light p-6 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
            Found {preview.videos.length} video
            {preview.videos.length === 1 ? "" : "s"}. Review and fill in the
            details below.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClasses()}>
                Name
                <RequiredMark />
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses()}>Description</label>
              <textarea
                value={manual.description}
                onChange={(e) =>
                  setManual((m) => ({ ...m, description: e.target.value }))
                }
                rows={3}
                className={inputClasses()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses()}>
                Participants (comma-separated)
              </label>
              <input
                type="text"
                value={manual.participants}
                onChange={(e) =>
                  setManual((m) => ({ ...m, participants: e.target.value }))
                }
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
                  value={manual.language}
                  onChange={(e) =>
                    setManual((m) => ({
                      ...m,
                      language: e.target.value as Language,
                    }))
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
                  value={manual.type}
                  onChange={(e) =>
                    setManual((m) => ({
                      ...m,
                      type: Number(e.target.value) as ContentTypes,
                    }))
                  }
                  className={inputClasses()}
                >
                  {CONTENT_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {CONTENT_TYPE_LABELS[value]}
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
                  value={manual.style}
                  onChange={(e) =>
                    setManual((m) => ({
                      ...m,
                      style: Number(e.target.value) as PresentationStyles,
                    }))
                  }
                  className={inputClasses()}
                >
                  {PRESENTATION_STYLE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {PRESENTATION_STYLE_LABELS[value]}
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
                {CATEGORY_OPTIONS.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={manual.categories.has(value)}
                      onChange={() =>
                        setManual((m) => ({
                          ...m,
                          categories: toggleSetValue(m.categories, value),
                        }))
                      }
                      className="accent-primary"
                    />
                    {CATEGORY_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1.5">
              <legend className={labelClasses()}>Classes</legend>
              <div className="flex flex-wrap gap-3">
                {CLASS_OPTIONS.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={manual.classes.has(value)}
                      onChange={() =>
                        setManual((m) => ({
                          ...m,
                          classes: toggleSetValue(m.classes, value),
                        }))
                      }
                      className="accent-primary"
                    />
                    {CLASS_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <VideoListEditor videos={videos} onChange={setVideos} />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <span className="material-icons-round text-base">
              {isSaving ? "hourglass_empty" : "save"}
            </span>
            {isSaving ? "Saving…" : "Save playlist"}
          </button>
          <button
            type="button"
            onClick={() => setPreview(null)}
            disabled={isSaving}
            className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
