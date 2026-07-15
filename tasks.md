# Salasel Admin — Task Handoff

This file exists so a new AI session (or a human) can pick up exactly where
the previous session left off. Read `.kiro/steering/admin.md` first — it's
the authoritative spec for schema, security, and flows. This file is just
the running task list / status on top of that spec.

## Workflow reminders (apply to all tasks below)

- **Review-then-commit**: build a slice, verify (lint + typecheck + build,
  and a real dev-server/DB check when feasible), then wait for the user to
  review before committing. Don't batch multiple unrelated concerns into
  one commit — split by concern (e.g. dependency bump vs. feature code).
- Commit author is always `devAmjad4590 <developeramjad4590@gmail.com>`,
  never the assistant's own identity.
- Every server action that writes to Supabase must start with
  `await requireSession()` (see `lib/auth/session.ts`). This is the real
  auth boundary, not just the layout/proxy checks.
- Use the **context7** power to pull current docs before writing code
  against a library whose API you're not 100% sure of — this project
  already hit one real case where assumed API shape was wrong
  (`youtube-sr` was archived/broken; replaced with `youtubei.js`).
- This project runs Next.js 16 (Turbopack default, `proxy.ts` not
  `middleware.ts`, async-only request APIs, `revalidateTag` needs a
  profile arg). Check `node_modules/next/dist/docs/` for anything
  version-specific rather than assuming Next 14/15 behavior.
- Local Supabase runs via Docker (`docker ps` shows
  `supabase_db_admin-salasel` etc.). Migrations live in
  `supabase/migrations/`, copied from the public Salasel repo
  (`/home/amjad/repo/Salasel/supabase/migrations/`) — do not fork/edit
  them; any schema change needs a new migration applied to both repos.
  Apply new migrations locally with e.g.:
  `docker cp <file>.sql supabase_db_admin-salasel:/tmp/x.sql && docker exec supabase_db_admin-salasel psql -U postgres -d postgres -f /tmp/x.sql`

## Done so far

- Password-based auth (JWT session cookie via `jose`, rate-limited login,
  `proxy.ts` optimistic redirect, `requireSession()` real gate).
- Supabase admin client (`lib/supabase/admin.ts`), `PlaylistRow`/`VideoRow`
  models + mappers (`lib/models/`).
- YouTube fetch service (`lib/youtube/fetch.ts`, `parse.ts`) using
  `youtubei.js` (NOT `youtube-sr` — that package is archived/broken, see
  code comments in `fetch.ts` for the full story).
- Derived-field recompute (`lib/derived.ts`): `video_count`, `duration`,
  `start_date`, `end_date` on the playlist row, recomputed after any video
  set change.
- Playlist/video server actions (`lib/actions/playlists.ts`,
  `lib/actions/videos.ts`): create/update/delete playlist, add/update-title/
  remove video, re-sync from YouTube (never overwrites a manual title,
  only backfills zero/missing `duration`/`uploaded_at`).
- Add-playlist UI (`app/(dashboard)/playlists/new/`): paste URL/ID → fetch
  preview → thumbnail picker (choose from fetched videos, matches schema's
  `thumbnail_id` = a video ID, **not** an arbitrary uploaded image URL) →
  per-video include/exclude checkbox + inline title edit → save.
