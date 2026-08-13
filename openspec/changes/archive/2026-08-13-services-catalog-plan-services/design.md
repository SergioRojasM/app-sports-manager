## Context

The application allows tenant admins to create plans (`planes`) with subtypes (`plan_tipos`). Currently `plan_tipos` carries a generic `clases_incluidas` integer, but there is no catalog of what those sessions represent. This US introduces a structured service catalog (`servicios`) and a join table (`plan_tipos_servicios`) so plan subtypes can declare exactly which services and how many units are included.

The `gestion-servicios` page already exists as an empty placeholder in `(administrador)/gestion-servicios/page.tsx`. All booking-deduction logic that reads `clases_incluidas` is left completely unchanged.

**Architecture pattern**: feature-slice (page → component → hook → service → types), matching the existing `disciplines/`, `planes/`, and `scenarios/` slices.

## Goals / Non-Goals

**Goals:**
- Introduce `servicios` and `plan_tipos_servicios` tables with RLS and indexes.
- CRUD admin page for the services catalog (`gestion-servicios`).
- Services section inside `PlanFormModal` plan-tipo sub-form (add/remove service rows with `unidades`).
- Persist service assignments on plan tipo save via `syncPlanTipoServicios`.
- Load existing service assignments when editing a plan tipo.

**Non-Goals:**
- Migrating existing `clases_incluidas` data — deferred.
- Dropping `clases_incluidas` from `plan_tipos` — deferred.
- Changes to `deduct_classes_on_booking` RPC or booking flow — deferred.
- Subscription-level service tracking — deferred.
- Pushing any migration to remote Supabase — local only.

## Decisions

### 1. Two separate new tables, not a column on `plan_tipos`

**Decision**: Introduce `servicios` (catalog) and `plan_tipos_servicios` (join) rather than widening `plan_tipos` columns.

**Rationale**: A catalog table lets admins reuse service definitions across multiple plan tipos. A join table supports multi-service subtypes (e.g., "10 Natación + 5 Gym"). A single column cannot express that multiplicity.

**Alternative considered**: Add `servicio_nombre` + `unidades` columns directly to `plan_tipos`. Rejected because it cannot support multiple services per subtype and creates data duplication across rows.

---

### 2. `syncPlanTipoServicios` — full replace strategy (delete + insert)

**Decision**: When saving a plan tipo's services, delete all existing `plan_tipos_servicios` rows for the `plan_tipo_id` then insert the new set.

**Rationale**: The form always knows the complete desired state. Diffing individual rows adds complexity without benefit since service rows carry no state beyond `unidades`. The unique constraint `(plan_tipo_id, servicio_id)` prevents accidental duplicates.

**Alternative considered**: Upsert individual rows. Rejected because it requires tracking deleted rows separately.

---

### 3. `ON DELETE RESTRICT` on `servicios` FK in `plan_tipos_servicios`

**Decision**: Prevent deletion of a `servicios` row that is referenced by at least one `plan_tipos_servicios` row.

**Rationale**: Silently orphaning plan service assignments (ON DELETE CASCADE) or setting them to null (ON DELETE SET NULL) would break plan displays without warning the admin. A clear error message surfaced from the RESTRICT violation is better UX.

---

### 4. Keep `clases_incluidas` in `plan_tipos` and in all existing TS types

**Decision**: No changes to `PlanTipo`, `PlanTipoFormValues`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, or `planes.service.ts` regarding `clases_incluidas`.

**Rationale**: Deduction logic depends on `clases_incluidas` today. Removing it before updating the RPC would break booking. The migration is a separate, coordinated US.

---

### 5. `usePlanTipoServicios` as a standalone hook, not embedded in `usePlanForm`

**Decision**: Manage services-rows state in a dedicated `usePlanTipoServicios` hook; `usePlanForm` calls it when in plan-tipo edit mode.

**Rationale**: Keeps `usePlanForm` focused on plan-level fields (nombre, tipo, disciplinas). Services rows have their own fetch/sync lifecycle that is cleaner isolated. This also makes the `PlanTipoServiciosSection` component easy to test in isolation.

## Risks / Trade-offs

- **Risk**: `syncPlanTipoServicios` is not atomic by default (two separate Supabase calls: delete + insert). → **Mitigation**: Wrap in a Postgres function or run delete + insert in the same transaction using `.rpc()` if rollback safety is needed. For MVP, the non-atomic approach is acceptable because the window is tiny and the user can re-save.
- **Risk**: The `ON DELETE RESTRICT` on `servicios` returns a raw Postgres error to the JS client. → **Mitigation**: Catch the error code `23503` (foreign_key_violation) in `deleteServicio` and re-throw as a user-friendly `ServicioServiceError`.
- **Trade-off**: `clases_incluidas` and the new services section coexist in the plan-tipo form until the next US, which may confuse admins. → **Accepted**: A label/note in the UI clarifies the relationship.
