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

  const { data: maxRow, error: maxError } = await supabase
    .from("videos")
    .select("position")
    .eq("playlist_id", playlistId.trim())
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()
    .overrideTypes<Pick<VideoRow, "position"> | null, { merge: false }>();

  if (maxError) {
    return { ok: false, error: `Failed to determine video position: ${maxError.message}` };
  }

  const nextPosition = (maxRow?.position ?? -1) + 1;

  const row: VideoRow = {
    id: result.data.id,
    playlist_id: playlistId.trim(),
    title: result.data.title,
    duration: result.data.duration,
    uploaded_at: result.data.uploadedAt,
    position: nextPosition,
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
 * Persists a new drag-and-drop order for a playlist's videos. Writes the
 * `position` column for every video in `orderedVideoIds` (index in the
 * array = new position). Does not touch derived fields — order doesn't
 * affect `video_count`/`duration`/dates.
 */
export async function reorderVideos(
  playlistId: string,
  orderedVideoIds: string[],
): Promise<ActionResult> {
  await requireSession();

  if (typeof playlistId !== "string" || playlistId.trim().length === 0) {
    return { ok: false, error: "Missing playlist ID." };
  }
  if (!Array.isArray(orderedVideoIds) || orderedVideoIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "Invalid video order." };
  }

  const trimmedId = playlistId.trim();
  const supabase = getSupabaseAdmin();

  // Guard against writing a partial/wrong order for the playlist (e.g. a
  // stale client sending a list that doesn't match the actual video set).
  const { data: existing, error: fetchError } = await supabase
    .from("videos")
    .select("id")
    .eq("playlist_id", trimmedId)
    .overrideTypes<Pick<VideoRow, "id">[], { merge: false }>();

  if (fetchError) {
    return { ok: false, error: `Failed to load videos: ${fetchError.message}` };
  }

  const existingIds = new Set((existing ?? []).map((v) => v.id));
  const providedIds = new Set(orderedVideoIds);

  if (
    existingIds.size !== providedIds.size ||
    [...existingIds].some((id) => !providedIds.has(id))
  ) {
    return { ok: false, error: "Video order does not match the playlist's current videos." };
  }

  const results = await Promise.all(
    orderedVideoIds.map((id, index) =>
      supabase.from("videos").update({ position: index }).eq("id", id),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { ok: false, error: `Failed to save video order: ${failed.error.message}` };
  }

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
    .select("id, duration, uploaded_at, position")
    .eq("playlist_id", trimmedId)
    .overrideTypes<Pick<VideoRow, "id" | "duration" | "uploaded_at" | "position">[], { merge: false }>();

  if (fetchExistingError) {
    return { ok: false, error: `Failed to load existing videos: ${fetchExistingError.message}` };
  }

  const existingById = new Map((existingVideos ?? []).map((v) => [v.id, v]));
  let nextPosition =
    (existingVideos ?? []).reduce((max, v) => Math.max(max, v.position), -1) + 1;

  const fetched = await fetchPlaylist(trimmedId);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }

  const newRows: VideoRow[] = [];
  const updates: Array<{ id: string; duration?: number; uploaded_at?: number }> = [];

  for (const v of fetched.data.videos) {
    const existing = existingById.get(v.id);

    if (!existing) {
      // New videos found on YouTube are appended after existing videos,
      // in the order YouTube returns them, so a re-sync never disturbs
      // the admin's existing manual ordering of already-known videos.
      newRows.push({
        id: v.id,
        playlist_id: trimmedId,
        title: v.title,
        duration: v.duration,
        uploaded_at: v.uploadedAt,
        position: nextPosition++,
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
