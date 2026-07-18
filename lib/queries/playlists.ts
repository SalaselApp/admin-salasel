import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  rowToPlaylist,
  type Playlist,
  type PlaylistRow,
} from "@/lib/models/playlist";
import { rowToVideo, type Video, type VideoRow } from "@/lib/models/video";

/**
 * Server-side read helpers for the admin dashboard and edit screens.
 * These use the service-role client (like the write actions) and must
 * only be called from server components / server actions that have
 * already established the session — the dashboard layout gates access,
 * so these reads sit behind that boundary.
 */

/**
 * Lists all playlists, ordered by name (case-insensitive). Name search
 * is done in-memory by the caller / client since the set is small.
 */
export async function listPlaylists(): Promise<Playlist[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .order("name")
    .overrideTypes<PlaylistRow[], { merge: false }>();

  if (error) {
    throw new Error(`Failed to list playlists: ${error.message}`);
  }

  return (data ?? []).map(rowToPlaylist);
}

/**
 * Fetches a single playlist and its videos (videos ordered by their
 * persisted `position`). Returns null if the playlist doesn't exist.
 */
export async function getPlaylistWithVideos(
  id: string,
): Promise<{ playlist: Playlist; videos: Video[] } | null> {
  const supabase = getSupabaseAdmin();

  const { data: playlistRow, error: playlistError } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (playlistError) {
    throw new Error(`Failed to load playlist: ${playlistError.message}`);
  }
  if (!playlistRow) {
    return null;
  }

  const playlist = rowToPlaylist(playlistRow as unknown as PlaylistRow);

  const { data: videoRows, error: videosError } = await supabase
    .from("videos")
    .select("*")
    .eq("playlist_id", id)
    .order("position")
    .overrideTypes<VideoRow[], { merge: false }>();

  if (videosError) {
    throw new Error(`Failed to load videos: ${videosError.message}`);
  }

  return {
    playlist,
    videos: (videoRows ?? []).map(rowToVideo),
  };
}
