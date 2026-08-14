# US-0106 — Skip Plan Confirmation on Public Training Publish

## ID
US-0106

## Name
Optional "skip plan confirmation" toggle when publishing a public training, allowing bookings to proceed as pending alongside a pending plan request

## As a
Trainer/administrator publishing a training to the public marketplace

## I Want
An option, shown when publishing a training as public, to let athletes who lack the required plan/service still book the training — creating the reservation in a pending state together with a pending plan purchase request — instead of the booking being fully blocked until they buy a plan and wait for approval

## So That
Interested athletes don't lose the opportunity to reserve a spot while their plan request is reviewed, and I can decide, publication by publication, whether that flexibility makes sense for a given training

---

## Description

### Current State

- Publishing a public training uses `PublicarEntrenamientoModal.tsx` →
  `usePublicarEntrenamiento.ts` → `entrenamientosPublicosService.publicarEntrenamiento`
  (`src/services/supabase/portal/entrenamientos-publicos.service.ts:135-210`),
  which upserts a row into `entrenamientos_publicos`. The only editable
  fields today are `nombre`, `descripcion`, `precio`, and the banner image
  (`EntrenamientoPublicoFormValues`, `src/types/portal/entrenamientos-publicos.types.ts:34-38`).
  Access requirements (plan/service, membership status, discipline level)
  are configured separately, per training, in `entrenamiento_restricciones`
  rows (via `EntrenamientoRestriccionesSection.tsx`), evaluated at booking
  time — publishing only validates them, never sets them.

- Booking a public training runs `reservasService.validateBookingRestrictions`
  (`src/services/supabase/portal/reservas.service.ts:297-500`) as a
  pre-flight check in `usePublicTrainingReserva.openBooking()`
  (`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts:126-158`)
  and again, authoritatively, inside `reservasService.create()`
  (`reservas.service.ts:684-906`), which calls the `SECURITY DEFINER` RPC
  `book_and_deduct_service_units`.

- When the athlete lacks a required service/plan, the check returns
  `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`
  (`src/types/portal/entrenamiento-restricciones.types.ts:81-96`). The
  booking UI (`PublicTrainingReservaModal.tsx:149-213`) shows a blocking
  "No puedes reservar todavía" dialog with a "Ver planes de {tenant}" button
  that opens `PlanesPublicosModal` (pre-filtered by the missing service
  name via `bookingRejection.servicioNombre`). Selecting a plan there runs
  `useSuscripcion.submit()` (`src/hooks/portal/planes/useSuscripcion.ts:106-203`),
  which creates a `suscripciones` row (`estado: 'pendiente'`) and a `pagos`
  row (`estado: 'pendiente'`) — **and stops there**. The booking is never
  created; the athlete must return later, after an admin approves the plan,
  and book again from scratch.

- `book_and_deduct_service_units` (latest version in
  `supabase/migrations/20260729184000_formulario_respuestas_perfil_snapshot.sql:13-251`)
  always inserts the `reservas` row with `estado` hardcoded to `'confirmada'`
  — there is no parameter to request any other value, and no code path in
  the app ever produces `reservas.estado = 'pendiente'` today, even though
  `'pendiente'` is already a legal value per `reservas_estado_ck`
  (`supabase/migrations/20260221000100_migracion_inicial_bd.sql:330`) and
  per `ReservaEstado` (`src/types/portal/reservas.types.ts:1`).

- `reservas.suscripcion_id` (nullable `uuid`, FK to `suscripciones.id`,
  `supabase/migrations/20260319000200_deduct_classes_on_booking.sql:6-9`)
  exists but is never populated by `book_and_deduct_service_units`.

- Admin review of pending plan requests already exists and needs no new
  screens for the "pending" side: `ValidarSuscripcionModal.tsx` /
  `useValidarSuscripcion.ts` (Approve pendiente→activa, or Cancel→cancelada)
  and `ValidarPagoModal.tsx` / `useValidarPago.ts` (Aprobar/Rechazar a
  pago). Today, rejecting a pago is a single click with **no reason
  captured** — `pagos` has no comment/reason column at all — and the reason
  is never shown to the athlete. `PagoCard.tsx`
  (`src/components/portal/mis-suscripciones/PagoCard.tsx`) already lets the
  athlete "Resubir comprobante" on a `rechazado` pago via
  `useSubirComprobante.ts` → `pagosService.updateComprobantePath`
  (`src/services/supabase/portal/pagos.service.ts:31-40`) — but that
  function only updates `comprobante_path`; it never resets `pagos.estado`
  back to `pendiente`, so a resubmitted proof is silently stuck as
  `rechazado` today.

