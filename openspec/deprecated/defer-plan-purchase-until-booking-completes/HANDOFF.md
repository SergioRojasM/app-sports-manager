# Handoff — US-0110 (task 8.9)

Nothing has been committed. Below is the proposed commit message and PR description.

## Commit message

```
fix(public-trainings): defer plan purchase until the booking completes

On a public training published with "Omitir confirmación de plan", the plan
purchase was written to the database the moment the athlete confirmed the plan
form — before they had filled in the rest of the booking. Abandoning anywhere in
between left a 'pendiente' suscripcion + pago with no reservation pointing at
them, which then dead-ended the athlete: the duplicate-request check blocked
buying the plan again, the eligibility check still rejected the booking (the
subscription was not yet 'activa'), and approving that orphan confirmed nothing,
since the approval cascade only acts on linked reservas rows.

The plan selection is now held in memory and persisted only when the booking is
submitted. book_and_deduct_service_units gains an optional p_plan_purchase
payload and creates the suscripcion, its suscripcion_servicios, the pago and the
reserva in a single transaction — so either the athlete gets a booking plus a
plan request, or nothing is written at all and a later retry starts clean.

Because minutes can pass while the booking form is filled in, the function
re-verifies inside that transaction that the plan is still purchasable
(can_subscribe_to_plan) and that no duplicate pending subscription has appeared,
raising PLAN_NO_DISPONIBLE / SUSCRIPCION_PENDIENTE_EXISTENTE.

The proof-of-payment upload now runs after the booking succeeds (its storage
path needs the pago id); it stays best-effort, and a failed upload never undoes
a committed booking.

Scoped to the skip-plan-confirmation booking path only: the standalone catalog
purchase (PlanesPublicosModal opened without a chained booking) still creates
the subscription and payment immediately, and trainings with the flag off are
untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## PR description

```markdown
## Summary

Fixes the orphaned-plan-request dead end in the "Omitir confirmación de plan"
booking flow (US-0110, following on from US-0106).

**The bug.** `useSuscripcion.submit()` inserted `suscripciones` + `pagos` as soon
as the athlete confirmed the plan-purchase form — but the reservation is only
created several steps later, after the category/notes step and the training's
formulario. An athlete who dropped off in between left a `pendiente` subscription
that no reservation referenced, and was then stuck:

- `hasPendingSuscripcion()` blocked buying the plan again ("Ya tienes una
  solicitud pendiente para este plan"),
- `validateBookingRestrictions` still rejected the booking, since the
  subscription was `pendiente`, not `activa`,
- and approving the orphan auto-confirmed nothing, because
  `confirm_pending_reservas_for_suscripcion` only acts on linked `reservas` rows.

Which is the exact opposite of what the feature exists for: letting people book
without waiting on manual approval.

**The fix.** Nothing is written until the whole booking completes. The plan
selection is carried in memory as a `PendingPlanPurchaseDraft` and handed to the
booking call, where `book_and_deduct_service_units` creates the subscription, its
service units, the payment and the reservation in one transaction.

## Changes

- **Migration** `20260831120000_defer_plan_purchase_until_reserva.sql` — adds an
  optional `p_plan_purchase jsonb` to `book_and_deduct_service_units`. When
  present it re-checks `can_subscribe_to_plan` and the absence of a duplicate
  pending subscription, then inserts `suscripciones` → `suscripcion_servicios` →
  `pagos` and hands the new id to the existing reservation insert. The rest of
  the function body is carried forward unchanged (verified byte-for-byte against
  the live definition).
- **`useSuscripcion`** — `onSubscribed` now means "hand over the filled-in
  purchase" instead of "here's the id of the one I just created". When it is
  provided, `submit()` writes nothing. When it is absent (the standalone
  catalog), behavior is untouched.
- **`usePublicTrainingReserva`** — holds the draft, forwards it as
  `plan_pendiente_compra`, and uploads any proof of payment after the booking
  succeeds.
- **`reservas.service.ts`** — sends `p_plan_purchase` and maps the two new error
  codes to user-facing rejections.
- Types, prop-type passthrough, and `projectspec/03-project-structure.md` updated.

## Verification

Driven through the real UI in headless Chromium against local Supabase, as a
logged-in non-member athlete:

| | Result |
|---|---|
| Abandon after confirming the plan form | **0 rows written** (pre-fix: 1 suscripcion + 1 pago) |
| Retry after abandoning | Clean first-attempt behavior, no duplicate block |
| Full booking | All 4 rows created, `created_at` spread **0.000s**, no unit deducted while pending |
| With a proof file | `comprobante_path` set after the booking, object present in storage |
| Standalone catalog purchase | Still creates immediately — unchanged |
| Admin approve / reject | Cascades still work: `confirmada` + unit deducted / `rechazada` + motivo |
| Flag off | Blocking behavior unchanged |

Also exercised at the SQL level, including the atomicity guarantee itself: a
reservation forced to fail *after* the purchase block ran rolled the subscription
back with it.

`npx tsc --noEmit` clean repo-wide; `eslint` clean on all changed files. No test
suite exists in this repo. Local-only migration — not pushed to the hosted
project. All test fixtures and data were restored/removed afterward.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
