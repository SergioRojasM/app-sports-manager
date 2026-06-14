# US-0068 — Fix Service-Unit Deduction for Admin Bookings on Past Trainings

## ID
US-0068

## Name
Fix: Admin-Created Bookings for Past Trainings Do Not Deduct Service Units

## As a
Tenant administrator (administrador)

## I Want
The service units required by a training to be correctly deducted from the athlete's subscription when I create a retroactive booking for a **past** training session, exactly as they would be deducted for a present/future booking

## So That
The athlete's `suscripcion_servicios.unidades_restantes` balances stay accurate after I register walk-ins or correct missed bookings for sessions that already took place, instead of silently leaving the booking un-charged.

---

## Description

### Current State

`reservasService.create()` (`src/services/supabase/portal/reservas.service.ts`) handles admin bookings via the `bypass_restrictions` flag (US-0061). The booking itself is created successfully, but the **service-unit deduction silently does not happen** when the training (`entrenamientos.fecha_hora`) is in the past. Reservations are inserted via `book_and_deduct_service_units` with an **empty `p_deductions` array**, so no row is written to `reserva_servicios` and no `suscripcion_servicios.unidades_restantes` is decremented.

#### Root cause

Both the admin "matched restriction row" resolution (step 1b in `create()`) and the deduction lookup (`findServiceSubscriptionsToCharge`) determine which of the athlete's subscriptions cover a required `servicio_id` by filtering `suscripcion_servicios` joined to `suscripciones` on:

```ts
.eq('suscripciones.estado', 'activa')
```

This reflects the subscription's **current** status (evaluated "now", at booking-creation time), not its status **at the date of the training**.

A daily cron job (`vencer_suscripciones_expiradas`, `supabase/migrations/20260604000100_cron_vencimiento_suscripciones.sql`) automatically flips `suscripciones.estado` from `'activa'` to `'vencida'` once `fecha_fin < CURRENT_DATE`.

Concrete failure sequence:
1. Athlete had an active subscription covering `servicio_id = X` during the week of the training (`fecha_inicio <= fecha_entrenamiento <= fecha_fin`), with `unidades_restantes > 0` at that time.
2. Time passes. The subscription's `fecha_fin` is now in the past, so the cron job sets `estado = 'vencida'`.
3. Today, the admin creates a booking for the athlete on that **past** training (allowed per US-0061, `bypass_restrictions = true`).
4. Step 1b builds `activeServicioIds` from `suscripcion_servicios` rows where `suscripciones.estado = 'activa'`. The now-expired subscription is excluded, so `X` is **not** in `activeServicioIds`.
5. No `entrenamiento_restricciones` row's service slots are fully covered ⇒ `matchedRow` stays `null`.
6. If the matched restriction row has service slots, `create()` returns `ADMIN_CONFIRM_NO_UNITS`. The admin clicks "create anyway" (`confirmed_no_units = true`), and `matchedRow` remains `null`.
7. `serviceSlots = []` ⇒ `deductions = []` ⇒ `book_and_deduct_service_units` is called with no deductions.
8. The reservation is created, but **no unit is decremented and no `reserva_servicios` row is written** — even though the athlete's subscription clearly covered that service on the day of the training.

This bug is specific to **past** trainings because for present/future bookings, a subscription that is currently valid (`fecha_fin >= today`) almost always still has `estado = 'activa'`, so the `estado = 'activa'` filter and a date-window filter coincide. They diverge only once a subscription's validity window has elapsed relative to "now" but still covered the training's actual date.

### Proposed Changes

Make the service-eligibility lookup **date-aware**: a subscription's `suscripcion_servicios` row is eligible to be matched/charged for a booking if, **as of the training's date** (`entrenamientos.fecha_hora`), the subscription:

- has `estado <> 'cancelada'` (explicitly cancelled subscriptions are never eligible, regardless of date), **and**
- `fecha_inicio IS NULL OR fecha_inicio <= referenceDate`, **and**
- `fecha_fin IS NULL OR fecha_fin >= referenceDate`

