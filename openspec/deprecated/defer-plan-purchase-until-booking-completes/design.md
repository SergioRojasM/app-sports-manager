## Context

US-0106 (`plan-skip-confirmation-booking`) lets an athlete book a public training that
lacks its required plan/service, as long as the training's publication has
`omitir_confirmacion_plan = true`. The implemented flow is two REST-level writes
followed by a third, later one:

1. `useSuscripcion.submit()` (`src/hooks/portal/planes/useSuscripcion.ts:156-191`) inserts
   `suscripciones` (`pendiente`), then `pagos` (`pendiente`) linked to it, then optionally
   uploads a proof file — all before the athlete has even opened the booking form.
2. Only afterward does `usePublicTrainingReserva.continueWithPendingPlan()` open the
   booking form (category/notes, optionally a formulario).
3. `reservaForm.submitCreate()` finally calls `reservasService.create()` →
   `book_and_deduct_service_units` RPC, which inserts `reservas` (`pendiente`) linked via
   `suscripcion_id` to the subscription created in step 1.

Between step 1 and step 3, the subscription is durable but functionally orphaned: no
reservation references it, and there is no UI affordance to "resume" a half-finished
booking. If the athlete never reaches step 3, `hasPendingSuscripcion()`
(`suscripciones.service.ts:58-75`) treats a retry as a duplicate ("Ya tienes una solicitud
pendiente para este plan") and blocks it, while `validateBookingRestrictions` still
rejects the booking outright because the subscription isn't `activa` yet. The athlete is
stuck until an admin manually approves a request that, once approved, has nothing to
auto-confirm (`confirm_pending_reservas_for_suscripcion` only acts on `reservas` rows,
and none exists).

## Goals / Non-Goals

**Goals:**
- Guarantee that no `suscripciones`/`pagos` row is ever created on the
  skip-confirmation path unless a `reservas` row is created in the same operation.
- Keep the athlete-facing UI flow (dialog sequence, stepper, forms) unchanged — this is a
  persistence-timing fix, not a UX redesign.
- Preserve every existing guarantee from US-0106: server-side re-verification of
  `omitir_confirmacion_plan`, all other restriction checks unconditional, duplicate
  pending-subscription protection, admin approve/reject cascades.

**Non-Goals:**
- Redesigning the plan-purchase or booking forms.
- Changing the standalone catalog-purchase flow (`PlanesPublicosModal` opened without a
  chained booking callback) — it keeps its current immediate-write behavior.
- Cleaning up subscriptions already orphaned by the pre-fix code path.
- Changing how admins review/approve/reject subscriptions or the existing cascade RPCs.

## Decisions

### 1. Defer persistence to a single atomic SQL function call, not a client-side "draft + two API calls"

**Chosen**: Extend the existing `book_and_deduct_service_units` `SECURITY DEFINER`
function with an optional `p_plan_purchase jsonb` parameter. When present, the function
inserts `suscripciones` + `suscripcion_servicios` + `pagos` in the same PL/pgSQL
transaction as the `reservas` insert, before returning.

**Alternatives considered**:
- *Two sequential client-side calls (create suscripcion+pago, then create reserva),
  wrapped in client-side try/catch with manual rollback on failure.* Rejected: Postgres
  transactions aren't controllable from two separate PostgREST/RPC calls issued by a
  browser client — there's no way to guarantee atomicity without a stored procedure, and
  a manual "delete what I just inserted" rollback on the client re-introduces exactly the
  kind of half-written state this fix exists to eliminate (e.g., if the rollback call
  itself fails due to a dropped connection).
- *A separate new RPC dedicated to "book with plan purchase", leaving
  `book_and_deduct_service_units` untouched.* Rejected: nearly all of the reservation
  logic (profile-completeness gate, formulario handling, capacity, the reserva insert
  itself) would have to be duplicated or extracted into a shared internal function
  anyway. Adding one optional parameter to the existing function keeps a single
  source of truth for "how a reservation gets inserted" and matches how `p_permitir_pendiente`/
  `p_suscripcion_id` were already added for US-0106.

Consequence: the RPC signature grows by one parameter; the two dropped/recreated
overloads from the previous migration are dropped again and replaced, same pattern
already used in `20260813180000_omitir_confirmacion_plan.sql`.

### 2. `onSubscribed` changes meaning in place, rather than adding a parallel callback prop

**Chosen**: Re-type `useSuscripcion`'s existing `onSubscribed` option from
`(suscripcionId: string) => void` to `(purchase: PendingPlanPurchaseDraft) => void`, and
change what triggers it: instead of firing after the DB write, it fires *instead of* the
DB write.

**Alternatives considered**:
- *Add a second prop (e.g. `onDraftPurchase`) alongside `onSubscribed`, leaving the
  original meaning intact for future callers.* Rejected as unnecessary complexity:
  `onSubscribed` has exactly one real caller today (`PublicTrainingReservaModal` via
  `PlanesPublicosModal`), added specifically for this booking flow in US-0106. There is
  no other consumer whose contract this would break. Keeping two near-identical props
  invites confusion about which one to use going forward.

### 3. Duplicate-subscription and plan-availability checks move (partially) into the atomic function

**Chosen**: The client-side `hasPendingSuscripcion` pre-check (run when the athlete opens
the plan picker) stays as a UX nicety, but the atomic function independently re-checks
both `can_subscribe_to_plan` and "no existing `pendiente` subscription for this
(athlete, plan)" right before inserting — because real time (filling out category/notes/
formulario) can pass between the client-side check and the final submit, during which
another tab, another device, or an admin action could change either fact.