- Neither `reservas.estado` nor `suscripciones.estado` have a `'rechazada'`/
  rejection-distinct-from-cancellation value today. Nothing links a
  rejected/cancelled `suscripcion` back to any `reservas` row (the two
  flows are entirely disconnected, since no reservation is ever created
  alongside a pending subscription today).

### Proposed Changes

**1. Publish-time toggle.** Add a boolean `omitir_confirmacion_plan` to
`entrenamientos_publicos`, editable from `PublicarEntrenamientoModal.tsx` as
a checkbox labeled "Omitir confirmación de plan", following the same
pattern as the `tenants.requiere_perfil_completo` checkbox in
`EditTenantForm.tsx:212-227`. Default `false` — today's blocking behavior
is unchanged unless a trainer/admin explicitly opts in per publication.

**2. Booking proceeds as pending.** When a booking is rejected with
`SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` AND the public training has
`omitir_confirmacion_plan = true`:
- All other restriction checks (timing, membership status, discipline
  level), capacity, duplicate-booking, and per-category-capacity checks
  still apply exactly as today — **only** the plan/service requirement is
  bypassed.
- The athlete is guided through the existing plan catalog/purchase UI
  (`PlanesPublicosModal` → `SuscripcionModal` → `useSuscripcion.submit()`),
  which still creates `suscripciones` (`pendiente`) + `pagos` (`pendiente`)
  exactly as today.
- Immediately after that purchase succeeds, the athlete is taken into the
  normal booking form (category/notes/attached form, same as any booking)
  and, on submit, a `reservas` row is created with `estado = 'pendiente'`
  and `suscripcion_id` pointing at the just-created subscription — instead
  of being blocked.
- The server independently re-verifies `entrenamientos_publicos.omitir_confirmacion_plan`
  for the target training before allowing this path (never trusts a raw
  client-supplied flag alone), so a tampered client request cannot bypass
  the plan requirement on a training that isn't configured for it.

**3. Approval auto-confirms the linked booking.** When an admin approves
the pending suscripción/pago, any `reservas` row(s) linked via
`suscripcion_id` that are still `pendiente` are automatically confirmed
(estado → `confirmada`) and the corresponding service unit(s) deducted, the
same way a normal booking would be. If units turn out to be insufficient at
approval time (edge case), the reservation is left `pendiente` for manual
handling.

**4. Rejection with a visible reason, and a new `rechazada` reservation
state.** Rejecting a pago now requires the admin to enter a reason
(`motivo_rechazo`), stored on `pagos` and shown to the athlete on
`PagoCard.tsx`. Any `reservas` row(s) still `pendiente` and linked via
`suscripcion_id` are moved to a new `rechazada` state with the same
`motivo_rechazo` copied onto the reservation, so the athlete can see why
directly from their reservations view. Cancelling a still-`pendiente`
suscripción from `ValidarSuscripcionModal` (the only other terminal-reject
path for a pending request) cascades the same way. The athlete resolves a
rejected payment through the existing "Resubir comprobante" flow (fixed so
resubmission resets `pagos.estado` back to `pendiente` for re-review); if
that plan request is eventually approved, the athlete must submit a **new**
booking — a `rechazada` reservation is never resurrected automatically.

**5. No change to today's default flow.** With
`omitir_confirmacion_plan = false` (the default, and the only option
available before this US), booking behavior for a missing plan/service is
unchanged: fully blocked until the athlete buys the plan and it's approved,
then re-books manually.

---

## Database Changes

New migration file `supabase/migrations/{timestamp}_omitir_confirmacion_plan.sql`:

