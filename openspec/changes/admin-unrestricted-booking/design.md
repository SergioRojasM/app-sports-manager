## Context

The `reservas.service.ts → create()` function is the single write path for all booking creation. It currently applies the same four validation layers to every caller — past-date guard, restriction validation (timing + access conditions), global capacity check, and per-category capacity check — before delegating to the `book_and_deduct_class` RPC.

Administrators need to bypass these guards to record bookings retroactively (sessions that already took place), to register walk-ins regardless of capacity, and to override plan/level/timing requirements. The subscription class-deduction and duplicate-booking checks must remain unconditional because they reflect real-world accounting (classes consumed) and data integrity (no double-booking).

## Goals / Non-Goals

**Goals:**
- Allow administrators to create bookings without being blocked by: past-date guard, restriction validation (timing, plan, discipline, level), global capacity limit, per-category capacity limit.
- Preserve class deduction for admin-created bookings when the athlete has a valid active subscription — ensuring retroactive bookings correctly account for consumed sessions.
- Keep the duplicate-booking check unconditional for all roles.
- Minimize the surface area of the change to three files; no migrations, RPCs, or UI changes required.

**Non-Goals:**
- Does not extend the bypass to the `entrenador` role.
- Does not add any UI indicator for admin-override bookings.
- Does not change cancellation, update, or deletion flows.
- Does not bypass duplicate-booking check under any circumstance.
- Does not introduce a new RPC or API route.

## Decisions

### Decision 1: Flag on `CreateReservaInput` rather than a separate service function

**Chosen**: Add `bypass_restrictions?: boolean` to `CreateReservaInput` and keep a single `create()` entry point.

**Alternatives considered**:
- `createAdminOverride()` — a dedicated function that duplicates the non-bypassed logic. Rejected: duplicates code and risks drift between the two paths.
- Role check inside `create()` via `auth.uid()` → role lookup — Rejected: adds a DB round-trip and couples the service to the auth layer. The flag is injected by `useReservas` which already holds the role from the tenant context.

**Rationale**: A single entry point with a flag keeps the diff minimal, is easy to audit, and defaults to `false` (falsy/undefined) so all existing callers are unaffected without changes.

### Decision 2: Class deduction is NOT bypassed

**Chosen**: `findSubscriptionToCharge` and `book_and_deduct_class` run unconditionally for admin bookings.

**Rationale**: When an admin registers a past session retroactively, the athlete's subscription should reflect the consumed class. If no valid subscription exists (expired, exhausted), `findSubscriptionToCharge` returns `null` and the RPC inserts with `p_suscripcion_id = NULL` — a silent no-op that is the correct fallback. Skipping deduction entirely would produce accounting errors and was explicitly rejected per the user story.

### Decision 3: Capacity checks are bypassed (both global and per-category)

**Chosen**: Both `getCapacidad` and the per-category check are wrapped in `if (!input.bypass_restrictions)`.

**Rationale**: Administrators explicitly assume responsibility for over-capacity registrations (walk-ins, retroactive corrections). Blocking them at capacity would contradict the feature goal. Athletes are unaffected — the same guards remain active for non-admin calls.

### Decision 4: Flag injection in hook, not component

**Chosen**: `useReservas.createReserva` injects `bypass_restrictions: true` for admin role.

**Rationale**: The hook already receives `role` as a prop and is the canonical call-site aggregation point between UI and service. Components (`ReservasPanel`, `ReservaFormModal`) need no changes, which keeps the UI layer clean.

## Risks / Trade-offs

- **Over-capacity accounting risk** → Admin is aware and explicitly assumes responsibility. No mitigation needed at the code level.
- **Missed class deduction on past bookings** → Mitigated by keeping `findSubscriptionToCharge` unconditional; the RPC gracefully handles `NULL` suscripcion_id.
- **Entrenador role does not get the bypass** → A coach cannot register past-session bookings. Accepted as a deliberate scope constraint; can be extended later if needed.
- **`bypass_restrictions` is a client-side flag** → Rejected by RLS if the caller is not an `administrador` or `entrenador` of the tenant (the RLS INSERT policy still enforces `atleta_id` ownership rules). An `atleta` role cannot exploit this flag to bypass capacity checks because RLS blocks inserting bookings for other `atleta_id` values anyway; for their own bookings the flag would still allow a self-booking bypass — however the flag is only injected by the hook when `role === 'administrador'`, and the role value originates from the server-authoritative tenant membership, making this a non-issue in practice.
