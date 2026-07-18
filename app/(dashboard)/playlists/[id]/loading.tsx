export default function EditPlaylistLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 h-5 w-56 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: thumbnail */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border border-gray-200 bg-surface-light p-4 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
            <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
            <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-md bg-gray-200 dark:bg-slate-700"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: fields + videos */}
        <div className="flex-1 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-surface-light p-6 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                  <div className="h-10 w-full animate-pulse rounded-md bg-gray-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface-light shadow-sm dark:border-slate-700 dark:bg-surface-dark">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 sm:px-6">
                  <div className="h-24 w-28 shrink-0 animate-pulse rounded-md bg-gray-200 dark:bg-slate-700" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
