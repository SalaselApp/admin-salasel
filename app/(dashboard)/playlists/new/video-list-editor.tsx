"use client";

import Image from "next/image";
import { useState } from "react";

import type { FetchedVideo } from "@/lib/youtube/fetch";
import { videoThumbnailUrl, fallbackThumbnailUrl } from "@/lib/youtube/thumbnail";

export interface EditableVideo extends FetchedVideo {
  included: boolean;
}

export interface VideoListEditorProps {
  videos: EditableVideo[];
  onChange: (videos: EditableVideo[]) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Per-video row: thumbnail, editable title, duration, and an
 * include/exclude checkbox controlling whether the video is saved with
 * the playlist.
 */
export function VideoListEditor({ videos, onChange }: VideoListEditorProps) {
  const includedCount = videos.filter((v) => v.included).length;

  function updateVideo(id: string, patch: Partial<EditableVideo>) {
    onChange(videos.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface-light shadow-sm dark:border-slate-700 dark:bg-surface-dark">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          Videos
        </h2>
        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
          {includedCount} / {videos.length} included
        </span>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {videos.map((video) => (
          <VideoRow
            key={video.id}
            video={video}
            onChange={(patch) => updateVideo(video.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function VideoRow({
  video,
  onChange,
}: {
  video: EditableVideo;
  onChange: (patch: Partial<EditableVideo>) => void;
}) {
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(video.id));

  return (
    <div
      className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-4 p-4 transition-colors sm:px-6 ${
        video.included ? "" : "opacity-50"
      }`}
    >
      <input
        type="checkbox"
        checked={video.included}
        onChange={(e) => onChange({ included: e.target.checked })}
        aria-label={`Include "${video.title}"`}
        className="accent-primary"
      />

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

      <input
        type="text"
        value={video.title}
        onChange={(e) => onChange({ title: e.target.value })}
        disabled={!video.included}
        className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 outline-none hover:border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed dark:text-slate-100 dark:hover:border-slate-600"
      />

      <span className="text-sm text-gray-500 dark:text-slate-400">
        {formatDuration(video.duration)}
      </span>
    </div>
  );
}
