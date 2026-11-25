## 1. Branch setup

- [x] 1.1 Create a new branch `feat/team-events-management-phase-one` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Page

- [x] 2.1 Replace the empty `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` with an async server page, same shape as `gestion-suscripciones/page.tsx`. It awaits `params` and renders `<Suspense><GestionEventosPage tenantId={tenantId} /></Suspense>`; Suspense is required by `useSearchParams`.

## 3. Components (`src/components/portal/gestion-eventos/`)

- [x] 3.1 `EventoEstadoBadge.tsx`: `GritBadge` showing "Confirmado" (success tone) or "Cancelado" (danger tone), labels taken from `EVENTO_ESTADO_LABELS`
- [x] 3.2 `EventoActionsMenu.tsx`:
  - kebab trigger with `aria-haspopup="menu"`, `aria-expanded` and an `aria-label`
  - items use `role="menuitem"`: Editar; Cancelar evento or Confirmar evento, depending on `estado`; Eliminar
  - `Escape` closes the menu and returns focus to the trigger
  - callbacks: `onEditar`, `onCambiarEstado(target)`, `onEliminar`
- [x] 3.3 `EventoProximamenteModal.tsx`: informational dialog. `mode: 'crear' | 'editar'` selects the "La creación/edición de eventos estará disponible próximamente" copy. Uses `role="dialog"`, `aria-modal`, `aria-labelledby`, focus on open, `Escape` closes, backdrop `bg-grit-bg/70 backdrop-blur-sm`.
- [x] 3.4 `CambiarEstadoEventoModal.tsx`: confirmation with cancel or re-confirm copy, depending on the target estado. Uses `useCambiarEstadoEvento`; shows the error inline; disables the confirm button with a loader while submitting; `Escape` is ignored while submitting.
- [x] 3.5 `EliminarEventoModal.tsx`: modeled on `EliminarSuscripcionModal`. Shows the event name and Bogotá date, warns the action cannot be undone, uses `useEliminarEvento`, and has the same submit and error handling as 3.4.
- [x] 3.6 `EventosToolbar.tsx`:
  - view switcher: `role="radiogroup"` labelled "Vista de eventos", with Tarjetas `grid_view`, Lista `view_list` and Calendario `calendar_month`; `role="radio"` / `aria-checked`, Arrow keys move and Enter/Space select
  - filters: search, Estado, Periodo (hidden in calendar view), Disciplina
  - uses the `gritInputClass` / `gritSelectClass` styles
- [x] 3.7 `EventosStatsCards.tsx`: Total, Próximos confirmados and Cancelados, same pattern as `SuscripcionesStatsCards`
- [x] 3.8 `EventoCard.tsx`, modeled on `PublicTrainingCard`:
  - banner, or a discipline-colored placeholder
  - estado badge, "Privado" tag, "Inactivo" tag
  - name and discipline
  - Bogotá date/time, or "Fecha por definir"
  - duration
  - location: venue, else `punto_encuentro`
  - trainer
  - capacity: "Cupo: N" or "Cupo ilimitado"
  - price summary: Gratis, $X, or Desde $X
  - muted emphasis when cancelled
  - `EventoActionsMenu`
- [x] 3.9 `EventosGrid.tsx`: responsive grid (1 / 2 / 3 columns at base / `sm` / `lg`) and a skeleton state
- [x] 3.10 `EventosTable.tsx`, modeled on `SuscripcionesTable`:
  - columns: Evento, Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad, Estado, Acciones
  - client pagination at 20 rows
  - stacked rows below `md`
  - skeleton rows
- [x] 3.11 `EventosCalendar.tsx`, modeled on `EntrenamientosCalendar`:
  - Monday-first grid, `toDateKeyInBogota`, discipline palette
  - up to 3 chips per day plus "+N"; cancelled chips struck through and with a text label
  - day cells are buttons with an `aria-label` giving the date and count
  - the selected-day list shows actions
  - "N eventos sin fecha" note linking to the list view
  - skeleton grid
  - do NOT modify `EntrenamientosCalendar`; helper extraction to `src/lib/portal/calendar.utils.ts` is allowed only with zero behavior change
