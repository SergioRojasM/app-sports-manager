## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/us0016-training-booking-feature`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migrations

- [x] 2.1 Create `supabase/migrations/20260302000200_reservas_rls_policies.sql` with SELECT, INSERT, UPDATE, and DELETE RLS policies for `public.reservas` — SELECT allows tenant members (atleta sees own rows only; entrenador/administrador sees all); INSERT restricted to own `atleta_id` unless role is entrenador/administrador; UPDATE and DELETE restricted to entrenador/administrador
- [x] 2.2 Create `supabase/migrations/20260302000300_reservas_indexes.sql` with a composite index on `public.reservas(tenant_id, entrenamiento_id)`
- [x] 2.3 Run `npx supabase db reset` and verify both migrations apply cleanly with no errors

## 3. Types

- [x] 3.1 Create `src/types/portal/reservas.types.ts` with `ReservaEstado` union, `Reserva`, `ReservaView` (with `atleta_nombre`, `atleta_apellido`, `atleta_email`), `CreateReservaInput`, `UpdateReservaInput`, and `ReservaCapacidad` interfaces
- [x] 3.2 Add `reservas_activas?: number` field to `TrainingInstance` type in `src/types/portal/entrenamientos.types.ts`

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/reservas.service.ts` exporting a `reservasService` plain object
- [x] 4.2 Implement `getByEntrenamiento(tenantId, entrenamientoId)` — queries `reservas` joined with `usuarios` returning `ReservaView[]`, filtered by tenant
- [x] 4.3 Implement `getMyReserva(tenantId, entrenamientoId, atletaId)` — returns the current user's single non-cancelled booking or null
- [x] 4.4 Implement `getCapacidad(tenantId, entrenamientoId)` — returns `ReservaCapacidad` with `reservas_activas` count (excluding `cancelada`) and `disponible` boolean
- [x] 4.5 Implement `create(input: CreateReservaInput)` — performs capacity check (throws `ReservaServiceError('capacity_exceeded')` if full), duplicate check, then inserts with `estado = 'pendiente'` and `fecha_reserva = now()`
- [x] 4.6 Implement `update(id, tenantId, input: UpdateReservaInput)` — updates `estado` and/or `notas`; sets `fecha_cancelacion = now()` when `estado = 'cancelada'`
- [x] 4.7 Implement `cancel(id, tenantId)` — sets `estado = 'cancelada'` and `fecha_cancelacion = now()`
- [x] 4.8 Implement `deleteReserva(id, tenantId)` — hard deletes, only allowed when service verifies `estado` is `pendiente` or `cancelada`
- [x] 4.9 Define and export a typed `ReservaServiceError` class (similar to `TrainingServiceError`) with error code variants: `capacity_exceeded`, `duplicate_booking`, `invalid_estado`, `not_found`, `unknown`

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/entrenamientos/reservas/useReservas.ts` accepting `{ tenantId, entrenamientoId, role }` — loads bookings via `reservasService`, exposes `reservas`, `capacidad`, `isLoading`, `error`, `createReserva`, `updateReserva`, `cancelReserva`, `deleteReserva`, and `refresh`
- [x] 5.2 Implement optimistic state updates in `useReservas` for `cancelReserva` and `deleteReserva` with rollback on error
- [x] 5.3 Create `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts` — manages form state for `ReservaFormModal` (atleta picker, notes); validates capacity and duplicate before submit; exposes `form`, `isSubmitting`, `error`, `submitCreate`, `submitUpdate`, `reset`
- [x] 5.4 Modify `src/hooks/portal/entrenamientos/useEntrenamientos.ts` to enrich each `TrainingInstance` with `reservas_activas` count (via join/subquery in the fetch, not N+1); expose `selectedInstanceId: string | null` and `setSelectedInstanceId` in the hook return type

## 6. Components

