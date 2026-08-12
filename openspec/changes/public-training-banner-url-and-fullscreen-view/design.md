## Context

`entrenamientos_publicos.banner_url` is `varchar(500)` (`supabase/migrations/20260723010000_entrenamientos_publicos.sql:27`). The value written to it is never user-typed text — it's the output of `storageService.uploadEntrenamientoPublicoBanner()` → `createSignedUrl(path, SIGNED_URL_TTL)` (`src/services/supabase/portal/storage.service.ts:155-174`), consumed by `usePublicarEntrenamiento.ts:150-164` and persisted via `entrenamientos-publicos.service.ts:174`. Supabase signed URLs embed a bearer token in the query string and commonly exceed 500 characters, so publish/update fails with `value too long for type character varying(500)` whenever that happens.

`entrenamientos_publicos_view` (`supabase/migrations/20260724010000_entrenamientos_publicos_public_view.sql`) selects `ep.banner_url` directly and is granted to `anon, authenticated` for the anonymous landing page. It is a plain `select` (not `select *`), owned-privileges view, intentionally scoped to public-safe columns only.

`PublicTrainingCard.tsx` renders the banner as a static `<img>` inside a fixed `h-64` container. It is the single shared presentational component consumed, unmodified, by three call sites:
1. `PublicTrainingsGrid.tsx` → `EntrenamientosPublicosPage.tsx` (authenticated marketplace, `/portal/entrenamientos-publicos`)
2. the same grid → `PublicEntrenamientosLandingPage.tsx` (anonymous landing, `/entrenamientos-publicos`, US-0091 — explicitly reuses the card "as-is, no auth coupling")
3. `PublicarEntrenamientoModal.tsx`'s live preview (admin publish/manage-publication flow)

No fullscreen-image-viewer component exists yet. The closest structural precedent is `FormularioPreviewModal.tsx`, which implements a fixed-overlay backdrop, fade-in via `requestAnimationFrame`, and an `Escape` keydown listener scoped to `open`.

## Goals / Non-Goals

**Goals:**
- Remove the practical length ceiling on `banner_url` so any signed URL Supabase produces can be persisted.
- Give visitors a way to see a training banner at full size from the marketplace grid, on both authenticated and anonymous surfaces, without any per-surface wiring.
- Keep the change additive and low-risk: no behavior change to publish/despublish, booking, or existing card content.

**Non-Goals:**
- Re-architecting how banners are uploaded or how signed URLs are generated/rotated.
- Building a general-purpose image gallery/lightbox (zoom, pan, swipe between images) — this is a single-image fullscreen view.
- Changing `entrenamientos_publicos_view`'s row-filtering (`activo = true and fecha_hora >= now()`) or its grants.

## Decisions

**1. `varchar(500)` → `text`, not a larger `varchar(N)`.**
Signed URLs have no fixed, guaranteed upper bound (they scale with the JWT payload, which Supabase controls, not this application). Picking a new arbitrary cap (e.g. `varchar(1500)`) just relocates the same failure mode further out. `text` has no practical storage or performance penalty over `varchar` in Postgres (both use the same on-disk `varlena` representation) and is the correct type for a system-generated value with no length invariant to enforce. Rejected alternative: keep `varchar` with a larger bound — deferred failure risk, no benefit.

**2. Drop-and-recreate `entrenamientos_publicos_view` rather than `create or replace view`.**
Postgres allows `create or replace view` only when the new query's output column list (names, order, types) is compatible in a narrow sense; widening a projected column's underlying type by altering the base table requires the view to not depend on the column at the time of the `alter column ... type` statement in the way this project's Postgres version is expected to enforce. The safe, unambiguous sequence — used because the view is a thin, fully-owned artifact with no dependents of its own — is: `drop view` → `alter column` → recreate the view with the exact original definition. The migration inlines the original `create view` statement verbatim (sourced from `20260724010000_entrenamientos_publicos_public_view.sql`) so the view's `select` (columns, joins, filters) is byte-identical apart from `banner_url`'s inherited type.

**2a. (Discovered during local verification) `revoke all` before `grant select` when recreating the view.**
Supabase's local setup applies `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon, authenticated, service_role` for new objects in `public`. Dropping and recreating the view re-triggers that default grant, so a bare `grant select ...` (the original 2026-07-24 migration's wording) leaves `anon`/`authenticated` also holding `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER` on the view — confirmed by inspecting `information_schema.role_table_grants` after the first migration attempt. This exact failure mode, and its fix, is already documented in `20260729000100_entrenamientos_publicos_restricciones_servicio.sql:106-114` for `entrenamientos_publicos_servicios_view`: `revoke all ... from anon, authenticated;` before `grant select ...`. The migration was updated to apply the same idiom, so the recreated view ends up with a **strictly tighter** effective grant (`SELECT` only) than the original view technically carried — a one-way improvement, not a behavior change any consumer depends on (the view was never actually updatable in practice: it joins multiple base tables and includes a `left join lateral` aggregate, so Postgres would reject DML against it regardless of grants).