- [x] 3.12 `GestionEventosPage.tsx` (`'use client'`):
  - `GritPageHeader` "Eventos" with the "Nuevo evento" button, then toolbar, stats and the active view
  - `onNuevo` / `onEditar` open `EventoProximamenteModal`
  - owns the state of the status and delete modals
  - on success, calls `reload()`, plus the calendar reload when the calendar is active
  - states: error (`GritEmptyState` + "Reintentar"), empty tenant ("Aún no hay eventos" + "Nuevo evento"), no filter matches ("No hay eventos que coincidan con los filtros" + "Limpiar filtros")
- [x] 3.13 `index.ts` barrel exporting `GestionEventosPage`

## 4. Hooks (`src/hooks/portal/gestion-eventos/`)

- [x] 4.1 `useGestionEventos.ts`:
  - loads `eventosService.listEventos(tenantId)` and the tenant disciplines
  - exposes `eventos`, `filteredEventos`, `stats`, `disciplinas`, `loading`, `error`, `reload`, the filter state and setters, and `clearFilters`
  - 250 ms debounced search; AND-combined filters; the "Próximos" periodo includes undated events
  - sorting per periodo (nulls last); stats computed over the unfiltered set
  - errors logged with `console.error`
- [x] 4.2 `useEventosVista.ts`: reads `?vista=` from `useSearchParams()`, falls back to `tarjetas`, and writes with `router.replace(pathname + '?' + params, { scroll: false })`
- [x] 4.3 `useEventosCalendar.ts`:
  - Bogotá month state with `monthLabel`, `monthStartDate`, `goPrevious`, `goNext`, `selectedDateKey` and `selectDate`
  - fetches `listEventos(tenantId, { desde, hasta })` per month, only when enabled (calendar view)
  - groups events by date key and exposes `undatedCount` from the main dataset, plus `reload`
- [x] 4.4 `useCambiarEstadoEvento.ts`: `{ isSubmitting, error, confirmar(estado) }` calling `updateEstadoEvento`, then `onSuccess`
- [x] 4.5 `useEliminarEvento.ts`: `{ isSubmitting, error, confirmar() }` calling `deleteEvento`, then `onSuccess` (same shape as `useEliminarSuscripcion`)

## 5. Service

- [x] 5.1 Create `src/services/supabase/portal/eventos.service.ts` exporting `eventosService`. Use the browser `createClient()`. Add a local `mapServiceError` that maps:
  - `42501`, or zero rows returned, → `forbidden`
  - `23503` → `invalid_reference`
  - `23514` → `invalid_data`
  - anything else → `unknown`

  Each maps to the Spanish messages from the spec.
- [x] 5.2 `listEventos(tenantId, filters?)`:
  - embeds `disciplina:disciplinas(id, nombre)`, `escenario:escenarios(id, nombre)` and `entrenador:usuarios!eventos_entrenador_id_fkey(id, nombre, apellido)`
  - applies `.eq('tenant_id')`, plus optional `gte`/`lt` on `fecha_hora`
  - orders ascending with nulls last
  - maps rows to `EventoListItem`
- [x] 5.3 `getEventoById(tenantId, eventoId)` using `maybeSingle()`, returning `null` when not found
- [x] 5.4 `createEvento(tenantId, input)`: sets `creado_por` from `auth.getUser()`, trims text, turns empty strings into null, defaults the arrays to `[]`, and uses `.select('*').single()`
- [x] 5.5 `updateEvento(tenantId, eventoId, input)`: never sends `tenant_id`, `creado_por` or timestamps; maps `PGRST116` to `forbidden`
- [x] 5.6 `updateEstadoEvento(tenantId, eventoId, estado)`: validates against `EVENTO_ESTADOS` before calling Supabase (`invalid_data`); updates with `.select('*').single()`
- [x] 5.7 `deleteEvento(tenantId, eventoId)`: `.delete().eq('tenant_id').eq('id').select('id')`; an empty result throws `forbidden`
- [x] 5.8 Export `eventosService` from `src/services/supabase/portal/index.ts`

## 6. Types

- [x] 6.1 Create `src/types/portal/eventos.types.ts` with:
  - `EventoEstado`, `EVENTO_ESTADOS`, `EVENTO_ESTADO_LABELS`
  - `Evento` (the DB row), `EventoInput`, `EventoListItem`, `EventosListFilters` (`desde?`, `hasta?`)
  - `EventosVista`, `EventosPeriodo`, `EventosClientFilters`, `EventosStats`
  - the `EventoServiceError` class, with `code: 'forbidden' | 'invalid_reference' | 'invalid_data' | 'unknown'`

  Reuse `CronogramaItem`, `IncluyeItem` and `PrecioItem` via `import type` from `entrenamientos-publicos.types.ts`. No `any`.