```sql
-- 1. Publish-time toggle
alter table public.entrenamientos_publicos
  add column omitir_confirmacion_plan boolean not null default false;

-- 2. New reservas states + rejection reason
alter table public.reservas drop constraint reservas_estado_ck;
alter table public.reservas
  add constraint reservas_estado_ck
    check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'rechazada'));
alter table public.reservas
  add column motivo_rechazo text null;

-- 3. Payment rejection reason
alter table public.pagos
  add column motivo_rechazo text null;

-- 4. book_and_deduct_service_units — allow inserting as 'pendiente' and
--    linking a suscripcion_id even without a deduction. CREATE OR REPLACE
--    the full function body from
--    20260729184000_formulario_respuestas_perfil_snapshot.sql, adding:
--      p_permitir_pendiente boolean default false,
--      p_suscripcion_id uuid default null
--    and using them in the reservas insert:
--      estado => case when p_permitir_pendiente then 'pendiente' else 'confirmada' end,
--      suscripcion_id => p_suscripcion_id
--    (currently omitted from the insert's column list entirely). Keep
--    `security definer`, `set search_path = public`, and all existing
--    validation/deduction logic unchanged for the p_permitir_pendiente = false
--    (default) path.

-- 5. New SECURITY DEFINER function: confirm on approval
create or replace function public.confirm_pending_reservas_for_suscripcion(
  p_suscripcion_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
-- For each reservas row with suscripcion_id = p_suscripcion_id and
-- estado = 'pendiente' (ordered by created_at), resolve the training's
-- matching restriction row and required servicio(s) the same way
-- book_and_deduct_service_units does, attempt the same
-- validate-then-deduct sequence (insert into reserva_servicios,
-- decrement suscripcion_servicios.unidades_restantes when finite), and
-- set estado = 'confirmada' on success. If units are insufficient, leave
-- the row 'pendiente' and continue to the next one (do not raise).
$$;

-- 6. New SECURITY DEFINER function: reject cascades to bookings
create or replace function public.reject_pending_reservas_for_suscripcion(
  p_suscripcion_id uuid,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
-- update public.reservas set estado = 'rechazada', motivo_rechazo = p_motivo
-- where suscripcion_id = p_suscripcion_id and estado = 'pendiente';
$$;
```

No new RLS policies are required:
- `reservas_insert_authenticated`/update policies
  (`supabase/migrations/20260727010000_entrenamientos_publicos_sync_visibilidad.sql:108-126`,
  `20260302000200_reservas_rls_policies.sql:88-105`) have no condition on
  `estado`/`suscripcion_id`, and all writes described above go through
  `SECURITY DEFINER` functions anyway, which bypass caller-context RLS.
- `suscripciones_insert_own` / `pagos_insert_own` already permit the
  athlete's own `pendiente` inserts (unchanged, already exercised by
  today's "Ver planes" flow).

**Existing queries that must treat `'rechazada'` the same as `'cancelada'`**
(exclude from active-reservation counts / duplicate-booking checks):
- `reservas.service.ts` category capacity count (`.neq('estado', 'cancelada')`, ~line 847)
- `getCapacidad` active-reservation count
- `getMyReserva` (duplicate-booking check)
- Any other `.neq('estado', 'cancelada')` / `.in('estado', [...])` filter over `reservas` found during implementation (grep for `'cancelada'` across `reservas.service.ts`, `inicio.service.ts`).

---

## API / Server Actions

All changes are Supabase-client service functions (no Next.js API routes in
this codebase — see `03-project-structure.md`).

- **`src/services/supabase/portal/entrenamientos-publicos.service.ts`**
  - `publicarEntrenamiento(input: PublicarEntrenamientoInput)`: include
    `omitir_confirmacion_plan: input.omitirConfirmacionPlan` in `commonPatch`
    (line ~160-176).
  - `listPublicTrainings()`: select `omitir_confirmacion_plan`, map to
    `omitirConfirmacionPlan` on `PublicTrainingListItem`.
  - `listPublicTrainingsForLanding()`: map `omitirConfirmacionPlan: false`
    (anonymous landing page never books).

- **`src/services/supabase/portal/reservas.service.ts`**
  - `create(input: CreateReservaInput): Promise<Reserva | BookingResult>`
    (line 684-906): when the restriction check returns
    `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` and
    `input.permitir_pendiente_sin_plan` is `true`, query
    `entrenamientos_publicos` for `(entrenamiento_id, tenant_id)` with
    `activo = true` and re-verify `omitir_confirmacion_plan = true` before
    proceeding; if not true, return the original `BookingResult` rejection
    unchanged. On success, call the RPC with
    `p_permitir_pendiente: true, p_suscripcion_id: input.plan_pendiente_suscripcion_id ?? null`.
    All other steps (capacity, duplicate, per-category capacity, formulario)
    remain unconditional.

- **`src/services/supabase/portal/gestion-suscripciones.service.ts`**
  - `updatePagoEstado(pagoId, 'rechazado', motivo: string)`: persist
    `motivo_rechazo` on the `pagos` row; after the update succeeds, fetch
    the pago's `suscripcion_id` and call RPC
    `reject_pending_reservas_for_suscripcion(suscripcion_id, motivo)`.
  - `updateSuscripcionEstado(id, 'cancelar', adminUserId)`: when the
    suscripción being cancelled was `pendiente`, also call
    `reject_pending_reservas_for_suscripcion(id, <generic motivo>)`.
  - Approval path (wherever `suscripciones.estado` is set to `activa`,
    reached from `useValidarSuscripcion.approve()`): after the update
    succeeds, call RPC
    `confirm_pending_reservas_for_suscripcion(suscripcion_id)`.