**3. Modal state lives inside `PublicTrainingCard`, not lifted to the grid/page.**
`PublicTrainingCard` already receives all the data it needs (`bannerUrl`, `nombre`) as props and has no reason to expose "is the banner modal open" to its parents — no parent behavior depends on it (unlike `onReservar`, which triggers a cross-cutting booking flow owned by the page). Keeping `useState` local to the card means:
- Zero prop changes to `PublicTrainingsGrid.tsx`, `EntrenamientosPublicosPage.tsx`, `PublicEntrenamientosLandingPage.tsx`, or `PublicarEntrenamientoModal.tsx`.
- The anonymous landing page — which deliberately reuses this card with "no auth coupling" per US-0091 — gets the feature automatically, with no risk of accidentally introducing an auth-gated code path.
- Each card instance in a grid manages its own modal independently (opening one card's banner doesn't affect others), which is the correct semantics for a grid of cards.

Rejected alternative: a single grid-level modal with a `selectedItem` state lifted into `PublicTrainingsGrid`. Rejected because it would require prop changes across all three consumers for no behavioral benefit, and would couple the grid to viewer state it doesn't otherwise own.

**4. New `PublicTrainingBannerModal.tsx` component, styled after `FormularioPreviewModal.tsx`.**
Reusing the existing fixed-overlay + backdrop + fade-in + `Escape`-listener pattern keeps the interaction model consistent with the rest of the app and avoids introducing a new modal primitive or a dependency (e.g. a portal/lightbox library) for a single-image use case. The component is scoped to `components/portal/entrenamientos-publicos/` (same feature slice as `PublicTrainingCard`), per the project's feature-slice convention.

**5. No new service/hook/type layer.**
The methodology of page → component → hook → service → types applies when a feature needs data-fetching or business logic. This change needs neither: the banner URL is already available as a prop on `PublicTrainingCardData`, and "open/close a viewer for a value I already have" is pure UI state, not a use case requiring a hook. Introducing a hook here would be process for its own sake.

## Risks / Trade-offs

- **[Risk] `alter column ... type text` on a `varchar(500)` column could, in principle, trigger a table rewrite on some Postgres versions/casts.** → Mitigation: `varchar → text` is a well-known no-rewrite, catalog-only change in Postgres (the underlying storage representation is identical); this is a metadata update, not a data migration. Verified by running the migration locally against the project's Supabase instance before considering the change done (per the "never push to remote, only local" rule).
- **[Risk] Recreating the view with a hand-copied `create view` statement could silently drift from the original (typo, dropped column, changed filter) and break the anonymous landing page.** → Mitigation: the migration inlines the exact original SQL from `20260724010000_entrenamientos_publicos_public_view.sql` with only the implicit column type changing; manual diff against that file is part of the review/testing step, and the landing page's existing manual test (load `/entrenamientos-publicos` logged out) catches any regression.
- **[Risk] A broken/expired signed URL still renders as a broken image inside the new fullscreen modal (same as today's card thumbnail).** → Accepted, out of scope: this change doesn't alter signed-URL lifetime or add retry/fallback handling; behavior matches the existing thumbnail's broken-image handling.
- **[Trade-off] The "Ver" button also appears in the admin's `PublicarEntrenamientoModal` live preview**, which wasn't explicitly requested. → Accepted: it's a strict improvement (admins can already see the banner they just uploaded, this just lets them view it larger) and avoids adding a prop to suppress it, which would reintroduce the coupling Decision 3 avoids.

## Migration Plan

1. Add `supabase/migrations/{timestamp}_entrenamientos_publicos_banner_url_text.sql` (drop view → alter column → recreate view, as specified in the proposal's Impact section).
2. Apply the migration to the **local** Supabase instance only (`supabase db reset` / local migration apply — never pushed to the remote/hosted project as part of this change).
3. Manually verify: publish a training with a long-URL banner succeeds; `/entrenamientos-publicos` (anonymous) still loads and shows banners; existing published trainings' banners still render.
4. Ship the frontend changes (`PublicTrainingBannerModal.tsx`, `PublicTrainingCard.tsx` edit) in the same change — no sequencing dependency between the DB and UI halves; the "Ver" button works regardless of banner URL length, and the length fix has no UI-visible effect on its own.
5. Rollback, if ever needed: a follow-up migration reverting `banner_url` to `varchar(500)` would fail for any row written with a longer URL in the interim, so rollback in practice means fixing forward, not reverting the type.

## Open Questions

None — the User Story (US-0100) and existing codebase patterns (`FormularioPreviewModal.tsx`, the shared-card architecture) resolve every open point.
