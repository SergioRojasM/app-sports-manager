## 1. Branch Setup

- [x] 1.1 Create branch `feat/us0089-public-training-marketplace` from `develop`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Types

- [x] 2.1 Create `src/types/portal/entrenamientos-publicos.types.ts` with:
  - `EntrenamientoPublico` (all DB columns: `id`, `tenant_id`, `entrenamiento_id`, `nombre`, `descripcion`, `disciplina_id`, `escenario_id`, `entrenador_id`, `fecha_hora`, `duracion_minutos`, `cupo_maximo`, `punto_encuentro`, `estado`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas`, `precio`, `banner_url`, `activo`, `publicado_por`, `created_at`, `updated_at`)
  - `PublicarEntrenamientoInput` (tenantId, entrenamientoId, nombre, descripcion, precio, banner_url — the editable subset)
  - `EntrenamientoPublicoFormValues` (controlled form state for `PublicarEntrenamientoModal.tsx`)
  - `PublicTrainingListItem` (marketplace view model: publication fields + joined `disciplinaNombre`, `escenarioNombre`, `escenarioUbicacion`, `tenantNombre`, `tenantLogoUrl`, `reservasActivas`)
  - `PublicTrainingFilters` (`dateChip: 'today' | 'tomorrow' | 'this_week' | 'weekend' | null`, `search: string`, `tenantId: string | null`)
  - `EntrenamientoPublicoServiceError` class with `code: 'servicio_restriction' | 'duplicate' | 'forbidden' | 'validation' | 'unknown'`
- [x] 2.2 Extend `src/types/portal/storage.types.ts`: add `buildEntrenamientoPublicoBannerPath(tenantId: string, entrenamientoId: string, ext: string): string` returning `orgs/{tenantId}/entrenamientos-publicos/{entrenamientoId}.{ext}`, and `UploadEntrenamientoPublicoBannerInput` type
- [x] 2.3 Extend `src/types/portal.types.ts`: add a `PUBLIC_TRAININGS_MENU_ITEM` constant (`label: 'Entrenamientos Públicos'`, `href: '/portal/entrenamientos-publicos'`, an appropriate icon), and append it after `BASE_MENU_ITEM` in the `!tenantId` branch of `resolvePortalMenu`

## 3. Database Migration

- [x] 3.1 Create `supabase/migrations/20260723010000_entrenamientos_publicos.sql` with `CREATE TABLE public.entrenamientos_publicos` (all columns per design.md/spec: including `reserva_antelacion_horas`, `cancelacion_antelacion_horas`, `precio`, `banner_url`, `activo` default `true`, `publicado_por`), FKs to `tenants`, `entrenamientos` (`on delete cascade`), `disciplinas`, `escenarios`, `usuarios` (×2), a unique constraint on `entrenamiento_id`, and CHECK constraints (`precio >= 0`, `cupo_maximo > 0`, both antelacion columns `>= 0`) — all nullable checks following the existing `entrenamientos_reserva_antelacion_ck` pattern
- [x] 3.2 Add indexes: `idx_entrenamientos_publicos_tenant_id`, `idx_entrenamientos_publicos_activo`, `idx_entrenamientos_publicos_fecha_hora`
- [x] 3.3 Enable RLS and `grant select, insert, update, delete ... to authenticated`; add policies: `entrenamientos_publicos_select_authenticated` (`activo = true OR tenant_id IN admin tenants`), `entrenamientos_publicos_insert_admin`, `entrenamientos_publicos_update_admin`, `entrenamientos_publicos_delete_admin` (all admin-scoped via `get_admin_tenants_for_authenticated_user()`)
- [x] 3.4 Add `entrenamientos_publicos_set_updated_at` trigger using the existing `public.set_updated_at()` function
- [x] 3.5 Add `public.check_entrenamiento_publico_sin_restriccion_servicio()` function and `entrenamientos_publicos_no_servicio_restriccion` `before insert or update` trigger that raises an exception when the referenced `entrenamiento_id` has any `entrenamiento_restricciones` row with `servicio_1_id`…`servicio_4_id` set
- [x] 3.6 Add the `public_training_banner_read` SELECT policy on `storage.objects` (bucket `org-assets`, path segment `[1] = 'orgs'`, `[3] = 'entrenamientos-publicos'`, `to authenticated`, no membership check)
- [x] 3.7 Apply the migration to the **local** Supabase instance only (`supabase migration up`) — do NOT push to the remote/hosted project; verified no errors
- [x] 3.8 Verified in the local instance via direct SQL: a direct insert targeting a servicio-restricted `entrenamiento_id` fails with the trigger's exception (`SQLSTATE P0001`); an insert for a non-restricted training succeeds (and was cleaned up). Table columns, all 4 RLS policies, both triggers, and the storage policy were confirmed present via `information_schema`/`pg_policies`. Role-based (admin vs non-admin JWT) RLS behavior reuses the proven `get_admin_tenants_for_authenticated_user()` pattern from other tables and should be spot-checked manually through the app (see section 12).

## 4. Service — `entrenamientos-publicos.service.ts`

- [x] 4.1 Create `src/services/supabase/portal/entrenamientos-publicos.service.ts`
- [x] 4.2 Implement `hasServicioRestrictions(tenantId, entrenamientoId): Promise<boolean>` — query `entrenamiento_restricciones` for the given `entrenamiento_id` and return `true` if any row has a non-null `servicio_1_id`/`servicio_2_id`/`servicio_3_id`/`servicio_4_id`
- [x] 4.3 Implement `getPublicacionByEntrenamientoId(tenantId, entrenamientoId): Promise<EntrenamientoPublico | null>`
- [x] 4.4 Implement `listPublishedEntrenamientoIds(tenantId): Promise<Set<string>>` (id-only fetch scoped to the tenant)
- [x] 4.5 Implement `publicarEntrenamiento(input: PublicarEntrenamientoInput): Promise<EntrenamientoPublico>`: call `hasServicioRestrictions` first and throw `EntrenamientoPublicoServiceError('servicio_restriction', ...)` if `true`; otherwise read the source `entrenamientos` row (for `disciplina_id`, `escenario_id`, `entrenador_id`, `fecha_hora`, `duracion_minutos`, `cupo_maximo`, `punto_encuentro`, `estado`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas`) and upsert by `entrenamiento_id` (insert sets `publicado_por` to the current user; update never overwrites it); map a caught trigger exception to the same `'servicio_restriction'` error code
- [x] 4.6 Implement `despublicarEntrenamiento(tenantId, id): Promise<void>` — sets `activo = false`
- [x] 4.7 Implement `listPublicTrainings(): Promise<PublicTrainingListItem[]>` — query `entrenamientos_publicos` joined with `disciplinas(nombre)`, `escenarios(nombre, ubicacion)`, `tenants(nombre, logo_url)`, filtered to `activo = true` and `fecha_hora >= now()`; batch-enrich with a reservation count per `entrenamiento_id` via `reservasService.getCapacidad` (parallelized with `Promise.all`, mirroring the existing pattern in `useEntrenamientos.ts`). Date/search/organization filtering intentionally happens client-side in the marketplace hook (per spec), not in this query.
- [x] 4.8 Implement `listPublicTenantOptions(): Promise<SelectOption[]>` — distinct tenants with at least one `activo = true` publication
- [x] 4.9 Add a `mapServiceError`-style helper mapping Postgrest error codes (23505 duplicate, 23503 fk, 42501 forbidden, 23514 validation) plus the custom trigger exception (matched on message, since it raises without a fixed SQLSTATE mapping in PostgREST) to `EntrenamientoPublicoServiceError`

