import { redirect } from "next/navigation";
import Link from "next/link";

import { hasValidSession } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = await hasValidSession();
  if (!signedIn) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between border-b border-gray-200 bg-surface-light px-6 py-4 dark:border-slate-700 dark:bg-surface-dark">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-icons-round text-primary">ondemand_video</span>
          <span className="font-bold text-gray-900 dark:text-slate-100">
            Salasel Admin
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
          >
            <span className="material-icons-round text-base">logout</span>
            Sign out
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
