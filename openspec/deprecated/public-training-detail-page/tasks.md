## 1. Setup

- [x] 1.1 Create a new branch `feat/public-training-detail-page` from the current base branch — created as `feat/public-training-detail-page-v2`, since a branch named `feat/public-training-detail-page` already exists (holding a prior implementation of this US, left untouched)
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260828120000_entrenamientos_publicos_detalle_fields.sql` adding `cronograma jsonb not null default '[]'::jsonb`, `incluye jsonb not null default '[]'::jsonb`, `descripcion_larga text`, `pagina_evento_url text` to `entrenamientos_publicos`
- [x] 2.2 In the same migration, drop the `entrenamientos_publicos_precio_ck` constraint and convert `precio` from `numeric(10,2)` to `jsonb` via `alter column ... type jsonb using (...)`, wrapping existing non-null values into `[{ nombre: 'Precio general', descripcion: null, precio: <value> }]` and nulls into `[]`; set the new default (`'[]'::jsonb`) and `not null`
- [x] 2.3 Add `entrenamientos_publicos_precio_array_ck`, `entrenamientos_publicos_cronograma_array_ck`, `entrenamientos_publicos_incluye_array_ck` CHECK constraints (`jsonb_typeof(...) = 'array'`)
- [x] 2.4 Drop and recreate `entrenamientos_publicos_view` carrying forward every existing column, plus the four new columns and a `left join public.usuarios` for `entrenador_nombre`. **Caught a real defect while verifying against the live schema**: the view definition in `20260812190000` (which this migration was based on) predates `omitir_confirmacion_plan` being added to the table by `20260813180000`, so the first draft of this migration would have silently dropped that column from the view — breaking the detail page's authenticated booking path, which reads `omitirConfirmacionPlan` from this view to pass to `PublicTrainingReservaModal`. Added `ep.omitir_confirmacion_plan` with an explanatory comment.
- [x] 2.5 Re-apply `revoke all on entrenamientos_publicos_view from anon, authenticated` + `grant select ... to anon, authenticated` after recreating the view — verified live: `anon` and `authenticated` each hold `SELECT` only
- [x] 2.6 Apply the migration to the **local** Supabase instance only (never push to the remote/hosted project as part of this change) and verify it applies cleanly. **Note**: version `20260828120000` was already recorded in `supabase_migrations.schema_migrations` and already applied to the local DB by a prior session, so re-running it would be a no-op. Verified equivalence instead: live columns/types/defaults, the three array CHECK constraints, and the view's 27-column list all match this migration file exactly, and the `create view` statement was executed inside a `begin … rollback` transaction to prove it is valid SQL and reproduces the identical column list.
- [x] 2.7 Manually verify a pre-existing row with a plain numeric `precio` migrates into a one-item `"Precio general"` array, and a null `precio` migrates into `[]` — live data shows a migrated legacy row as `[{"nombre": "Precio general", "precio": 125000.00, "descripcion": null}]`; the `using` expression was additionally exercised over `125000.00` / `null` / `0.00` inputs, confirming non-null (including zero) wraps into a one-item array and null becomes `[]`

## 3. Types

- [x] 3.1 Add `CronogramaItem { hora: string; descripcion: string }`, `IncluyeItem { titulo: string; descripcion: string }`, `PrecioItem { nombre: string; precio: number; descripcion: string | null }` to `src/types/portal/entrenamientos-publicos.types.ts`
- [x] 3.2 Change `EntrenamientoPublico.precio` and `PublicTrainingListItem.precio` from a scalar to `PrecioItem[]`; add `cronograma`, `incluye`, `descripcion_larga`/`descripcionLarga`, `pagina_evento_url`/`paginaEventoUrl`, `entrenadorNombre` fields to both types as applicable
- [x] 3.3 Update `PublicarEntrenamientoInput`/`EntrenamientoPublicoFormValues` to carry `cronograma: CronogramaItem[]`, `incluye: IncluyeItem[]`, `precio: PrecioItem[]`, `descripcionLarga: string`, `paginaEventoUrl: string`. **Deliberate deviation**: `EntrenamientoPublicoFormValues.precio` is `PrecioFormRow[]` (amount as a raw `string`), not `PrecioItem[]`. Holding the amount as a number in form state makes an emptied input coerce through `Number('') === 0` and silently publish the option as free; keeping it a string lets the blank be rejected as invalid. `PublicarEntrenamientoInput.precio` stays `PrecioItem[]` — the hook converts on submit.
- [x] 3.4 Add `entrenamientoId?: string` to `PublicTrainingCardData`

## 4. Service Layer

- [x] 4.1 Extend `listPublicTrainings()` (`src/services/supabase/portal/entrenamientos-publicos.service.ts`) to select `cronograma, incluye, descripcion_larga, pagina_evento_url` and an `entrenador:usuarios(nombre, apellido)` embed, mapping to the new `PublicTrainingListItem` fields; update the `precio` mapping to pass through the parsed jsonb array. Verified the `entrenamientos_publicos_entrenador_id_fkey → usuarios(id)` FK exists, which is what lets PostgREST resolve the embed. Added a `toEntrenadorNombre()` helper mirroring the view's `nullif(trim(concat(...)), '')` so both surfaces derive the same display name.
- [x] 4.2 Extend `listPublicTrainingsForLanding()` similarly, reading the extra columns (including `entrenador_nombre`) off `entrenamientos_publicos_view`. Refactored the view select list, row type, and row→`PublicTrainingListItem` mapper into a shared `VIEW_SELECT_COLUMNS` / `PublicTrainingViewRow` / `mapViewRow()` so this and `getPublicTrainingDetail` cannot drift apart. **Behavior change**: `omitirConfirmacionPlan` is now read from the view instead of being hardcoded `false` — the detail page books directly and passes it to the booking modal, so a hardcoded value would be silently wrong there. Nothing on the landing grid reads the field, so that surface is unaffected.
- [x] 4.3 Add `getPublicTrainingDetail(entrenamientoId: string): Promise<PublicTrainingListItem | null>` selecting the same column list as `listPublicTrainingsForLanding()` from `entrenamientos_publicos_view`, filtered `.eq('entrenamiento_id', entrenamientoId).maybeSingle()`
- [x] 4.4 Extend `publicarEntrenamiento()`'s write payload to persist `cronograma`, `incluye`, `precio` (array), `descripcion_larga`, `pagina_evento_url`

## 5. Hooks

- [x] 5.1 Add `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts` — input `entrenamientoId`, calls `getPublicTrainingDetail` on mount/id change, exposes `{ item, loading, error, refetch }`. "Not found" (`item === null`, `error === null`) and "fetch failed" (`error` set) are kept as distinct outcomes so a transient outage never renders as a deleted training.
- [x] 5.2 Extend `usePublicarEntrenamiento.ts` form state/validation/submit for `cronograma`/`incluye`/`precio[]`/`descripcionLarga`/`paginaEventoUrl`: validate each `precio` row's amount (number ≥ 0) with a per-row inline error (not the whole array); validate `paginaEventoUrl` as a well-formed URL when non-empty, valid when empty. Added generic `addRow`/`removeRow`/`updateRow` mutators over the three lists, a `precioErrors` map keyed by row index (re-keyed on removal so errors stay aligned with the shifted rows), and `paginaEventoUrlError`. URL validation requires an `http:`/`https:` protocol, so a bare `"foo"` is rejected.

## 6. Components — Publish-Time Authoring

- [x] 6.1 In `PublicarEntrenamientoModal.tsx`, replace the single "Precio (COP)" number input with a repeatable list editor (add/remove row): nombre + precio (COP) + descripción; zero rows means "Gratis"
- [x] 6.2 Add a repeatable "Cronograma" list editor (add/remove row): hora + descripción, in display order (array order is the order, no separate `orden` field)
- [x] 6.3 Add a repeatable "Incluye" list editor (add/remove row): título + descripción
- [x] 6.4 Add a "Descripción larga (Markdown)" textarea for `descripcion_larga`, with helper text noting Markdown is supported
- [x] 6.5 Add a "Página del evento (URL)" text input for `pagina_evento_url`, validated as a well-formed URL when non-empty (same pattern as `formulario_externo`)
- [x] 6.6 Update the modal's live `PublicTrainingCard` preview (`previewData`) to pass the new array-shaped fields, omitting `entrenamientoId` (no live detail URL exists pre-publish). Only rows with a valid amount feed the preview, so a half-typed row can't flicker the card to "Gratis" or a wrong "Desde …". Threaded the new row mutators/errors through the sole call site, `EntrenamientosPage.tsx`.

## 7. Components — Detail Page

- [x] 7.1 Add `react-markdown` dependency to `package.json` (^10.1.0)
- [x] 7.2 Build `PublicTrainingDetalleHero.tsx` (`components/landing/entrenamientos-publicos/detalle/`): full-width `bannerUrl` image with `PublicTrainingCard`-style empty-banner fallback; discipline tag + "ENTRENAMIENTO PÚBLICO" tag + `nombre` title + `descripcion` subtitle + meta row (date, time, `escenarioNombre`/`puntoEncuentro`, `reservasActivas`/`cupoMaximo`)
- [x] 7.3 Build `PublicTrainingDetalleDescripcion.tsx`: "Descripción" heading + `descripcion_larga` rendered via `react-markdown`; component renders nothing when `descripcion_larga` is null/empty
- [x] 7.4 Build `PublicTrainingDetalleIncluye.tsx`: "¿Qué incluye este entrenamiento?" heading + checklist from `incluye`; renders nothing when the array is empty
- [x] 7.5 Build `PublicTrainingDetalleCronograma.tsx`: "¿Cómo será la sesión?" heading + "Xh Ymin en total" badge (computed from `duracion_minutos`) + vertical timeline from `cronograma`, in array order; renders nothing when the array is empty
- [x] 7.6 Build `PublicTrainingDetalleUbicacion.tsx`: location card from `escenarioNombre`/`escenarioUbicacion`/`puntoEncuentro`; static map-style placeholder (no illustration); "Ver en Google Maps" link built from `escenarioNombre` + `escenarioUbicacion` as a search query; no amenity tags row
- [x] 7.7 Build `PublicTrainingDetalleReserva.tsx`: info rows for cupos disponibles, duración, entrenador (shown only when `entrenadorNombre` is present); primary "Reservar mi cupo" CTA; secondary "Ver detalles oficiales" CTA (`target="_blank"`, `rel="noopener noreferrer"`, with "Serás redirigido al sitio oficial del evento" note) shown only when `pagina_evento_url` is set; no "Nivel recomendado" row
- [x] 7.8 Build `PublicTrainingDetallePrecios.tsx`: "Precios y opciones" heading + responsive grid of price cards from `precio`, all styled identically (no featured/"MÁS POPULAR" badge); renders nothing when the array is empty
- [x] 7.9 Build the breadcrumb row ("Inicio › Entrenamientos › {nombre}") and closing CTA banner (second "Reservar mi cupo" button wired to the same reserve handler) as part of `PublicTrainingDetallePage.tsx`, reusing the existing landing `Header` and footer content (check for an existing shared footer component before building a new one)
- [x] 7.10 Build `PublicTrainingDetallePage.tsx`: fetches via `usePublicTrainingDetalle`, reads the `from` search param (breadcrumb "Entrenamientos" crumb + "Volver" both target it, falling back to `/entrenamientos-publicos` when absent — never `router.back()`/`document.referrer`), renders the inline "not found" state (invalid id / not `activo` / past `fecha_hora`) and the inline error+"Reintentar" state (fetch failure), assembles every section above in `obHO3` order, and wires the reserve CTA(s) to the auth-branching logic in section 8
- [x] 7.11 Verify each section against design node `obHO3` in `projectspec/designs/pencil/grit-arena-v2.pen` as you build it (structure, spacing, typography, colors) — not only at the end

## 8. Reservation Entry Point

- [x] 8.1 In `PublicTrainingDetallePage.tsx`, call `useAuth()` and branch on "Reservar mi cupo" clicks: anonymous (`!initializing && !user`) opens the existing `RegistrateParaReservarModal` unmodified with a `PublicTrainingListItem`-shaped target (`entrenamientoId`, `tenantId`, `disciplinaId`, `nombre`); authenticated (`user` present) opens the existing `PublicTrainingReservaModal` unmodified with `tenantId`, `entrenamientoId`, `disciplinaId`, `trainingNombre`, `tenantNombre`, `omitirConfirmacionPlan`
- [x] 8.2 Disable the CTA with a loading state while `initializing` is true

## 9. Card Entry Point + Route Wiring

- [x] 9.1 In `PublicTrainingCard.tsx`, render a "Ver detalles" button/link next to "Reservar" when `entrenamientoId` is present, pointing to `/entrenamientos-publicos/{entrenamientoId}?from={encodeURIComponent(currentPathname)}` using `usePathname()`; update `formatPrecio()` for the `PrecioItem[]` shape (`Gratis` / single value / "Desde $min COP")
- [x] 9.2 Pass `entrenamientoId` in `PublicTrainingsGrid.tsx`'s `toCardData()`
- [x] 9.3 Implement `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` rendering `PublicTrainingDetallePage` with static metadata
- [x] 9.4 Confirm `middleware.ts`'s `protectedPaths` (`["/dashboard", "/portal"]`) still excludes the new route — no change expected, but verify

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` entries for every new/modified file in this change (new `detalle/` components, new hook, updated service/type/component descriptions)

