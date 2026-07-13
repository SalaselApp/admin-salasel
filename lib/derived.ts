import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VideoRow } from "@/lib/models/video";

/**
 * Recomputes and persists the derived fields on a playlist row:
 * `video_count`, `duration`, `start_date`, `end_date`.
 *
 * Must be called after any change to a playlist's video set (add,
 * remove, re-sync, or a video's duration/uploaded_at changing), so the
 * playlist row never drifts out of sync with its actual videos. Not
 * needed for manual metadata edits (name, description, etc.) or
 * deletion, since those don't change the video set.
 */
export async function recomputeDerivedFields(playlistId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: videos, error: fetchError } = await supabase
    .from("videos")
    .select("duration, uploaded_at")
    .eq("playlist_id", playlistId)
    .returns<Pick<VideoRow, "duration" | "uploaded_at">[]>();

  if (fetchError) {
    throw new Error(`Failed to fetch videos for playlist ${playlistId}: ${fetchError.message}`);
  }

  const rows = videos ?? [];

  const videoCount = rows.length;
  const duration = rows.reduce((sum, v) => sum + (v.duration || 0), 0);

  const uploadedDates = rows
    .map((v) => v.uploaded_at)
    .filter((d): d is number => typeof d === "number" && d > 0);

  const startDate = uploadedDates.length ? Math.min(...uploadedDates) : 0;
  const endDate = uploadedDates.length ? Math.max(...uploadedDates) : 0;

  const { error: updateError } = await supabase
    .from("playlists")
    .update({
      video_count: videoCount,
      duration,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", playlistId);

  if (updateError) {
    throw new Error(`Failed to update derived fields for playlist ${playlistId}: ${updateError.message}`);
  }
}
