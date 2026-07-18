import "server-only";

import { Innertube, YTNodes } from "youtubei.js";

type LockupView = InstanceType<typeof YTNodes.LockupView>;
type PlaylistVideo = InstanceType<typeof YTNodes.PlaylistVideo>;
type ReelItem = InstanceType<typeof YTNodes.ReelItem>;
type ShortsLockupView = InstanceType<typeof YTNodes.ShortsLockupView>;
type PlaylistItem = LockupView | PlaylistVideo | ReelItem | ShortsLockupView;

import { extractPlaylistId, parseUploadedAt } from "./parse";

/**
 * Server-side YouTube metadata fetching.
 *
 * NOTE ON LIBRARY CHOICE: the steering doc originally called for
 * `youtube-sr` (matching the public Salasel CLI). That package's GitHub
 * repo was archived by its owner on 2025-12-14 and is now read-only /
 * permanently unmaintained; `YouTube.getPlaylist()` also reliably
 * returns `null` against YouTube's current page structure (verified
 * against the exact same package copy vendored in the public repo, not
 * just this project — this is a real upstream breakage, not an
 * integration bug). We use `youtubei.js` instead: it talks to YouTube's
 * Innertube API directly (the same API YouTube's own clients use)
 * rather than scraping/parsing rendered HTML, and is actively
 * maintained. The playlist-add / re-sync flows and derived-field logic
 * described in the steering doc are unaffected — only the fetch
 * implementation changes.
 */

// Delay between per-video detail fetches (to get uploadedAt, which is
// only available on the video's own watch page, not the playlist
// listing) to avoid rate limiting, matching the CLI's fetchVideos
// behavior.
const PER_VIDEO_FETCH_DELAY_MS = 300;

export interface FetchedVideo {
  id: string;
  title: string;
  duration: number; // seconds
  uploadedAt: number; // unix epoch seconds, 0 if unknown
}

export interface FetchedPlaylist {
  id: string;
  name: string;
  thumbnailId: string;
  videos: FetchedVideo[];
}

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedClient: Promise<Innertube> | null = null;

function getClient(): Promise<Innertube> {
  if (!cachedClient) {
    cachedClient = Innertube.create();
  }
  return cachedClient;
}

/** Extracts { id, title, duration } from a playlist listing item. Items
 * can be the modern LockupView shape or the legacy PlaylistVideo shape;
 * anything else (e.g. shorts) is skipped. */
function parseListingItem(
  item: PlaylistItem,
): { id: string; title: string; duration: number } | null {
  if (item instanceof YTNodes.LockupView) {
    if (item.content_type !== "VIDEO" || !item.content_id) return null;
    return {
      id: item.content_id,
      title: item.metadata?.title?.text ?? "Untitled",
      duration: 0, // backfilled from the per-video fetch below
    };
  }

  if (item instanceof YTNodes.PlaylistVideo) {
    if (!item.id) return null;
    return {
      id: item.id,
      title: item.title?.text ?? "Untitled",
      duration: item.duration?.seconds ?? 0,
    };
  }

  return null;
}

/**
 * Fetches a single video's detail page to get its upload date (and, for
 * listing item shapes that don't carry it, duration). Playlist listing
 * items don't reliably include an upload date — only per-video pages
 * do — which is why we fetch each video individually with a delay
 * between requests.
 */
async function fetchVideoDetail(
  videoId: string,
): Promise<{ uploadedAt: number; duration: number } | null> {
  try {
    const yt = await getClient();
    const info = await yt.getInfo(videoId);
    const uploadedAt = parseUploadedAt(info.primary_info?.published?.text);
    const duration = info.basic_info?.duration ?? 0;
    return { uploadedAt, duration };
  } catch {
    return null;
  }
}

/**
 * Fetches a playlist's metadata and video list from YouTube using ONLY
 * the playlist listing (a single request) — no per-video detail fetches.
 * This is fast and stays well within serverless function timeouts even
 * for large playlists.
 *
 * The tradeoff: the listing doesn't carry `uploadedAt` (and, for some
 * item shapes, not `duration` either), so those come back as 0 here. The
 * caller is expected to backfill them by calling `fetchVideoDetails` in
 * batches (see the add-playlist flow), which keeps each request short
 * instead of doing all N per-video fetches in one long request that
 * would time out on hosts like Netlify (10s sync function limit).
 */
