## Why

On a public training published with `omitir_confirmacion_plan = true` (US-0106), the
plan purchase (`suscripciones` + `pagos`, both `estado = 'pendiente'`) is written to the
database the instant the athlete confirms the plan-purchase form — before they finish the
rest of the booking (category/notes/formulario, then final submit). If the athlete
abandons anywhere in between, that subscription is orphaned: it's still `pendiente`, no
`reservas` row was ever created to link to it, and the athlete's next retry is blocked
outright — `hasPendingSuscripcion()` treats the orphan as a duplicate request and
`validateBookingRestrictions` still rejects the booking because the subscription isn't
`activa`. The athlete is stuck waiting on an admin to approve a request that, even once
approved, has no linked reservation to auto-confirm — defeating the entire purpose of the
skip-confirmation feature (US-0106, US-0110 user story).

## What Changes

- Defer persistence of the plan purchase on the skip-confirmation booking path: the
  plan/subtype/payment-method/comment/proof-file selection is captured only in memory
  until the athlete completes the full booking form.
- Create `suscripciones`, `suscripcion_servicios`, `pagos`, and `reservas` atomically, in
  a single `SECURITY DEFINER` SQL function call, only when the athlete's final "Reservar"
  submit fires — never earlier. Abandoning at any point before that leaves zero rows
  behind.
- Extend `book_and_deduct_service_units` with a new optional `p_plan_purchase jsonb`
  parameter that performs the subscription + service-unit + payment inserts inside the
  same transaction as the reservation insert, with server-side re-verification that the
  plan is still purchasable and that no duplicate pending subscription exists.
- Change `useSuscripcion`'s `onSubscribed` callback contract: when provided (i.e., the
  hook is being driven from a booking flow), `submit()` no longer writes
  `suscripciones`/`pagos` itself — it hands the raw form data to the callback as a draft
  instead.
- Move the proof-of-payment upload (which needs a real `pagos.id`) to run as a
  best-effort follow-up after the atomic booking+purchase RPC succeeds, instead of
  inside the old immediate-write step.
- **BREAKING** (internal API only, no external consumers): `useSuscripcion`'s
  `onSubscribed` signature changes from `(suscripcionId: string) => void` to
  `(purchase: PendingPlanPurchaseDraft) => void`; `CreateReservaInput`'s
  `plan_pendiente_suscripcion_id` field is replaced by `plan_pendiente_compra`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plan-skip-confirmation-booking`: the "Booking continues as pending when only the
  plan/service requirement fails" requirement changes from "plan purchase happens
  immediately, then the booking form is completed" to "plan purchase and booking are
  captured together but persisted atomically only on final booking submit." A new
  requirement is added covering the atomicity/no-orphan guarantee and the
  defense-in-depth re-checks (`can_subscribe_to_plan`, duplicate-pending-subscription)
  performed inside that same atomic write.

## Impact

- **Database**: new migration extending `book_and_deduct_service_units` (function
  signature gains `p_plan_purchase jsonb default null`); no new tables/columns.
- **Services**: `src/services/supabase/portal/reservas.service.ts` (`create()`'s RPC
  call and error mapping).
- **Hooks**: `src/hooks/portal/planes/useSuscripcion.ts`,
  `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`.
- **Components**: `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`,
  `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` (prop type only, no
  markup change).
- **Types**: `src/types/portal/reservas.types.ts`, `src/types/portal/suscripciones.types.ts`.
- **Not affected**: the standalone catalog-purchase flow (no chained booking), admin
  review UI (`ValidarPagoModal`, `ValidarSuscripcionModal`) and its approve/reject
  cascade RPCs, `SuscripcionModal.tsx` (already only collects form data, unaware of
  persistence timing).
- No new page or component is introduced and no visual/UI change is required — this is a
  persistence-timing fix behind an existing UI flow, so no design/sketch input is needed.

## Non-goals

- Not changing the eligibility rules, capacity checks, or any restriction code other than
  `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` handling already covered by US-0106.
- Not changing the standalone "buy a plan from the catalog" purchase flow (outside a
  booking) — it keeps creating `suscripciones`/`pagos` immediately on submit.
- Not changing admin approval/rejection UI or the existing
  `confirm_pending_reservas_for_suscripcion` / `reject_pending_reservas_for_suscripcion`
  cascades — a subscription created via the new atomic path is indistinguishable from one
  created the old way, so those keep working unchanged.
- Not adding any new UI screens, steps, or visual states to the booking modal — the
  stepper/dialog sequence the athlete sees is unchanged; only the timing of underlying
  writes changes.
- Not retroactively cleaning up any already-orphaned `suscripciones`/`pagos` rows created
  by the old code path before this fix ships (out of scope; can be handled manually by an
  admin if needed).