...where `referenceDate` is the **local calendar date** (`YYYY-MM-DD`) derived from `entrenamientos.fecha_hora` (or "today" if `fecha_hora IS NULL`).

This is a strict generalization of the current `estado = 'activa'` check: for a present/future training, `referenceDate` is today or later, so a subscription satisfying the date-window condition with `estado <> 'cancelada'` is, in practice, the same set of subscriptions that currently have `estado = 'activa'`. For a past training, it additionally includes subscriptions that have since transitioned to `'vencida'` purely due to the passage of time, but which legitimately covered the training's date.

#### 1. New shared helper — `getServicioEntitlements`

Add a private helper in `reservas.service.ts`:

```ts
type ServicioEntitlement = {
  suscripcionId: string;
  unidadesRestantes: number | null;
};

async function getServicioEntitlements(
  tenantId: string,
  atletaId: string,
  referenceDate: string, // 'YYYY-MM-DD'
): Promise<Map<string, ServicioEntitlement[]>>
```

- Queries `suscripcion_servicios` joined to `suscripciones!inner(tenant_id, atleta_id, estado, fecha_inicio, fecha_fin)`, filtered server-side by `tenant_id`, `atleta_id`, and `suscripciones.estado <> 'cancelada'` (no `unidades_restantes` filter — both exhausted and available rows are needed to distinguish "exhausted" from "never had access").
- In application code, filters out rows where the subscription's date window does not cover `referenceDate`:
  ```ts
  const fechaInicio = row.suscripciones.fecha_inicio as string | null;
  const fechaFin = row.suscripciones.fecha_fin as string | null;
  const covers =
    (fechaInicio === null || fechaInicio <= referenceDate) &&
    (fechaFin === null || fechaFin >= referenceDate);
  ```
- Groups the remaining rows by `servicio_id` into a `Map<servicioId, ServicioEntitlement[]>`, each list sorted ascending by `unidades_restantes` with `null` (unlimited) last — mirroring the current `.order('unidades_restantes', { ascending: true, nullsFirst: false })` behavior.

#### 2. New helper — `getEntrenamientoFechaHora` + `toLocalDateString`

```ts
async function getEntrenamientoFechaHora(entrenamientoId: string, tenantId: string): Promise<string | null>
```

Fetches `entrenamientos.fecha_hora` (single point-query by PK, same shape as the existing `isEntrenamientoPast` helper).

```ts
function toLocalDateString(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
```

Reuses the same local-date derivation style as the existing `formatFechaHora` helper (avoids UTC-shift artifacts at day boundaries).

#### 3. `create()` — compute `referenceDate` once, use it for deduction resolution

At the top of `create()`, **before** the `bypass_restrictions` branch, fetch `fecha_hora` once via `getEntrenamientoFechaHora` and compute:

```ts
const referenceDate = toLocalDateString(await getEntrenamientoFechaHora(input.entrenamiento_id, input.tenant_id));
```

This single extra point-query runs for both admin and non-admin bookings (negligible overhead, same as `isEntrenamientoPast`).

**Step 1b (admin matchedRow resolution)** — replace the inline `suscripcion_servicios` query (filtered by `suscripciones.estado = 'activa'`) with:

```ts
const entitlements = await getServicioEntitlements(input.tenant_id, input.atleta_id, referenceDate);
const activeServicioIds = new Set<string>(
  [...entitlements.entries()]
    .filter(([, rows]) => rows.some((r) => r.unidadesRestantes === null || r.unidadesRestantes > 0))
    .map(([servicioId]) => servicioId),
);
```

**Step 2 (`findServiceSubscriptionsToCharge`)** — change its signature to accept `referenceDate` and reuse the same `getServicioEntitlements` map instead of issuing its own per-`servicioId` `suscripcion_servicios` queries:

