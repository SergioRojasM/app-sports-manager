# US-0118 — Team Events Management (Phase 1: Data Model, Listing & Status Actions)

## ID
US-0118

## Name
Team events module — `eventos` table, services, and the admin management page with switchable cards / list / calendar views plus delete and status-change actions

## As a
Tenant administrator (and, at the data layer, tenant trainer)

## I Want
A dedicated "Eventos" module where I can see every event my team has created — as cards, as a list, or on a calendar — and delete events or switch their status between *Confirmado* and *Cancelado*

## So That
The team can run events for its own members (tournaments, clinics, outings, social activities) as a first-class concept that is independent from trainings, laying the foundation for the next phases (event creation/editing, publishing, and ticket purchase)

---

## Description

### Current State
- Public trainings (`entrenamientos_publicos`, US-0073 → US-0117) are the only "publishable, purchasable" activity. They are always derived from an `entrenamientos` row (`entrenamiento_id not null`, unique) and are aimed at cross-tenant visitors on the marketplace.
- There is no way to model a team event that is not a training. The route `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` exists as an **empty file** (0 bytes) and is not linked from the portal menu.

### Proposed Changes

#### Scope of this phase
| In scope | Out of scope (later phases) |
|----------|-----------------------------|
| `eventos` table, constraints, indexes, RLS, `updated_at` trigger | Create / edit form (wizard, banner upload, cronograma/incluye editors) |
| Full CRUD service + types (create/update are implemented and typed so phase 2 only builds UI) | Ticket purchase flow, ticket/attendee tables, payments |
| Management page with cards (default), list and calendar views | Public/member-facing event detail page and event marketplace |
| "Nuevo evento" button and "Editar" action **as entry points only** (see below) | Trainer access to the management page (route stays under `(administrador)`) |
| Delete action with confirmation | Soft delete / delete protection once tickets exist |
| Change status action (`confirmado` ⇄ `cancelado`) | Notifications to members on cancellation |
| "Eventos" entry in the administrator tenant menu | |

#### Relationship with public trainings
`eventos` is a **new, standalone table**. It has no FK to `entrenamientos` / `entrenamientos_publicos`, and no existing public-training code, view, trigger, or RPC is modified. The column set intentionally mirrors `entrenamientos_publicos` (including the US-0109 detail fields `cronograma`, `incluye`, `descripcion_larga`, `pagina_evento_url`, and the multi-option `precio` array) so that phase 2 can reuse the same editors and card shape.

#### Data model decisions (beyond the requested minimum)
1. **`escenario_id` and `entrenador_id` are `uuid` with foreign keys**, not `text`. Every other table in the project (`entrenamientos`, `entrenamientos_publicos`) stores them as `uuid` FKs to `escenarios(id)` and `usuarios(id)`; `text` would prevent joins for the card/list/calendar display names and allow orphan ids. Both stay nullable (an event may be off-site — see `punto_encuentro` — or have no assigned trainer).
2. **`precio jsonb not null default '[]'`** is added, same shape as `entrenamientos_publicos.precio` (`[{ nombre, precio, descripcion }]`, empty array = free). Tickets are the core purpose of the module; cards display "Gratis" / "Desde $X" from this column already in phase 1.
3. **`estado`** is constrained to `('confirmado', 'cancelado')`, default `'confirmado'`.
4. **`creado_por`** references `usuarios(id) on delete set null` and is set by the service from the current auth user.
5. **`punto_encuentro`** stays `text` as requested (no length cap), **`banner_url`** stays `text` (same as `entrenamientos_publicos` after `20260812190000_entrenamientos_publicos_banner_url_text.sql`).
6. Semantics of the two flags:
   - `activo = false` → the event is hidden from everyone except the tenant's admins/trainers (draft/archived). Not toggled from the UI in this phase; it defaults to `true`.
   - `publico = true` → readable by anyone, including `anon`. `publico = false` → readable only by members of the tenant.
