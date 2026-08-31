# US-0110 — Defer Plan Purchase Persistence Until Booking Completes

## ID
US-0110

## Name
Fix: don't persist a plan/subscription purchase request until the entire skip-plan-confirmation booking flow finishes

## As a
Athlete booking a public training that has "Omitir confirmación de plan" enabled

## I Want
My plan purchase (subscription + payment request) to only be saved once I actually finish reserving my spot — not the moment I pick a plan and confirm payment details

## So That
If I abandon the booking partway through (close the tab, get interrupted, don't finish the category/notes/formulario steps), I'm not left with an orphaned pending subscription that blocks me from trying again — I can simply retry the whole booking later without being stuck waiting on an admin to approve a request that was never actually going anywhere

---

## Description

### Current State

US-0106 ("Skip Plan Confirmation on Public Training Publish", already implemented —
migration `supabase/migrations/20260813180000_omitir_confirmacion_plan.sql`) lets a
training published with `entrenamientos_publicos.omitir_confirmacion_plan = true` allow
an athlete who lacks the required plan/service to keep booking: they're routed into the
plan catalog, and once they submit a plan purchase, they continue straight into the
normal booking form and, on final submit, get a `reservas` row in `estado = 'pendiente'`
linked via `suscripcion_id`.

The bug is in *when* the plan purchase is written to the database:

- `PublicTrainingReservaModal.tsx:212-221` opens `PlanesPublicosModal` with
  `onSubscribed={(suscripcionId) => void reserva.continueWithPendingPlan(suscripcionId)}`
  when `canSkipConfirmation` is true.
- Inside that modal, `SuscripcionModal.tsx`'s "Confirmar" button calls
  `useSuscripcion.submit()` (`src/hooks/portal/planes/useSuscripcion.ts:118-221`), which
  **unconditionally** runs three steps the instant the athlete confirms the plan form —
  regardless of whether `onSubscribed` was passed:
  1. `suscripcionesService.createSuscripcion(...)` → inserts `suscripciones` with
     `estado: 'pendiente'` (line 156-163).
  2. `pagosService.createPago(...)` → inserts `pagos` with `estado: 'pendiente'`, linked
     to the new `suscripcion.id` (line 166-174).
  3. Optionally uploads the proof-of-payment file and updates `pagos.comprobante_path`
     (line 176-191).
  - Only *after* all of this has already been written does it call
    `onSubscribed(suscripcion.id)` (line 198-201), which is what triggers
    `usePublicTrainingReserva.continueWithPendingPlan()`
    (`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts:184-190`) to
    stash `pendingPlanSuscripcionId` and open the booking form
    (`reservaForm.openCreate`).
- The athlete still has to get through the category/notes step and, if the training has
  an attached formulario, the formulario step, before `reservaForm.submitCreate()` ever
  runs `reservasService.create()` (`reservas.service.ts:684-906`), which is the **only**
  point that creates the `reservas` row and links it to the already-created
  `suscripcion_id` via `input.plan_pendiente_suscripcion_id`
  (`reservas.types.ts:54-55`, `reservas.service.ts:900`).

**The gap:** if the athlete closes the modal, navigates away, or otherwise abandons
anywhere between step 1 above and the final `reservasService.create()` call, a
`suscripciones` row (and its `pagos` row) is left permanently in `estado = 'pendiente'`
with **no** `reservas` row ever created — `reservas.suscripcion_id` only gets populated
by the RPC that never ran. When the athlete comes back later and tries to book again (the
same training, or any other training requiring the same plan):

1. `validateBookingRestrictions` still rejects the booking with
   `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS`, because the subscription is still
   `pendiente`, not `activa`.
2. Opening the plan catalog again and selecting the same plan trips
   `useSuscripcion.openModal()`'s duplicate check
   (`suscripcionesService.hasPendingSuscripcion`, `useSuscripcion.ts:94-99`), which sets
   `isDuplicate = true` and shows "Ya tienes una solicitud pendiente para este plan." —
   blocking a new purchase attempt (`submit()` returns `false` immediately when
   `isDuplicate`, line 120).
3. The athlete is now stuck: they can't buy the plan again (duplicate blocked) and can't
   book (still ineligible) until an admin manually approves the orphaned subscription.
   Even then, approval only helps by coincidence: `confirm_pending_reservas_for_suscripcion`
   (`20260813180000_omitir_confirmacion_plan.sql:289-368`) only auto-confirms `reservas`
   rows linked via `suscripcion_id` — since none exists, approving the orphaned
   subscription confirms nothing, and the athlete must notice on their own that the plan
   is now active and manually restart the entire booking from scratch. This defeats the
   entire point of `omitir_confirmacion_plan`: letting the reservation proceed without
   waiting on manual approval.

### Proposed Changes

**Persist nothing until the final "Reservar" submit.** Within the skip-plan-confirmation
booking flow specifically (i.e., whenever `PlanesPublicosModal`/`useSuscripcion` is
invoked with a callback that chains into a booking), the plan-purchase form (plan,
subtype, payment method, comment, proof file) is only **captured in memory**. The
`suscripciones` + `suscripcion_servicios` + `pagos` rows are created — together with the
`reservas` row — atomically, in a single new `SECURITY DEFINER` SQL function call, only
when the athlete completes the booking form and its final submit fires. If the athlete
abandons anywhere before that point, nothing has been written to the database at all —
there is nothing to be "stuck" on, and retrying later (even picking a different plan) is
identical to a first attempt.

This is scoped to the skip-plan-confirmation entry point only. The standalone "buy a plan
directly from the catalog" flow (`PlanesPublicosModal` opened outside a booking, e.g. from
a general plans page — no chaining callback) is **unchanged**: it still creates
`suscripciones`/`pagos` immediately on submit, exactly as today, since there's no booking
process to defer to.

