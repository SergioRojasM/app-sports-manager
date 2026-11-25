## Context

- US-0118 introduces "eventos": activities a team organizes for its own members, which can later be sold as tickets. They are conceptually close to public trainings (`entrenamientos_publicos`, US-0073 → US-0117) but must not depend on a training.
- The placeholder route `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` is an empty file. The `(administrador)` layout already redirects non-admins server-side via `getCachedTenantAccess`.
- Tenant-capability helpers from US-0114 exist and exclude `pendiente_activacion` memberships:
  - `get_member_tenants_for_authenticated_user()`
  - `get_trainer_or_admin_tenants_for_authenticated_user()`
  - `get_admin_tenants_for_authenticated_user()`
- Architecture (`projectspec/03-project-structure.md`): feature slice `page → component → hook → service → types`. No Supabase calls from components. Browser client in services. `grit-*` design tokens (US-0116). There is no toast library; errors are shown inline.
- Design reference: no new mockup. The UI reuses the visual patterns of `PublicTrainingCard` / `PublicTrainingsGrid` (cards), `SuscripcionesTable` / `SuscripcionesStatsCards` (list and stats) and `EntrenamientosCalendar` (calendar), all using `grit-arena-v2.pen` tokens.

## Goals / Non-Goals

**Goals:**
- A durable `eventos` schema that phases 2–3 (form, tickets) can build on without reshaping columns.
- RLS that encodes the read and write matrix from the story, so the UI never needs to enforce data permissions.
- A complete, typed data-access layer, including create and update, which are not yet used by the UI.
- An admin page with three interchangeable views sharing one dataset, one filter state and one action set.

**Non-Goals:**
- Create/edit form, banner upload, ticket purchase, public/member event pages, the anon-safe view, a trainer UI route, soft delete, and notifications. See the proposal's Non-goals.
- Refactoring `EntrenamientosCalendar` or any trainings code.

## Architecture

```
app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx   (Server; admin gate from layout)
  └─ <GestionEventosPage tenantId>                                       ('use client')
       ├─ useEventosVista()            ← ?vista=tarjetas|lista|calendario
       ├─ useGestionEventos(tenantId)  ← dataset + client filters + stats + reload
       │     └─ eventosService.listEventos(tenantId)
       │     └─ disciplinesService (filter options)
       ├─ useEventosCalendar(tenantId) ← month range; only active in calendar view
       │     └─ eventosService.listEventos(tenantId, { desde, hasta })
       │
       ├─ GritPageHeader  [Nuevo evento] ─► EventoProximamenteModal
       ├─ EventosToolbar  (view switcher + filters)
       ├─ EventosStatsCards
       ├─ vista === 'tarjetas'   → EventosGrid → EventoCard ┐
       ├─ vista === 'lista'      → EventosTable            ├─► EventoActionsMenu
       ├─ vista === 'calendario' → EventosCalendar         ┘     ├─ Editar          → EventoProximamenteModal
       │                                                          ├─ Cancelar/Confirmar → CambiarEstadoEventoModal
       │                                                          │                          └─ useCambiarEstadoEvento → eventosService.updateEstadoEvento
       │                                                          └─ Eliminar        → EliminarEventoModal
       │                                                                                     └─ useEliminarEvento → eventosService.deleteEvento
       └─ onSuccess of any modal → reload() (+ calendar reload when active)

eventosService ──(browser client, user JWT)──► public.eventos  [RLS]
```

## Decisions

### D1. Standalone table instead of reusing `entrenamientos_publicos`
The table is new and has no FK to trainings.
- *Alternative:* make `entrenamientos_publicos.entrenamiento_id` nullable and add a `tipo` column. Rejected because it would touch the booking RPCs (`book_and_deduct_service_units`), triggers (`check_entrenamiento_publico_restricciones_membresia`), the anon view and the marketplace. That is high regression risk for a feature the story explicitly wants independent.
- The column set is kept deliberately parallel (`cronograma`, `incluye`, `precio` with the same JSON shapes), so the phase 2 editors can reuse the US-0109 components and types.

### D2. `escenario_id` / `entrenador_id` as `uuid` FKs (the story input suggested `text`)
Every existing table stores these as `uuid` FKs. FKs give referential integrity and let PostgREST embed `escenarios(nombre)` and `usuarios(nombre, apellido)` for display.
- `on delete set null`, not `restrict` as in `entrenamientos_publicos`: an event outlives a removed venue or trainer, since `punto_encuentro` can take over.
- `disciplina_id` stays `restrict`, as requested (`not null`).

### D3. Added `precio jsonb` column
Same shape as `entrenamientos_publicos.precio`: an array of `{ nombre, precio, descripcion }`, where `[]` means free. Phase 1 only displays it on cards. Adding it now avoids a follow-up migration in the tickets phase.

### D4. `estado` as varchar plus a check constraint, not a Postgres enum
This matches the project convention (e.g. `entrenamientos_publicos.estado`). A later phase can add values such as `finalizado` with a constraint swap instead of `alter type`. The TypeScript union `EventoEstado` is the single source for the UI.