## 5. Service — `storage.service.ts` extension

- [x] 5.1 Add `uploadEntrenamientoPublicoBanner(supabase, tenantId, entrenamientoId, file): Promise<StorageUploadResult>` to `src/services/supabase/portal/storage.service.ts`, mirroring `uploadOrgBanner` (path via `buildEntrenamientoPublicoBannerPath`, `upsert: true`, `contentType: file.type`, then `createSignedUrl`)

## 6. Hook — publish/despublish flow

- [x] 6.1 Create `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts`: open/close state, prefill via `getPublicacionByEntrenamientoId` (falling back to source training defaults when no publication exists), controlled form state, banner file selection/validation (MIME jpeg/png/webp, ≤2 MiB, mirroring `useOrgBannerUpload`), `submit()` calling `publicarEntrenamiento` (uploading the banner first if a new file was selected), `despublicar()` calling `despublicarEntrenamiento`, and surfaced `error`/`isSubmitting` state
- [x] 6.2 Extended `src/hooks/portal/entrenamientos/useEntrenamientos.ts` to fetch `publishedEntrenamientoIds` (via `listPublishedEntrenamientoIds`) in the same `Promise.all` as the rest of `loadAll`, refreshed automatically whenever `refresh()`/`loadAll` reruns (e.g. after publish/despublish). The servicio-restriction check (`hasServicioRestrictions`) is invoked on-demand at the component level (`EntrenamientosPage.tsx`, see 8.2) when the action modal opens for a specific training, rather than eagerly for every instance in the list — cheaper and avoids N async calls on every page load.

