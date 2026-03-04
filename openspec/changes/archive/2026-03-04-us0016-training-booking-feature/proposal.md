## Why

Athletes currently have no way to reserve a spot in a training session from within the app — bookings must be handled manually outside the system. Adding booking management directly inside the existing `gestion-entrenamientos` module closes this gap and enables trainers and administrators to track attendance capacity in real time.

## What Changes

- **New sub-feature slice `reservas`** nested under the `entrenamientos` feature slice (components → hooks → service → types).
- **New `ReservasPanel`** embedded in `EntrenamientosPage`: appears when a training is selected and shows the booking list for that training.
- **New `ReservaFormModal`**: supports create (self-book for atleta; on-behalf for entrenador/administrador) and edit (status change + notes).
- **New `reservas.service.ts`**: all Supabase CRUD for `reservas` table, joining `usuarios` to return enriched views.
- **New `reservas.types.ts`**: domain interfaces (`Reserva`, `ReservaView`, `CreateReservaInput`, `UpdateReservaInput`, `ReservaCapacidad`).
- **Modified `EntrenamientosPage`**: adds training selection state and renders `ReservasPanel`; adds capacity indicator to training cards/events.
- **Modified `useEntrenamientos`**: exposes `selectedEntrenamientoId` state and setter.
- **Modified `entrenamientos.types.ts`**: enriches `EntrenamientoView` with `reservas_activas` count.
- **New RLS migration** `supabase/migrations/*_reservas_rls_policies.sql`: SELECT / INSERT / UPDATE / DELETE policies for `public.reservas`.
- **New DB index migration** `supabase/migrations/*_reservas_indexes.sql`: index on `(tenant_id, entrenamiento_id)` for `reservas`.

## Capabilities

### New Capabilities

- `training-booking`: Full booking lifecycle for training sessions — role-scoped create, view, edit, cancel, and delete of reservations (`reservas`), capacity validation against `cupo_maximo`, and capacity indicator on training cards. Covers the `reservas` service, hooks, components, types, and RLS policies.

### Modified Capabilities

- `training-management`: The training overview UI gains a booking panel (shown on training selection) and a capacity indicator per training card/event. The `EntrenamientoView` type is enriched with `reservas_activas`. These are spec-level behavior additions to the existing training management capability.

## Impact

**Code**
- `src/components/portal/entrenamientos/` — adds `reservas/` sub-folder; modifies `EntrenamientosPage.tsx` and `index.ts`
- `src/hooks/portal/entrenamientos/` — adds `reservas/` sub-folder; modifies `useEntrenamientos.ts`
- `src/services/supabase/portal/` — adds `reservas.service.ts`
- `src/types/portal/` — adds `reservas.types.ts`; modifies `entrenamientos.types.ts`

**Database**
- New RLS policies on `public.reservas` (SELECT, INSERT, UPDATE, DELETE)
- New index on `public.reservas(tenant_id, entrenamiento_id)`
- No schema changes — `reservas` and `asistencias` tables already exist

**Dependencies**
- No new npm packages required
- Requires Supabase local instance running (`npx supabase start`)

**Non-goals**
- Attendance tracking (`asistencias` table) is out of scope for this change
- Subscription class credit decrement (`suscripciones.clases_restantes`) is out of scope
- No new routes or pages — feature is embedded in the existing `gestion-entrenamientos` page
- Push/email notifications for booking confirmations are out of scope
- Waitlist functionality is out of scope

## Implementation Plan (page → component → hook → service → types)

1. **Types** — Create `reservas.types.ts`; extend `entrenamientos.types.ts`
2. **Service** — Create `reservas.service.ts` with all CRUD + capacity query
3. **Hooks** — Create `useReservas.ts` and `useReservaForm.ts`
4. **Components** — Create `ReservaStatusBadge`, `ReservasPanel`, `ReservaFormModal`; update `EntrenamientosPage`, capacity indicator on calendar/cards
5. **DB** — Write and apply RLS + index migrations
6. **Barrel exports** — Update `index.ts` files
