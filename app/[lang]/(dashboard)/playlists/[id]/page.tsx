import { notFound } from "next/navigation";
import Link from "next/link";

import { getPlaylistWithVideos } from "@/lib/queries/playlists";
import { EditPlaylistForm } from "./edit-playlist-form";

export const dynamic = "force-dynamic";

export default async function EditPlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPlaylistWithVideos(id);

  if (!result) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-slate-400"
      >
        <span className="material-icons-round text-base">arrow_back</span>
        Back to playlists
      </Link>

      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <Link href="/" className="hover:text-primary">
          Playlists
        </Link>
        <span className="material-icons-round text-base">chevron_right</span>
        <span className="text-gray-900 dark:text-slate-100">
          {result.playlist.name}
        </span>
      </div>

      <EditPlaylistForm
        playlist={result.playlist}
        videos={result.videos}
      />
    </div>
  );
}
