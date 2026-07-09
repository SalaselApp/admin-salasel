import type {
  Categories,
  Classes,
  ContentTypes,
  Language,
  PresentationStyles,
} from "@/types";

/**
 * Raw shape of the `playlists` table, snake_case, as stored in Supabase.
 * This schema is shared with the public Salasel app — do not add or
 * rename columns here without a migration applied to both repos.
 */
export interface PlaylistRow {
  id: string;
  name: string;
  thumbnail_id: string;
  description: string;
  participants: string[];
  language: Language;
  type: ContentTypes;
  style: PresentationStyles;
  categories: Categories[];
  classes: Classes[];
  video_count: number;
  duration: number;
  start_date: number;
  end_date: number;
}

/**
 * App-facing camelCase shape used throughout the admin UI and actions.
 */
export interface Playlist {
  id: string;
  name: string;
  thumbnailId: string;
  description: string;
  participants: string[];
  language: Language;
  type: ContentTypes;
  style: PresentationStyles;
  categories: Categories[];
  classes: Classes[];
  videoCount: number;
  duration: number;
  startDate: number;
  endDate: number;
}

export function rowToPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    thumbnailId: row.thumbnail_id,
    description: row.description,
    participants: row.participants,
    language: row.language,
    type: row.type,
    style: row.style,
    categories: row.categories,
    classes: row.classes,
    videoCount: row.video_count,
    duration: row.duration,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

/**
 * Manual (editor-provided) fields for a playlist. Excludes fields that
 * are derived (video_count, duration, start_date, end_date) or immutable
 * (id).
 */
export interface PlaylistManualInput {
  name: string;
  thumbnailId: string;
  description: string;
  participants: string[];
  language: Language;
  type: ContentTypes;
  style: PresentationStyles;
  categories: Categories[];
  classes: Classes[];
}

export function playlistManualInputToRow(
  id: string,
  input: PlaylistManualInput,
): Omit<PlaylistRow, "video_count" | "duration" | "start_date" | "end_date"> {
  return {
    id,
    name: input.name,
    thumbnail_id: input.thumbnailId,
    description: input.description,
    participants: input.participants,
    language: input.language,
    type: input.type,
    style: input.style,
    categories: input.categories,
    classes: input.classes,
  };
}
