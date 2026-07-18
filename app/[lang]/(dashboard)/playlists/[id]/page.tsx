import { notFound } from "next/navigation";
import Link from "next/link";

import { getPlaylistWithVideos } from "@/lib/queries/playlists";
import { getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeHref } from "@/lib/i18n/navigation";
import { DirectionalIcon } from "@/app/[lang]/directional-icon";
import { EditPlaylistForm } from "./edit-playlist-form";

export const dynamic = "force-dynamic";

export default async function EditPlaylistPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = getLocaleConfig(lang).code;
  const dict = await getDictionary(locale);
  const result = await getPlaylistWithVideos(id);

  if (!result) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link
        href={localeHref(locale, "/")}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-slate-400"
      >
        <DirectionalIcon className="text-base">arrow_back</DirectionalIcon>
        {dict.playlist.backToPlaylists}
      </Link>

      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <Link href={localeHref(locale, "/")} className="hover:text-primary">
          {dict.playlist.breadcrumbPlaylists}
        </Link>
        <DirectionalIcon className="text-base">chevron_right</DirectionalIcon>
        <span className="text-gray-900 dark:text-slate-100">
          {result.playlist.name}
        </span>
      </div>

      <EditPlaylistForm
        playlist={result.playlist}
        videos={result.videos}
        locale={locale}
        dict={dict}
      />
    </div>
  );
}
