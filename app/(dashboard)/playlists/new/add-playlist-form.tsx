"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { fetchPlaylistPreview, createPlaylist } from "@/lib/actions/playlists";
import type { FetchedPlaylist, FetchedVideo } from "@/lib/youtube/fetch";
import { PlaylistThumbnail } from "./playlist-thumbnail";
import { VideoListEditor, type EditableVideo } from "./video-list-editor";
import { ThumbnailPicker } from "../thumbnail-picker";
import {
  PlaylistFields,
  emptyManualFields,
  inputClasses,
  labelClasses,
  type ManualFieldsState,
} from "../playlist-fields";

function toEditableVideos(videos: FetchedVideo[]): EditableVideo[] {
  return videos.map((v) => ({ ...v, included: true }));
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
  const [manual, setManual] = useState<ManualFieldsState>(emptyManualFields);
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
          <ThumbnailPicker
            videos={videos}
            selectedId={thumbnailId}
            onSelect={setThumbnailId}
          />
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

            <PlaylistFields value={manual} onChange={setManual} />
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
