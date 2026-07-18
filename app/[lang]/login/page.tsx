import { redirect } from "next/navigation";

import { hasValidSession } from "@/lib/auth/session";
import { getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeHref } from "@/lib/i18n/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocaleConfig(lang).code;

  const alreadySignedIn = await hasValidSession();
  if (alreadySignedIn) {
    redirect(localeHref(locale, "/"));
  }

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-surface-light p-8 shadow-lg dark:border-slate-700 dark:bg-surface-dark">
        <div className="mb-6 flex items-center gap-2">
          <span className="material-icons-round text-primary">ondemand_video</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {dict.appTitle}
          </h1>
        </div>
        <LoginForm dict={dict.login} locale={locale} />
      </div>
    </div>
  );
}