7. `omitir_confirmacion_compra`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas` are stored now for the ticket-purchase phase; they are displayed nowhere in phase 1.

#### UI — `GestionEventosPage`
Rendered inside the existing portal shell (`portal/layout.tsx` provides `.grit-shell`, breadcrumb and `GritPageContainer`). Follows the US-0116 visual system: `grit-*` tokens only, `rounded-grit-*` radii, `font-grit-title` for headings, `@/components/ui` grit kit. No outer page padding, exactly one `h1`.

**Header** — `GritPageHeader` with title "Eventos", subtitle "Gestiona los eventos de tu equipo", and a primary `GritButton` **"Nuevo evento"** (icon `add`).

**Toolbar** (`EventosToolbar`), below the header:
- **View switcher**: a segmented control with three options — *Tarjetas* (icon `grid_view`, default), *Lista* (icon `view_list`), *Calendario* (icon `calendar_month`). Implemented as a `role="radiogroup"` with `role="radio"` / `aria-checked` buttons. The selected view is synced to the URL query param `?vista=tarjetas|lista|calendario` (via `useRouter().replace`, no scroll) so it survives reloads and can be shared; an unknown/missing value falls back to `tarjetas`.
- **Search** input: filters by `nombre` (case-insensitive, client-side, debounced 250 ms).
- **Estado** select: *Todos* (default) / *Confirmado* / *Cancelado*.
- **Periodo** select: *Próximos* (default: `fecha_hora >= now()` or `fecha_hora is null`) / *Pasados* (`fecha_hora < now()`) / *Todos*. Ignored in calendar view (the calendar is navigated by month).
- **Disciplina** select: *Todas* + tenant disciplines (from `disciplinesService`).

**Stats row** (`EventosStatsCards`, same pattern as `SuscripcionesStatsCards`): *Total*, *Próximos confirmados*, *Cancelados*, computed from the loaded (unfiltered) dataset.

**Cards view (default)** — `EventosGrid` + `EventoCard`, modeled on `PublicTrainingsGrid` / `PublicTrainingCard`:
- Responsive grid: 1 column < `sm`, 2 columns `sm`–`lg`, 3 columns ≥ `lg`.
- Card content: banner (`banner_url`, or a discipline-colored gradient placeholder with the discipline icon when null), `EventoEstadoBadge`, a *Privado* `GritTag` when `publico = false`, a *Inactivo* tag when `activo = false`, name, discipline, date/time formatted in `America/Bogota` (`EEE d MMM · h:mm a`, or "Fecha por definir" when null), duration, escenario name or `punto_encuentro`, trainer name, capacity ("Cupo: N" or "Cupo ilimitado"), price summary ("Gratis" / "Desde $X" / "$X").
- Cancelled events render with reduced emphasis (muted text + the *Cancelado* badge) but remain actionable.
- Card footer: kebab menu (`EventoActionsMenu`) with the actions listed below.

**List view** — `EventosTable`, modeled on `SuscripcionesTable`:
- Columns: Evento (name + discipline), Fecha y hora, Lugar (escenario or punto de encuentro), Entrenador, Cupo, Visibilidad (Público / Privado), Estado (badge), Acciones (`EventoActionsMenu`).
- Default sort: `fecha_hora` ascending for *Próximos*, descending for *Pasados* / *Todos*; nulls last.
- Client-side pagination, 20 rows per page (same controls as `SuscripcionesTable`).
- Below `md` the table collapses into stacked rows (same responsive pattern used by `SuscripcionesTable`).

**Calendar view** — `EventosCalendar`, modeled on `EntrenamientosCalendar` (month grid, Monday-first `WEEKDAY_HEADERS`, `toDateKeyInBogota`, previous/next month buttons, discipline color palette):
- Each day cell shows up to 3 event chips (discipline color dot + truncated name, struck-through when `cancelado`) and a "+N" overflow indicator.
- Selecting a day shows, below the grid, the list of that day's events with time, name, estado badge and `EventoActionsMenu`.
- Events with `fecha_hora = null` are not placed on the grid; a note "N eventos sin fecha" is shown under the calendar and links to the list view.
- Month navigation re-fetches only the visible month range (see `listEventos` date filters).
- Do **not** generalize `EntrenamientosCalendar`; copy the month-grid helpers into the new component (or extract them to `src/lib/portal/calendar.utils.ts` if the developer prefers — both acceptable, but `EntrenamientosCalendar` behavior must not change).

**Actions** (`EventoActionsMenu`, shared by all three views):
| Action | Visible when | Behavior |
|--------|--------------|----------|
| Editar | always | Phase 1: calls `onEditar(evento)`; the page opens `EventoProximamenteModal` ("La edición de eventos estará disponible próximamente"). |
| Cancelar evento | `estado = 'confirmado'` | Opens `CambiarEstadoEventoModal` asking for confirmation ("Los miembros verán el evento como cancelado"). On confirm → `updateEstado(id, 'cancelado')`. |
| Confirmar evento | `estado = 'cancelado'` | Same modal, reactivation copy. On confirm → `updateEstado(id, 'confirmado')`. |
| Eliminar | always | Opens `EliminarEventoModal` (modeled on `EliminarSuscripcionModal`): shows the event name and date, warns that the action cannot be undone. On confirm → `deleteEvento(id)`. |

- **"Nuevo evento"** button: calls `onNuevo()`; the page opens the same `EventoProximamenteModal` ("La creación de eventos estará disponible próximamente"). The handler seam (`onNuevo`, `onEditar`) is what phase 2 will replace with the form.
- After a successful status change or delete, the modal closes and the dataset is refreshed (`reload()` from `useGestionEventos`). The modal stays open and shows the inline error on failure.
- All modals follow the existing modal pattern: backdrop `bg-grit-bg/70 backdrop-blur-sm`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus on open, `Escape` closes (except while submitting), submit buttons disabled while submitting.

**States**:
- Loading: skeleton cards (cards view), skeleton rows (list view), grid skeleton (calendar view).
- Error: `GritEmptyState` with the error message and a "Reintentar" button calling `reload()`.
- Empty (no events at all): `GritEmptyState` "Aún no hay eventos" + "Crea el primer evento de tu equipo" + "Nuevo evento" button.
- Empty after filters: "No hay eventos que coincidan con los filtros" + "Limpiar filtros" button.

**Menu** — add `{ label: 'Eventos', path: 'gestion-eventos', icon: 'event' }` to `ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`, placed right after *Entrenamientos*.

**Route access** — the page lives under `(administrador)`, whose layout already redirects anyone who is not an active tenant admin. Trainers have write permission in RLS (so phase 2 can move the page to `(shared)` or add a trainer route without another migration), but they get no UI entry point in this phase.

---

## Database Changes

### Migration: `supabase/migrations/20260928120000_eventos.sql`

```sql
-- =============================================
-- Migration: Team events (US-0118)
-- Standalone events for tenant members, independent from entrenamientos.
-- =============================================

