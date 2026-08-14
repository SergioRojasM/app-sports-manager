## Context

When a subscription is created, the system currently stores a single `clases_restantes` integer on `suscripciones`. US-0062 introduced `plan_tipos_servicios`, enabling a plan subtype to specify N services with per-service unit allocations (`unidades`, nullable for unlimited). There is no mechanism to snapshot or track these per-service entitlements at subscription time.

This change introduces `suscripcion_servicios` — a child table that captures the per-service unit entitlement at the moment of subscription creation — and a SECURITY DEFINER RPC to populate it atomically.

## Goals / Non-Goals

**Goals:**
- Add `suscripcion_servicios` table with RLS and updated_at trigger
- Add `populate_suscripcion_servicios` SECURITY DEFINER function called after subscription insert
- Update both subscription creation paths (athlete self-service + admin) to call the RPC
- Add `getSuscripcionServicios()` read function and `SuscripcionServicio` TypeScript type

**Non-Goals:**
- Modifying `book_and_deduct_class` / `cancel_and_restore_class` to deduct from `suscripcion_servicios`
- Any UI displaying per-service unit balances
- Backfilling existing subscriptions
- Removing `clases_restantes` from `suscripciones`

## Decisions

### Decision 1: New child table `suscripcion_servicios` vs. column on `suscripciones`

**Chosen**: New child table.

**Rationale**: A `plan_tipo` can have multiple service assignments in `plan_tipos_servicios`. A single `servicio_id` column on `suscripciones` can only represent one service. A child table with one row per (subscription × service) naturally represents 0..N services per subscription, including the degenerate case of 0 rows when no subtype is selected.

**Alternative considered**: Adding parallel `servicio_ids[]` and `unidades_restantes[]` arrays to `suscripciones`. Rejected because array columns violate 1NF, make RLS and query logic complex, and complicate the future deduction RPC.

### Decision 2: SECURITY DEFINER function for population vs. direct INSERT from service layer

**Chosen**: SECURITY DEFINER function `populate_suscripcion_servicios`.

**Rationale**: Follows the established pattern in this codebase (`book_and_deduct_class`, `cancel_and_restore_class`). Direct INSERT from `authenticated` would require an INSERT RLS policy on `suscripcion_servicios` that allows the athlete to write to their own subscription rows — this opens a vector for a malicious client to craft arbitrary entitlement rows. The SECURITY DEFINER approach keeps all write authority server-side, consistent with the security posture of the booking deduction flow.

**Alternative considered**: INSERT RLS policy scoped to own subscriptions. Rejected because it would allow a client to call the Supabase JS client's `.from('suscripcion_servicios').insert(...)` directly, bypassing the business logic (reading from `plan_tipos_servicios`).

### Decision 3: Snapshot `unidades_incluidas` vs. always read from `plan_tipos_servicios` at deduction time

**Chosen**: Snapshot `unidades_incluidas` at subscription creation time.

**Rationale**: `plan_tipos_servicios.unidades` can change after the subscription is created (admin edits the plan). Snapshotting protects existing subscriptions from retroactive changes. Mirrors how `clases_plan` on `suscripciones` already snapshots the class count at subscription time.

### Decision 4: `ON CONFLICT DO NOTHING` on `populate_suscripcion_servicios`

**Chosen**: Silent idempotency via `ON CONFLICT (suscripcion_id, servicio_id) DO NOTHING`.

**Rationale**: If the RPC is accidentally called twice (e.g., retry after a transient error), no duplicate rows are created. `unidades_restantes` is not overwritten, which would incorrectly reset a partially consumed balance.

## Risks / Trade-offs

- **Risk**: `populate_suscripcion_servicios` succeeds for some services and then the connection drops mid-insert. The unique constraint and idempotent conflict resolution mean a retry will safely skip already-inserted rows and insert the missing ones. → **Mitigation**: `ON CONFLICT DO NOTHING` ensures idempotency.

- **Risk**: A plan type's services are modified after subscriptions are created. Existing `suscripcion_servicios` rows are unaffected (they hold snapshots). New subscriptions will reflect the updated service list. → **Mitigation**: Snapshot design is intentional; acceptable trade-off.

- **Risk**: Subscription created without `plan_tipo_id` (no subtype) leaves `suscripcion_servicios` empty. Future deduction code must handle this case. → **Mitigation**: Noted in non-goals; deduction code is out of scope for this story.

- **Trade-off**: Direct INSERT by `authenticated` role is blocked. Any future feature that needs to write to `suscripcion_servicios` must go through a SECURITY DEFINER function. This is intentional to protect unit balances from client-side tampering.

## Migration Plan

1. Write migration `supabase/migrations/20260611000100_suscripcion_servicios.sql`.
2. Apply locally: `npx supabase db reset` or `npx supabase migration up`.
3. Verify table/function exists in local Supabase Studio.
4. Deploy to remote via CI/CD pipeline (do NOT push manually with `supabase db push`).

**Rollback**: Drop `suscripcion_servicios` table and `populate_suscripcion_servicios` function. No existing data depends on these — this story introduces them from scratch.

## Open Questions

- None. Design is fully defined by the US-0063 acceptance criteria.
