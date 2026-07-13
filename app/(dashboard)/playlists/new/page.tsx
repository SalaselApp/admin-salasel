import { AddPlaylistForm } from "./add-playlist-form";

export default function NewPlaylistPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
        Add playlist
      </h1>
      <AddPlaylistForm />
    </div>
  );
}
