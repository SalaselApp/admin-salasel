"use server";

import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchPlaylist } from "@/lib/youtube/fetch";
import { recomputeDerivedFields } from "@/lib/derived";
import { revalidatePublicContent } from "@/lib/revalidate-public";
import {
  playlistManualInputToRow,
  type PlaylistManualInput,
} from "@/lib/models/playlist";
import type { VideoRow } from "@/lib/models/video";
import { validatePlaylistManualInput } from "@/lib/validation/playlist";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Fetches a playlist's metadata + video list from YouTube for the
 * add-playlist flow's preview step. Does not write anything — the
 * caller (client form) reviews/edits the result, then calls
 * `createPlaylist` to persist it.
 */
export async function fetchPlaylistPreview(urlOrId: string) {
  await requireSession();

  if (typeof urlOrId !== "string" || urlOrId.trim().length === 0) {
    return { ok: false, error: "Enter a YouTube playlist URL or ID." } as const;
  }

  const result = await fetchPlaylist(urlOrId.trim());
  if (!result.ok) {
    return { ok: false, error: result.error } as const;
  }

  return { ok: true, data: result.data } as const;
}

/**
 * Creates (or re-creates, via upsert) a playlist and its videos, then
 * recomputes derived fields. Used by the add-playlist flow after the
 * editor has reviewed/filled in the fetched preview.
 */
export async function createPlaylist(
  playlistId: string,
  manualInput: PlaylistManualInput,
  videos: Array<{ id: string; title: string; duration: number; uploadedAt: number }>,
): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }

  const validated = validatePlaylistManualInput(manualInput);
  if (!validated.valid) {
    return { ok: false, error: validated.error };
  }

  if (!Array.isArray(videos) || videos.length === 0) {
    return { ok: false, error: "A playlist must have at least one video." };
  }

  for (const v of videos) {
    if (
      typeof v.id !== "string" ||
      v.id.trim().length === 0 ||
      typeof v.title !== "string" ||
      typeof v.duration !== "number" ||
      v.duration < 0 ||
      typeof v.uploadedAt !== "number" ||
      v.uploadedAt < 0
    ) {
      return { ok: false, error: "Invalid video data." };
    }
  }

  const supabase = getSupabaseAdmin();
  const playlistRow = playlistManualInputToRow(playlistId.trim(), validated.data);

  // Upsert the playlist row with placeholder derived fields (0) — the
  // real values are computed below from the actual inserted videos, so
  // the playlist row is never trusted to carry correct counts on its
  // own. Upsert on id conflict so re-adding an existing playlist is
  // safe (matches the public repo's seed script behavior).
  const { error: playlistError } = await supabase.from("playlists").upsert({
    ...playlistRow,
    video_count: 0,
    duration: 0,
    start_date: 0,
    end_date: 0,
  });

  if (playlistError) {
    return { ok: false, error: `Failed to save playlist: ${playlistError.message}` };
  }

  const videoRows: VideoRow[] = videos.map((v, index) => ({
    id: v.id,
    playlist_id: playlistId.trim(),
    title: v.title,
    duration: v.duration,
    uploaded_at: v.uploadedAt,
    position: index,
  }));

  const { error: videosError } = await supabase.from("videos").upsert(videoRows);

  if (videosError) {
    return { ok: false, error: `Failed to save videos: ${videosError.message}` };
  }

  await recomputeDerivedFields(playlistId.trim());

  // New playlist + videos both affect the public site's caches.
  await revalidatePublicContent();

  return { ok: true, data: undefined };
}

/**
 * Updates a playlist's manual metadata fields. `id` is immutable and not
 * accepted here. Does not touch derived fields (video set is unchanged).
 */
export async function updatePlaylistMeta(
  playlistId: string,
  manualInput: PlaylistManualInput,
): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }

  const validated = validatePlaylistManualInput(manualInput);
  if (!validated.valid) {
    return { ok: false, error: validated.error };
  }

  const supabase = getSupabaseAdmin();
  const { name, thumbnailId, description, participants, language, type, style, categories, classes } =
    validated.data;

  const { error } = await supabase
    .from("playlists")
    .update({
      name,
      thumbnail_id: thumbnailId,
      description,
      participants,
      language,
      type,
      style,
      categories,
      classes,
    })
    .eq("id", playlistId.trim());

  if (error) {
    return { ok: false, error: `Failed to update playlist: ${error.message}` };
  }

  await revalidatePublicContent("playlists");

  return { ok: true, data: undefined };
}

/**
 * Deletes a playlist. Its videos are removed automatically via the
 * `videos.playlist_id` FK's ON DELETE CASCADE.
 */
export async function deletePlaylist(playlistId: string): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("playlists").delete().eq("id", playlistId.trim());

  if (error) {
    return { ok: false, error: `Failed to delete playlist: ${error.message}` };
  }

  // Deleting cascades to videos, so both caches are affected.
  await revalidatePublicContent();

  return { ok: true, data: undefined };
}
