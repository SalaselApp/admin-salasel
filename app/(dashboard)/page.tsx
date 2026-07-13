import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-gray-500 dark:text-slate-400">
        Playlist dashboard coming soon.
      </p>
      <Link
        href="/playlists/new"
        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <span className="material-icons-round text-base">add</span>
        Add playlist
      </Link>
    </div>
  );
}
