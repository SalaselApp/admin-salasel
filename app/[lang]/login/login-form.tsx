"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/lib/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: LoginState = {};

export function LoginForm({
  dict,
  locale,
}: {
  dict: Dictionary["login"];
  locale: Locale;
}) {
  const [state, action, pending] = useActionState(login, initialState);

  const errorMessage =
    state?.errorCode === "locked"
      ? dict.tooManyAttempts
      : state?.errorCode === "incorrect"
        ? dict.incorrectPassword
        : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-gray-700 dark:text-slate-300"
        >
          {dict.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? dict.signingIn : dict.signIn}
      </button>
    </form>
  );
}
