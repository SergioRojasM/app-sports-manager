## Context

Public trainings are only browsable as cards inside two grids that reuse the same `PublicTrainingCard` component: `/entrenamientos-publicos` (anonymous landing, reads the anon-safe `entrenamientos_publicos_view`) and `/portal/entrenamientos-publicos` (authenticated marketplace, reads `entrenamientos_publicos` directly plus authenticated-only joins). There is no per-training URL. A placeholder route already exists at `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` but is empty. `entrenamientos_publicos.precio` is a single nullable `numeric(10,2)`; there is no schedule, no "what's included" list, and no long-form description.

The booking flow for both anonymous and authenticated visitors already exists end-to-end (`RegistrateParaReservarModal` → guided signup/login → `PublicTrainingReservaModal`, driven by `guidedBooking.ts` and `useAuth()`). This change reuses both flows as-is.

The visual target is node `obHO3` ("Content", inside the `OyIqr` "Public Training Detail" frame) in `projectspec/designs/pencil/grit-arena-v2.pen`. Full structural and field-level detail is captured in `projectspec/userstory/us0109-public-training-detail-page.md`.

This is a cross-cutting change: one migration (including a breaking column-type change on `precio`), a new client-side data hook, nine new detail-page components, and edits to the existing card/grid/publish-modal components.

## Goals / Non-Goals

**Goals:**
- Ship a shareable, unauthenticated-friendly detail page at `/entrenamientos-publicos/{entrenamiento_id}` that is as visually faithful as possible to the `obHO3` design node.
- Extend the data model additively where possible (`cronograma`, `incluye`, `descripcion_larga`, `pagina_evento_url` as new columns) and migrate `precio` from a scalar to a `jsonb` array without losing existing pricing data.
- Give the training card a stable "Ver detalles" entry point that correctly returns the visitor to whichever grid they came from, including after a hard reload or a cold external visit.
- Reuse the existing anonymous/authenticated booking entry points unmodified.
- Render admin-authored Markdown (`descripcion_larga`) safely, with no path to script execution.

**Non-Goals:**
- No changes to how booking, plan purchase, or formulario submission work.
- No "Nivel recomendado" row, no amenity tags, no "MÁS POPULAR" featured pricing badge — see proposal Non-Goals.
- No RLS policy changes.
- No new API routes or server actions.
- No change to `middleware.ts`'s `protectedPaths`.
- No server-side rendering / `notFound()` — data fetching stays client-side, consistent with every other page in this feature slice.

## Decisions

### 1. `precio` becomes a `jsonb` array via an in-place `alter column ... type jsonb using (...)`, not a new column + backfill + drop
**Decision**: Migrate `entrenamientos_publicos.precio` from `numeric(10,2)` to `jsonb` in place, wrapping any existing non-null value into a one-item `[{ nombre: 'Precio general', descripcion: null, precio: <value> }]` array, and null into `[]`.

**Why over the alternative** (add `precio_v2 jsonb`, backfill, drop `precio`, rename): the table has no other consumers reading `precio` mid-migration (this is a single additive-transactional migration file, applied before any deploy touches the new column), so there is no window where both shapes need to coexist. An in-place `alter ... using` is one statement, keeps the column name stable (no rename step to coordinate across `service.ts`/types), and Postgres executes the `using` expression per-row in the same transaction as the type change — safe for this table's expected row count (admin-authored public training publications, not a high-volume table).

