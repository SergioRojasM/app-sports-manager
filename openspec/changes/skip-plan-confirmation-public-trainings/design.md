## Context

Public training booking (`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`) and plan purchase (`src/hooks/portal/planes/useSuscripcion.ts`) are today two independent flows that never talk to each other: a booking rejected for a missing plan/service (`SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS`, computed in `reservasService.validateBookingRestrictions`, `src/services/supabase/portal/reservas.service.ts:297-500`) sends the athlete into the plan catalog, and the plan purchase, once submitted, ends the interaction (`suscripciones`/`pagos` rows in `pendiente`) without ever retrying the booking.

The atomic booking write goes through a single `SECURITY DEFINER` RPC, `book_and_deduct_service_units` (latest in `supabase/migrations/20260729184000_formulario_respuestas_perfil_snapshot.sql:13-251`), which always inserts `reservas.estado = 'confirmada'` and never sets `reservas.suscripcion_id`. `reservas.estado = 'pendiente'` is a legal DB value (`reservas_estado_ck`) that no code path has ever produced. Admin review of pending plan requests already has full UI (`ValidarSuscripcionModal.tsx`, `ValidarPagoModal.tsx`) but has never needed to touch `reservas` because nothing ever created one alongside a pending subscription.

This design connects the two flows for public trainings that opt in via a new per-publication flag, and extends admin review to cascade into any reservation that was allowed to proceed pending that plan.

## Goals / Non-Goals

**Goals:**
- Let a trainer/admin opt a specific public training publication into "book now, plan pending" behavior.
- Reuse the existing plan-purchase UI and existing booking-form UI as-is; only bridge them together for this path.
- Make the eventual admin decision (approve/reject) resolve the linked reservation automatically, so no reservation is left dangling in `pendiente` forever without the admin having to separately manage it in the reservations panel.
- Keep every check unrelated to plan/service (timing, membership, level, capacity, duplicate booking, attached forms) exactly as strict as it is today.
- Default every training to today's behavior; this is additive and opt-in per publication.

**Non-Goals:**
- Not building a generic "book without paying" mode — the plan purchase (with its payment proof) is still always required; only the *waiting* for its approval is what moves from blocking to non-blocking.
- Not changing anything about private (non-public) training bookings.
- Not reworking the existing admin subscription/payment review UI beyond adding a required rejection reason and the new cascade calls.
- Not attempting to auto-resurrect a `rechazada` reservation if the athlete's plan is eventually approved after a resubmission — a fresh booking is always required.
- Not handling more than one required-service restriction row differently from how `validateBookingRestrictions` already resolves multi-row OR logic today — the skip-confirmation path reuses that same resolution, it doesn't add new restriction-matching logic.

## Decisions

**1. Bypass lives inside `reservasService.create()`, gated by a server-reverified DB flag, not a trusted client flag alone.**
`CreateReservaInput` gains `permitir_pendiente_sin_plan?: boolean` and `plan_pendiente_suscripcion_id?: string | null`. When the restriction check returns `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` and the caller set `permitir_pendiente_sin_plan`, `create()` queries `entrenamientos_publicos` for `(entrenamiento_id, tenant_id, activo = true)` and only proceeds if `omitir_confirmacion_plan = true` there. This mirrors the existing `bypass_restrictions`/`confirmed_no_units` client-trusted-flag pattern used for admin overrides, but adds the extra DB re-check because this path affects a financial/plan-eligibility bypass reachable by any authenticated athlete, not just an admin acting through an already-role-gated UI.
*Alternative considered*: trust the client flag outright (like `bypass_restrictions` does). Rejected — `bypass_restrictions` is only reachable from admin-only UI code paths; this path is reachable by any athlete, so a purely client-trusted flag would let a crafted request skip the plan requirement on any public training regardless of what the trainer configured.

**2. Reuse `book_and_deduct_service_units` rather than adding a second RPC for the pending path.**
Add two optional parameters, `p_permitir_pendiente boolean default false` and `p_suscripcion_id uuid default null`, defaulting to today's exact behavior. The pending path always calls it with `p_deductions = []` (nothing to deduct — that's *why* the booking was rejected in the first place), so the existing validation/deduction logic is simply skipped over, not modified.
*Alternative considered*: a separate `book_pending_reserva` RPC. Rejected — it would duplicate the formulario/perfil validation logic already inside `book_and_deduct_service_units`, which this path still needs (a pending booking still has to satisfy the attached-form requirement).