**1. `useSuscripcion` — defer persistence when chained into a booking.**
`useSuscripcion.submit()`'s `onSubscribed` callback changes meaning: instead of firing
*after* the suscripcion/pago rows already exist (passing their id), it now fires
**instead of** creating them, passing the raw form data as a draft object. When
`onSubscribed` is provided, `submit()` skips Steps 1–3 (`createSuscripcion`,
`createPago`, file upload) entirely, resolves the selected subtype exactly as today
(existing subtype/duplicate validation unchanged — `isDuplicate` still blocks confirming
when a genuine pending subscription for that plan already exists, e.g. from a previously
*completed* skip-confirmation booking), calls
`onSubscribed({ planId, planTipoId, comentarios, metodoPagoId, monto, file })`, closes the
modal, and returns `true` — no DB round trip. When `onSubscribed` is omitted (the
standalone catalog flow), behavior is 100% unchanged.

**2. Booking form carries the draft plan purchase, not a suscripcion id.**
`usePublicTrainingReserva`'s `pendingPlanSuscripcionId: string | null` state becomes
`pendingPlanPurchase: PendingPlanPurchaseDraft | null`. `continueWithPendingPlan()` now
takes the draft object (not a string id) and simply stores it before opening the booking
form — no DB call.

**3. Atomic creation on final submit.** When the booking form's `onCreateReserva` fires
with a `pendingPlanPurchase` draft present, `reservasService.create()` is called with a
new `plan_pendiente_compra` payload (plan id, subtype id, comment, payment method id,
amount) instead of a subscription id. Inside `create()`, when the server-side
`omitir_confirmacion_plan` re-verification passes (unchanged from US-0106 — still never
trusts the client flag alone), the RPC `book_and_deduct_service_units` is called with a
new `p_plan_purchase jsonb` parameter carrying that payload. Inside the function, in the
same transaction as the reservation insert:
- Re-verifies the plan is still purchasable (`can_subscribe_to_plan`) — defense-in-depth
  against a plan being deactivated/un-published between when the athlete picked it and
  when they finished the booking form.