- Design system matches the public Salasel app: teal primary (`#0d9488`),
  dark slate surfaces, Material Icons Round. Reference files are in
  `/home/amjad/repo/Salasel/app/` (e.g. `globals.css`,
  `[lang]/(home)/components/PlaylistCard.tsx`,
  `[lang]/playlist/[id]/components/SelectedPlaylistCard.tsx`,
  `shared/components/SearchBar.tsx`). Some classes referenced there
  (`text-light`, `card-dark`, `muted-light`, etc.) are **not actually
  defined anywhere** in that repo (looks like leftover/broken from a past
  refactor) — don't copy those, use the working ones (`text-gray-900
  dark:text-slate-100`, `bg-surface-light dark:bg-surface-dark`, etc.)
- Local Supabase schema applied (migrations copied + run against the
  Docker Postgres instance) — `playlists`/`videos` tables exist, RLS
  policies already correctly restrict writes to `service_role` only.

## Next up (in the order the user wants them)

### 1. Drag-and-drop video reordering

The user wants to reorder video cards by dragging, on the manage-videos
screen (and/or the add-playlist review screen).

**Open question / likely blocker**: the current `videos` table has no
explicit ordering column (`id`, `playlist_id`, `title`, `duration`,
`uploaded_at` only — see `supabase/migrations/20260623000000_init_schema.sql`).
Today, ordering is implicit (insertion order / `uploaded_at`). To persist a
custom drag order you'll likely need:
- A new `position` (or `sort_order`) integer column on `videos`, added via
  a **new migration** (don't edit the existing one) — and this migration
  needs to be applied to the public Salasel repo too if the public site
  ever displays videos in playlist order (check whether it currently
  relies on `uploaded_at` ordering or insertion order before assuming this
  is purely additive).
- Confirm with the user whether the public site cares about this order at
  all, or if this is admin-only (e.g. just for readability while editing)
  before adding the column — flag it, don't silently assume.
- A drag-and-drop library: check via context7 (no existing drag-drop
  dependency in this repo yet). `@dnd-kit` is the modern, actively
  maintained standard for React — verify current API via context7 rather
  than assuming.
- A server action `reorderVideos(playlistId, orderedVideoIds: string[])`
  that writes the new `position` values, likely without needing a
  derived-field recompute (order doesn't affect `video_count`/`duration`/
  dates) — but confirm.

### 2. Playlist dashboard

Currently `app/(dashboard)/page.tsx` is just a placeholder with an
"Add playlist" button. Needs to become the real dashboard per the steering
doc: list all playlists (name, language, type, video_count, thumbnail),
case-insensitive search by name, links into edit/manage-videos screens.
Match the card style already established in the add-playlist screen /
the public app's `PlaylistCard.tsx` (thumbnail, title, description,
metadata row) — but this is an *admin* list view, not the public
consumption view, so it probably wants edit/delete affordances instead of
progress bars/bookmarks.

### 3. Remaining flows from the original plan

Per `.kiro/steering/admin.md`, still not built:
- **Edit playlist** screen — manual fields, `id` read-only, delete button
  with confirm.
- **Manage videos** screen — list videos (title, duration, upload date),
  edit title inline, remove (confirm), "Re-sync from YouTube" button
  (action already exists: `resyncPlaylistVideos` in
  `lib/actions/videos.ts` — just needs a UI). This is also where drag
  reorder (#1) would live.
- **Delete playlist** — confirm dialog, calls `deletePlaylist` (action
  already exists in `lib/actions/playlists.ts`).

### 4. i18n — Arabic default

Full i18n for the admin UI itself (not the content, which already has a
`language` field per playlist). User wants Arabic as the default locale.

Things to figure out before implementing, flag to user if unclear:
- Arabic is RTL — this needs `dir="rtl"` handling, and Tailwind's logical
  properties (`ps-`/`pe-`/`start-`/`end-` instead of `pl-`/`pr-`/
  `left-`/`right-`) or a lot of the existing layout (e.g. the sidebar/
  header, thumbnail picker grid, video row layout) may visually break in
  RTL. The public Salasel app already solved this — check
  `/home/amjad/repo/Salasel/app/[lang]/` and `I18N.md` in that repo for
  the established pattern (it uses `[lang]` route segments +
  `getTranslations`/`Translations` type) before inventing a new approach.
- Decide: does the admin need per-user language switching (like the
  public site's `LanguageSwitcher`), or is "Arabic by default, no
  switcher" sufficient since it's a small trusted-editor tool? Ask the
  user — don't assume.
- This will touch almost every existing component (all current UI is
  hardcoded English) — expect this to be the largest of the four tasks.
  Do it last, as the user requested, so it doesn't block the
  functionality-only work above.

## Notes / gotchas discovered this session

- `youtube-sr` (the package originally specified in the steering doc) is
  **permanently archived** upstream (Dec 2025) and its `getPlaylist()`
  reliably returns `null` against current YouTube page structure — verified
  against the exact same package copy vendored in the public Salasel repo,
  so this is a real upstream break, not a bug in this repo. Replaced with
  `youtubei.js` (Innertube API client, actively maintained). If the public
  repo's CLI still depends on `youtube-sr`, it's likely also broken there
  and nobody's noticed — worth mentioning to the user at some point, out of
  scope for this repo to fix.
- `.env` needs `ADMIN_PASSWORD`, `SESSION_SECRET`, `COOKIE_NAME`,
  `SESSION_DURATION`, `MAX_ATTEMPTS`, `LOCKOUT_MS` in addition to the
  Supabase vars — see `.env.example` for the full list with placeholders.
- Supabase's `.returns<T>()` is deprecated in current `postgrest-js`; use
  `.overrideTypes<T, { merge: false }>()` instead (already fixed in
  `lib/derived.ts` and `lib/actions/videos.ts` — keep this pattern for any
  new typed queries).
