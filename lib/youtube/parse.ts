/**
 * ID/URL parsing helpers for YouTube playlists and videos.
 *
 * Ported from the public Salasel CLI's approach (bin/func/util/youtube.js
 * per the steering doc) to TypeScript, verified against youtube-sr's own
 * internal regexes (node_modules/youtube-sr/dist/mod.js) so the accepted
 * ID shapes match what youtube-sr itself considers valid.
 */

// Matches youtube-sr's own PLAYLIST_ID regex (PL|FL|UU|LL|RD|OL + 11-41 chars).
const PLAYLIST_ID_PATTERN = /^(PL|FL|UU|LL|RD|OL)[a-zA-Z0-9-_]{11,41}$/;
// Standard YouTube video ID: exactly 11 URL-safe base64-ish chars.
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9-_]{11}$/;

/**
 * Extracts a playlist ID from either a raw ID or a playlist URL
 * (`https://www.youtube.com/playlist?list=<ID>`, with or without extra
 * query params after it).
 */
export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (PLAYLIST_ID_PATTERN.test(trimmed)) return trimmed;

  const match = trimmed.match(/[&?]list=([^&]+)/);
  if (match && PLAYLIST_ID_PATTERN.test(match[1])) return match[1];

  return null;
}

/**
 * Extracts a video ID from either a raw ID or a watch/short URL
 * (`https://www.youtube.com/watch?v=<ID>` or `https://youtu.be/<ID>`).
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  const watchMatch = trimmed.match(/[&?]v=([^&]+)/);
  if (watchMatch && VIDEO_ID_PATTERN.test(watchMatch[1])) return watchMatch[1];

  const shortMatch = trimmed.match(/youtu\.be\/([^&?/]+)/);
  if (shortMatch && VIDEO_ID_PATTERN.test(shortMatch[1])) return shortMatch[1];

  return null;
}

// Matches an absolute date like "Jan 1, 2020" or "January 1, 2020",
// which is the shape YouTube's video page `dateText` field uses.
// (Distinct from the relative "2 years ago" text used in search results,
// which we never rely on for uploadedAt.)
const ABSOLUTE_DATE_PATTERN =
  /[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}/;

/**
 * Parses a YouTube video page's `dateText` (e.g. "Jan 1, 2020",
 * "Premiered Jan 1, 2020") into a unix epoch in seconds. Returns 0 if the
 * text is missing or unparseable — 0 is the sentinel used elsewhere for
 * "missing" fields (matches the re-sync semantics in the steering doc).
 */
export function parseUploadedAt(dateText: string | null | undefined): number {
  if (!dateText) return 0;

  const match = dateText.match(ABSOLUTE_DATE_PATTERN);
  const dateSegment = match ? match[0] : dateText;

  const ms = new Date(`${dateSegment} UTC`).getTime();
  if (Number.isNaN(ms)) return 0;

  return Math.floor(ms / 1000);
}