begin;

-- 1. Table
create table public.eventos (
  id                            uuid primary key default gen_random_uuid(),
  tenant_id                     uuid not null,
  nombre                        varchar(150),
  descripcion                   text,
  disciplina_id                 uuid not null,
  escenario_id                  uuid,
  entrenador_id                 uuid,
  fecha_hora                    timestamptz,
  duracion_minutos              integer,
  cupo_maximo                   integer,
  punto_encuentro               text,
  estado                        varchar(30) not null default 'confirmado',
  reserva_antelacion_horas      integer,
  cancelacion_antelacion_horas  integer,
  precio                        jsonb not null default '[]'::jsonb,
  banner_url                    text,
  activo                        boolean not null default true,
  publico                       boolean not null default true,
  creado_por                    uuid,
  omitir_confirmacion_compra    boolean not null default false,
  cronograma                    jsonb not null default '[]'::jsonb,
  incluye                       jsonb not null default '[]'::jsonb,
  descripcion_larga             text,
  pagina_evento_url             text,
  created_at                    timestamptz not null default timezone('utc', now()),
  updated_at                    timestamptz not null default timezone('utc', now()),

  constraint eventos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint eventos_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete restrict,
  constraint eventos_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete set null,
  constraint eventos_entrenador_id_fkey
    foreign key (entrenador_id) references public.usuarios(id) on delete set null,
  constraint eventos_creado_por_fkey
    foreign key (creado_por) references public.usuarios(id) on delete set null,

  constraint eventos_estado_ck
    check (estado in ('confirmado', 'cancelado')),
  constraint eventos_duracion_ck
    check (duracion_minutos is null or duracion_minutos > 0),
  constraint eventos_cupo_ck
    check (cupo_maximo is null or cupo_maximo > 0),
  constraint eventos_reserva_antelacion_ck
    check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  constraint eventos_cancelacion_antelacion_ck
    check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0),
  constraint eventos_precio_array_ck
    check (jsonb_typeof(precio) = 'array'),
  constraint eventos_cronograma_array_ck
    check (jsonb_typeof(cronograma) = 'array'),
  constraint eventos_incluye_array_ck
    check (jsonb_typeof(incluye) = 'array')
);

