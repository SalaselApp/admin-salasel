import { redirect } from "next/navigation";

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
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
        <span className="font-semibold text-black dark:text-zinc-50">
          Salasel Admin
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
