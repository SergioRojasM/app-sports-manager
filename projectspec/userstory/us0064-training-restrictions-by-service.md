# US-0064 — Training Restrictions by Service

## ID
US-0064

## Name
Replace Plan/Discipline Restrictions with Service-Based Restrictions on Trainings

## As a
Tenant administrator

## I Want
To configure training access restrictions based on the tenant's service catalog (up to 4 services per rule, combined with AND logic, multiple rules with OR logic), replacing the current plan/discipline-based restriction model, and to have the booking RPC deduct one unit from **each** service listed in the matching restriction row — not just one service

## So That
Access control is tied to the service-unit entitlement ledger introduced in US-0063, making it consistent: an athlete who has an active subscription covering all required services (with units remaining) is allowed to book, and one unit is atomically deducted from each of those services in a single database transaction.

---

## Description

### Current State
`entrenamiento_restricciones` and `entrenamiento_grupo_restricciones` each contain `plan_id` and `disciplina_id` nullable FK columns to express "must have an active subscription to this plan / that includes this discipline". When a booking is created, `validateBookingRestrictions` pre-fetches the athlete's active plans and plan-discipline assignments, then evaluates every OR row. If a `plan_id` match is found, `findSubscriptionToCharge` resolves which subscription to deduct from, and the `book_and_deduct_class` RPC decrements `clases_restantes` in `suscripciones`.

There is no admin-facing description or guide text on a restriction rule — admins must infer the meaning from raw dropdowns.

### Proposed Changes

#### 1. Database schema — restriction tables
- Add four nullable service FK columns per restriction row: `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id`, each `uuid REFERENCES public.servicios(id) ON DELETE SET NULL`. This keeps each OR row self-contained, matches the visual "4 AND slots" UI pattern, and avoids an extra junction table and join.
- Add a `descripcion` text column (nullable) to both tables as an optional admin-visible label or guide note for the rule.
- The existing `plan_id` and `disciplina_id` columns are **left in place** in this US — they become unused legacy columns. Their removal is deferred to a dedicated clean-up US.

#### 2. Booking RPC — multi-service unit deduction
- Rename/replace `book_and_deduct_class` and `cancel_and_restore_class` so the deduction targets `suscripcion_servicios.unidades_restantes` for **every** service in the matched restriction row, not `suscripciones.clases_restantes`.
- A new `reserva_servicios` table tracks which `(suscripcion_id, servicio_id)` pairs were deducted for each `reserva_id`, enabling accurate restoration on cancellation.
- The new RPC `book_and_deduct_service_units(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_deductions jsonb)` must atomically:
  1. Accept `p_deductions` as a JSONB array of objects `[{"suscripcion_id": "...", "servicio_id": "..."}]`. An empty array (`[]`) means no deductions.
  2. For each element: check if `unidades_restantes IS NULL` (unlimited) — if so, skip. Otherwise, decrement `unidades_restantes` where `unidades_restantes > 0`. If no row is updated, raise `'UNIDADES_AGOTADAS'` (ERRCODE P0001).
  3. For each deducted pair (including unlimited ones), insert a row into `reserva_servicios(reserva_id, suscripcion_id, servicio_id)`.
  4. Insert the `reservas` row and return it.
- The restore RPC `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)` must atomically:
  1. Mark the reservation `cancelada` + set `fecha_cancelacion`.
  2. Read all rows from `reserva_servicios` for `p_reserva_id`, then for each, increment `unidades_restantes` in `suscripcion_servicios` (only where `unidades_restantes IS NOT NULL` — skip unlimited rows).
  3. Delete the `reserva_servicios` rows for `p_reserva_id`.
- Both RPCs are `SECURITY DEFINER`.

#### 3. `validateBookingRestrictions` — service-based evaluation
Replace the current plan/discipline logic with service-based logic:
- Pre-fetch the athlete's active service entitlements: `suscripcion_servicios` joined with `suscripciones` (state = 'activa', tenant_id matches), collecting a set of `servicio_id`s that have `unidades_restantes > 0 OR unidades_restantes IS NULL`.
- For each OR row evaluate the AND conditions in order: `usuario_estado`, then `servicio_1_id…servicio_4_id` (skip NULL slots). All non-null service slots must be satisfied (AND).
- Keep `validar_nivel_disciplina` logic unchanged.
- New rejection codes: `'SERVICIO_REQUERIDO'` (replaces `PLAN_REQUERIDO` and `DISCIPLINA_REQUERIDA`).

