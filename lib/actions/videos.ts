"use server";

import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchPlaylist, fetchVideo } from "@/lib/youtube/fetch";
import { recomputeDerivedFields } from "@/lib/derived";
import type { VideoRow } from "@/lib/models/video";
import type { ActionResult } from "./playlists";

/**
 * Adds a single video to a playlist by URL or ID, then recomputes the
 * playlist's derived fields.
 */
export async function addVideo(
  playlistId: string,
  videoUrlOrId: string,
): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }
  if (typeof videoUrlOrId !== "string" || videoUrlOrId.trim().length === 0) {
    return { ok: false, error: "Enter a YouTube video URL or ID." };
  }

  const result = await fetchVideo(videoUrlOrId.trim());
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const supabase = getSupabaseAdmin();
  const row: VideoRow = {
    id: result.data.id,
    playlist_id: playlistId.trim(),
    title: result.data.title,
    duration: result.data.duration,
    uploaded_at: result.data.uploadedAt,
  };

  const { error } = await supabase.from("videos").upsert(row);
  if (error) {
    return { ok: false, error: `Failed to save video: ${error.message}` };
  }

  await recomputeDerivedFields(playlistId.trim());

  return { ok: true, data: undefined };
}

/**
 * Updates a video's title override. Does not affect derived fields.
 */
export async function updateVideoTitle(
  videoId: string,
  title: string,
): Promise<ActionResult> {
  await requireSession();

  if (typeof videoId !== "string" || videoId.trim().length === 0) {
    return { ok: false, error: "Missing video ID." };
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "Title cannot be empty." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("videos")
    .update({ title: title.trim() })
    .eq("id", videoId.trim());

  if (error) {
    return { ok: false, error: `Failed to update video: ${error.message}` };
  }

  return { ok: true, data: undefined };
}

/**
 * Removes a video from a playlist, then recomputes the playlist's
 * derived fields.
 */
export async function removeVideo(
  playlistId: string,
  videoId: string,
): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }
  if (typeof videoId !== "string" || videoId.trim().length === 0) {
    return { ok: false, error: "Missing video ID." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("videos").delete().eq("id", videoId.trim());

  if (error) {
    return { ok: false, error: `Failed to remove video: ${error.message}` };
  }

  await recomputeDerivedFields(playlistId.trim());

  return { ok: true, data: undefined };
}

/**
 * Re-syncs a playlist's videos from YouTube: adds any videos found on
 * YouTube that aren't already stored, and backfills `duration` /
 * `uploaded_at` on existing rows only where those fields are currently
 * missing/zero. Never overwrites a manually-edited title, and never
 * overwrites a non-zero duration/uploaded_at (those are treated as
 * already-correct, whether set by a prior fetch or a manual edit).
 * Recomputes derived fields once at the end.
 */
export async function resyncPlaylistVideos(playlistId: string): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }

  const trimmedId = playlistId.trim();
  const supabase = getSupabaseAdmin();

  const { data: existingVideos, error: fetchExistingError } = await supabase
    .from("videos")
    .select("id, duration, uploaded_at")
    .eq("playlist_id", trimmedId)
    .overrideTypes<Pick<VideoRow, "id" | "duration" | "uploaded_at">[], { merge: false }>();

  if (fetchExistingError) {
    return { ok: false, error: `Failed to load existing videos: ${fetchExistingError.message}` };
  }

  const existingById = new Map((existingVideos ?? []).map((v) => [v.id, v]));

  const fetched = await fetchPlaylist(trimmedId);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }

  const newRows: VideoRow[] = [];
  const updates: Array<{ id: string; duration?: number; uploaded_at?: number }> = [];

  for (const v of fetched.data.videos) {
    const existing = existingById.get(v.id);

    if (!existing) {
      newRows.push({
        id: v.id,
        playlist_id: trimmedId,
        title: v.title,
        duration: v.duration,
        uploaded_at: v.uploadedAt,
      });
      continue;
    }

    const patch: { id: string; duration?: number; uploaded_at?: number } = { id: v.id };
    if (!existing.duration && v.duration) patch.duration = v.duration;
    if (!existing.uploaded_at && v.uploadedAt) patch.uploaded_at = v.uploadedAt;
    if (patch.duration !== undefined || patch.uploaded_at !== undefined) {
      updates.push(patch);
    }
  }

  if (newRows.length > 0) {
    const { error } = await supabase.from("videos").insert(newRows);
    if (error) {
      return { ok: false, error: `Failed to add new videos: ${error.message}` };
    }
  }

  for (const patch of updates) {
    const { id, ...fields } = patch;
    const { error } = await supabase.from("videos").update(fields).eq("id", id);
    if (error) {
      return { ok: false, error: `Failed to update video ${id}: ${error.message}` };
    }
  }

  await recomputeDerivedFields(trimmedId);

  return { ok: true, data: undefined };
}