- **`src/services/supabase/portal/pagos.service.ts`**
  - `updateComprobantePath(supabase, pagoId, path)` (line 31-40): also
    reset `estado` to `'pendiente'` (and clear `motivo_rechazo`) so a
    resubmitted proof re-enters the review queue — fixes the existing gap
    where a rejected pago never returns to `pendiente` after re-upload.

All new/changed functions run under the caller's session via the browser
Supabase client (`createClient()`), consistent with the rest of this
service layer; the two new SQL functions are `SECURITY DEFINER` so they can
write `reservas`/`reserva_servicios`/`suscripcion_servicios` rows the
calling athlete/admin doesn't have direct RLS write access to, matching the
existing pattern used by `book_and_deduct_service_units`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_omitir_confirmacion_plan.sql` | New column on `entrenamientos_publicos`, `reservas` estado constraint + `motivo_rechazo`, `pagos.motivo_rechazo`, `book_and_deduct_service_units` CREATE OR REPLACE, two new SECURITY DEFINER functions |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | `omitir_confirmacion_plan`/`omitirConfirmacionPlan` on `EntrenamientoPublico`, `PublicarEntrenamientoInput`, `EntrenamientoPublicoFormValues`, `PublicTrainingListItem` |
| Types | `src/types/portal/reservas.types.ts` | `ReservaEstado` adds `'rechazada'`; `Reserva.motivo_rechazo`; `CreateReservaInput.permitir_pendiente_sin_plan` / `plan_pendiente_suscripcion_id` |
| Types | `src/types/portal/pagos.types.ts` / `src/types/portal/gestion-suscripciones.types.ts` | Add `motivo_rechazo` field where pago rows are typed |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | Wire `omitir_confirmacion_plan` through `publicarEntrenamiento`/`listPublicTrainings`/`listPublicTrainingsForLanding` |
| Service | `src/services/supabase/portal/reservas.service.ts` | `create()` gains the server-reverified pending-without-plan path; audit `.neq('estado','cancelada')` filters to also exclude `'rechazada'` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | `updatePagoEstado` reject requires+stores motivo and cascades reject; suscripción cancel (pending) cascades reject; suscripción approve cascades confirm |
| Service | `src/services/supabase/portal/pagos.service.ts` | `updateComprobantePath` resets `estado` to `pendiente` on resubmission |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts` | Load/edit/submit the new checkbox field |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` | Accept `omitirConfirmacionPlan`; track the pending suscripción id; pass new `CreateReservaInput` fields; pending-specific success message |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Optional `onSubscribed?: (suscripcionId: string) => void` callback fired after successful create, before the generic success message |
| Hook | `src/hooks/portal/gestion-suscripciones/useValidarPago.ts` | `reject(pagoId, motivo)` requires a motivo string |
| Hook | `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts` | `approve()`/`cancel()` trigger the new cascade RPCs |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | New "Omitir confirmación de plan" checkbox + helper text |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | Adjusted rejection dialog/CTA when the flag is on; on plan-purchase success, continue into the normal booking form instead of stopping |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` → `SuscripcionModal.tsx` | Thread the optional `onSubscribed` callback through (no behavior change when absent) |
| Component | `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx` | "Rechazar" requires a motivo textarea before submitting |
| Component | `src/components/portal/mis-suscripciones/PagoCard.tsx` | Show `motivo_rechazo` when `estado === 'rechazado'` |
| Component | `src/components/portal/mis-reservas/*` and `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx` | Render the new `rechazada` state + `motivo_rechazo` |
| Component | `src/components/portal/entrenamientos/reservas/ReservaStatusBadge.tsx` | Render the new `rechazada` state |

---

## Acceptance Criteria