- [x] 6.1 Create `src/components/portal/entrenamientos/reservas/ReservaStatusBadge.tsx` — renders a colored badge for `pendiente` (yellow), `confirmada` (blue), `cancelada` (gray), `completada` (green)
- [x] 6.2 Create `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — modal for create and edit modes; atleta picker (filtered to tenant atletas) shown only for entrenador/administrador; notes textarea; validation error display
- [x] 6.3 Create `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` — slide-over panel showing booking list for selected training; role-aware: atleta sees own booking + "Reservar" CTA; entrenador/administrador sees all bookings + capacity indicator + "Nueva reserva" + edit/cancel/delete per row; uses `useReservas`
- [x] 6.4 Create `src/components/portal/entrenamientos/reservas/index.ts` with barrel exports for `ReservasPanel`, `ReservaFormModal`, `ReservaStatusBadge`
- [x] 6.5 Modify `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` — add a "Ver reservas" button that calls an `onViewReservas?: () => void` prop; existing edit/delete actions must remain unchanged
- [x] 6.6 Modify `src/components/portal/entrenamientos/EntrenamientosPage.tsx` — wire `selectedInstanceId` from `useEntrenamientos`; add state to track when `ReservasPanel` is active; render `ReservasPanel` when a training is selected and the "Ver reservas" action is triggered; pass `onViewReservas` handler to `EntrenamientoActionModal`
- [x] 6.7 Add capacity indicator pill to training cards in `EntrenamientosCalendar` and/or `EntrenamientosList` — green < 70%, yellow 70–99%, red = full; no color signal when `cupo_maximo` is null
- [x] 6.8 Modify `src/components/portal/entrenamientos/index.ts` — export `ReservasPanel` and sub-module barrel from `reservas/index.ts`

## 7. Refresh After Mutations

- [x] 7.1 After any booking mutation (create, cancel, delete, update) inside `useReservas`, call `refresh()` to re-fetch the training instance list so `reservas_activas` counts update on cards

## 8. Documentation Update

- [x] 8.1 Update `projectspec/03-project-structure.md` to document the new `reservas/` sub-feature slice under the `entrenamientos` feature slice in the directory structure, components, hooks, and services sections

## 9. QA Verification

- [x] 9.1 Manual QA — atleta role: book available training → verify `pendiente` state; attempt double-book → blocked; cancel own booking → state becomes `cancelada`
- [x] 9.2 Manual QA — entrenador role: create booking on behalf of athlete; confirm booking; mark as completed (only for past training); delete a `cancelada` booking after confirmation dialog
- [x] 9.3 Manual QA — capacity: fill training to `cupo_maximo`; verify "Reservar" button disabled for atleta and capacity indicator shows red; cancel one booking; verify button re-enables and counter updates
- [x] 9.4 Manual QA — cross-tenant: verify no bookings from another tenant are visible or mutable

## 10. Commit and Pull Request

- [x] 10.1 Stage all changes and create a commit with message: `feat(reservas): add training booking feature (US-0016) — ReservasPanel, useReservas, reservasService, RLS migrations, capacity indicator`
- [x] 10.2 Push branch and open a Pull Request with the following description:

  **Title:** `feat: Training Booking Feature (US-0016)`

  **Summary:**
  Adds booking management (`reservas`) as a sub-feature slice inside the existing `gestion-entrenamientos` module. Athletes can self-book and cancel; trainers and administrators have full CRUD with on-behalf booking and status management.

  **Changes:**
  - New `training-booking` feature slice: `reservas.types.ts`, `reservas.service.ts`, `useReservas`, `useReservaForm`, `ReservasPanel`, `ReservaFormModal`, `ReservaStatusBadge`
  - `EntrenamientosPage` updated with booking panel trigger and capacity indicators
  - `useEntrenamientos` enriches instances with `reservas_activas` count
  - Two new migrations: RLS policies + index on `reservas(tenant_id, entrenamiento_id)`
  - `projectspec/03-project-structure.md` updated

  **Testing:** Manual QA scenarios in tasks 9.1–9.4