#### 4. `findServiceSubscriptionsToCharge` — multi-service lookup
Replace plan-based lookup with a multi-service lookup:
- New signature: `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds: string[])` → `Promise<Array<{ suscripcionId: string | null; servicioId: string; exhausted: boolean }>>`.
- For each `servicioId` in the array, query `suscripcion_servicios` joined with `suscripciones` (state = 'activa', tenant_id matches, `servicio_id = servicioId`, `unidades_restantes > 0 OR unidades_restantes IS NULL`). Return one entry per service. NULL `unidades_restantes` → `suscripcionId: null` (unlimited — logged in `reserva_servicios` but not decremented). No match → `exhausted: true` for that service.
- If any service returns `exhausted: true`, reject the booking with code `'UNIDADES_AGOTADAS'` before calling the RPC.
- The resulting array is passed as `p_deductions` to `book_and_deduct_service_units`.

#### 5. UI — `EntrenamientoRestriccionesSection`
- Remove the "Plan" and "Discipline" dropdowns from each restriction row.
- Add up to 4 "Service" dropdowns (labeled Servicio 1–4) per row, each populated from the tenant's services catalog. Slots are nullable (empty = not required).
- Add an optional `descripcion` text field per rule (single-line input, max 200 chars) rendered above the service slots, with placeholder "Ej: Requerido para clases premium de natación".
- Show a tooltip or inline hint: "Cada fila es una alternativa (OR). Dentro de la fila, todos los servicios marcados deben cumplirse (AND)."

#### 6. Types
- Update `EntrenamientoRestriccion` and `EntrenamientoGrupoRestriccion` to add `servicio_1_id: string | null`, `servicio_2_id: string | null`, `servicio_3_id: string | null`, `servicio_4_id: string | null`, and `descripcion: string | null`. Keep `plan_id` and `disciplina_id` fields to match the DB schema (they will be removed in the future clean-up US).
- Add `BookingRejectionCode` value `'SERVICIO_REQUERIDO'`.
- Remove `'PLAN_REQUERIDO'` and `'DISCIPLINA_REQUERIDA'` codes (or mark deprecated).

---

## Database Changes

### Migration: `supabase/migrations/20260612000100_restricciones_por_servicio.sql`

