"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { Playlist } from "@/lib/models/playlist";
import type { Video } from "@/lib/models/video";
import { updatePlaylistMeta, deletePlaylist } from "@/lib/actions/playlists";
import { videoThumbnailUrl } from "@/lib/youtube/thumbnail";
import { Categories, Classes } from "@/types";
import { PlaylistThumbnail } from "../new/playlist-thumbnail";
import {
  PlaylistFields,
  inputClasses,
  labelClasses,
  type ManualFieldsState,
} from "../playlist-fields";
import { ManageVideos } from "./manage-videos";

function playlistToManualFields(playlist: Playlist): ManualFieldsState {
  return {
    description: playlist.description,
    participants: playlist.participants.join(", "),
    language: playlist.language,
    type: playlist.type,
    style: playlist.style,
    categories: new Set<Categories>(playlist.categories),
    classes: new Set<Classes>(playlist.classes),
  };
}

export function EditPlaylistForm({
  playlist,
  videos,
}: {
  playlist: Playlist;
  videos: Video[];
}) {
  const router = useRouter();
  const [name, setName] = useState(playlist.name);
  const [thumbnailId, setThumbnailId] = useState(playlist.thumbnailId);
  const [manual, setManual] = useState<ManualFieldsState>(() =>
    playlistToManualFields(playlist),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (manual.categories.size === 0) {
      setError("Select at least one category.");
      return;
    }

    startSave(async () => {
      const result = await updatePlaylistMeta(playlist.id, {
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
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${playlist.name}" and all its videos? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startDelete(async () => {
      const result = await deletePlaylist(playlist.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: thumbnail preview + picker */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-gray-200 bg-surface-light p-4 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
          <p className={`${labelClasses()} mb-2`}>Thumbnail</p>
          <PlaylistThumbnail videoId={thumbnailId} alt={name} />

          {videos.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Right: metadata + videos */}
      <div className="flex-1 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-surface-light p-6 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClasses()}>
              YouTube playlist ID
            </label>
            <input
              type="text"
              value={playlist.id}
              readOnly
              disabled
              className={`${inputClasses()} cursor-not-allowed opacity-60`}
            />
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClasses()}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses()}
            />
          </div>

          <PlaylistFields value={manual} onChange={setManual} />
        </div>

        <ManageVideos playlistId={playlist.id} initialVideos={videos} />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && (
          <p className="text-sm text-primary">Changes saved.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <span className="material-icons-round text-base">
              {isSaving ? "hourglass_empty" : "save"}
            </span>
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <span className="material-icons-round text-base">
              {isDeleting ? "hourglass_empty" : "delete"}
            </span>
            {isDeleting ? "Deleting…" : "Delete playlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