- Re-verifies no `pendiente` subscription already exists for
  `(atleta_id, plan_id)` — defense-in-depth duplicate guard, since real time may have
  passed (filling out category/notes/formulario) since the client-side check in step 1.
- Inserts `suscripciones` (`estado = 'pendiente'`), populates `suscripcion_servicios`
  (same logic as `populate_suscripcion_servicios`), inserts `pagos`
  (`estado = 'pendiente'`, no `comprobante_path` yet), and only then proceeds with the
  existing reservation-insert logic, using the newly created subscription's id as the
  reservation's `suscripcion_id` — exactly as the existing `p_suscripcion_id` path did.
- All of this is one PL/pgSQL function call, so if the reservation insert fails for any
  reason downstream (e.g. a capacity race), the whole transaction — including the new
  subscription and payment rows — rolls back. Nothing partial is ever left behind.

**4. Proof-of-payment upload stays a client-side follow-up.** Uploading the file to
Storage still needs the `pagos.id`, which only exists after the atomic RPC returns. After
a successful booking, if a proof file was attached to the draft, the client fetches the
`pagos` row by the reservation's `suscripcion_id` (RLS already permits reading any pago,
`pagos_select_authenticated`) and uploads/attaches it exactly as
`useSuscripcion.submit()`'s existing Step 3 does today — best-effort, non-blocking: a
failed upload does not fail the booking (the athlete can still resubmit their proof later
via the existing "Resubir comprobante" flow on `PagoCard.tsx`).

**5. No change to today's default flow.** Trainings with `omitir_confirmacion_plan =
false`, and the standalone catalog-purchase flow, are entirely unaffected by this fix.

---

## Database Changes

New migration file
`supabase/migrations/{timestamp}_defer_plan_purchase_until_reserva.sql`:

```sql
-- Extends book_and_deduct_service_units (US-0106) with an optional p_plan_purchase
-- payload so a skip-plan-confirmation booking can create the subscription + payment +
-- reservation atomically, in one transaction, only when the booking actually completes.
drop function if exists public.book_and_deduct_service_units(
  uuid, uuid, uuid, uuid, text, jsonb, uuid, jsonb, boolean, uuid
);

create or replace function public.book_and_deduct_service_units(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid    default null,
  p_notas                      text    default null,
  p_deductions                 jsonb   default '[]',
  p_formulario_plantilla_id    uuid    default null,
  p_formulario_respuesta       jsonb   default null,
  p_permitir_pendiente         boolean default false,
  p_suscripcion_id             uuid    default null,
  p_plan_purchase              jsonb   default null
  -- {"plan_id": uuid, "plan_tipo_id": uuid|null, "comentarios": text|null,
  --  "metodo_pago_id": uuid, "monto": numeric}
)
returns public.reservas
language plpgsql
security definer
set search_path = public
as $$
declare
  -- ...existing declarations from 20260813180000_omitir_confirmacion_plan.sql...
  v_new_suscripcion_id uuid;