**Trade-off accepted**: this is a **breaking** change for every call site that currently treats `precio` as a number (`formatPrecio()` in `PublicTrainingCard`, the publish form's single price input, any TypeScript consumer of `EntrenamientoPublico.precio`/`PublicTrainingListItem.precio`). All such sites must be updated in the same change (tracked in Acceptance Criterion 16 / `npm run build` passing with no new type errors).

### 2. `entrenamientos_publicos_view` is dropped and recreated, not `create or replace view`
**Decision**: The migration does `drop view public.entrenamientos_publicos_view;` followed by a full `create view ... as select ...` with every existing column plus the new ones and the `entrenador_nombre` join.

**Why**: Postgres does not allow `create or replace view` to change a projected column's type (here, `precio` changes from `numeric` to `jsonb`), or reorder/drop columns — only appending new trailing columns is allowed under `replace`. Since `precio`'s type is changing, a full drop+recreate is required. The migration immediately re-applies `revoke all` + `grant select` to `anon, authenticated` after recreating the view, matching the fix already applied by every prior migration that touches this view (Supabase's default privileges re-grant `ALL` on every view recreate).

### 3. `getPublicTrainingDetail` reuses `PublicTrainingListItem` as its return type, no separate `PublicTrainingDetail` type
**Decision**: `getPublicTrainingDetail(entrenamientoId)` returns `Promise<PublicTrainingListItem | null>`, the same shape already used by `listPublicTrainingsForLanding()`.

**Why over a dedicated detail type**: the new fields (`cronograma`, `incluye`, `descripcionLarga`, `paginaEventoUrl`, `entrenadorNombre`) now live on `PublicTrainingListItem` unconditionally (every list/detail read goes through the same `entrenamientos_publicos_view`), so a single row is structurally identical to a list item — a separate type would duplicate every field for no behavioral difference and force two mapping functions to stay in sync.

### 4. `from` search param is the single source of truth for back-navigation, not `router.back()`/`document.referrer`
**Decision**: `PublicTrainingCard` builds its "Ver detalles" link as `/entrenamientos-publicos/{entrenamientoId}?from={encodeURIComponent(currentPathname)}` using `usePathname()`; the detail page reads `from` and falls back to `/entrenamientos-publicos` when it is absent.

**Why**: `router.back()` fails for a visitor who arrived via a cold external link (no in-app history) and `document.referrer` is unreliable after a hard reload (browser history is lost, and referrer can be empty/stripped by the browser or an intermediate redirect). A URL param survives reloads and works identically for a first-ever visit, satisfying Acceptance Criterion 5's requirement that the affordance work "after a hard page reload" and "for a visitor who never had any prior in-app history at all."

### 5. Detail page components live under `components/landing/entrenamientos-publicos/detalle/`, not under `components/portal/`
**Decision**: The new page shell and every section component are placed in a new `detalle/` subfolder alongside the existing anonymous `landing/entrenamientos-publicos/` components (e.g. `RegistrateParaReservarModal.tsx`), not under `components/portal/entrenamientos-publicos/`.

**Why**: The detail route is outside `/portal` and must work for anonymous visitors, matching the existing bounded-context split already used by `PublicEntrenamientosLandingPage` (landing) vs. `EntrenamientosPublicosPage` (portal marketplace). Reusing the `landing/` context keeps this route's components colocated with the other anonymous-facing surface it shares a booking flow with.

### 6. `descripcion_larga` renders through `react-markdown`, not a hand-rolled parser or `dangerouslySetInnerHTML`
**Decision**: Add `react-markdown` as a new dependency and render `descripcion_larga` through it directly (React-element output).

**Why over alternatives** (a minimal hand-rolled Markdown-to-HTML converter, or a heavier pipeline like `remark`+`rehype-sanitize`): `react-markdown` never touches `dangerouslySetInnerHTML` — it parses Markdown into a React element tree directly, so raw HTML/script embedded in an admin-authored description (e.g. a `<script>` tag or an `<img onerror>` payload) is rendered as literal text by default, with no sanitization step to configure or get wrong. This satisfies Acceptance Criterion 12 with the smallest new dependency footprint.

## Risks / Trade-offs

- **[Risk] The `precio` type migration is breaking for every existing TypeScript consumer** — any file still treating `precio` as a number will fail to compile or, worse, silently misbehave at runtime (e.g. rendering `[object Object]`). → **Mitigation**: Acceptance Criterion 16 requires `npm run build` to pass with no new type errors across every file touching `EntrenamientoPublico.precio`/`PublicTrainingListItem.precio`; `tasks.md` enumerates each call site (`formatPrecio()`, the publish form, both list mappers) to update in the same change.
- **[Risk] `drop view` + `create view` is not zero-downtime** — between the `drop` and `create` statements inside the same transaction, any concurrent read against the view would fail. → **Mitigation**: both statements run inside the migration's single `begin`/`commit` transaction, so Postgres holds the necessary lock for the transaction's duration; this is the same pattern already used by prior migrations touching this view, applied locally only (never pushed directly to the remote/hosted project — per project convention, migrations are applied via the normal Supabase migration/deploy pipeline).
- **[Risk] A pre-existing public training with a plain numeric `precio` could be mis-migrated if the `using` expression is wrong** → **Mitigation**: Acceptance Criterion 13 explicitly requires verifying a pre-existing row's price still displays correctly, labeled "Precio general", after migration — tested manually as part of the implementation checklist.
- **[Trade-off] Positional array order is the only ordering mechanism for `cronograma`** — no separate `orden` column. → **Mitigation**: this matches the explicit instruction in the source User Story ("no separate `orden` field — array order is the order") and is consistent with how `precio`/`incluye` are already ordered; reordering is an admin-authoring concern handled entirely client-side in the repeatable list editor.
- **[Risk] `from` param can be tampered with (open redirect-style concern)** — a visitor could craft a `from` value pointing off-site. → **Mitigation**: `from` is only ever used as an internal Next.js route target (rendered as an `<a>`/`Link` href within the app), never passed to a server-side redirect, so at worst a malformed value produces a broken in-app link, not an off-site redirect; no server-side validation is required beyond what already exists for internal navigation.

## Migration Plan

1. Apply the new migration **locally only** (local Supabase, per project convention — never push directly to the remote/hosted project from this change).
2. Verify `entrenamientos_publicos_view`'s grants resolve to `select`-only for `anon`/`authenticated` after the drop/recreate (the migration's own `revoke all` + `grant select` step).
3. Ship types/service/hook/component changes together in one PR — the `precio` type change is breaking, so there is no safe way to do a dual-path/rollout split between the data-model change and the UI/type updates that depend on it.
4. Manually verify the full acceptance-criteria checklist (anonymous + authenticated booking journeys end-to-end, migrated legacy pricing data, empty cronograma/incluye/precio states, not-found state, Markdown XSS payload rendering as literal text, "Ver detalles oficiales" CTA present/absent, no featured badge) before merge, per the User Story's Implementation Steps.
5. Rollback: reverting the migration (dropping the new columns, reverting `precio`'s type, restoring the prior view definition) is safe as long as no production row has used the new array-shaped fields yet; a standard revert PR covers the application-code side.

## Open Questions

- None outstanding — the source User Story (`us0109-public-training-detail-page.md`) already resolves every ambiguity called out during its own review (design-fidelity expectations, out-of-scope elements, back-navigation source of truth, Markdown rendering approach).
