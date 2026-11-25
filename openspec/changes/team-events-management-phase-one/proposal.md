## Why

Teams need to run events for their own members (tournaments, clinics, outings, social activities) that are not trainings. Today the only publishable, purchasable activity is a public training, which must always derive from an `entrenamientos` row and targets cross-tenant visitors. The `gestion-eventos` route exists as an empty placeholder. This change (US-0118, phase 1) lays the data foundation and the admin management screen so that the next phases (create/edit form, publishing, ticket purchase) only add behavior on top.

## What Changes

- New standalone `public.eventos` table (no FK to `entrenamientos` / `entrenamientos_publicos`). Its columns mirror `entrenamientos_publicos`, including `cronograma`, `incluye`, `descripcion_larga`, `pagina_evento_url` and a multi-option `precio` jsonb array. `estado` is constrained to `confirmado | cancelado`, and there is an `updated_at` trigger and indexes.
- `escenario_id` and `entrenador_id` are `uuid` foreign keys, nullable, `on delete set null`, for consistency with the rest of the schema.
- RLS:
  - `anon` reads public + active events.
  - Authenticated users read public + active events, every active event of the tenants they belong to, and every event of the tenants where they are admin or trainer.
  - Only tenant admins and trainers can insert, update or delete.
- New `eventosService` with list (with optional date range), get by id, create, update, update status and delete. Postgrest errors are mapped to a typed `EventoServiceError` with Spanish messages.
- New `GestionEventosPage` at `/portal/orgs/[tenant_id]/gestion-eventos` (replacing the empty `page.tsx`):
  - Switchable views, synced to `?vista=`: **cards** (default, modeled on `PublicTrainingCard`), **list** (modeled on `SuscripcionesTable`) and **calendar** (modeled on `EntrenamientosCalendar`, `America/Bogota`).
  - Filters: search, estado, periodo and disciplina. A stats row.
  - Loading, error and empty states.
  - Actions: **Eliminar** (confirmation modal, hard delete) and **Cancelar / Confirmar evento** (confirmation modal toggling `estado`).
  - **Nuevo evento** and **Editar** are entry points only: they open a "disponible próximamente" modal.
- New "Eventos" item in the administrator tenant menu, placed after "Entrenamientos".

## Capabilities

### New Capabilities
- `team-events-data`: the `eventos` table contract (columns, defaults, constraints, referential behavior), its RLS read/write rules per actor, and the `eventosService` data-access contract and error mapping.
- `team-events-management`: the admin "Eventos" management page. It covers the switchable cards, list and calendar views, the filters and stats, the loading, error and empty states, the delete and change-status actions, and the phase-1 placeholder behavior of "Nuevo evento" and "Editar".

### Modified Capabilities
- `portal-role-navigation`: the administrator tenant menu gains a `gestion-eventos` entry ("Eventos", icon `event`) after `gestion-entrenamientos`. It is not shown to `usuario` or `entrenador`.

## Non-goals

- Event creation or edit form, banner upload, and editors for cronograma, incluye and precio (phase 2). The `createEvento` and `updateEvento` services are implemented but not wired to the UI.
- Ticket purchase, ticket or attendee tables, payments, and the `omitir_confirmacion_compra` behavior.
- A public or member-facing event listing or detail page, the anon-safe view, and the storage read policy for event banners.
- A trainer UI entry point. The page stays under `(administrador)`; phase 2 adds a separate trainer route under `(shared)`, and RLS already allows trainer writes (see design, Resolved Questions).
- Toggling `activo` or `publico` from the UI.
- Soft delete, or blocking delete once tickets exist.
- Notifications to ticket holders and members when an event is cancelled. This is confirmed as required, but in a later phase.
- Any change to trainings, public trainings, or `EntrenamientosCalendar` behavior.

## Files to Create or Modify

Order follows page → component → hook → service → types, then database and navigation.

| Layer | File | Change |
|-------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` | Replace the empty file with a server page rendering `<GestionEventosPage tenantId />` |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | New: page orchestration |
| Component | `src/components/portal/gestion-eventos/EventosToolbar.tsx` | New: view switcher and filters |
| Component | `src/components/portal/gestion-eventos/EventosStatsCards.tsx` | New |
| Component | `src/components/portal/gestion-eventos/EventosGrid.tsx`, `EventoCard.tsx` | New: cards view |
| Component | `src/components/portal/gestion-eventos/EventosTable.tsx` | New: list view |
| Component | `src/components/portal/gestion-eventos/EventosCalendar.tsx` | New: calendar view |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx`, `EventoEstadoBadge.tsx` | New |
| Component | `src/components/portal/gestion-eventos/CambiarEstadoEventoModal.tsx`, `EliminarEventoModal.tsx`, `EventoProximamenteModal.tsx` | New |
| Component | `src/components/portal/gestion-eventos/index.ts` | New barrel |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useEventosVista.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useEventosCalendar.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useCambiarEstadoEvento.ts`, `useEliminarEvento.ts` | New |
| Service | `src/services/supabase/portal/eventos.service.ts` | New `eventosService` |
| Service | `src/services/supabase/portal/index.ts` | Export `eventosService` |
| Types | `src/types/portal/eventos.types.ts` | New contracts, view models and `EventoServiceError` |
| Migration | `supabase/migrations/20260928120000_eventos.sql` | Table, constraints, indexes, trigger, RLS |
| Navigation | `src/types/portal.types.ts` | Add "Eventos" to `ROLE_TENANT_ITEMS.administrador` |
| Docs | `projectspec/03-project-structure.md` | Document the `gestion-eventos` slice and the `eventos` table |

## Step-by-step Implementation Plan

1. Verify the current `get_member_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()` definitions (US-0114).
2. Write and apply the `eventos` migration. Verify RLS per actor in SQL: anon, non-member, member, trainer, admin and pending member.
3. Create `eventos.types.ts`, reusing `CronogramaItem`, `IncluyeItem` and `PrecioItem`.
4. Create `eventos.service.ts` and export it from the barrel.
5. Create the hooks: data and filters, view sync, calendar month, change status, delete.
6. Build the shared components: badge, actions menu and the three modals.
7. Build the toolbar, stats, and the cards, list and calendar views.
8. Build `GestionEventosPage` and replace the placeholder `page.tsx`.
9. Add the "Eventos" menu item for administrators.
10. Seed sample events and test manually: all views, filters, actions, empty and error states, and direct URL access as trainer and athlete.
11. Run `npm run lint` and `npm run build`. Update `03-project-structure.md`.

## Impact

- **Database**: one new table with its policies. No changes to existing tables, views, functions or triggers. It reuses `set_updated_at()` and the US-0114 tenant-capability helpers.
- **Frontend**: a new feature slice `gestion-eventos` and one line in the admin menu config.
- **Security**: RLS is the only data guard. The route is gated by the existing `(administrador)` layout. No service-role usage.
- **Dependencies**: none added. There is no toast library, so errors are shown inline.
- **Design reference**: no new mockup. Visuals follow `grit-arena-v2.pen` tokens and the existing `PublicTrainingCard`, `SuscripcionesTable` and `EntrenamientosCalendar` screens.
