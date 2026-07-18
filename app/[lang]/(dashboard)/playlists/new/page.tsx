import Link from "next/link";

import { getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeHref } from "@/lib/i18n/navigation";
import { DirectionalIcon } from "@/app/[lang]/directional-icon";
import { AddPlaylistForm } from "./add-playlist-form";

export default async function NewPlaylistPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocaleConfig(lang).code;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link
        href={localeHref(locale, "/")}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-slate-400"
      >
        <DirectionalIcon className="text-base">arrow_back</DirectionalIcon>
        {dict.playlist.backToPlaylists}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
        {dict.add.heading}
      </h1>
      <AddPlaylistForm locale={locale} dict={dict} />
    </div>
  );
}