### D5. RLS matrix built on existing helpers

| Actor | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `anon` | `publico and activo` | — |
| authenticated non-member | `publico and activo` | — |
| member (any role, non-pending) | above + `activo` rows of own tenants | — |
| admin / trainer | all rows of their tenants | ✓ |

- Reuses `get_member_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()`, so there are no new SECURITY DEFINER functions and pending memberships are excluded automatically.
- The UPDATE `with check` repeats the tenant predicate, which prevents moving a row to a tenant where the caller has no role.
- `revoke all … from anon, authenticated`, then explicit grants. This mirrors the `20260828120000` lesson about Supabase default privileges.
- *Alternative:* expose anon reads only via a view (as `entrenamientos_publicos_view` does). This is deferred to the public-page phase. For phase 1 the table policy is enough, because anon has no UI and cannot join the dependent tables anyway.

### D6. Client-side filtering, server-side date range only for the calendar
Tenant event volumes are small (expected fewer than a few hundred). `useGestionEventos` loads the tenant dataset once and derives the filtered list and stats with `useMemo`, so stats stay independent of the filters. The calendar uses its own `desde` / `hasta` query per month, backed by the `(tenant_id, fecha_hora)` index, so month navigation stays cheap even if the main dataset grows.
- *Alternative:* server-side pagination and filters. Deferred; the threshold (above 500 events) is noted in the story as tech debt.

### D7. View state in the URL (`?vista=`)
`useEventosVista` reads `useSearchParams()` and writes with `router.replace(..., { scroll: false })`. The view survives reloads and can be shared, with no localStorage edge cases. Unknown values fall back to `tarjetas`. Because `useSearchParams` requires a Suspense boundary in the App Router, the page wraps `GestionEventosPage` in `<Suspense>`.

### D8. Calendar: a new component, not a generalized `EntrenamientosCalendar`
`EntrenamientosCalendar` is typed to `TrainingCalendarItem` and training semantics (`canManage`, star dots for público). Generalizing it risks regressions in a heavily used screen. `EventosCalendar` copies the month-grid helpers (`toDateKeyInBogota`, Monday-first grid, discipline palette). Extracting them to `src/lib/portal/calendar.utils.ts` is allowed, provided `EntrenamientosCalendar`'s output is unchanged.

### D9. Phase-1 seams for create and edit
`GestionEventosPage` owns `onNuevo()` and `onEditar(evento)` handlers that currently open `EventoProximamenteModal`. Phase 2 swaps these handlers for the form modal. No view component needs to change.

### D10. Error model
`eventos.service.ts` maps Postgrest errors to `EventoServiceError { code: 'forbidden' | 'invalid_reference' | 'invalid_data' | 'unknown', message }`, following the `EntrenamientoPublicoServiceError` pattern.
- RLS-filtered UPDATE and DELETE statements return 0 rows without an error. The service therefore uses `.select()` after the write and treats an empty result as `forbidden`.
- Hooks expose `error: string | null`. Modals render it inline, and the page renders load errors with `GritEmptyState` plus "Reintentar".

## Risks / Trade-offs

- **Trainers have write access in RLS but no UI.** A trainer could write through the API with their JWT. → This is intentional per the story's permission matrix; the phase 2 route decision will expose it in the UI.
- **Hard delete loses history.** → Acceptable while there are no tickets. The phase 3 story must add blocking or soft delete before tickets reference `eventos.id`.
- **Anon SELECT on the base table** exposes every column of public events, including `creado_por` and `entrenador_id` uuids. → Low sensitivity (opaque ids). The public-page phase will switch anon to a curated view and can revoke the base-table grant.
- **Client-side filtering doesn't scale to very large tenants.** → Documented threshold. The calendar already queries by range.
- **Duplicated calendar helpers.** → Optional extraction to `lib/portal/calendar.utils.ts`, guarded by "no behavior change" on trainings.
- **Timezone off-by-one on day placement.** → All date keys are computed with `America/Bogota`, as `EntrenamientosCalendar` does. A late-night UTC event is covered by an acceptance scenario.

## Migration Plan

1. Add `supabase/migrations/20260928120000_eventos.sql`. It is wrapped in `begin; … commit;` and is purely additive.
2. Apply **locally only** (`supabase migration up` / `supabase db reset`). Do **not** push to the remote Supabase project as part of this change.
3. Verify RLS locally per actor using `set local role` plus `request.jwt.claims`.
4. Rollback (local): `drop table public.eventos cascade;`. No other object depends on it.

## Resolved Questions (for later phases)

- **Trainer UI access**: phase 2 adds a **separate events route under the `(shared)` route group** for trainers. The admin page stays at `(administrador)/gestion-eventos`, unchanged. The phase 1 RLS already allows trainer writes, so no migration is needed for this. To make that route cheap to add, `GestionEventosPage` MUST stay route-agnostic: it receives only `tenantId` and reads nothing from the `(administrador)` context.
- **Cancellation notifications**: cancelling an event WILL notify ticket holders and members, but in a later phase (tickets/notifications), not in phase 1 or 2. Phase 1 status changes only update `estado`.
