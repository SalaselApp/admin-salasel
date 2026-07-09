import { redirect } from "next/navigation";

import { hasValidSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const alreadySignedIn = await hasValidSession();
  if (alreadySignedIn) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
          Salasel Admin
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
