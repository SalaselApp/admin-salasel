"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";

import type { Video } from "@/lib/models/video";
import {
  removeVideo,
  reorderVideos,
  updateVideoTitle,
} from "@/lib/actions/videos";
import { videoThumbnailUrl, fallbackThumbnailUrl } from "@/lib/youtube/thumbnail";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatDate(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Video management for an existing playlist: drag-reorder (persisted via
 * `reorderVideos`), inline title edit (`updateVideoTitle`), and remove
 * (`removeVideo`). Each op hits the server immediately; local state is
 * kept in sync so the UI stays responsive.
 */
const INITIAL_VIDEO_COUNT = 10;

export function ManageVideos({
  playlistId,
  initialVideos,
}: {
  playlistId: string;
  initialVideos: Video[];
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [, startReorder] = useTransition();

  function persistOrder(next: Video[]) {
    setVideos(next);
    setError(null);
    startReorder(async () => {
      const result = await reorderVideos(
        playlistId,
        next.map((v) => v.id),
      );
      if (!result.ok) setError(result.error);
    });
  }

  function handleTitleSaved(id: string, title: string) {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, title } : v)));
  }

  function handleRemoved(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface-light shadow-sm dark:border-slate-700 dark:bg-surface-dark">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          Videos
        </h2>
        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
          {videos.length} video{videos.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <p className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      {videos.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
          This playlist has no videos.
        </p>
      ) : (
        (() => {
          const isCollapsible = videos.length > INITIAL_VIDEO_COUNT;
          const visibleVideos =
            isCollapsible && !expanded
              ? videos.slice(0, INITIAL_VIDEO_COUNT)
              : videos;
          const hiddenCount = videos.length - visibleVideos.length;

          return (
            <>
              <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return;
                  persistOrder(move(videos, event));
                }}
              >
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {visibleVideos.map((video, index) => (
                    <VideoRow
                      key={video.id}
                      video={video}
                      index={index}
                      playlistId={playlistId}
                      onTitleSaved={handleTitleSaved}
                      onRemoved={handleRemoved}
                      onError={setError}
                    />
                  ))}
                </div>
              </DragDropProvider>

              {isCollapsible && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 bg-gray-50 px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <span className="material-icons-round text-base">
                    {expanded ? "expand_less" : "expand_more"}
                  </span>
                  {expanded ? "Show fewer" : `Load all (${hiddenCount} more)`}
                </button>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}

function VideoRow({
  video,
  index,
  playlistId,
  onTitleSaved,
  onRemoved,
  onError,
}: {
  video: Video;
  index: number;
  playlistId: string;
  onTitleSaved: (id: string, title: string) => void;
  onRemoved: (id: string) => void;
  onError: (message: string | null) => void;
}) {
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(video.id));
  const [title, setTitle] = useState(video.title);
  const [isPending, startTransition] = useTransition();
  const { ref, handleRef, isDragging } = useSortable({ id: video.id, index });

  const dirty = title.trim() !== video.title && title.trim().length > 0;

  function saveTitle() {
    if (!dirty) return;
    onError(null);
    startTransition(async () => {
      const result = await updateVideoTitle(video.id, title.trim());
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onTitleSaved(video.id, title.trim());
    });
  }

  function handleRemove() {
    if (!confirm(`Remove "${video.title}" from this playlist?`)) return;
    onError(null);
    startTransition(async () => {
      const result = await removeVideo(playlistId, video.id);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onRemoved(video.id);
    });
  }

  return (
    <div
      ref={ref}
      className={`grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-x-4 p-4 transition-colors sm:px-6 ${
        isDragging ? "opacity-40" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Drag to reorder "${video.title}"`}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-slate-500 dark:hover:text-slate-300"
      >
        <span className="material-icons-round text-lg">drag_indicator</span>
      </button>

      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-gray-200 shadow-sm sm:w-28 dark:bg-slate-700">
        <Image
          alt={video.title}
          src={imageUrl}
          fill
          sizes="112px"
          className="object-cover"
          onError={() => setImageUrl(fallbackThumbnailUrl(video.id))}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 outline-none hover:border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary dark:text-slate-100 dark:hover:border-slate-600"
        />
        <span className="px-2 text-xs text-gray-400 dark:text-slate-500">
          {formatDate(video.uploadedAt)}
        </span>
      </div>

      <span className="text-sm text-gray-500 dark:text-slate-400">
        {formatDuration(video.duration)}
      </span>

      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        aria-label={`Remove "${video.title}"`}
        className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-slate-500"
      >
        <span className="material-icons-round text-lg">delete_outline</span>
      </button>
    </div>
  );
}
