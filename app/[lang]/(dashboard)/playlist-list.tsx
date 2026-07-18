"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import type { Playlist } from "@/lib/models/playlist";
import { ContentTypes, LANGUAGES, type Language } from "@/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localeHref } from "@/lib/i18n/navigation";
import { interpolate } from "@/lib/i18n/interpolate";
import { contentTypeLabel, presentationStyleLabel } from "@/lib/i18n/labels";
import { videoThumbnailUrl, fallbackThumbnailUrl } from "@/lib/youtube/thumbnail";

const CONTENT_TYPE_OPTIONS = Object.values(ContentTypes).filter(
  (v): v is ContentTypes => typeof v === "number",
);

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PlaylistList({
  playlists,
  locale,
  dict,
}: {
  playlists: Playlist[];
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.dashboard;
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [type, setType] = useState<ContentTypes | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return playlists.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (language !== "all" && p.language !== language) return false;
      if (type !== "all" && p.type !== type) return false;
      return true;
    });
  }, [playlists, query, language, type]);

  const hasActiveFilters = query.trim() !== "" || language !== "all" || type !== "all";

  function clearFilters() {
    setQuery("");
    setLanguage("all");
    setType("all");
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {t.heading}
        </h1>
        <Link
          href={localeHref(locale, "/playlists/new")}
          className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <span className="material-icons-round text-base">add</span>
          {t.addPlaylist}
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="material-icons-round pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 dark:text-slate-500">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-full border border-gray-300 bg-white py-2.5 pe-4 ps-10 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language | "all")}
          aria-label={t.filterByLanguage}
          className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">{t.allLanguages}</option>
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value === "all" ? "all" : (Number(e.target.value) as ContentTypes))
          }
          aria-label={t.filterByContentType}
          className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">{t.allTypes}</option>
          {CONTENT_TYPE_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {contentTypeLabel(dict, v)}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-slate-400"
          >
            <span className="material-icons-round text-base">close</span>
            {t.clear}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-gray-500 dark:text-slate-400">
          {playlists.length === 0 ? t.emptyNoPlaylists : t.emptyNoMatches}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              locale={locale}
              dict={dict}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistCard({
  playlist,
  locale,
  dict,
}: {
  playlist: Playlist;
  locale: Locale;
  dict: Dictionary;
}) {
  const [imageUrl, setImageUrl] = useState(
    videoThumbnailUrl(playlist.thumbnailId),
  );

  const videoCountLabel = interpolate(
    playlist.videoCount === 1
      ? dict.dashboard.videoCount
      : dict.dashboard.videoCountPlural,
    { count: playlist.videoCount },
  );

  return (
    <Link
      href={localeHref(locale, `/playlists/${playlist.id}`)}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-surface-light shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-surface-dark"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
        <Image
          src={imageUrl}
          alt={playlist.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          onError={() => setImageUrl(fallbackThumbnailUrl(playlist.thumbnailId))}
        />
        <span className="absolute bottom-2 end-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
          {videoCountLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-primary dark:text-slate-100">
          {playlist.name}
        </h2>
        {playlist.description && (
          <p className="line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
            {playlist.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-gray-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="material-icons-round text-sm">translate</span>
            {playlist.language.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-icons-round text-sm">category</span>
            {contentTypeLabel(dict, playlist.type)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-icons-round text-sm">mic</span>
            {presentationStyleLabel(dict, playlist.style)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-icons-round text-sm">schedule</span>
            {formatDuration(playlist.duration)}
          </span>
        </div>
      </div>
    </Link>
  );
}
