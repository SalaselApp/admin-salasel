"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  fetchPlaylistListingPreview,
  fetchVideoDetailsBatch,
  createPlaylist,
} from "@/lib/actions/playlists";
import type { FetchedPlaylist, FetchedVideo } from "@/lib/youtube/fetch";

// How many videos' details to fetch per request. Each YouTube getInfo
// call is ~0.8-1s plus a 300ms anti-rate-limit delay, so a batch of 5
// runs in ~6s — comfortably under a 10s serverless function timeout —
// while the client loops through the whole playlist with a progress bar.
const DETAIL_BATCH_SIZE = 5;
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
  // Progress of the per-video detail backfill: null when idle, otherwise
  // { done, total } fetched so far.
  const [detailProgress, setDetailProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  function handleFetch(formData: FormData) {
    setError(null);
    const value = String(formData.get("urlOrId") ?? "");
    startFetch(async () => {
      // Phase 1: fast listing-only fetch (single short request).
      const result = await fetchPlaylistListingPreview(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const listing = result.data;
      const editable = toEditableVideos(listing.videos);

      setPreview(listing);
      setName(listing.name);
      setThumbnailId(listing.thumbnailId);
      setVideos(editable);

      // Phase 2: backfill uploadedAt/duration in small batches so each
      // request stays short. Show progress; a failed batch is skipped
      // (those videos keep 0s and can be re-synced later) rather than
      // aborting the whole add flow.
      const ids = editable.map((v) => v.id);
      setDetailProgress({ done: 0, total: ids.length });

      for (let i = 0; i < ids.length; i += DETAIL_BATCH_SIZE) {
        const slice = ids.slice(i, i + DETAIL_BATCH_SIZE);
        const batch = await fetchVideoDetailsBatch(slice);
        if (batch.ok) {
          const byId = new Map(batch.data.map((d) => [d.id, d]));
          setVideos((prev) =>
            prev.map((v) => {
              const d = byId.get(v.id);
              if (!d) return v;
              return {
                ...v,
                duration: v.duration || d.duration,
                uploadedAt: v.uploadedAt || d.uploadedAt,
              };
            }),
          );
        }
        setDetailProgress({
          done: Math.min(i + DETAIL_BATCH_SIZE, ids.length),
          total: ids.length,
        });
      }

      setDetailProgress(null);
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

          {detailProgress && (
            <div className="mb-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <span className="material-icons-round animate-spin text-base">
                  progress_activity
                </span>
                Fetching video details… {detailProgress.done} /{" "}
                {detailProgress.total}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${
                      detailProgress.total
                        ? (detailProgress.done / detailProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

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
            disabled={isSaving || detailProgress !== null}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <span className="material-icons-round text-base">
              {isSaving ? "hourglass_empty" : "save"}
            </span>
            {isSaving
              ? "Saving…"
              : detailProgress !== null
                ? "Fetching details…"
                : "Save playlist"}
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