begin
  -- ── NEW: atomic plan purchase, only when a draft was submitted with the booking ──
  if p_plan_purchase is not null then
    if not p_permitir_pendiente then
      raise exception 'PLAN_PURCHASE_REQUIERE_PENDIENTE' using errcode = 'P0001';
    end if;

    if not public.can_subscribe_to_plan((p_plan_purchase->>'plan_id')::uuid, p_tenant_id) then
      raise exception 'PLAN_NO_DISPONIBLE' using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.suscripciones
       where atleta_id = p_atleta_id
         and plan_id = (p_plan_purchase->>'plan_id')::uuid
         and estado = 'pendiente'
    ) then
      raise exception 'SUSCRIPCION_PENDIENTE_EXISTENTE' using errcode = 'P0001';
    end if;

    insert into public.suscripciones (tenant_id, atleta_id, plan_id, plan_tipo_id, comentarios, estado)
    values (
      p_tenant_id, p_atleta_id,
      (p_plan_purchase->>'plan_id')::uuid,
      nullif(p_plan_purchase->>'plan_tipo_id', '')::uuid,
      nullif(p_plan_purchase->>'comentarios', ''),
      'pendiente'
    )
    returning id into v_new_suscripcion_id;

    if nullif(p_plan_purchase->>'plan_tipo_id', '') is not null then
      insert into public.suscripcion_servicios (suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes)
      select v_new_suscripcion_id, pts.servicio_id, pts.unidades, pts.unidades
        from public.plan_tipos_servicios pts
       where pts.plan_tipo_id = (p_plan_purchase->>'plan_tipo_id')::uuid
      on conflict (suscripcion_id, servicio_id) do nothing;
    end if;

    insert into public.pagos (tenant_id, suscripcion_id, monto, comprobante_path, estado, metodo_pago_id)
    values (
      p_tenant_id, v_new_suscripcion_id,
      (p_plan_purchase->>'monto')::numeric, null, 'pendiente',
      (p_plan_purchase->>'metodo_pago_id')::uuid
    );

    p_suscripcion_id := v_new_suscripcion_id;
  end if;

  -- ── everything below is UNCHANGED from 20260813180000_omitir_confirmacion_plan.sql ──
  -- profile-completeness gate, formulario respuesta insert, pass-1 deductions
  -- pre-validation, reservas insert (using p_suscripcion_id, now possibly the row just
  -- created above), pass-2 deductions.