```sql
-- NOTE: plan_id and disciplina_id are intentionally kept in both tables.
-- They will be dropped in a future clean-up US once the service-based model is confirmed stable.

-- 1. entrenamiento_restricciones: add service columns + descripcion
ALTER TABLE public.entrenamiento_restricciones
  ADD COLUMN descripcion     text,
  ADD COLUMN servicio_1_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_2_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_3_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_4_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL;

-- 2. entrenamiento_grupo_restricciones: same additions
ALTER TABLE public.entrenamiento_grupo_restricciones
  ADD COLUMN descripcion     text,
  ADD COLUMN servicio_1_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_2_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_3_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_4_id   uuid REFERENCES public.servicios(id) ON DELETE SET NULL;

-- 3. Indexes for service lookups
CREATE INDEX idx_ent_restricciones_servicio_1 ON public.entrenamiento_restricciones (servicio_1_id) WHERE servicio_1_id IS NOT NULL;
CREATE INDEX idx_ent_restricciones_servicio_2 ON public.entrenamiento_restricciones (servicio_2_id) WHERE servicio_2_id IS NOT NULL;
CREATE INDEX idx_eg_restricciones_servicio_1  ON public.entrenamiento_grupo_restricciones (servicio_1_id) WHERE servicio_1_id IS NOT NULL;
CREATE INDEX idx_eg_restricciones_servicio_2  ON public.entrenamiento_grupo_restricciones (servicio_2_id) WHERE servicio_2_id IS NOT NULL;

-- 4. New table: reserva_servicios — ledger of service units deducted per booking
CREATE TABLE IF NOT EXISTS public.reserva_servicios (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id     uuid        NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  suscripcion_id uuid        REFERENCES public.suscripciones(id) ON DELETE SET NULL,
  servicio_id    uuid        NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT reserva_servicios_reserva_servicio_uk UNIQUE (reserva_id, servicio_id)
);

CREATE INDEX IF NOT EXISTS idx_reserva_servicios_reserva_id
  ON public.reserva_servicios (reserva_id);
CREATE INDEX IF NOT EXISTS idx_reserva_servicios_suscripcion_id
  ON public.reserva_servicios (suscripcion_id);

ALTER TABLE public.reserva_servicios ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.reserva_servicios TO authenticated;

-- SELECT: own athlete or tenant admin
DROP POLICY IF EXISTS reserva_servicios_select ON public.reserva_servicios;
CREATE POLICY reserva_servicios_select ON public.reserva_servicios
  FOR SELECT TO authenticated
  USING (
    reserva_id IN (
      SELECT r.id FROM public.reservas r
      WHERE r.atleta_id = auth.uid()
         OR r.tenant_id IN (
           SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
         )
    )
  );

-- 5. New RPC: book_and_deduct_service_units
CREATE OR REPLACE FUNCTION public.book_and_deduct_service_units(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid    DEFAULT NULL,
  p_notas                      text    DEFAULT NULL,
  p_deductions                 jsonb   DEFAULT '[]'
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva      public.reservas;
  v_rows         int;
  v_item         jsonb;
  v_suscripcion  uuid;
  v_servicio     uuid;
  v_unlimited    boolean;
BEGIN
  -- Pre-validate: check all finite services have units before any write
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_deductions)
  LOOP
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    IF v_suscripcion IS NOT NULL THEN
      SELECT (unidades_restantes IS NULL)
        INTO v_unlimited
        FROM public.suscripcion_servicios
       WHERE suscripcion_id = v_suscripcion
         AND servicio_id    = v_servicio;

      IF NOT COALESCE(v_unlimited, false) THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.suscripcion_servicios
           WHERE suscripcion_id    = v_suscripcion
             AND servicio_id       = v_servicio
             AND unidades_restantes > 0
        ) THEN
          RAISE EXCEPTION 'UNIDADES_AGOTADAS'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Insert reservation
  INSERT INTO public.reservas (
    tenant_id, atleta_id, entrenamiento_id,
    entrenamiento_categoria_id, estado, fecha_reserva, notas
  ) VALUES (
    p_tenant_id, p_atleta_id, p_entrenamiento_id,
    p_entrenamiento_categoria_id, 'confirmada', now(), p_notas
  )
  RETURNING * INTO v_reserva;

  -- Deduct and log each service
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_deductions)
  LOOP
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    IF v_suscripcion IS NOT NULL THEN
      SELECT (unidades_restantes IS NULL)
        INTO v_unlimited
        FROM public.suscripcion_servicios
       WHERE suscripcion_id = v_suscripcion
         AND servicio_id    = v_servicio;

      IF NOT COALESCE(v_unlimited, false) THEN
        UPDATE public.suscripcion_servicios
           SET unidades_restantes = unidades_restantes - 1
         WHERE suscripcion_id     = v_suscripcion
           AND servicio_id        = v_servicio
           AND unidades_restantes > 0;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
          RAISE EXCEPTION 'UNIDADES_AGOTADAS'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;

    -- Log deduction (including unlimited rows for traceability)
    INSERT INTO public.reserva_servicios (reserva_id, suscripcion_id, servicio_id)
    VALUES (v_reserva.id, v_suscripcion, v_servicio)
    ON CONFLICT (reserva_id, servicio_id) DO NOTHING;
  END LOOP;

  RETURN v_reserva;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_and_deduct_service_units(uuid,uuid,uuid,uuid,text,jsonb) TO authenticated;

-- 6. New RPC: cancel_and_restore_service_units
CREATE OR REPLACE FUNCTION public.cancel_and_restore_service_units(
  p_reserva_id uuid,
  p_tenant_id  uuid
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
  v_rec     record;
BEGIN
  UPDATE public.reservas
     SET estado            = 'cancelada',
         fecha_cancelacion = now()
   WHERE id        = p_reserva_id
     AND tenant_id = p_tenant_id
  RETURNING * INTO v_reserva;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  -- Restore finite units for each logged service deduction
  FOR v_rec IN
    SELECT rs.suscripcion_id, rs.servicio_id
      FROM public.reserva_servicios rs
     WHERE rs.reserva_id = p_reserva_id
       AND rs.suscripcion_id IS NOT NULL
  LOOP
    UPDATE public.suscripcion_servicios
       SET unidades_restantes = unidades_restantes + 1
     WHERE suscripcion_id    = v_rec.suscripcion_id
       AND servicio_id       = v_rec.servicio_id
       AND unidades_restantes IS NOT NULL;  -- skip unlimited rows
  END LOOP;

  -- Remove deduction log
  DELETE FROM public.reserva_servicios WHERE reserva_id = p_reserva_id;

  RETURN v_reserva;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_and_restore_service_units(uuid,uuid) TO authenticated;
```