**3. Two new small `SECURITY DEFINER` functions for the approve/reject cascade, not a trigger on `suscripciones`.**
`confirm_pending_reservas_for_suscripcion(suscripcion_id)` and `reject_pending_reservas_for_suscripcion(suscripcion_id, motivo)` are called explicitly from the service layer right after the existing `suscripciones.estado` update succeeds (approve → confirm cascade; reject payment / cancel-while-pending → reject cascade).
*Alternative considered*: a DB trigger on `suscripciones` estado transitions. Rejected — the reject cascade needs the admin-entered `motivo` text, which isn't naturally available inside a trigger fired by a plain `UPDATE suscripciones SET estado = ...`; passing it through an explicit RPC call keeps the reason handling simple and visible in the service layer, and keeps `confirm_...`'s "leave `pendiente` on insufficient units, don't fail the approval" behavior an explicit, readable function rather than trigger-swallowed logic.

**4. New `rechazada` reservation state instead of reusing `cancelada`.**
`cancelada` already means "the athlete or an admin actively cancelled a confirmed-or-pending slot" and carries different UI/semantics (e.g., cancellation timing restrictions, `fecha_cancelacion`). A rejection driven by the *plan* being turned down is a distinct cause the athlete needs to see explained (`motivo_rechazo`) and distinct from a self-service cancellation. Every place that already excludes `cancelada` from active-reservation math is updated to exclude `rechazada` too, rather than trying to make `cancelada` carry two meanings.

**5. UI bridging happens in `PublicTrainingReservaModal.tsx`/`usePublicTrainingReserva.ts`, not inside the shared `PlanesPublicosModal`.**
`PlanesPublicosModal` → `SuscripcionModal` → `useSuscripcion` gain one optional callback, `onSubscribed?: (suscripcionId: string) => void`, fired right after a successful subscription+payment creation. `PublicTrainingReservaModal` is the only caller that passes it; when fired, it stores the new subscription id and transitions from the rejection dialog straight into the normal booking form (`reservaForm.openCreate`) instead of stopping. Every other caller of `PlanesPublicosModal` (the standalone catalog) is unaffected since the prop is optional and defaults to today's "close with success message" behavior.
*Alternative considered*: fork a dedicated modal for this flow. Rejected — the existing catalog/purchase UI and booking-form UI are exactly what's needed; forking would duplicate validation and styling for no behavioral gain.

## Risks / Trade-offs

- **[Risk]** An athlete could rack up multiple `pendiente` reservations across several public trainings while a single plan request is still under review, then have some auto-confirm and others left `pendiente` if the granted plan doesn't have enough units for all of them at once. → **Mitigation**: `confirm_pending_reservas_for_suscripcion` processes them in creation order and leaves any it can't satisfy in `pendiente` rather than failing the whole approval; those remain visible in the existing reservations panel (already filters on `pendiente`) for manual admin follow-up, same as today's edge-case handling philosophy in `ADMIN_CONFIRM_NO_UNITS`.
- **[Risk]** Widening `reservas_estado_ck` and adding columns is a live-table schema change. → **Mitigation**: purely additive (new nullable columns, one new allowed enum value); no existing row's `estado` or downstream query changes meaning. Per project rule, the migration is applied only to the local Supabase instance during this change, never pushed to the remote/hosted project directly.
- **[Trade-off]** Requiring a motivo on every payment rejection (not just ones tied to this new flow) is a small existing-flow UX change beyond the strict minimum needed for this feature. → Accepted deliberately: it's what makes the rejection reason available to cascade onto the reservation, and it directly closes a UX gap (today's rejection is a silent single click with no explanation ever reaching the athlete).
- **[Trade-off]** The pending-plan booking flow adds a few more steps between "rejected" and "reservation created" (open catalog → purchase → booking form) versus a hypothetical one-click flow. → Accepted: it reuses two already-shipped, already-tested UI flows verbatim instead of building new purchase/booking UI, which lowers implementation risk and keeps both flows individually consistent with their non-skip-confirmation counterparts.

## Migration Plan

1. Write and apply the migration locally only (`supabase db reset` / local `supabase migration up` per `projectspec` conventions) — never push directly to the remote/hosted Supabase project as part of this change.
2. Ship service/hook/component changes behind the fact that `omitir_confirmacion_plan` defaults to `false` — no existing publication's behavior changes until a trainer/admin explicitly opts in per training.
3. No backfill needed: new columns are nullable or default `false`; no existing `reservas`/`pagos`/`suscripciones` rows need modification.
4. Rollback: since the feature is purely additive and default-off, disabling it is a config-level no-op (nobody has to have checked the box); a full rollback would drop the new columns/constraint value and `CREATE OR REPLACE` the RPC back to its previous body, safe as long as no `reservas` row has been written with `estado IN ('pendiente','rechazada')` or a non-null `suscripcion_id` written by the new RPC path in the meantime (check before rolling back in a shared environment).

## Open Questions

- Should there be a dedicated admin-facing indicator (e.g., a badge) in the reservations panel distinguishing "pending because of this skip-confirmation flow" from any other pending state, beyond what `suscripcion_id` already implies? Deferred — out of scope for this change; the existing reservations panel already shows `pendiente` rows, and `suscripcion_id` is queryable for anyone who needs to trace the link.