comment on table public.eventos is
  'Team events (US-0118). Independent from entrenamientos; publico=true is readable by anon, publico=false only by tenant members.';

-- 2. Indexes
create index idx_eventos_tenant_fecha_hora on public.eventos (tenant_id, fecha_hora);
create index idx_eventos_disciplina_id on public.eventos (disciplina_id);
create index idx_eventos_publicos_fecha_hora on public.eventos (fecha_hora)
  where publico = true and activo = true;

-- 3. updated_at trigger (reuses the shared trigger function)
create trigger eventos_set_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.eventos enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated; make them explicit and minimal.
revoke all on public.eventos from anon, authenticated;
grant select on public.eventos to anon;
grant select, insert, update, delete on public.eventos to authenticated;

-- SELECT (anon): public, active events only.
create policy eventos_select_anon on public.eventos
  for select to anon
  using (publico = true and activo = true);

-- SELECT (authenticated):
--   * any public active event,
--   * any active event of a tenant the caller is a member of (non-pending membership),
--   * every event (including inactive) of a tenant where the caller is admin or trainer.
create policy eventos_select_authenticated on public.eventos
  for select to authenticated
  using (
    (publico = true and activo = true)
    or (
      activo = true
      and tenant_id in (select t.tenant_id from public.get_member_tenants_for_authenticated_user() t)
    )
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

-- INSERT / UPDATE / DELETE: tenant admins and trainers only.
create policy eventos_insert_trainer_admin on public.eventos
  for insert to authenticated
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy eventos_update_trainer_admin on public.eventos
  for update to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  )
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy eventos_delete_trainer_admin on public.eventos
  for delete to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