1. Publishing a training shows an "Omitir confirmación de plan" checkbox in `PublicarEntrenamientoModal`, unchecked by default; the value persists and reloads correctly when reopening the publish modal for an already-published training.
2. With the flag **off** (default), booking a public training the athlete isn't eligible for (missing service/plan) behaves exactly as today: fully blocked, "Ver planes" opens the catalog, no reservation is created.
3. With the flag **on**, an athlete missing the required plan/service can still complete a booking: after purchasing a plan through the catalog (creating `suscripciones`/`pagos` in `pendiente`), they are taken into the normal booking form and, on submit, a `reservas` row is created with `estado = 'pendiente'` and `suscripcion_id` set to the new subscription's id.
4. With the flag **on**, all other booking rules still apply unchanged: a rejection for timing, membership status, discipline level, exhausted capacity, or duplicate booking still blocks the booking outright (no plan-purchase bypass for those).
5. A client request that sets the "skip plan" input flag for a training whose `entrenamientos_publicos.omitir_confirmacion_plan` is `false` is rejected server-side exactly as before (defense-in-depth check).
6. When an admin approves the pending suscripción/pago, any linked `reservas` row still `pendiente` is automatically set to `confirmada` and the appropriate service unit is deducted (visible in `reserva_servicios`/`suscripcion_servicios`).
7. Rejecting a pago now requires the admin to enter a motivo; the pago is stored with `estado = 'rechazado'` and `motivo_rechazo` set; any linked `reservas` row still `pendiente` moves to `rechazada` with the same `motivo_rechazo` copied onto it.
8. The athlete can see the rejection reason on the rejected `PagoCard` and on the `rechazada` reservation in their reservations view.
9. Resubmitting a comprobante on a `rechazado` pago resets its `estado` back to `pendiente` for re-review (fixing the pre-existing gap).
10. A `rechazada` reservation is never automatically reactivated even if its subscription is later approved; the athlete must submit a new booking.
11. `rechazada` reservations are excluded from capacity counts and from the duplicate-booking check, the same as `cancelada` ones.
12. Cancelling a still-`pendiente` suscripción from `ValidarSuscripcionModal` cascades the reject the same way as a pago rejection (linked pending reservations move to `rechazada`).

---

## Implementation Steps

- [ ] Write and apply the migration (new column, constraint change, two new columns, `book_and_deduct_service_units` replace, two new SECURITY DEFINER functions)
- [ ] Update `entrenamientos-publicos.types.ts`, `reservas.types.ts`, `pagos.types.ts`/`gestion-suscripciones.types.ts`
- [ ] Wire the publish-time toggle end to end (service → hook → `PublicarEntrenamientoModal` checkbox)
- [ ] Extend `reservas.service.ts` `create()` with the server-reverified pending path; audit and fix `'cancelada'`-only filters
- [ ] Extend `usePublicTrainingReserva.ts` + `PublicTrainingReservaModal.tsx` for the continue-booking-as-pending UX
- [ ] Add the optional `onSubscribed` callback to `useSuscripcion.ts`/`SuscripcionModal.tsx`/`PlanesPublicosModal.tsx`
- [ ] Add the motivo requirement to `ValidarPagoModal.tsx`/`useValidarPago.ts`, store + surface `motivo_rechazo`
- [ ] Wire approve/cancel cascades in `useValidarSuscripcion.ts` / `gestion-suscripciones.service.ts`
- [ ] Fix `pagos.service.ts` `updateComprobantePath` to reset `estado` to `pendiente`
- [ ] Add `rechazada` handling to `ReservaStatusBadge.tsx`, `ReservaEstadoBadge.tsx`, and athlete-facing reservation views
- [ ] Verify RLS: confirm `SECURITY DEFINER` functions cover all new writes; no new policies needed
- [ ] Manual test: happy path (booking as pending → approve → auto-confirm), reject path (motivo → rechazada → resubmit → new booking required), regression on flag-off trainings
- [ ] Update `projectspec/03-project-structure.md` entries for touched files/functions

---

## Non-Functional Requirements

- **Security**: The "skip plan confirmation" bypass must always be
  re-verified server-side against `entrenamientos_publicos.omitir_confirmacion_plan`
  — never trust the client-supplied flag alone (mirrors the existing
  client-trusted-flag pattern used by `bypass_restrictions`/`confirmed_no_units`,
  but this path additionally re-checks a DB-backed flag because it affects
  a financial/plan-eligibility bypass, not just an admin action). Both new
  SQL functions are `SECURITY DEFINER` with `set search_path = public`,
  matching `book_and_deduct_service_units`.
- **Performance**: The extra `entrenamientos_publicos` lookup in `create()`
  is a single indexed point lookup (`entrenamiento_id` + `tenant_id`,
  already indexed via the existing unique constraint), negligible added
  latency.
- **Accessibility**: The new motivo textarea in `ValidarPagoModal` and the
  new checkbox in `PublicarEntrenamientoModal` follow the existing labeled
  form-control patterns already used in those modals (associated `<label>`,
  visible focus states).
- **Error handling**: Server-side rejection of a tampered "skip plan" flag
  surfaces as the same `BookingRejection` dialog the athlete would see
  without the flag (no special/confusing error). Failures in the new
  SECURITY DEFINER RPCs (e.g., `confirm_pending_reservas_for_suscripcion`
  finding insufficient units) must not throw and abort the approval — leave
  the reservation `pendiente` and let the approval itself still succeed.