```ts
async function findServiceSubscriptionsToCharge(
  tenantId: string,
  atletaId: string,
  servicioIds: string[],
  referenceDate: string,
): Promise<ServiceChargeEntry[]>
```

For each `servicioId`:
- Look up `entitlements.get(servicioId)`.
- If the first (lowest `unidades_restantes`) entry has `unidadesRestantes === null || unidadesRestantes > 0` → `{ suscripcionId: unidadesRestantes === null ? null : entry.suscripcionId, servicioId, exhausted: false }`.
- Else if any entry exists with `unidadesRestantes === 0` → `{ suscripcionId: null, servicioId, exhausted: true }`.
- Else (no entitlement rows at all for this service, regardless of date) → `{ suscripcionId: null, servicioId, exhausted: false }` (unchanged from current "no subscription found, no deduction" behavior).

Update the call site in `create()`:

```ts
const chargeEntries = await findServiceSubscriptionsToCharge(
  input.tenant_id,
  input.atleta_id,
  serviceSlots,
  referenceDate,
);
```

#### 4. `validateBookingRestrictions` — use the same date-aware entitlement set

The non-admin path (`validateBookingRestrictions`) currently builds its own `activeServicioIds` set with the same `suscripciones.estado = 'activa'` filter (step 4b in the function). Replace it with a call to `getServicioEntitlements(tenantId, atletaId, referenceDate)`, where `referenceDate = toLocalDateString(ent.fecha_hora)` (using the `fecha_hora` already loaded at the top of this function — no extra query). This keeps both code paths consistent and is a no-op behavior change for athletes, since US-0040 already blocks athlete bookings on past trainings (so `referenceDate` is always today or later for this path).

#### 5. No changes to RPCs or migrations

`book_and_deduct_service_units` and `cancel_and_restore_service_units` (migration `20260612000100_restricciones_por_servicio.sql`) are unchanged. They already operate generically on whatever `p_deductions` array / `reserva_servicios` ledger they receive — the fix is entirely about **which subscription rows are eligible to appear in that array**, computed in the application layer.

Cancellation/restoration (`cancel_and_restore_service_units`) is also unaffected: it restores units based on the `reserva_servicios` ledger written at booking time, so a unit correctly deducted from a now-`vencida` subscription (per this fix) will be correctly restored to that same subscription if the booking is later cancelled.

---

## Database Changes

None. No new migration is required. This is a pure application-layer (service) fix.

Relevant existing schema (unchanged):
- `public.suscripciones` — `(id, tenant_id, atleta_id, plan_id, fecha_inicio date, fecha_fin date, clases_restantes, estado varchar check in ('activa','vencida','cancelada'), created_at)`.
- `public.suscripcion_servicios` — `(id, suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes, created_at, updated_at)`.
- `public.reserva_servicios` — `(id, reserva_id, suscripcion_id, servicio_id, created_at)`, ledger written by `book_and_deduct_service_units`.
- `public.vencer_suscripciones_expiradas()` — daily cron (`vencer-suscripciones-diarias`, 06:00 UTC) that sets `estado = 'vencida'` once `fecha_fin < CURRENT_DATE`. **Unchanged** — this fix works around its effect on retroactive bookings, it does not modify the cron itself.

---

## API / Server Actions

No new API routes or RPCs. All changes are internal to `src/services/supabase/portal/reservas.service.ts`.

