import { listPlaylists } from "@/lib/queries/playlists";
import { getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { PlaylistList } from "./playlist-list";

// The dashboard reflects live DB state; don't cache between requests.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocaleConfig(lang).code;
  const dict = await getDictionary(locale);
  const playlists = await listPlaylists();
  return <PlaylistList playlists={playlists} locale={locale} dict={dict} />;
}