end;
$$;
```

No RLS changes: the new inserts (`suscripciones`, `suscripcion_servicios`, `pagos`) run
inside a `SECURITY DEFINER` function exactly like the existing reservation/deduction
inserts already do, bypassing caller-context RLS the same way
`book_and_deduct_service_units` already does today.

---

## API / Server Actions

- **`src/services/supabase/portal/reservas.service.ts`**
  - `create(input: CreateReservaInput)`: when `pendienteSinPlan` is true and
    `input.plan_pendiente_compra` is present, pass
    `p_plan_purchase: { plan_id: ..., plan_tipo_id: ..., comentarios: ..., metodo_pago_id: ..., monto: ... }`
    to the RPC instead of a `p_suscripcion_id`. Add error-code mappings (mirroring the
    existing `SUSCRIPCION_INACTIVA`/`UNIDADES_AGOTADAS` handling at lines ~903-917):
    - `PLAN_NO_DISPONIBLE` → `{ ok: false, code: 'SERVICIO_REQUERIDO', message: 'El plan seleccionado ya no está disponible. Elige otro plan para continuar.' }`
    - `SUSCRIPCION_PENDIENTE_EXISTENTE` → `{ ok: false, code: 'SERVICIO_REQUERIDO', message: 'Ya tienes una solicitud de plan pendiente de aprobación. Espera a que sea revisada antes de continuar.' }`

- **`src/hooks/portal/planes/useSuscripcion.ts`**
  - `onSubscribed` option's signature changes from `(suscripcionId: string) => void` to
    `(purchase: PendingPlanPurchaseDraft) => void`. When present, `submit()` skips the
    `createSuscripcion`/`createPago`/upload steps and calls it with the captured form
    data instead.

- **`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`**
  - `continueWithPendingPlan(purchase: PendingPlanPurchaseDraft)`: stores the draft
    (replaces the old `suscripcionId: string` param) and opens the booking form — no DB
    call.
  - `onCreateReserva`: build `plan_pendiente_compra` from `pendingPlanPurchase` instead of
    forwarding a subscription id.
  - After a successful create with a `pendingPlanPurchase.file` present: fetch the pago
    row by the returned reservation's `suscripcion_id`
    (`supabase.from('pagos').select('id').eq('suscripcion_id', result.suscripcion_id).maybeSingle()`),
    then `storageService.uploadPaymentProof(...)` +
    `pagosService.updateComprobantePath(...)`, wrapped in try/catch — non-blocking,
    mirrors the existing pattern removed from `useSuscripcion.submit()`'s old Step 3.

All calls continue to run under the caller's session via the browser Supabase client
(`createClient()`); the SQL changes remain `SECURITY DEFINER`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_defer_plan_purchase_until_reserva.sql` | `book_and_deduct_service_units` CREATE OR REPLACE with new `p_plan_purchase` param and atomic subscription+payment creation |
| Types | `src/types/portal/suscripciones.types.ts` | New `PendingPlanPurchaseDraft` type: `{ planId: string; planTipoId: string \| null; comentarios: string \| null; metodoPagoId: string; monto: number; file: File \| null }` |
| Types | `src/types/portal/reservas.types.ts` | `CreateReservaInput.plan_pendiente_suscripcion_id` → `plan_pendiente_compra: { plan_id: string; plan_tipo_id: string \| null; comentarios: string \| null; metodo_pago_id: string; monto: number } \| null` |
| Service | `src/services/supabase/portal/reservas.service.ts` | `create()`: send `p_plan_purchase` instead of `p_suscripcion_id` on the skip-confirmation path; map `PLAN_NO_DISPONIBLE`/`SUSCRIPCION_PENDIENTE_EXISTENTE` errors |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | `onSubscribed` re-typed to `(purchase: PendingPlanPurchaseDraft) => void`; `submit()` skips DB writes and calls it with the draft when provided |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` | `pendingPlanSuscripcionId` → `pendingPlanPurchase: PendingPlanPurchaseDraft \| null`; `continueWithPendingPlan(purchase)`; build `plan_pendiente_compra` on submit; post-success proof upload follow-up |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | Update `onSubscribed` callback wiring to pass the draft through to `continueWithPendingPlan` |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | `onSubscribed` prop re-typed to `(purchase: PendingPlanPurchaseDraft) => void` (pure passthrough to `useSuscripcion`) |

No changes needed to `SuscripcionModal.tsx` (already only collects form data and calls
`onConfirm`/`suscripcion.submit()`, unaware of persistence timing) or to any admin-review
component (`ValidarPagoModal`, `ValidarSuscripcionModal`, `confirm_pending_reservas_for_suscripcion`,
`reject_pending_reservas_for_suscripcion`) — a subscription created via the new atomic
path is a normal `pendiente` `suscripciones`/`pagos` row indistinguishable from any other,
so the existing approve/reject cascades from US-0106 keep working unchanged.

---

## Acceptance Criteria

1. On a training with `omitir_confirmacion_plan = true`, an ineligible athlete who opens
   the plan catalog, selects a plan/subtype, fills in payment method + comment, and clicks
   "Confirmar" — but then closes the modal/tab **before** reaching the final "Reservar"
   step — leaves **no** `suscripciones` or `pagos` row behind at all.
2. That same athlete, returning later and retrying the booking (same training or a
   different one requiring the same plan), sees the exact same fresh eligibility
   rejection as a first-time visitor — no "Ya tienes una solicitud pendiente" duplicate
   block, since nothing was ever created.
3. Completing the full flow end-to-end (select plan → fill payment form → confirm →
   complete category/notes/formulario steps → submit) creates the `suscripciones`
   (`pendiente`), `suscripcion_servicios`, `pagos` (`pendiente`), and `reservas`
   (`pendiente`, `suscripcion_id` set) rows together, all with the same `created_at`
   transaction — verified by them appearing atomically (never one without the others).
4. If a proof-of-payment file was attached during the plan-selection step, it is
   successfully uploaded and `pagos.comprobante_path` set after the booking completes
   successfully.
5. If the selected plan's subtype grants specific services, `suscripcion_servicios` rows
   are populated identically to today's standalone-purchase flow (same
   `unidades_incluidas`/`unidades_restantes` values).
6. An athlete who already has a genuinely pending subscription for a plan (created by a
   previously *completed* skip-confirmation booking) still sees "Ya tienes una solicitud
   pendiente para este plan" when trying to select that same plan again, and cannot
   proceed — this duplicate protection is preserved, just checked against real rows
   instead of potentially-orphaned ones.
7. If the athlete takes long enough between confirming the plan-purchase form and
   submitting the final booking that the plan becomes unavailable (deactivated/
   unpublished) or a duplicate pending subscription appears from another tab in the
   meantime, the final submit fails cleanly with a clear message and creates nothing
   (verified via the new `PLAN_NO_DISPONIBLE`/`SUSCRIPCION_PENDIENTE_EXISTENTE` mappings)
   — no partial rows left behind.
8. The standalone "buy a plan from the catalog" flow (not reached via a booking
   rejection) is completely unaffected: submitting a plan purchase there still creates
   `suscripciones`+`pagos` immediately, exactly as before this fix.
9. Admin approval/rejection of a subscription created through this new atomic path
   behaves identically to one created through the old immediate-write path — the
   existing `confirm_pending_reservas_for_suscripcion` / `reject_pending_reservas_for_suscripcion`
   cascades from US-0106 require no changes and continue to work.
10. A training with `omitir_confirmacion_plan = false` is entirely unaffected — this fix
    only changes the timing of writes on the skip-confirmation path.

---

## Implementation Steps

- [ ] Write and apply the migration (extend `book_and_deduct_service_units` with
      `p_plan_purchase`, atomic subscription+payment creation, defense-in-depth
      `PLAN_NO_DISPONIBLE`/`SUSCRIPCION_PENDIENTE_EXISTENTE` checks)
- [ ] Add `PendingPlanPurchaseDraft` to `suscripciones.types.ts`
- [ ] Update `CreateReservaInput` in `reservas.types.ts`
- [ ] Update `useSuscripcion.ts`: re-type `onSubscribed`, branch `submit()` to skip DB
      writes and call it with the draft when provided
- [ ] Update `PlanesPublicosModal.tsx`'s `onSubscribed` prop type (passthrough only)
- [ ] Update `usePublicTrainingReserva.ts`: rename state to `pendingPlanPurchase`, update
      `continueWithPendingPlan`, build `plan_pendiente_compra` on submit, add the
      post-success proof-upload follow-up
- [ ] Update `PublicTrainingReservaModal.tsx`'s `onSubscribed` wiring
- [ ] Update `reservas.service.ts` `create()`'s RPC call and new error-code mappings
- [ ] Manual test: abandon after confirming the plan form (before finishing booking) →
      verify zero `suscripciones`/`pagos` rows created, and retry works cleanly
- [ ] Manual test: full happy path with a proof file attached → verify all four rows
      created atomically and the proof uploaded
- [ ] Manual test: standalone catalog purchase (outside booking) still works unchanged
- [ ] Manual test: existing admin approve/reject flows still work on subscriptions
      created via the new path
- [ ] Update `projectspec/03-project-structure.md` entries for touched files/functions

---

## Non-Functional Requirements

- **Security**: The new `p_plan_purchase` path re-verifies `can_subscribe_to_plan`
  server-side inside the `SECURITY DEFINER` function — never trusts that the client-side
  plan the athlete picked earlier is still valid by the time the booking form is
  submitted. Duplicate-subscription protection is also re-verified server-side at the
  same point, closing the window where time passes between plan selection and final
  submit.
- **Performance**: The extra `can_subscribe_to_plan` call and duplicate-subscription
  existence check inside the RPC are both indexed point lookups, negligible added
  latency; no additional round trips from the client versus today (still one RPC call for
  the entire booking + purchase).
- **Data integrity**: Because subscription, payment, and reservation creation now happen
  in a single PL/pgSQL function invocation, they are transactionally atomic — a failure
  at any point (e.g. a capacity race on the reservation insert) rolls back the whole
  operation, so there is never a subscription/payment row without its reservation, or
  vice versa, on this path.
- **Error handling**: `PLAN_NO_DISPONIBLE` and `SUSCRIPCION_PENDIENTE_EXISTENTE` surface
  through the same `BookingRejection` dialog the athlete already sees for other
  eligibility failures — no new UI pattern needed.
