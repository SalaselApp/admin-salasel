import { listPlaylists } from "@/lib/queries/playlists";
import { PlaylistList } from "./playlist-list";

// The dashboard reflects live DB state; don't cache between requests.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const playlists = await listPlaylists();
  return <PlaylistList playlists={playlists} />;
}