## 7. Database (local only)

- [x] 7.1 Read the current definitions of `get_member_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()` (US-0114). Confirm that pending memberships are excluded and that the trainer/admin helper returns only active admin/trainer memberships.
- [x] 7.2 Create `supabase/migrations/20260928120000_eventos.sql`, wrapped in `begin; … commit;`, containing:
  - the table with all columns, FKs (`tenant` cascade, `disciplina` restrict, `escenario`/`entrenador`/`creado_por` set null) and check constraints (estado, duracion, cupo, both antelaciones, the three jsonb arrays)
  - a table comment
  - indexes `(tenant_id, fecha_hora)`, `(disciplina_id)`, and a partial `(fecha_hora) where publico and activo`
  - the `set_updated_at` trigger
- [x] 7.3 In the same migration:
  - enable RLS
  - `revoke all … from anon, authenticated`, then `grant select to anon` and `grant select, insert, update, delete to authenticated`
  - policies `eventos_select_anon`, `eventos_select_authenticated`, `eventos_insert_trainer_admin`, `eventos_update_trainer_admin` (with `using` + `with check`) and `eventos_delete_trainer_admin`
- [x] 7.4 Apply locally only (`npx supabase migration up --local`). Never push to the remote Supabase project.
- [x] 7.5 Regenerate local Supabase types, if the project keeps a generated `database.types.ts` — N/A: the project has no generated types file

## 8. Navigation

- [x] 8.1 In `src/types/portal.types.ts`, add `{ label: 'Eventos', path: 'gestion-eventos', icon: 'event' }` to `ROLE_TENANT_ITEMS.administrador`, immediately after "Entrenamientos". Confirm the `event` icon renders in `PortalNavMenu`.

## 9. Verification

- [x] 9.1 Constraints in SQL: minimal-insert defaults; rejection of `estado = 'pendiente'`, `cupo_maximo = 0`, `duracion_minutos = 0`, negative antelación, and non-array jsonb; `updated_at` refresh; FK behaviors (discipline restrict, venue/trainer set null, tenant cascade)
- [x] 9.2 RLS per actor, using `set local role` + `request.jwt.claims` with seeded users:
  - anon: public + active only
  - non-member: public + active only
  - member `usuario`: all active rows, including private; no writes
  - pending member: public + active only
  - trainer and admin: all rows, with writes
  - moving an event to another tenant is rejected
- [x] 9.3 Seed events locally covering public/private, confirmed/cancelled, dated/undated, past/future, with and without venue, trainer and price, including one at `2026-10-01T01:00:00Z`
- [x] 9.4 Manual UI check as admin:
  - the menu item and its position
  - the three views and `?vista=` persistence and fallback
  - keyboard use of the switcher
  - filters and "Limpiar filtros"; stats stay unchanged when filtering
  - card and table content
  - the calendar's Bogotá day placement, month navigation, overflow and undated note
- [x] 9.5 Manual action checks:
  - Nuevo evento and Editar placeholders send no request
  - cancel and re-confirm an event
  - delete, including cancelling the delete modal
  - inline errors, simulated by going offline — NOT exercised in the browser (error mapping reviewed in code; RLS denial paths verified in SQL)
  - `Escape` blocked while submitting
- [x] 9.6 States: loading skeletons, load error with "Reintentar", an empty tenant, and filters with no match — load-error state NOT exercised in the browser; the rest verified
- [x] 9.7 Direct URL access as trainer and as athlete redirects to `/portal/orgs/{tenantId}`, and no "Eventos" menu entry is shown for them
- [x] 9.8 Confirm that no trainings, public trainings or `EntrenamientosCalendar` files changed behavior (`git diff --stat`)

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`: add the `gestion-eventos` feature slice (page, components, hooks, `eventos.service.ts`, `eventos.types.ts`) to the directory tree, and document the `eventos` table and its RLS matrix

## 11. Quality gates and delivery

- [x] 11.1 Run `npx tsc --noEmit` and `npx eslint` on the changed files, plus tests if any apply. Do not run a build.
- [x] 11.2 Write the commit message (`feat(team-events-management-phase-one): ...`) and the pull request description in `openspec/changes/team-events-management-phase-one/delivery.md`. The PR description covers why, the schema and RLS matrix, the views and actions, the phase-1 placeholders, and a note that the migration is local only.
