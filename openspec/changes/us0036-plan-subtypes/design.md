## Context

Plans (`planes`) currently carry a single price, validity, and class quota directly on the row. This one-plan-one-price model prevents offering variants of the same plan (e.g., "Monthly – 8 classes" vs. "Monthly – 4 classes"). A new `plan_tipos` table is introduced to hold these variants; subscriptions will reference the chosen subtype at creation time.

The change touches five layers: database migration, TypeScript types, service layer, hooks, and three components. It is additive at the DB level (no columns dropped) and backward-compatible for existing subscriptions (`plan_tipo_id` is nullable).

**Current state constraints identified from the codebase:**
- `src/types/portal/planes.types.ts` already exports `type PlanTipo = 'virtual' | 'presencial' | 'mixto'` — a **naming collision** with the new entity. The existing type must be renamed before introducing the new `PlanTipo` interface.
- `useSuscripcion` already manages a 2-phase open (fetch payment methods + duplicate check); the subtype step must slot into the modal flow without breaking that logic.
- `usePlanForm` is pure form-state with no async calls; subtype diff-upsert must be handled at the submit call-site (hook or page) rather than inside the pure hook.

---

## Goals / Non-Goals

**Goals:**
- Introduce `plan_tipos` table with RLS and all required indexes.
- Extend `suscripciones` with a nullable `plan_tipo_id` FK.
- Rename existing `PlanTipo` union type → `PlanModalidad` to free the identifier for the new entity.
- Add `PlanTipo` interface and related input/form value types.
- Update `getPlanes` to embed nested `plan_tipos[]` via PostgREST nested select (single query, no N+1).
- Add `getPlanTiposByPlan`, `createPlanTipo`, `updatePlanTipo`, `deletePlanTipo` to `planesService`.
- Extend `usePlanForm` with inline subtype form state and diff-upsert logic.
- Extend `useSuscripcion` with `selectedTipoId` state; pass `plan_tipo_id` and subtype-sourced `clases_plan` on submit.
- Update `PlanFormModal` with an inline "Tipos de plan" section.
- Update `PlanesTable` with a subtypes-count column.
- Update `SuscripcionModal` with a Step 1 subtype selector before the existing payment step.

**Non-Goals:**
- Dropping deprecated `planes.precio / vigencia_meses / clases_incluidas` (deferred cleanup migration).
- Backfilling `plan_tipo_id` on existing subscription rows.
- Automatic subtype expiration / scheduling.

---

## Decisions

### 1. Rename `PlanTipo` union → `PlanModalidad`

**Decision:** Rename the existing `type PlanTipo = 'virtual' | 'presencial' | 'mixto'` to `PlanModalidad` across all files before using `PlanTipo` for the new entity interface.

**Rationale:** The identifier `PlanTipo` is the natural domain name for the new entity. Renaming the union to `PlanModalidad` (which more accurately describes what it represents — a delivery modality) is preferable to giving the new entity a synthetic name. The rename is purely internal; no API surface changes.

**Files affected:** `planes.types.ts`, `planes.service.ts`, `usePlanForm.ts`, `PlanFormModal.tsx`.

---

### 2. Embed `plan_tipos[]` in `getPlanes` via nested PostgREST select

**Decision:** Extend the `getPlanes` select string to `'*, plan_tipos(*), planes_disciplina(disciplina_id, disciplinas(id, nombre))'`. No separate `getPlanTiposByPlan` call is made on the list page.

**Rationale:** Avoids N+1 queries when rendering the plans table. PostgREST resolves the join server-side; the client receives a fully-hydrated object in a single round-trip. `getActiveTipos(plan)` in `usePlanesView` filters `activo === true` client-side from the embedded array.

**Alternative considered:** Lazy-load subtypes when the form modal opens. Rejected because the subscription modal (athlete view) also needs subtypes immediately when rendering the plan list, making eager loading a better fit.

---

### 3. Diff-based upsert for subtypes in plan save flow

**Decision:** On plan form submit, the hook computes three sets from comparing `initialTipos` (loaded when edit modal opens) vs. `tiposForm` (current form state):
- **to-create**: rows without an `id` (new entries).
- **to-update**: rows with an `id` whose values differ from the initial snapshot.
- **to-deactivate**: rows in `initialTipos` whose `id` no longer appears in `tiposForm` → set `activo = false` (soft-delete).

Hard-delete is only exposed via `deletePlanTipo` and gated by a subscription check.

**Rationale:** Soft-deactivate preserves referential integrity for existing subscriptions (`suscripciones.plan_tipo_id` → `plan_tipos.id ON DELETE SET NULL`). The diff avoids redundant updates and makes the intention declarative. The service layer executes the diff operations sequentially; no transaction wrapper is available via the Supabase JS client, but failures surface to the hook's error state.

---

### 4. `SuscripcionModal` step model

