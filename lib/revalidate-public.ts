import "server-only";

/**
 * Notifies the public Salasel site to drop its cached content after an
 * admin write.
 *
 * WHY THIS EXISTS: the public site wraps its Supabase reads in
 * `unstable_cache` with tags (`playlists`, `videos`) and a 1-hour
 * revalidate window. This admin app writes to the same DB, but its
 * writes can't clear the public app's cache — cache tags are
 * per-application (separate processes, separate cache stores). So we
 * call a secret-guarded webhook the public app exposes
 * (`POST /api/revalidate`), which runs `revalidateTag` on its side.
 *
 * Best-effort: a failed revalidation must NOT fail the write that
 * already succeeded. The edit is saved either way; worst case the public
 * site just shows stale content until its TTL expires. We log and move
 * on rather than surfacing an error to the editor.
 *
 * Config (both optional — if unset, revalidation is skipped with a
 * warning, e.g. in local dev where the public site isn't running):
 *   PUBLIC_SITE_URL     e.g. https://salasel.app
 *   REVALIDATE_SECRET   shared secret, must match the public app's env
 */
export async function revalidatePublicContent(
  tag?: "playlists" | "videos",
): Promise<void> {
  const baseUrl = process.env.PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!baseUrl || !secret) {
    console.warn(
      "[revalidate] PUBLIC_SITE_URL / REVALIDATE_SECRET not set — skipping " +
        "public cache revalidation. The public site will refresh on its own " +
        "TTL instead.",
    );
    return;
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/revalidate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(tag ? { tag } : {}),
      // Don't let a slow/hung public site block the admin response.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(
        `[revalidate] Public site returned ${res.status} for tag "${tag ?? "all"}".`,
      );
    }
  } catch (err) {
    console.error(
      `[revalidate] Failed to reach the public site for tag "${tag ?? "all"}":`,
      err instanceof Error ? err.message : err,
    );
  }
}
