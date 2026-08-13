## Context

`reservasService.create()` (`src/services/supabase/portal/reservas.service.ts`) supports two booking paths:

- **Athlete path** (`bypass_restrictions` falsy): `validateBookingRestrictions()` evaluates `entrenamiento_restricciones` rows and, for the service-slot condition (step 4b), builds `activeServicioIds` from `suscripcion_servicios` joined to `suscripciones!inner(...)` filtered on `suscripciones.estado = 'activa'`.
- **Admin bypass path** (`bypass_restrictions = true`, US-0061): step 1b performs an equivalent `estado = 'activa'` lookup to find a `matchedRow`, then step 2 calls `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds)`, which issues **one query per `servicio_id`**, each filtered on `suscripciones.estado = 'activa'` and `unidades_restantes > 0 OR unidades_restantes IS NULL`.

A daily cron (`vencer_suscripciones_expiradas`, `supabase/migrations/20260604000100_cron_vencimiento_suscripciones.sql`) sets `suscripciones.estado = 'vencida'` once `fecha_fin < CURRENT_DATE AND estado = 'activa'`.

For present/future bookings, "subscription is currently `'activa'`" and "subscription's date window covers the training's date" are practically equivalent — a subscription valid for a future date is, by definition, also valid today. They **diverge only for past trainings**: an admin booking a past session today may find that the subscription which covered that past date has since rolled over to `'vencida'`, so the `estado = 'activa'` filter excludes it, `matchedRow` stays `null`, `serviceSlots = []`, and `book_and_deduct_service_units` is called with an empty `p_deductions` array — the booking is created but no unit is ever decremented.

## Goals / Non-Goals

**Goals:**
- Make service-entitlement eligibility a function of **the training's date** (`referenceDate`), not "now", so retroactive admin bookings correctly deduct from subscriptions that covered that date — even if those subscriptions have since expired (`estado = 'vencida'`).
- Preserve `UNIDADES_AGOTADAS` protection: an entitlement row that covers `referenceDate` but has `unidades_restantes = 0` must still block the booking, not silently skip deduction.
- Keep present/future booking behavior (athlete and admin) byte-for-byte equivalent to today.
- Reduce the N-per-service query pattern in `findServiceSubscriptionsToCharge` to a single query via a shared helper.

**Non-Goals:**
- No changes to `book_and_deduct_service_units`, `cancel_and_restore_service_units`, or any migration — the RPCs already operate generically on whatever `p_deductions` they're given.
- No changes to `vencer_suscripciones_expiradas` or the daily cron schedule.
- No changes to `CreateReservaInput`, `BookingResult`, `useReservas.ts`, or any UI component.
- No change to `estado = 'cancelada'` handling — cancelled subscriptions remain permanently ineligible regardless of date.

## Decisions

### 1. Single shared helper `getServicioEntitlements(tenantId, atletaId, referenceDate)`

Replaces both the step-1b inline query and the per-service loop in `findServiceSubscriptionsToCharge` with one query:

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

- Server-side filter: `suscripcion_servicios` joined to `suscripciones!inner(tenant_id, atleta_id, estado, fecha_inicio, fecha_fin)`, `.eq('suscripciones.tenant_id', tenantId)`, `.eq('suscripciones.atleta_id', atletaId)`, `.neq('suscripciones.estado', 'cancelada')`.
- **No `unidades_restantes` filter** at the query level — both exhausted (`= 0`) and available rows are needed to distinguish "exhausted as of this date" from "no entitlement at all".
- Application-level date-window filter:
  ```ts
  const covers =
    (fechaInicio === null || fechaInicio <= referenceDate) &&
    (fechaFin === null || fechaFin >= referenceDate);
  ```
- Groups surviving rows by `servicio_id`, each list sorted ascending by `unidades_restantes` with `null` (unlimited) last — mirrors the existing `.order('unidades_restantes', { ascending: true, nullsFirst: false })`.

**Alternative considered**: keep per-service queries but add `.lte('suscripciones.fecha_inicio', referenceDate).gte('suscripciones.fecha_fin', referenceDate)` (or `.is(...)` for nulls) to each. Rejected — Supabase's PostgREST filter syntax for "column is null OR column <op> value" across a joined table is awkward (`.or()` with dotted/embedded paths is unreliable), and this would keep the N-per-service round trips. A single broader query + in-memory filtering is simpler, more testable, and strictly fewer round trips.

### 2. `referenceDate` derivation: `getEntrenamientoFechaHora` + `toLocalDateString`