## 11. Verification & Handoff

All browser testing below ran headless Chromium against the local dev server + local Supabase, driving the real UI. Two trainings were seeded as complementary fixtures: a "rich" one (2 prices, 3 cronograma rows, 2 incluye rows, `pagina_evento_url`, an entrenador, and a Markdown `descripcion_larga` carrying `<script>`/`<img onerror>` payloads) and a "minimal" one (legacy migrated single price, everything else empty/null).

- [x] 11.1 Manual test: anonymous booking journey — verified the detail page's "Reservar mi cupo" opens the existing "Regístrate para reservar" modal for an anonymous visitor. **Partially verified**: the post-auth continuation (signup/login → guided modal → completed reservation) was NOT driven end to end; that leg is the unmodified US-0103 `guidedBooking.ts` journey this change reuses without touching.
- [x] 11.2 Manual test: authenticated booking journey — logged in through the real login form as a seeded test user; the CTA opened `PublicTrainingReservaModal` (NOT the anonymous modal), which ran the existing pipeline and surfaced the real "Completa tus datos" profile-requirements step (US-0095/0096) for the new user. **Partially verified**: a reservation was not carried to completion, since that requires satisfying the profile/plan prerequisites; what is proven is that the new page hands off correctly into the existing, unmodified booking flow.
- [x] 11.3 Manual test: verified "Ver detalles" on BOTH grids — public landing (`from=%2Fentrenamientos-publicos`) and authenticated portal marketplace (`from=%2Fportal%2Fentrenamientos-publicos`) — and that clicking through yields a breadcrumb/"Volver" pointing back at the originating grid. Direct visit with no `from` falls back to `/entrenamientos-publicos`; an off-site `from=https://evil.com` is rejected and also falls back.
- [x] 11.4 Manual test: the migrated legacy row renders "Precio general"; the minimal training hides the cronograma, incluye and descripción sections entirely; the not-found state ("Entrenamiento no disponible" + link back) renders for an unknown id and is distinct from the retryable fetch-error state.
- [x] 11.5 Manual test: Markdown renders formatted (h2, `<strong>`, 2 `<li>`), while the `<script>` and `<img onerror>` payloads render as literal text — asserted `window.__xss_fired === false`, zero live `<script>` nodes, zero `img[onerror]` nodes, and no dialogs fired.
- [x] 11.6 Manual test: "Ver detalles oficiales" present with `target="_blank"` + `rel="noopener noreferrer"` and the redirect note when `pagina_evento_url` is set, and fully absent (CTA and note) when unset; no "MÁS POPULAR" badge anywhere, and exactly one identically-styled card per price option.
- [x] 11.7 `npx tsc --noEmit` passes with 0 errors repo-wide; `eslint` on all 10 new/modified files reports 0 problems. No test suite exists in this repo (no `test` script, no `*.test.*`/`*.spec.*` files), so there was nothing to run. Full build deliberately not run.
- [ ] 11.8 Draft a commit message and pull request description summarizing the change for the user (commits are only made when the user explicitly asks)

**Also verified (beyond the original checklist):** the publish modal round-trip (AC8) — as a tenant admin, all five new editors render, previously-saved `precio`/`cronograma`/`incluye`/`pagina_evento_url`/`descripcion_larga` values hydrate back into the form on reopen, a malformed URL is rejected inline, and a newly-added price row persisted to the database (confirmed by direct query).

**Three real defects were found and fixed during verification**, each of which would have shipped broken:
1. The migration's recreated view omitted `omitir_confirmacion_plan` (see task 2.4).
2. `listPublicTrainings`' `entrenador:usuarios(...)` embed was ambiguous — `entrenamientos_publicos` has two FKs into `usuarios` — so PostgREST rejected the query and the **entire authenticated marketplace listing failed to load**. Fixed by naming the FK constraint explicitly.
3. The hero meta row and reserve card labelled `reservasActivas / cupoMaximo` as "cupos disponibles", so a training with 0 reservations out of 30 read as "0 / 30 cupos disponibles" (zero available) when all 30 were free. Both now show remaining capacity.
