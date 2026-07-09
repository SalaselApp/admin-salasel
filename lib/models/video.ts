/**
 * Raw shape of the `videos` table, snake_case, as stored in Supabase.
 * Shared with the public Salasel app — do not add or rename columns
 * without a migration applied to both repos.
 */
export interface VideoRow {
  id: string;
  playlist_id: string;
  title: string;
  duration: number;
  uploaded_at: number;
}

/**
 * App-facing camelCase shape used throughout the admin UI and actions.
 */
export interface Video {
  id: string;
  playlistId: string;
  title: string;
  duration: number;
  uploadedAt: number;
}

export function rowToVideo(row: VideoRow): Video {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    title: row.title,
    duration: row.duration,
    uploadedAt: row.uploaded_at,
  };
}

export function videoToRow(video: Video): VideoRow {
  return {
    id: video.id,
    playlist_id: video.playlistId,
    title: video.title,
    duration: video.duration,
    uploaded_at: video.uploadedAt,
  };
}