**RLS policies** for `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones` are unchanged (already in migration 20260319000100).

---

## API / Server Actions

### `src/services/supabase/portal/reservas.service.ts`

#### `validateBookingRestrictions` (updated)
- **Input**: `entrenamientoId: string, atletaId: string, tenantId: string`
- **Returns**: `Promise<BookingResult>`
- **Logic change**: Replace pre-fetch of `suscripciones.plan_id` + `planes_disciplina` with a query on `suscripcion_servicios` joined to `suscripciones` (state = 'activa', tenant_id matches). Collect `Set<string>` of `servicio_id` with available units. Evaluate each OR row: for each non-null `servicio_1_id…servicio_4_id`, check membership in the set. On failure emit `SERVICIO_REQUERIDO`.

#### `findServiceSubscriptionsToCharge` (new, replaces `findSubscriptionToCharge`)
- **File**: `src/services/supabase/portal/reservas.service.ts`
- **Input**: `tenantId: string, atletaId: string, servicioIds: string[]`
- **Returns**: `Promise<Array<{ suscripcionId: string | null; servicioId: string; exhausted: boolean }>>`
- **Logic**: For each `servicioId`, query `suscripcion_servicios ss JOIN suscripciones s` where `s.tenant_id = tenantId AND s.atleta_id = atletaId AND s.estado = 'activa' AND ss.servicio_id = servicioId AND (ss.unidades_restantes > 0 OR ss.unidades_restantes IS NULL)`. Return one entry per service. NULL `unidades_restantes` → `suscripcionId: null` (unlimited). No match → `exhausted: true`.

#### `create` (updated)
- After `validateBookingRestrictions` returns the matching restriction row, collect all non-null service IDs from `servicio_1_id…servicio_4_id` in that row. Call `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds)`. If any entry is exhausted, return `BookingRejection` with code `'UNIDADES_AGOTADAS'`. Otherwise, build the `p_deductions` JSONB array and call `book_and_deduct_service_units` RPC.
- `validateBookingRestrictions` must be updated to return not only the `BookingResult` but also the matched restriction row (or `null` if unrestricted), so `create()` can extract the service IDs.

#### `cancel` (updated)
- Call `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)`. The RPC handles restoration internally via `reserva_servicios`.