**Decision:** The modal adds a `step: 1 | 2` state. Step 1 shows subtype selection cards; Step 2 shows payment method + comment (existing flow). "Continue" on step 1 is disabled until a subtype is selected. The modal title updates to `"Suscribirse a [Plan] — [Subtype]"` on step 2.

**Rationale:** Keeps the existing payment flow intact; the subtype selector is prepended cleanly. A single modal with step state is simpler than a multi-component wizard for a 2-step flow.

**Constraint:** `clases_plan` passed to `createSuscripcion` must now come from `selectedTipo.clases_incluidas` (not from `plan.clases_incluidas`). The `useSuscripcion` hook carries both `selectedTipoId` and a derived `selectedTipo` reference to make this value available at submit time.

---

### 5. `tenant_id` denormalized on `plan_tipos`

**Decision:** `plan_tipos` carries a `tenant_id` column (FK → `tenants`) in addition to `plan_id`.

**Rationale:** Required for RLS policy evaluation. The RLS WHERE clause checks `miembros_tenant.tenant_id = plan_tipos.tenant_id` — a join to `planes` to derive `tenant_id` from `plan_id` inside RLS policies is expensive and fragile. Denormalizing `tenant_id` keeps RLS fast and explicit. The service layer always populates it from the parent plan's `tenant_id`, never from client input.

---

### 6. Validation — at least one active subtype required

**Decision:** Client-side validation in `usePlanForm.validate()` is extended to check `tiposForm.some(t => t.activo)`. If false, a top-level `tipos` error is set and the submit is blocked. Server-side enforcement is NOT added in this release (app-layer guard only).

**Rationale:** Adding a DB-level CHECK on a related table requires a constraint trigger, which is out of scope. The app-layer guard satisfies the acceptance criteria and avoids migration complexity.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `plan_tipo_id` is nullable → existing subscriptions have no subtype reference; display code must handle `null` gracefully. | All display paths that join `plan_tipos` use optional chaining; subtype name falls back to `"—"`. |
| Diff-upsert is not atomic: a partial failure (e.g., update succeeds, create fails) leaves subtypes in an inconsistent state. | Error is surfaced to the user; plan is not marked as saved. A subsequent retry is safe (diff re-computed). A rollback mechanism is not added in this release. |
| Subtype remove with active subscriptions silently deactivates instead of deleting — admin may not notice. | UI shows inline notice _"Se marcará como inactivo"_ in the form row so the outcome is transparent. |
| Naming collision (`PlanTipo`) affects all files that import from `planes.types.ts`. | The rename is done as the first task in the implementation plan, enabling a single grep/replace pass. |
| Plans without subtypes (existing data) will show 0 subtypes in the table column and hide the "Adquirir" button for athletes. | Acceptable: existing plans are not purchasable until an admin adds at least one subtype. Existing subscriptions are unaffected. |

---

## Migration Plan

1. **Apply migration `20260319000300_plan_tipos.sql`** to create `plan_tipos`, add `suscripciones.plan_tipo_id`, indexes, and RLS. No data migration needed (new table; `plan_tipo_id` defaults to `null`).
2. **Deploy application code** — all changes are backward-compatible: `plan_tipo_id = null` is valid, and the existing plan form still works until an admin adds subtypes.
3. **Rollback**: Drop `suscripciones.plan_tipo_id` column and `plan_tipos` table. Application code must be rolled back simultaneously (nullable FK means no existing rows are broken).

There is no data migration path from `planes.precio / vigencia_meses / clases_incluidas` → `plan_tipos` in this release. Admins must create subtypes manually for each plan they want purchasable.

### 7. Subtype delete vs. deactivate gate

**Decision:** When the administrator attempts to remove (hard-delete) a subtype from the form:

- **If the subtype has no active `suscripciones`** (`plan_tipo_id` references with `estado IN ('activa', 'pendiente')` = 0) → **hard-delete** the row.
- **If the subtype has one or more active/pending `suscripciones`** → **block hard-delete**; set `activo = false` (soft-deactivate) instead. The UI shows an inline notice: _"Este subtipo tiene suscripciones activas y no puede eliminarse. Se marcará como inactivo."_

The service `deletePlanTipo(id)` checks for active subscriptions before deleting. If found, it calls `updatePlanTipo(id, { activo: false })` and returns a result flag `{ deleted: false, deactivated: true }` so the hook/component can show the appropriate message.

**Rationale:** Hard-deleting a subtype with active subscriptions would leave those subscriptions without a valid subtype reference (even with `ON DELETE SET NULL`, the subscription data would lose context). Soft-deactivation preserves history and keeps the athlete's subscription readable. No admin confirmation prompt needed — the system decides automatically based on subscription state.

---

## Open Questions

- **Should existing plans be auto-populated with one default subtype** from their current `precio / vigencia_meses / clases_incluidas`? The US defers this. If desired, a one-time seed script can be added later.
