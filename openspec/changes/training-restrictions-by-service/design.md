## Context

Training bookings previously enforced access via `plan_id` and `disciplina_id` columns on restriction rows, then deducted a single class counter (`suscripciones.clases_restantes`). US-0062/US-0063 introduced a per-service unit entitlement ledger (`suscripcion_servicios`, `plan_tipos_servicios`) that supersedes the plan/class model. This change brings the restriction and deduction flow into alignment with the new model.

Current state:
- `entrenamiento_restricciones` rows carry `plan_id` / `disciplina_id` FKs
- `validateBookingRestrictions` pre-fetches athlete's active plan IDs and plan-discipline assignments
- `book_and_deduct_class` RPC decrements `suscripciones.clases_restantes` (single counter)
- `cancel_and_restore_class` RPC restores that single counter using `reservas.suscripcion_id`

Target state:
- Restriction rows carry up to 4 service FKs (`servicio_1_id…servicio_4_id`) + `descripcion`; legacy `plan_id`/`disciplina_id` remain unused pending a future clean-up US
- `validateBookingRestrictions` evaluates service entitlements from `suscripcion_servicios`
- `book_and_deduct_service_units` RPC accepts a JSONB array, pre-validates all services, then atomically deducts each and logs to a new `reserva_servicios` ledger
- `cancel_and_restore_service_units` RPC self-heals from `reserva_servicios`

## Goals / Non-Goals

**Goals:**
- Align restriction evaluation and unit deduction with the service-unit entitlement model
- Support AND logic across up to 4 services per restriction row, deducting all of them atomically
- Track every deduction with full traceability via `reserva_servicios`
- Provide an admin-friendly UI with service selectors, a description field, and an AND/OR guide
- Keep migration additive (no column drops in this US)

**Non-Goals:**
- Removing `plan_id`/`disciplina_id` DB columns (future clean-up US)
- Migrating existing restriction row data
- Changing `validar_nivel_disciplina` semantics
- Changing subscription creation, payment, or plan management flows
- Remote Supabase migrations (local only)

## Decisions

### D1: Four flat columns vs. a junction table for service slots

**Decision**: Use four nullable FK columns (`servicio_1_id`…`servicio_4_id`) directly on the restriction row.

**Rationale**: The requirement caps AND conditions at 4 services per row. Four flat columns keep each OR row self-contained, eliminate an extra join at evaluation time, and make the "max 4" constraint implicit in the schema. A junction table would allow arbitrary counts but adds complexity (ordering, cascade deletes, extra query) for no functional gain given the fixed cap.

**Alternative considered**: `servicio_ids uuid[]` array column — rejected because Postgres arrays are harder to index, FK-constrain, and query with Supabase's JS client.

---

### D2: JSONB array for multi-service deductions in the RPC

**Decision**: `book_and_deduct_service_units` accepts `p_deductions jsonb` (array of `{suscripcion_id, servicio_id}` objects).

**Rationale**: Passing a JSONB array in a single RPC call keeps the deduction atomic across all services in one transaction. The alternative (a separate RPC call per service) would require the caller to manage partial-failure rollback at application level, which is complex and error-prone.

---

### D3: Pre-validate all services before writing anything

**Decision**: The RPC iterates `p_deductions` twice — first to check all services have available units, then to perform writes.

**Rationale**: Avoids partial deductions where service A is decremented but service B is exhausted. The double-pass is a minor cost for correctness: both passes run inside the same transaction, so no external interleaving is possible.

---

### D4: `reserva_servicios` ledger table for restoration

**Decision**: A new `reserva_servicios(reserva_id, suscripcion_id, servicio_id)` table records every deduction, and `cancel_and_restore_service_units` reads it to know what to restore.

**Rationale**: Without a ledger, `cancel` would need to re-fetch the training's restriction row to determine which services were deducted. That is fragile — the restriction row may have been edited between booking and cancellation. The ledger makes restoration independent of current restriction state.

**Alternative**: Store a JSONB column on `reservas`. Rejected because it is harder to query, index, and enforce referential integrity on.

---

### D5: `validateBookingRestrictions` returns the matched restriction row

**Decision**: Update the function signature to return `{ result: BookingResult; matchedRow: EntrenamientoRestriccion | null }`.

**Rationale**: `create()` needs the matched row's service IDs to build the deductions array. Returning the matched row from the validation function avoids a second DB query to re-fetch it.

## Risks / Trade-offs

- **Legacy columns unused but present** → `plan_id`/`disciplina_id` remain in the schema. No restriction logic reads them, so existing restriction rows silently become unrestricted until reconfigured. Admin must be aware and re-enter restrictions after this migration. Mitigation: document clearly in the UI and in the admin release notes.
- **Double-loop in RPC** → The pre-validate pass adds a small N round-trips inside one DB function. For N ≤ 4, this is negligible but worth noting if restrictions ever grow beyond 4 services.
- **`reserva_servicios` orphan risk** → If an RPC errors after inserting the `reservas` row but before all `reserva_servicios` rows are logged, the restore will be incomplete. Mitigation: the transaction is atomic — any failure rolls back all writes including the `reservas` insert, so orphan rows cannot exist.

## Migration Plan

1. Apply migration locally (`supabase db reset` or `supabase migration up`). Never push to remote in this US.
2. Migration is additive-only: `ALTER TABLE … ADD COLUMN`. Safe for zero-downtime apply.
3. New RPCs replace old ones — old `book_and_deduct_class` / `cancel_and_restore_class` remain in place until a future clean-up US (they are no longer called by the updated service layer).
4. Rollback: drop the 4 new columns, drop `reserva_servicios`, drop the two new RPCs, and revert the service layer changes. The old RPCs and columns are untouched.