| Function | Change |
|----------|--------|
| `getServicioEntitlements(tenantId, atletaId, referenceDate)` | **New** private helper — returns `Map<servicioId, ServicioEntitlement[]>` for the athlete's non-cancelled subscriptions whose `[fecha_inicio, fecha_fin]` window covers `referenceDate` |
| `getEntrenamientoFechaHora(entrenamientoId, tenantId)` | **New** private helper — point-query for `entrenamientos.fecha_hora` |
| `toLocalDateString(iso)` | **New** private helper — derives `YYYY-MM-DD` from an ISO timestamp using local date components (or "today" if `null`) |
| `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds, referenceDate)` | **Modified** — adds `referenceDate` param; resolves entries from `getServicioEntitlements` instead of per-service `estado = 'activa'` queries |
| `validateBookingRestrictions(entrenamientoId, atletaId, tenantId)` | **Modified** — `activeServicioIds` (step 4b) now built from `getServicioEntitlements(tenantId, atletaId, toLocalDateString(ent.fecha_hora))` instead of an inline `estado = 'activa'` query |
| `create(input)` | **Modified** — fetches `fecha_hora` once via `getEntrenamientoFechaHora`, computes `referenceDate`, and threads it into step 1b (`activeServicioIds`) and step 2 (`findServiceSubscriptionsToCharge`) |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `getServicioEntitlements`, `getEntrenamientoFechaHora`, `toLocalDateString` helpers; modify `findServiceSubscriptionsToCharge` signature; modify `validateBookingRestrictions` step 4b; modify `create()` to compute and thread `referenceDate` |

No other files (types, hooks, components, migrations) need to change — `CreateReservaInput`, `BookingResult`, `useReservas.ts`, and the RPC functions are all unaffected.

---

## Acceptance Criteria

1. Given an athlete had an active subscription whose `[fecha_inicio, fecha_fin]` window covered a past training's `fecha_hora`, and that subscription's matching `suscripcion_servicios` row for the training's required `servicio_id` had `unidades_restantes > 0` **at that time**, and the subscription's `estado` is now `'vencida'` (expired by the daily cron since then): when an admin creates a booking for that athlete on that past training, the booking is created **and** `reserva_servicios` gets a new row linking the reservation to that `servicio_id` and `suscripcion_id`, **and** `suscripcion_servicios.unidades_restantes` for that row is decremented by exactly 1.
2. In the same scenario, the admin is **not** shown the `ADMIN_CONFIRM_NO_UNITS` prompt — the required service is correctly recognized as covered, so `matchedRow` resolves on the first pass.
3. If the matched (date-eligible) subscription's `suscripcion_servicios.unidades_restantes = 0` for the required service (already exhausted as of the training date), the booking attempt is rejected with `UNIDADES_AGOTADAS` (or, without `confirmed_no_units`, surfaces via the existing `ADMIN_CONFIRM_NO_UNITS` → confirm flow as appropriate) — i.e., the fix must not allow over-drawing an exhausted subscription just because it is now `vencida`.
4. If **no** subscription (active, expired, or otherwise) had a `[fecha_inicio, fecha_fin]` window covering the training's date for the required service, behavior is unchanged from today: `matchedRow` is not found, and (if the restriction row has service slots) the admin sees `ADMIN_CONFIRM_NO_UNITS`; confirming creates the booking with no deduction.
5. A subscription with `estado = 'cancelada'` is **never** eligible for matching/deduction, regardless of whether its date window covers the training date (past or future).
6. Bookings on **present/future** trainings — for both athletes and admins — behave exactly as before: the set of services considered "available" is unchanged (verified by regression testing the existing US-0064/US-0035/US-0061 flows).
7. Cancelling a reservation that was retroactively charged per AC1 correctly restores the unit to the (now `vencida`) subscription via `cancel_and_restore_service_units`, and removes the `reserva_servicios` ledger row — exactly as it does for non-retroactive bookings.
8. A training with `fecha_hora = null` falls back to "today" as `referenceDate` for entitlement resolution (no crash, no incorrect exclusion).

---

## Implementation Steps