## 7. Hook — marketplace + booking

- [x] 7.1 Create `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts`: fetch `listPublicTrainings` + `listPublicTenantOptions` on mount, manage filter state (`dateChip`, `search`, `tenantId`), derive the filtered list client-side and a "this week" count computed from the full unfetched list (independent of active filters, matching the static reference widget), expose `loading`/`error`/`refetch`/`featuredItem`/`standardItems`
- [x] 7.2 Create `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`: thin composition of the **existing** `useReservaForm`/`useFormularioRespuestaForm`, parameterized by `tenantId`/`entrenamientoId`/`disciplinaId` sourced from the selected `PublicTrainingListItem` (not from route context); fetches `formulario_id`/`formulario_externo`/`formulario_obligatorio` directly from the source `entrenamientos` row (never duplicated onto `entrenamientos_publicos`); no changes to `reservas.service.ts`

## 8. Components — existing `entrenamientos` feature (training wizard + action modal)

- [x] 8.1 Remove the `Privado`/`Público` radio group from `EntrenamientoWizard.tsx`; replace with a read-only info row showing the current `values.visibilidad` and static helper text about publishing later
- [x] 8.2 In `EntrenamientosPage.tsx`, compute `canPublish`/`publishDisabledReason` (via an on-demand effect calling `entrenamientosPublicosService.hasServicioRestrictions` for the selected instance) alongside the existing `selectedActionContext`, and derive `isPublished` from `publishedEntrenamientoIds`; wire `usePublicarEntrenamiento` and render `PublicarEntrenamientoModal`, refreshing the page's data after a successful publish/despublish
- [x] 8.3 Add the "Publicar"/"Gestionar publicación" button to `EntrenamientoActionModal.tsx`, visible only when `role === 'administrador'`, disabled when historical or when `!canPublish` (showing `publishDisabledReason`)
- [x] 8.4 Create `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx`: right-side slide-over with a live `PublicTrainingCard` preview beside an editable form (nombre, descripcion, precio, banner upload), read-only fecha/hora/duración/escenario/cupo, a primary submit button, and a "Despublicar" button shown only when already published; wired into `EntrenamientosPage.tsx` via `usePublicarEntrenamiento`

## 9. Components — new `entrenamientos-publicos` feature slice