```ts
async function getEntrenamientoFechaHora(entrenamientoId: string, tenantId: string): Promise<string | null>
function toLocalDateString(iso: string | null): string
```

- `getEntrenamientoFechaHora` mirrors the existing `isEntrenamientoPast` query shape (point lookup by PK + `tenant_id`).
- `toLocalDateString` reuses the local-date-component approach already used by `formatFechaHora` (avoids UTC day-boundary shift bugs). `iso === null` → returns today's local date.
- `referenceDate` is computed **once** near the top of `create()`, before branching on `bypass_restrictions`, so both paths share the same value and pay only one extra point-query (negligible — same shape as the existing `isEntrenamientoPast` call).

**Alternative considered**: compute `referenceDate` independently inside `validateBookingRestrictions` (it already loads `entrenamientos.fecha_hora` for its own checks) and inside `create()`'s bypass branch (separate `getEntrenamientoFechaHora` call). Rejected for the non-bypass path — `validateBookingRestrictions` already has `ent.fecha_hora` in scope, so it derives `referenceDate` locally from that value with no extra query; only the bypass/admin path and the shared `create()` entry need the new helper call.

### 3. `findServiceSubscriptionsToCharge` signature change

New signature: `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds, referenceDate)`. For each `servicioId`, look up `entitlements.get(servicioId)`:

- First (lowest `unidadesRestantes`, nulls last) entry has `null` or `> 0` → not exhausted; `suscripcionId` = that entry's id, or `null` if unlimited.
- Else if any entry has `unidadesRestantes === 0` → `{ suscripcionId: null, servicioId, exhausted: true }` → caller returns `UNIDADES_AGOTADAS`.
- Else (no entitlement rows at all for this service/date) → `{ suscripcionId: null, servicioId, exhausted: false }` — unchanged "no subscription found, no deduction" fallback (drives `ADMIN_CONFIRM_NO_UNITS` for admins).

This is a strict generalization: for present/future trainings the entitlement set returned by `getServicioEntitlements(tenantId, atletaId, today_or_later)` is the same set that today's `estado = 'activa'` + `unidades_restantes > 0 OR NULL` query would return, so existing call sites see identical results.

### 4. `validateBookingRestrictions` step 4b reuse

Replace the inline `estado = 'activa'` query with `getServicioEntitlements(tenantId, atletaId, toLocalDateString(ent.fecha_hora))`, deriving `activeServicioIds` the same way as `create()`'s step 1b. Documented as a no-op for athletes (US-0040 already blocks past-training bookings for the athlete path), but keeps both code paths on one source of truth.

## Risks / Trade-offs

- **[Risk]** A subscription that is `'vencida'` purely due to time but covered the training's date is now eligible for *matching* (step 1b / restriction satisfaction), not just charging. → **Mitigation**: this is intentional and scoped — `estado <> 'cancelada'` is the only status gate; `'vencida'` subscriptions whose date window does not cover `referenceDate` remain excluded, and `'cancelada'` subscriptions remain excluded unconditionally (AC5).
- **[Risk]** `getServicioEntitlements` returns a broader row set (includes `unidades_restantes = 0` rows) than the previous per-service queries, which could change ordering/selection if not handled carefully. → **Mitigation**: explicit three-way resolution in `findServiceSubscriptionsToCharge` (available → exhausted → none) replicates prior semantics; covered by AC1–AC4.
- **[Risk]** Regression in present/future booking flows if `getServicioEntitlements`'s date-window filter inadvertently excludes a currently-`'activa'` subscription (e.g. `fecha_inicio`/`fecha_fin` edge cases). → **Mitigation**: AC6 requires explicit regression testing of existing US-0064/US-0061/US-0035 flows; the `<=`/`>=` boundary comparisons are inclusive, matching the `suscripciones_fechas_ck` semantics.
- **[Trade-off]** One extra point-query (`getEntrenamientoFechaHora`) per `create()` call on the bypass path. → Accepted: negligible cost, same shape as the existing `isEntrenamientoPast` call, and is offset by collapsing N per-service queries into one in `findServiceSubscriptionsToCharge`.

## Migration Plan

No database migration. Deploy is a single application code change to `reservas.service.ts`. Rollback is a plain revert of that file — no data backfill or schema rollback required. Local verification only (no remote Supabase migration push needed, per project convention).

## Open Questions

None — all behaviors (including `fecha_hora = null` fallback and `estado = 'cancelada'` exclusion) are fully specified in the linked user story (US-0068) and acceptance criteria.