export async function fetchPlaylistListing(
  urlOrId: string,
): Promise<FetchResult<FetchedPlaylist>> {
  const playlistId = extractPlaylistId(urlOrId);
  if (!playlistId) {
    return { ok: false, error: "Could not find a valid playlist ID in the input." };
  }

  let playlist;
  try {
    const yt = await getClient();
    playlist = await yt.getPlaylist(playlistId);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch playlist from YouTube.",
    };
  }

  if (!playlist) {
    return { ok: false, error: "Playlist not found or could not be parsed." };
  }

  const items = playlist.items ?? [];
  const videos: FetchedVideo[] = [];

  for (const item of items) {
    const parsed = parseListingItem(item);
    if (!parsed) continue;
    videos.push({
      id: parsed.id,
      title: parsed.title,
      duration: parsed.duration || 0,
      uploadedAt: 0, // backfilled via fetchVideoDetails
    });
  }

  // youtubei.js's Playlist.info doesn't expose a dedicated thumbnail
  // video ID, so we derive it from the first video, matching the
  // steering doc's `thumbnailId = thumbnail?.id || videos[0]?.id`
  // fallback logic.
  const thumbnailId = videos[0]?.id;
  if (!thumbnailId) {
    return { ok: false, error: "Playlist has no videos to derive a thumbnail from." };
  }

  return {
    ok: true,
    data: {
      id: playlistId,
      name: playlist.info?.title ?? "Untitled playlist",
      thumbnailId,
      videos,
    },
  };
}

export interface VideoDetail {
  id: string;
  duration: number;
  uploadedAt: number;
}

/**
 * Fetches `uploadedAt` (and duration, as a fallback) for a batch of
 * video IDs, sequentially with a small delay between each to avoid
 * YouTube rate-limiting. Kept small (the caller passes a slice, e.g. 10
 * IDs) so each invocation stays under serverless timeouts. Videos whose
 * detail fetch fails come back with 0s rather than failing the batch.
 */
export async function fetchVideoDetails(
  videoIds: string[],
): Promise<FetchResult<VideoDetail[]>> {
  if (!Array.isArray(videoIds)) {
    return { ok: false, error: "Invalid video IDs." };
  }

  const results: VideoDetail[] = [];

  for (let i = 0; i < videoIds.length; i++) {
    const id = videoIds[i];
    const detail = await fetchVideoDetail(id);
    results.push({
      id,
      duration: detail?.duration ?? 0,
      uploadedAt: detail?.uploadedAt ?? 0,
    });
    // Delay between requests (but not after the last one in the batch).
    if (i < videoIds.length - 1) {
      await delay(PER_VIDEO_FETCH_DELAY_MS);
    }
  }

  return { ok: true, data: results };
}

/**
 * Fetches a playlist's metadata and full video list from YouTube,
 * including per-video `uploadedAt`/`duration` details in one call.
 *
 * NOTE: this does N sequential per-video fetches with a delay between
 * each, so it can run for tens of seconds on large playlists — fine for
 * server-side/background use (e.g. re-sync), but NOT safe to call from a
 * request that has a short timeout. The add-playlist flow uses
 * `fetchPlaylistListing` + `fetchVideoDetails` (batched) instead.
 */
export async function fetchPlaylist(
  urlOrId: string,
): Promise<FetchResult<FetchedPlaylist>> {
  const listing = await fetchPlaylistListing(urlOrId);
  if (!listing.ok) return listing;

  const videos: FetchedVideo[] = [];
  for (const v of listing.data.videos) {
    const detail = await fetchVideoDetail(v.id);
    videos.push({
      id: v.id,
      title: v.title,
      duration: v.duration || detail?.duration || 0,
      uploadedAt: detail?.uploadedAt ?? 0,
    });
    await delay(PER_VIDEO_FETCH_DELAY_MS);
  }

  return {
    ok: true,
    data: { ...listing.data, videos },
  };
}

/**
 * Re-fetches a single video's current metadata from YouTube. Used by the
 * re-sync flow to backfill missing/zero duration or uploadedAt on
 * existing video rows without overwriting a manually-edited title.
 */
export async function fetchVideo(
  videoId: string,
): Promise<FetchResult<FetchedVideo>> {
  try {
    const yt = await getClient();
    const info = await yt.getInfo(videoId);
    if (!info.basic_info?.id) {
      return { ok: false, error: "Video not found or could not be parsed." };
    }
    return {
      ok: true,
      data: {
        id: info.basic_info.id,
        title: info.basic_info.title ?? "Untitled",
        duration: info.basic_info.duration ?? 0,
        uploadedAt: parseUploadedAt(info.primary_info?.published?.text),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch video from YouTube.",
    };
  }
}
