import Link from "next/link";

import { AddPlaylistForm } from "./add-playlist-form";

export default function NewPlaylistPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-slate-400"
      >
        <span className="material-icons-round text-base">arrow_back</span>
        Back to playlists
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
        Add playlist
      </h1>
      <AddPlaylistForm />
    </div>
  );
}
