"use client";

import { useState } from "react";
import Image from "next/image";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { interpolate } from "@/lib/i18n/interpolate";
import { videoThumbnailUrl } from "@/lib/youtube/thumbnail";

// 3-column grid → 3 rows visible before "Load more".
const INITIAL_THUMBNAIL_COUNT = 9;

export interface ThumbnailOption {
  id: string;
  title: string;
}

/**
 * Grid of video thumbnails to pick a playlist's `thumbnail_id` from.
 * Collapses to the first few rows for long playlists (a 60+ episode
 * playlist otherwise renders an enormous grid), with a "Load more"
 * toggle. The currently-selected thumbnail is always kept visible even
 * while collapsed.
 */
export function ThumbnailPicker({
  videos,
  selectedId,
  onSelect,
  dict,
}: {
  videos: ThumbnailOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  dict: Dictionary;
}) {
  const [expanded, setExpanded] = useState(false);

  const isCollapsible = videos.length > INITIAL_THUMBNAIL_COUNT;
  const visible =
    isCollapsible && !expanded
      ? videos.slice(0, INITIAL_THUMBNAIL_COUNT)
      : videos;
  const selectedHidden =
    isCollapsible &&
    !expanded &&
    selectedId &&
    !visible.some((v) => v.id === selectedId)
      ? videos.find((v) => v.id === selectedId)
      : undefined;
  const shown = selectedHidden ? [...visible, selectedHidden] : visible;
  const hiddenCount = videos.length - shown.length;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            aria-label={interpolate(dict.videos.useAsThumbnail, {
              title: v.title,
            })}
            className={`relative aspect-video overflow-hidden rounded-md border-2 transition-colors ${
              selectedId === v.id
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
            {selectedId === v.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="material-icons-round text-lg leading-none text-white">
                  check_circle
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {isCollapsible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <span className="material-icons-round text-sm">
            {expanded ? "expand_less" : "expand_more"}
          </span>
          {expanded
            ? dict.videos.showFewer
            : interpolate(dict.videos.loadMore, { count: hiddenCount })}
        </button>
      )}
    </>
  );
}