### `src/services/supabase/portal/entrenamiento-restricciones.service.ts` (if it exists, otherwise this is part of `entrenamientos.service.ts`)
- Update `saveRestricciones` / `upsertRestricciones` to write `servicio_1_id…servicio_4_id` and `descripcion` instead of `plan_id` / `disciplina_id`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260612000100_restricciones_por_servicio.sql` | Add service columns + descripcion to restriction tables; create `reserva_servicios` table with RLS; create `book_and_deduct_service_units` and `cancel_and_restore_service_units` RPCs |
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add `servicio_1_id…servicio_4_id` and `descripcion` fields (keep `plan_id`/`disciplina_id`); add `SERVICIO_REQUERIDO` rejection code; deprecate `PLAN_REQUERIDO`/`DISCIPLINA_REQUERIDA` |
| Types | `src/types/portal/reservas.types.ts` | Add `ReservaServicio` type; update `validateBookingRestrictions` return type to include matched row |
| Service | `src/services/supabase/portal/reservas.service.ts` | Rewrite `validateBookingRestrictions` (returns matched row); add `findServiceSubscriptionsToCharge`; update `create()` and `cancel()` to use new RPCs |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Update restriction save/upsert logic to use `servicio_1_id…servicio_4_id` and `descripcion` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Replace `plan_id`/`disciplina_id` fields in restriction row state with `servicio_1_id…servicio_4_id` and `descripcion` |
| Component | `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx` | Replace Plan/Discipline dropdowns with up to 4 Service dropdowns per row; add `descripcion` text input per row; add AND/OR guide tooltip |

---

## Acceptance Criteria

1. After migration, `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones` have the new columns `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id` (nullable UUIDs referencing `servicios`) and `descripcion` (nullable text). The legacy `plan_id` and `disciplina_id` columns remain in the schema (unused) and will be removed in a future US.
2. The training creation/edit form no longer shows Plan or Discipline dropdowns inside the restrictions section. Instead, each restriction row shows up to 4 service selector dropdowns populated from the tenant's active services catalog, plus an optional description text field.
3. An admin can add a description to each restriction rule. The description is shown inside the rule row as a guide text.
4. A tooltip or inline help label explains: "Each row is an alternative access path (OR). Within a row, all selected services are required simultaneously (AND)."
5. When an athlete tries to book a training that has restriction rows, `validateBookingRestrictions` evaluates service-based AND conditions per OR row against the athlete's active service entitlements (from `suscripcion_servicios` joined to active `suscripciones`).
6. An athlete whose active subscription includes all required services (with `unidades_restantes > 0` or `null`) passes the restriction check and can book.
7. An athlete who lacks an active subscription covering any required service receives a clear rejection message that names the missing service (rejection code: `SERVICIO_REQUERIDO`).
8. On successful booking, `book_and_deduct_service_units` RPC runs atomically: `suscripcion_servicios.unidades_restantes` is decremented by 1 for **every** non-null service in the matched restriction row. The `reservas` row is created, and one `reserva_servicios` row is inserted per deducted service.
9. If a service has `unidades_restantes IS NULL` (unlimited), no decrement occurs for that service, but a `reserva_servicios` row is still inserted for traceability (with `suscripcion_id = null`).
10. If any service in the matched row has `unidades_restantes = 0` before decrement, the entire booking is rejected with `UNIDADES_AGOTADAS` — no partial deductions occur (pre-validation runs before any write).
11. On booking cancellation, `cancel_and_restore_service_units` RPC atomically marks the reservation cancelled, reads `reserva_servicios` for that reservation, increments `unidades_restantes` for each finite-unit service, and deletes the `reserva_servicios` rows.
12. The `reserva_servicios` table stores each `(reserva_id, suscripcion_id, servicio_id)` pair that was deducted, providing full traceability of service unit consumption.
13. Admin bypass (`bypass_restrictions = true`) still skips all restriction and deduction logic as before.
14. Trainings with zero restriction rows remain fully open (no service check, no deduction).
15. Existing restriction rows that previously used `plan_id`/`disciplina_id` are unaffected structurally — those columns remain. However, the booking logic no longer reads them; all existing restriction rows will behave as if they have no service requirements (unrestricted) until the admin reconfigures them using the new service selectors.

---

## Implementation Steps

- [ ] Write and apply migration `20260612000100_restricciones_por_servicio.sql`:
  - [ ] `ALTER TABLE entrenamiento_restricciones ADD COLUMN descripcion, ADD COLUMN servicio_1_id … servicio_4_id` (keep `plan_id`/`disciplina_id` in place)
  - [ ] Same additions for `entrenamiento_grupo_restricciones`
  - [ ] Create `reserva_servicios` table with RLS (SELECT: own athlete or admin; no direct writes)
  - [ ] Create `book_and_deduct_service_units` SECURITY DEFINER RPC (JSONB deductions array, pre-validate then deduct all services)
  - [ ] Create `cancel_and_restore_service_units` SECURITY DEFINER RPC (reads `reserva_servicios` to restore)
  - [ ] GRANT EXECUTE on both RPCs to `authenticated`
- [ ] Update `src/types/portal/entrenamiento-restricciones.types.ts`:
  - [ ] Add `servicio_1_id | null` … `servicio_4_id | null` and `descripcion: string | null` to both restriction types (keep `plan_id`/`disciplina_id` fields)
  - [ ] Add `'SERVICIO_REQUERIDO'` to `BookingRejectionCode`
  - [ ] Remove or mark `'PLAN_REQUERIDO'` and `'DISCIPLINA_REQUERIDA'` as deprecated
- [ ] Update `src/types/portal/reservas.types.ts`: add `servicio_id: string | null` to `Reserva` and `CreateReservaInput`
- [ ] Update `src/services/supabase/portal/reservas.service.ts`:
  - [ ] Rewrite `validateBookingRestrictions` to use service-set evaluation and return the matched restriction row alongside `BookingResult`
  - [ ] Add `findServiceSubscriptionsToCharge(tenantId, atletaId, servicioIds[])` (returns array of `{suscripcionId, servicioId, exhausted}`)
  - [ ] Update `create()` to extract all service IDs from matched row, call `findServiceSubscriptionsToCharge`, check for exhausted entries, then call `book_and_deduct_service_units` RPC with JSONB deductions
  - [ ] Update `cancel()` to call `cancel_and_restore_service_units(reservaId, tenantId)` — no need to pass service data, RPC reads from `reserva_servicios`
- [ ] Update `src/services/supabase/portal/entrenamientos.service.ts`: persist `servicio_1_id…servicio_4_id` and `descripcion` on restriction upsert
- [ ] Update `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`: replace restriction row state shape
- [ ] Update `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx`: replace Plan/Discipline dropdowns with service selectors and description input; add guide tooltip
- [ ] Verify RLS policies still correct (no new policies needed — existing ADMIN-only insert/update/delete policies remain)
- [ ] Test manually:
  - [ ] Admin creates a training with 2 restriction rows: row 1 requires Service A, row 2 requires Service B + Service C
  - [ ] Athlete with only Service A active → passes row 1, booking created, `unidades_restantes` for Service A decremented by 1, one `reserva_servicios` row inserted
  - [ ] Athlete with Service B + Service C active → passes row 2, booking created, `unidades_restantes` decremented for **both** B and C, two `reserva_servicios` rows inserted
  - [ ] Athlete with neither → blocked with `SERVICIO_REQUERIDO`
  - [ ] Athlete with Service B (1 unit) + Service C (0 units) → blocked with `UNIDADES_AGOTADAS` (pre-validation rejects before any write)
  - [ ] Athlete with unlimited Service A (`unidades_restantes IS NULL`) → passes, no decrement, `reserva_servicios` row inserted with `suscripcion_id = null`
  - [ ] Cancellation restores `unidades_restantes` for all finite services; unlimited and null-suscripcion rows are skipped

---

## Non-Functional Requirements

- **Security**: Both new RPCs are `SECURITY DEFINER` with `SET search_path = public` to prevent schema injection. Authenticated role cannot directly INSERT/UPDATE/DELETE `suscripcion_servicios` or `reserva_servicios` (all writes go through the DEFINER RPCs). Existing RLS policies on `entrenamiento_restricciones` (admin write, tenant-member read) remain unchanged.
- **Performance**: The service-set pre-fetch in `validateBookingRestrictions` is a single join query (not N+1). Indexes on `suscripcion_servicios(suscripcion_id)` and `suscripcion_servicios(servicio_id)` already exist from US-0063. Partial indexes on `servicio_1_id…servicio_2_id` are added by the migration.
- **Accessibility**: Service dropdowns in `EntrenamientoRestriccionesSection` must have `aria-label` attributes identifying each slot (e.g. "Servicio 1 de la regla N"). Guide tooltip must be keyboard-focusable.
- **Error handling**: `UNIDADES_AGOTADAS` Postgres exception is caught in `reservas.service.ts` and surfaced as a `BookingRejection` with code `'UNIDADES_AGOTADAS'`. The user sees a toast: "No te quedan unidades disponibles de uno o más servicios requeridos para este entrenamiento." The pre-validation check in `findServiceSubscriptionsToCharge` (TypeScript layer) may catch exhausted services before even calling the RPC, providing the same message.
