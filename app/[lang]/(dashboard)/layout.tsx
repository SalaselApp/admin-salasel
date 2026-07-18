import { redirect } from "next/navigation";
import Link from "next/link";

import { hasValidSession } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";
import { getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeHref } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "../language-switcher";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocaleConfig(lang).code;

  const signedIn = await hasValidSession();
  if (!signedIn) {
    redirect(localeHref(locale, "/login"));
  }

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between border-b border-gray-200 bg-surface-light px-6 py-4 dark:border-slate-700 dark:bg-surface-dark">
        <Link href={localeHref(locale, "/")} className="flex items-center gap-2">
          <span className="material-icons-round text-primary">ondemand_video</span>
          <span className="font-bold text-gray-900 dark:text-slate-100">
            {dict.appTitle}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher
            currentLocale={locale}
            label={dict.languageSwitcherLabel}
          />
          <form action={logout}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1 text-sm text-gray-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
            >
              <span className="material-icons-round text-base">logout</span>
              {dict.signOut}
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