- [x] 9.1 Create `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx`: shared presentational card driven by a `PublicTrainingCardData`-shaped prop (reused by both the marketplace grid and `PublicarEntrenamientoModal`'s preview); includes banner, sport badge, title, description, info row (calendar/time/location/spots + antelacion note when set), occupancy bar, price, and a "Reservar" button (opens `PublicTrainingReservaModal` from the marketplace; disabled in the publish-modal preview)
- [x] 9.2 Create `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`: thin wrapper rendering the **existing** `ReservaFormModal` (and `FormularioRespuestaModal` when applicable), driven by `usePublicTrainingReserva`; no reservations list, no export, no attendance management
- [x] 9.3 Create `src/components/portal/entrenamientos-publicos/PublicTrainingFilters.tsx`: left glass panel — title + subtitle, date chips (Hoy/Mañana/Esta semana/Fin de semana), a visual-only monthly calendar (current month, today highlighted, non-interactive), "Organización" dropdown, and a search field. Uses the app's existing `landing-*` Tailwind tokens (already registered in `tailwind.config.ts`, matching the `grit-arena.pen` palette exactly) plus `font-landing-display`/`font-landing-body`.
- [x] 9.4 Create `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx`: responsive grid rendering the most-recently-published listing with the Featured treatment and the rest as standard cards; renders an empty state when the filtered list is empty
- [x] 9.5 Create `src/components/portal/entrenamientos-publicos/SessionsAvailableWidget.tsx`: floating glass widget showing the current-week count
- [x] 9.6 Create `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx`: top-level container composing the above via `useEntrenamientosPublicosMarketplace`, styled per `projectspec/designs/pencil/grit-arena.pen` node `ql3Ij` (deep navy background, cyan/teal glows, glass panels) using the existing `landing-*` design tokens
- [x] 9.7 Create `src/components/portal/entrenamientos-publicos/index.ts` barrel export

## 10. Page + Menu wiring

- [x] 10.1 Replace `src/app/portal/entrenamientos-publicos/page.tsx` with a render-only page importing and rendering `<EntrenamientosPublicosPage />` — no data fetching in the page file
- [x] 10.2 Confirmed `PortalNavMenu.tsx`/`RoleBasedMenu.tsx` require no code change — both generically `.map()` over the `menuItems` array supplied by `resolvePortalMenu`/`usePortalNavigation`, so the new `PUBLIC_TRAININGS_MENU_ITEM` renders automatically. Visual/browser verification is left for manual QA (section 12) since no dev server was run for this change.

## 11. Documentation

- [x] 11.1 Updated `projectspec/03-project-structure.md`: new `/portal/entrenamientos-publicos/page.tsx` route entry; new `entrenamientos-publicos` feature slice (components, hooks, service, types); annotated `EntrenamientosPage.tsx`, `EntrenamientoFormModal.tsx`, `EntrenamientosList.tsx`'s sibling `EntrenamientoActionModal.tsx`, and the new `PublicarEntrenamientoModal.tsx` under the existing `entrenamientos` feature slice; annotated `useEntrenamientos.ts`, `entrenamientos.service.ts`, `storage.service.ts`, and `portal.types.ts`

## 12. Manual Verification

- [x] 12.3 (DB portion only) Verified directly against the local Postgres instance via `supabase db query`: inserting a publication for an `entrenamiento_id` with a servicio-based restriction fails with the trigger's `SQLSTATE P0001` exception; inserting for a non-restricted training succeeds (row cleaned up after). Table columns, all 4 RLS policies, both triggers, and the storage policy were confirmed present.
- [ ] 12.1 **Requires live QA (not run this session — no dev server/build per session instruction "sin Build")**: As `administrador` in Tenant A, publish a training with no restrictions via the running app; confirm the marketplace shows it (with banner) to a user with no membership in Tenant A; despublicar; confirm it disappears.
- [ ] 12.2 **Requires live QA**: As `entrenador`/`usuario`, confirm the "Publicar" action is absent from the options modal in the browser.
- [ ] 12.3b **Requires live QA**: Through the UI, confirm the "Publicar" button renders disabled with the explanatory reason for a servicio-restricted training (the underlying DB/service enforcement is already verified — see above).
- [ ] 12.4 **Requires live QA**: Publish one instance of a recurring series through the UI; confirm sibling instances and the `entrenamientos_grupo` row are unaffected.
- [ ] 12.5 **Requires live QA**: As the non-member visitor from 12.1, book the published training via the marketplace UI; confirm a `reservas` row is created against the source `entrenamiento_id`, an attached internal formulario routes through `FormularioRespuestaModal`, and booking inside the `reserva_antelacion_horas` cutoff is rejected.
- [ ] 12.6 **Requires live QA**: Verify date chips, search, and "Organización" filter combine correctly on the marketplace page in a browser; verify the empty state and the Featured card treatment render as designed.

Static verification performed instead this session (no browser/dev server): `npx tsc --noEmit` across the whole project — clean, zero errors. `npx eslint` across every new/modified file — clean, zero errors (two pre-existing unrelated warnings in `useEntrenamientos.ts` left untouched, not introduced by this change).

## 13. Commit & Pull Request

- [x] 13.1 Committed on `feat/us0089-public-training-marketplace` (commit `efd5e84`): migration, publish/despublish flow, servicio-restriction gate, marketplace page, reused booking pipeline, docs.
- [x] 13.2 PR description drafted (see chat) — pushing the branch and opening the PR were intentionally NOT done automatically; that requires explicit user confirmation since it's a remote/visible-to-others action.
