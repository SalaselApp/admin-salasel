export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-slate-700" />
        <div className="h-10 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-slate-700" />
      </div>
      <div className="mb-6 h-11 w-full animate-pulse rounded-full bg-gray-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-surface-light shadow-sm dark:border-slate-700 dark:bg-surface-dark"
          >
            <div className="aspect-video w-full animate-pulse bg-gray-200 dark:bg-slate-700" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