- [ ] Add `toLocalDateString(iso: string | null): string` helper near `formatFechaHora` in `reservas.service.ts`.
- [ ] Add `getEntrenamientoFechaHora(entrenamientoId, tenantId): Promise<string | null>` helper (mirrors `isEntrenamientoPast`'s query shape).
- [ ] Add `ServicioEntitlement` type and `getServicioEntitlements(tenantId, atletaId, referenceDate): Promise<Map<string, ServicioEntitlement[]>>` helper: query `suscripcion_servicios` joined to `suscripciones!inner(tenant_id, atleta_id, estado, fecha_inicio, fecha_fin)` filtered by `tenant_id`, `atleta_id`, `estado <> 'cancelada'`; filter by date-window coverage in JS; group by `servicio_id`, sorted by `unidades_restantes` ascending (nulls last).
- [ ] Update `findServiceSubscriptionsToCharge` to accept `referenceDate` and resolve entries via `getServicioEntitlements` (replace the per-`servicioId` Supabase queries).
- [ ] Update `validateBookingRestrictions`: compute `referenceDate = toLocalDateString(ent.fecha_hora)` and replace the inline `activeServicioIds` query (step 4b) with `getServicioEntitlements`.
- [ ] In `create()`: fetch `fecha_hora` via `getEntrenamientoFechaHora` once near the top (for both bypass and non-bypass paths), compute `referenceDate`.
- [ ] In `create()` step 1b (admin matchedRow resolution): replace the inline `suscripcion_servicios` query with `getServicioEntitlements(input.tenant_id, input.atleta_id, referenceDate)` and derive `activeServicioIds` from it.
- [ ] In `create()` step 2: pass `referenceDate` to `findServiceSubscriptionsToCharge`.
- [ ] Manually test (per AC1–AC2): create a subscription with `fecha_inicio`/`fecha_fin` in the past covering an existing past training's date, with `unidades_restantes = 1` for the training's required service; let it become `vencida` (either via the cron function or by manually setting `estado = 'vencida'` for the test); as admin, create a booking for that athlete on that past training; verify `reserva_servicios` row created and `unidades_restantes` decremented to `0`.
- [ ] Manually test (AC3): repeat with `unidades_restantes = 0` on the matched subscription; verify rejection (`UNIDADES_AGOTADAS`), no reservation created, no further decrement.
- [ ] Manually test (AC4): repeat with no subscription covering the training's date at all; verify `ADMIN_CONFIRM_NO_UNITS` → confirm → booking created with no `reserva_servicios` row (unchanged from current behavior).
- [ ] Manually test (AC5): repeat AC1 scenario but with the matched subscription's `estado = 'cancelada'` instead of `'vencida'`; verify it is excluded and behaves like AC4.
- [ ] Regression test (AC6): athlete self-booking on a future training with an active subscription and available units — deduction still works as before; admin booking on a future training — same.
- [ ] Manually test (AC7): cancel the booking created in AC1; verify `unidades_restantes` restored to `1` and the `reserva_servicios` row removed.
- [ ] Manually test (AC8): create/inspect a training with `fecha_hora = null` and confirm no runtime error during booking creation.

---

## Non-Functional Requirements

- **Security**: No RLS or permission changes. `getServicioEntitlements` runs under the same `authenticated` client context as the existing queries it replaces; it does not widen the set of rows a user can read (still scoped to `tenant_id` + `atleta_id` via the `suscripciones!inner` join, same as today).
- **Performance**: Adds one point-query (`getEntrenamientoFechaHora`) per `create()` call — negligible, same shape as the existing `isEntrenamientoPast` query. `getServicioEntitlements` replaces what was previously **N** per-`servicioId` queries in `findServiceSubscriptionsToCharge` with a **single** query covering all of the athlete's `suscripcion_servicios` rows, then groups in memory — a net performance improvement for trainings with multiple required services.
- **Accessibility**: No UI changes.
- **Error handling**: No new error codes. Existing `UNIDADES_AGOTADAS` and `ADMIN_CONFIRM_NO_UNITS` codes continue to be used for the cases described in AC3/AC4. If the `getServicioEntitlements` query fails, it should throw via the existing `mapServiceError` helper, consistent with other query failures in this file.