**Alternatives considered**:
- *Trust the client-side check only, since it already ran moments before.* Rejected:
  this is exactly the kind of trust-the-client gap the existing
  `omitir_confirmacion_plan` re-verification pattern in `reservas.service.ts:712-730`
  was introduced to close for the flag itself; the same reasoning applies to "is this
  plan still purchasable" and "is this still not a duplicate," which are equally
  time-sensitive facts.

### 4. Proof-of-payment upload remains a client-side follow-up step

**Chosen**: The file itself can't be inserted by SQL — Storage uploads happen from the
browser client. The upload keeps happening after the atomic RPC succeeds, using the
returned reservation's `suscripcion_id` to look up the newly created `pagos.id` (`pagos`
has `pagos_select_authenticated: using (true)`, so this lookup needs no new RLS).

**Alternatives considered**:
- *Upload the file first, pass its storage path into `p_plan_purchase`, insert
  `comprobante_path` directly.* Rejected: this would leave an uploaded file in Storage
  with no corresponding `pagos` row if the atomic RPC then failed (e.g., a capacity
  race), the mirror-image of the bug this change fixes. Uploading only after the RPC
  succeeds keeps the failure mode "nothing was created" rather than "an orphaned file
  exists" — and matches the existing best-effort, non-blocking nature of proof upload
  (a failed upload today doesn't fail subscription creation either; the athlete can
  always resubmit via `PagoCard.tsx`'s existing "Resubir comprobante" flow).

## Risks / Trade-offs

- **[Risk]** The atomic function grows more complex, mixing "plan purchase" and
  "reservation" concerns in one PL/pgSQL body.
  **Mitigation**: the new logic is a self-contained block guarded by
  `if p_plan_purchase is not null then ... end if;` at the top of the function, before
  any of the existing logic runs, and it only ever sets `p_suscripcion_id` as an output
  for the existing code path to consume unchanged — the existing reservation-insert logic
  is untouched.
- **[Risk]** A window still exists between the athlete confirming the plan-purchase form
  and the final submit where the plan could be deactivated or a duplicate subscription
  could appear (e.g. two tabs). **Mitigation**: covered by Decision 3 — both conditions
  are re-verified inside the same transaction as the write, so the failure is caught
  atomically rather than silently allowed.
- **[Trade-off]** `useSuscripcion.submit()` now has two materially different code paths
  (immediate write vs. draft handoff) gated on whether `onSubscribed` is passed. This is
  an existing pattern from US-0106 (the function already branches on `onSubscribed` for
  the success-message vs. callback choice); this change extends the same branch to also
  skip the DB writes, rather than introducing a new branching mechanism.

## Migration Plan

- One new migration file, additive only (extends an existing function's signature with a
  new optional parameter; no column/table changes, no data backfill).
- Deploy order: apply the migration first (old client code continues to work against the
  new function signature, since the new parameter defaults to `null` and preserves
  existing behavior when omitted), then ship the client-side changes. No coordinated
  rollout window is required.
- Rollback: reverting the client-side changes alone is safe even if the migration has
  already been applied (the new parameter is optional and unused by reverted client
  code). Reverting the migration itself would require dropping the new function
  signature and recreating the prior one, exactly mirroring how
  `20260813180000_omitir_confirmacion_plan.sql` itself replaced an older overload.
- Per project convention, the migration is applied only to the local Supabase instance
  during development; it is not pushed to the remote/hosted project as part of this
  change.
- Any `suscripciones`/`pagos` rows already orphaned by the pre-fix code path are left
  untouched — out of scope (see proposal Non-goals). An admin can identify and cancel
  them manually via `ValidarSuscripcionModal` if desired.

## Open Questions

None — the existing US-0106 implementation and RLS model fully determine the approach;
no unresolved technical decisions remain.
