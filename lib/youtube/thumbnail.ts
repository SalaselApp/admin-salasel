/**
 * Thumbnail URL helpers, matching the public Salasel app's convention
 * (app/utils.ts): the playlist thumbnail is always derived from a
 * video's YouTube thumbnail image, never an arbitrary uploaded URL —
 * the DB schema only stores `thumbnail_id` (a video ID), not an image
 * URL.
 */

export function videoThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
}

export function fallbackThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
