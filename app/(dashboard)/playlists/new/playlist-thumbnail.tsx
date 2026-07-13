"use client";

import { useState } from "react";
import Image from "next/image";

import { videoThumbnailUrl, fallbackThumbnailUrl } from "@/lib/youtube/thumbnail";

export interface PlaylistThumbnailProps {
  videoId: string;
  alt: string;
}

/**
 * Large thumbnail preview. Falls back to a lower-res YouTube thumbnail
 * if the primary one 404s (some videos don't have an sddefault image).
 *
 * Tracks which video ID last failed to load (rather than resetting a
 * separate "current URL" state via an effect) so switching to a
 * different video always starts from the primary URL again.
 */
export function PlaylistThumbnail({ videoId, alt }: PlaylistThumbnailProps) {
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);
  const imageUrl =
    failedVideoId === videoId
      ? fallbackThumbnailUrl(videoId)
      : videoThumbnailUrl(videoId);

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800">
        <span className="material-icons-round text-3xl text-gray-400 dark:text-slate-600">
          image
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 288px"
        className="object-cover"
        onError={() => setFailedVideoId(videoId)}
      />
    </div>
  );
}