commit;
```

Notes for the developer:
- Before writing the migration, open the latest definitions of `get_member_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()` (US-0114, `20260916120200_miembros_pendiente_activacion.sql`) and confirm both exclude `pendiente_activacion` memberships and that `get_trainer_or_admin_...` only returns `activo` admin/trainer memberships. If `get_member_tenants_...` still returns inactive/suspended members, that is acceptable for read access (consistent with the rest of the app) — do not introduce a new helper.
- The `update` policy's `with check` prevents moving an event to another tenant.
- `anon` read on joined tables (`disciplinas`, `escenarios`, `usuarios`) is **not** granted here; the anon-facing page is a later phase and will use a view (same approach as `entrenamientos_publicos_view`). The phase 1 admin page reads as `authenticated`.
- No storage policy is added in this phase (no banner upload yet). Phase 2 will add an `orgs/{tenantId}/eventos/...` read policy mirroring `public_training_banner_read`.
- Regenerate Supabase types if the project keeps a generated `database.types.ts`.

---

## API / Server Actions

All functions live in **`src/services/supabase/portal/eventos.service.ts`**, exported as `export const eventosService = { ... }` (same style as `entrenamientosPublicosService`), use the browser client `createClient()` from `@/services/supabase/client`, and translate Postgrest errors through a local `mapServiceError` into `EventoServiceError` (defined in the types file):

| Postgrest code | `EventoServiceError.code` | User-facing message (es) |
|---|---|---|
| `42501` / RLS violation / 0 rows affected on update/delete | `forbidden` | "No tienes permisos para gestionar este evento." |
| `23503` (FK) | `invalid_reference` | "La disciplina, escenario o entrenador seleccionado no existe." |
| `23514` (check) | `invalid_data` | "Los datos del evento no son válidos." |
| `PGRST116` on `getEventoById` | returns `null` (not an error) | — |
| anything else | `unknown` | "No se pudo completar la operación. Intenta de nuevo." |

Auth for every call: the user's session; enforcement is by RLS (policies above). No service-role usage.

### `listEventos(tenantId: string, filters?: EventosListFilters): Promise<EventoListItem[]>`
- `from('eventos').select('*, disciplina:disciplinas(id, nombre), escenario:escenarios(id, nombre), entrenador:usuarios!eventos_entrenador_id_fkey(id, nombre, apellido)')`
- `.eq('tenant_id', tenantId)`; optional `.gte('fecha_hora', filters.desde)` / `.lt('fecha_hora', filters.hasta)` (used by the calendar month range); `.order('fecha_hora', { ascending: true, nullsFirst: false })`.
- Maps rows to `EventoListItem` (camelCase view model with `disciplinaNombre`, `escenarioNombre`, `entrenadorNombre` = trimmed `nombre + ' ' + apellido` or `null`).
- Search, estado, periodo and disciplina filters are applied client-side in the hook (tenant datasets are small); only the date range is server-side.

### `getEventoById(tenantId: string, eventoId: string): Promise<Evento | null>`
- `.eq('tenant_id', tenantId).eq('id', eventoId).maybeSingle()`. Used by phase 2's edit form; implemented now.

### `createEvento(tenantId: string, input: EventoInput): Promise<Evento>`
- Sets `tenant_id = tenantId`, `creado_por = (await supabase.auth.getUser()).data.user.id`.
- Trims `nombre`, normalizes empty strings to `null`, passes `cronograma` / `incluye` / `precio` as arrays (default `[]`).
- `.insert(payload).select('*').single()`.
- Implemented and typed but **not wired to UI** in this phase.

### `updateEvento(tenantId: string, eventoId: string, input: Partial<EventoInput>): Promise<Evento>`
- Never sends `tenant_id`, `creado_por`, `created_at`, `updated_at`.
- `.update(payload).eq('tenant_id', tenantId).eq('id', eventoId).select('*').single()`; a `PGRST116` (no row returned because RLS filtered it) maps to `forbidden`.
- Implemented and typed but **not wired to UI** in this phase.

### `updateEstadoEvento(tenantId: string, eventoId: string, estado: EventoEstado): Promise<Evento>`
- Validates `estado ∈ EVENTO_ESTADOS` client-side before the call (throws `invalid_data` otherwise).
- `.update({ estado }).eq('tenant_id', tenantId).eq('id', eventoId).select('*').single()`.

### `deleteEvento(tenantId: string, eventoId: string): Promise<void>`
- `.delete().eq('tenant_id', tenantId).eq('id', eventoId).select('id')`; if the returned array is empty, throw `forbidden` (RLS silently filters deletes).
- Hard delete. (Phase 3 — tickets — must revisit this: block or soft-delete once an event has tickets.)

Also export `eventosService` from `src/services/supabase/portal/index.ts`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260928120000_eventos.sql` | New `eventos` table, constraints, indexes, `updated_at` trigger, RLS policies |
| Types | `src/types/portal/eventos.types.ts` | New: `EventoEstado` (`'confirmado' \| 'cancelado'`), `EVENTO_ESTADOS`, `EVENTO_ESTADO_LABELS` (`Confirmado`, `Cancelado`), `Evento` (DB row), `EventoInput`, `EventoListItem`, `EventosListFilters` (`desde?`, `hasta?`), `EventosVista` (`'tarjetas' \| 'lista' \| 'calendario'`), `EventosPeriodo` (`'proximos' \| 'pasados' \| 'todos'`), `EventosClientFilters`, `EventoServiceError` (class with `code`). Re-use `CronogramaItem`, `IncluyeItem`, `PrecioItem` via `import type` from `entrenamientos-publicos.types.ts` (do not duplicate). |
| Service | `src/services/supabase/portal/eventos.service.ts` | New `eventosService` with `listEventos`, `getEventoById`, `createEvento`, `updateEvento`, `updateEstadoEvento`, `deleteEvento` |
| Service | `src/services/supabase/portal/index.ts` | Export `eventosService` |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | New: loads events + disciplines for the tenant, exposes `eventos`, `filteredEventos`, `stats`, `loading`, `error`, `reload`, filter state + setters, `clearFilters` |
| Hook | `src/hooks/portal/gestion-eventos/useEventosVista.ts` | New: reads/writes `?vista=` via `useSearchParams` / `useRouter().replace`, falls back to `tarjetas` |
| Hook | `src/hooks/portal/gestion-eventos/useEventosCalendar.ts` | New: month state (`America/Bogota`), `monthLabel`, `monthStartDate`, prev/next, `selectedDateKey`, fetches the month range through `eventosService.listEventos` with `desde`/`hasta`, groups events by date key, counts undated events |
| Hook | `src/hooks/portal/gestion-eventos/useCambiarEstadoEvento.ts` | New: `{ isSubmitting, error, confirmar(estado) }`, calls `updateEstadoEvento`, invokes `onSuccess` |
| Hook | `src/hooks/portal/gestion-eventos/useEliminarEvento.ts` | New: same shape as `useEliminarSuscripcion`, calls `deleteEvento` |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | New `'use client'` page component: header, toolbar, stats, active view, modals orchestration, `onNuevo` / `onEditar` seams |
| Component | `src/components/portal/gestion-eventos/EventosToolbar.tsx` | New: view switcher (radiogroup), search, estado, periodo, disciplina filters |
| Component | `src/components/portal/gestion-eventos/EventosStatsCards.tsx` | New: Total / Próximos confirmados / Cancelados |
| Component | `src/components/portal/gestion-eventos/EventosGrid.tsx` | New: responsive card grid + skeleton |
| Component | `src/components/portal/gestion-eventos/EventoCard.tsx` | New: card modeled on `PublicTrainingCard` |
| Component | `src/components/portal/gestion-eventos/EventosTable.tsx` | New: list view modeled on `SuscripcionesTable`, with pagination |
| Component | `src/components/portal/gestion-eventos/EventosCalendar.tsx` | New: month grid modeled on `EntrenamientosCalendar` + selected-day list |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | New: kebab menu (Editar, Cancelar/Confirmar evento, Eliminar) |
| Component | `src/components/portal/gestion-eventos/EventoEstadoBadge.tsx` | New: `GritBadge` — Confirmado (success tone), Cancelado (danger tone) |
| Component | `src/components/portal/gestion-eventos/CambiarEstadoEventoModal.tsx` | New: confirmation modal for estado change |
| Component | `src/components/portal/gestion-eventos/EliminarEventoModal.tsx` | New: delete confirmation modal modeled on `EliminarSuscripcionModal` |
| Component | `src/components/portal/gestion-eventos/EventoProximamenteModal.tsx` | New: informational modal used by "Nuevo evento" and "Editar" in phase 1 |
| Component | `src/components/portal/gestion-eventos/index.ts` | New barrel exporting `GestionEventosPage` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` | Replace empty placeholder with the server page (same shape as `gestion-suscripciones/page.tsx`) rendering `<GestionEventosPage tenantId={tenantId} />` |
| Navigation | `src/types/portal.types.ts` | Add `{ label: 'Eventos', path: 'gestion-eventos', icon: 'event' }` to `ROLE_TENANT_ITEMS.administrador` after *Entrenamientos* |
| Docs | `projectspec/03-project-structure.md` | Add `gestion-eventos` feature slice to the directory tree and the `eventos` table to the data model notes |

---

## Acceptance Criteria

**Database & RLS**
1. After applying the migration, `public.eventos` exists with every column listed in *Database Changes*, including the requested defaults (`estado = 'confirmado'`, `activo = true`, `publico = true`, `omitir_confirmacion_compra = false`, `cronograma = '[]'`, `incluye = '[]'`).
2. Inserting `estado = 'pendiente'` fails with a check-constraint violation; `cupo_maximo = 0`, `duracion_minutos = 0`, a negative antelación, or a non-array `cronograma`/`incluye`/`precio` also fail.
3. Updating any column changes `updated_at`.
4. As `anon`, `select * from eventos` returns only rows with `publico = true and activo = true`.
5. As an authenticated user with no membership in tenant T, only T's `publico = true and activo = true` events are returned.
6. As an active member (role *usuario*) of T, all active events of T are returned, including `publico = false`; inactive events are not.
7. As an admin or trainer of T, all events of T are returned, including `activo = false`.
8. As an admin or trainer of T, insert / update / delete on T's events succeed; as a member with role *usuario*, as a non-member, as `anon`, or as a user whose membership is `pendiente_activacion`, they fail (insert raises an RLS error; update/delete affect 0 rows and the service throws `forbidden`).
9. An admin of T cannot update an event of T to `tenant_id = U` (another tenant), even if they are admin of U.
10. Deleting a `disciplinas` row referenced by an event is rejected; deleting a referenced `escenarios` row or `usuarios` (trainer) row sets the event's column to `null`; deleting the tenant deletes its events.

**Page & navigation**
11. A tenant admin sees an "Eventos" item in the tenant menu, right after "Entrenamientos", linking to `/portal/orgs/{tenantId}/gestion-eventos`.
12. A trainer or athlete who navigates directly to that URL is redirected to `/portal/orgs/{tenantId}` (existing `(administrador)` layout behavior).
13. The page shows a single `h1` "Eventos", the "Nuevo evento" button, the toolbar, and the stats row.

**Views**
14. With no `?vista` param the cards view is shown; selecting *Lista* or *Calendario* switches the view without a full reload and updates the URL to `?vista=lista` / `?vista=calendario`; reloading the page keeps the selected view; `?vista=foo` falls back to cards.
15. The view switcher is keyboard operable (Tab to focus, Arrow keys to move, Enter/Space to select) and announces the selected option (`aria-checked`).
16. Cards view: each card shows banner or placeholder, name, discipline, date/time in `America/Bogota` (or "Fecha por definir"), location (escenario or punto de encuentro), trainer (if any), capacity ("Cupo ilimitado" when null), price summary ("Gratis" when `precio = []`), estado badge, and a *Privado* tag when `publico = false`.
17. List view: shows the columns Evento, Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad, Estado, Acciones; paginates at 20 rows; collapses to stacked rows below `md`.
18. Calendar view: shows the current month (Bogotá time) with events on the correct day (an event at 2026-10-01 01:00 UTC appears on Sept 30); prev/next navigation loads the corresponding month; clicking a day lists that day's events with their actions; undated events are counted under the calendar.
19. Search, Estado, Periodo and Disciplina filters combine (AND) in cards and list views; *Próximos* is the default periodo and includes undated events; "Limpiar filtros" resets all filters to defaults.
20. Stats cards show correct counts for Total, Próximos confirmados and Cancelados, regardless of the active filters.

**Actions**
21. "Nuevo evento" and "Editar" open an informational modal stating the feature is coming soon; no data changes.
22. On a *Confirmado* event, the actions menu offers "Cancelar evento"; confirming sets `estado = 'cancelado'`, closes the modal, and the event re-renders with the *Cancelado* badge in the current view.
23. On a *Cancelado* event, the menu offers "Confirmar evento"; confirming sets `estado = 'confirmado'`.
24. "Eliminar" opens a confirmation modal showing the event name and date; confirming deletes the row and the event disappears from all views and stats; cancelling makes no change.
25. While a status change or delete is in flight, the confirm button shows a loading state and is disabled, and `Escape` does not close the modal.
26. If a status change or delete fails (e.g. network error or RLS denial), the modal stays open and shows the mapped Spanish error message inline; the list is not modified.

**States**
27. While loading, the active view shows skeletons.
28. If loading fails, an error state with "Reintentar" is shown, and clicking it re-fetches.
29. A tenant with no events sees the "Aún no hay eventos" empty state with a "Nuevo evento" button; a tenant whose filters match nothing sees "No hay eventos que coincidan con los filtros" with "Limpiar filtros".

**Isolation**
30. No existing file related to `entrenamientos`, `entrenamientos_publicos`, or `EntrenamientosCalendar` changes behavior; `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Verify the current definitions of `get_member_tenants_for_authenticated_user()` and `get_trainer_or_admin_tenants_for_authenticated_user()` (US-0114)
- [ ] Create `supabase/migrations/20260928120000_eventos.sql` and apply it locally
- [ ] Verify RLS manually in SQL (anon, non-member, member *usuario*, trainer, admin, pending member) — criteria 4–10
- [ ] Create `src/types/portal/eventos.types.ts`
- [ ] Create `src/services/supabase/portal/eventos.service.ts` and export it from `index.ts`
- [ ] Create hooks in `src/hooks/portal/gestion-eventos/` (`useGestionEventos`, `useEventosVista`, `useEventosCalendar`, `useCambiarEstadoEvento`, `useEliminarEvento`)
- [ ] Build shared pieces: `EventoEstadoBadge`, `EventoActionsMenu`, modals (`CambiarEstadoEventoModal`, `EliminarEventoModal`, `EventoProximamenteModal`)
- [ ] Build `EventosToolbar` and `EventosStatsCards`
- [ ] Build views: `EventoCard` + `EventosGrid`, `EventosTable`, `EventosCalendar`
- [ ] Build `GestionEventosPage` and barrel `index.ts`
- [ ] Replace the empty `gestion-eventos/page.tsx` with the server page
- [ ] Add the "Eventos" menu item for administrators
- [ ] Seed a few events locally (public/private, confirmed/cancelled, dated/undated, past/future, with/without escenario and trainer) and test all views, filters, and actions
- [ ] Test edge cases: empty tenant, filters with no match, failed delete (revoke permission / offline), direct URL access as trainer and athlete
- [ ] Run `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**:
  - RLS is the only enforcement layer for data; policies as specified above (anon → public+active; members → active; admin/trainer → all + write).
  - All service queries are additionally scoped with `.eq('tenant_id', tenantId)` so a crafted `eventoId` from another tenant is never touched.
  - `updateEvento` never sends `tenant_id` or `creado_por`; `createEvento` sets `creado_por` from the session, never from input.
  - The page is gated server-side by the existing `(administrador)` layout.
  - No service-role client is used anywhere in this feature.
- **Performance**:
  - `idx_eventos_tenant_fecha_hora` backs the per-tenant list and the calendar month-range query.
  - `idx_eventos_publicos_fecha_hora` (partial) is prepared for the future public listing.
  - List view uses client-side pagination (20 rows); the whole tenant dataset is loaded once per visit (expected < a few hundred events per tenant). If a tenant exceeds 500 events, move filters and pagination server-side (note as tech debt, not in scope).
  - Search input is debounced (250 ms); derived lists are memoized.
- **Accessibility**:
  - View switcher: `role="radiogroup"` with `aria-label="Vista de eventos"`, arrow-key navigation.
  - Actions menu: button with `aria-haspopup="menu"` / `aria-expanded`, items with `role="menuitem"`, `Escape` closes and returns focus to the trigger.
  - Modals: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moved into the dialog on open, `Escape` to close.
  - Calendar day cells are buttons with an `aria-label` such as "30 de septiembre, 2 eventos"; cancelled events are indicated by text (badge / "Cancelado"), not only by strikethrough or color.
  - Every icon-only button has an `aria-label`.
- **Error handling**:
  - Services throw `EventoServiceError` with a mapped Spanish message; hooks store `error: string | null`.
  - Load errors → full error state with "Reintentar"; action errors → inline message inside the modal (the project has no toast system — do not add one).
  - Unexpected errors are logged with `console.error` in the hook before being surfaced.
