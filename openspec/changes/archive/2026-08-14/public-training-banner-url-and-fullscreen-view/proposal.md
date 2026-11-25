## Why

Publishing a training to the Public Training Marketplace stores its banner as a Supabase Storage **signed URL** (a JWT-bearing query string), not a hand-typed link. Signed URLs routinely run 600–900+ characters, but `entrenamientos_publicos.banner_url` is capped at `varchar(500)`, so publishing or updating a publication with a banner fails with a Postgres "value too long" error. Separately, visitors browsing the marketplace (logged in or anonymous) have no way to inspect a banner beyond the small, fixed-height card thumbnail.

Source: `projectspec/userstory/us0100-public-training-banner-url-and-fullscreen-view.md` (US-0100).

## What Changes

- **BREAKING (schema)**: `entrenamientos_publicos.banner_url` changes from `varchar(500)` to `text` (unrestricted length). `entrenamientos_publicos_view` is dropped and recreated unchanged except for inheriting the new column type, since it directly projects `banner_url` and Postgres cannot widen a column type in place while a view depends on it.
- **New "Ver" button on public training cards.** `PublicTrainingCard.tsx` gains a "Ver" button overlaid on the banner, shown only when a banner exists. Clicking it opens a new fullscreen image modal (`PublicTrainingBannerModal.tsx`), closable via close button, backdrop click, or `Escape` — mirroring the existing overlay/backdrop/`Escape` pattern already used by `FormularioPreviewModal.tsx`.
- Because `PublicTrainingCard` is the single shared component already reused unmodified by the authenticated marketplace (`/portal/entrenamientos-publicos`), the anonymous landing page (`/entrenamientos-publicos`), and the admin's live preview inside `PublicarEntrenamientoModal.tsx`, the button reaches all three surfaces with no changes to `PublicTrainingsGrid.tsx`, `EntrenamientosPublicosPage.tsx`, `PublicEntrenamientosLandingPage.tsx`, or `PublicarEntrenamientoModal.tsx`.
- No new visual design is required for this component: the fullscreen viewer reuses the established backdrop/close/`Escape` interaction pattern already present in the codebase (`FormularioPreviewModal.tsx`), and the "Ver" button is a small icon-button overlay consistent with the existing badge treatment already on the banner (`featured`/discipline badges in `PublicTrainingCard.tsx`).

## Non-goals

- Changing how the banner is uploaded, validated, or how `uploadEntrenamientoPublicoBanner`/`createSignedUrl` work — the signed-URL generation path is unchanged; only the column that stores its result is widened.
- Adding pinch-zoom, pan, download, or multi-image/gallery support to the fullscreen viewer — it renders a single static image at full size.
- Any change to RLS policies, the `public_training_banner_read` storage policy, or storage bucket layout.
- Any change to the "Reservar" flow, occupancy display, or other existing `PublicTrainingCard` content.
- Backfilling or re-validating existing `entrenamientos_publicos` rows (their `banner_url` values are already under 500 characters, since they successfully wrote under the old constraint).

## Capabilities

### New Capabilities
*(none — this change modifies the existing public-training marketplace capability)*

### Modified Capabilities
- `public-training-marketplace`: `entrenamientos_publicos.banner_url` (and its projection through `entrenamientos_publicos_view`) is no longer length-capped, so signed-URL banners of any length can be published; every public training card (authenticated marketplace, anonymous landing page, and admin publish-preview) gains a "Ver" action that opens the banner fullscreen in a dismissible modal.

## Impact

**Database** — new migration `supabase/migrations/{timestamp}_entrenamientos_publicos_banner_url_text.sql`
- Drop and recreate `entrenamientos_publicos_view` (identical definition, `banner_url` now `text`).
- `alter table entrenamientos_publicos alter column banner_url type text` (metadata-only change, no table rewrite).
- No RLS, index, trigger, or storage policy changes — none reference `banner_url`'s type or length.

**Frontend**
- `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` — add "Ver" button (gated on `bannerUrl`), own local modal open/close state.
- `src/components/portal/entrenamientos-publicos/PublicTrainingBannerModal.tsx` — new component, fullscreen image viewer.
- `src/components/portal/entrenamientos-publicos/index.ts` — export the new modal if the barrel re-exports siblings.

No service, hook, or type signature changes: `banner_url`/`bannerUrl` is already typed as `string | null` in TypeScript, which already accommodates any length.
