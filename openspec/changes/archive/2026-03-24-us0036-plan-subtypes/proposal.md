## Why

Membership plans currently have a flat pricing model: one price, one validity, one class quota per plan. This blocks clubs from selling variants of the same plan (e.g., "Monthly – 8 classes" vs. "Monthly – 4 classes"). Introducing a `plan_tipos` table lets organisations define multiple purchasable subtypes under each plan without duplicating the plan itself.

## What Changes

- **NEW** `plan_tipos` table in the database — holds `nombre`, `precio`, `vigencia_dias`, `clases_incluidas`, and `activo` per plan variant; scoped to `tenant_id` and `plan_id`.
- **NEW** `plan_tipo_id` nullable FK column on `suscripciones` referencing the chosen subtype at subscription time.
- **MODIFIED** `planes` service query: `getPlanes` now embeds nested `plan_tipos[]` in each plan object.
- **NEW** CRUD service functions for `plan_tipos` (get, create, update, delete with subscription guard).
- **MODIFIED** Plan form modal: adds an inline "Subtypes" section where subtypes can be added, edited, or removed; at least one active subtype is required to save.
- **MODIFIED** Plans list table: adds a "Subtypes" count column per plan.
- **MODIFIED** Subscription modal: inserts a subtype-selection step (Step 1) before the existing payment comment step.
- **MODIFIED** `useSuscripcion` hook: tracks `selectedTipoId`; passes `plan_tipo_id` and subtype-sourced `clases_plan` to the service on submit.
- **MODIFIED** `usePlanForm` hook: manages inline `tiposForm[]` state and performs diff-based upsert of subtypes on plan save.
- The `precio`, `vigencia_meses`, and `clases_incluidas` columns on `planes` are **deprecated but not dropped** in this release.

## Capabilities

### New Capabilities
- `plan-subtypes`: New `plan_tipos` database table, RLS policies, TypeScript types (`PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, `PlanTipoFormValues`), and service-layer CRUD functions. This is the data foundation every other change builds on.

### Modified Capabilities
- `plan-management`: Plan form modal gains an inline subtype management section; plan list table gains a subtypes-count column; plan save logic now includes a diff-based upsert of `plan_tipos` records. Plan validation requires at least one active subtype before saving.
- `subscription-management`: Subscription modal adds a subtype-selection step (Step 1 of 2 flow). `useSuscripcion` must carry `selectedTipoId`, and `createSuscripcion` persists `plan_tipo_id` and reads `clases_plan` from the selected subtype instead of from the plan.

## Impact

**Database**
- New table: `plan_tipos` with FK to `planes` (`ON DELETE CASCADE`) and FK to `tenants`.
- New column: `suscripciones.plan_tipo_id` FK to `plan_tipos(id)` (`ON DELETE SET NULL`).

**Types**
- `src/types/portal/planes.types.ts` — add `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, `PlanTipoFormValues`; extend `Plan` with `plan_tipos?: PlanTipo[]`.
- `src/types/portal/suscripciones.types.ts` — add `plan_tipo_id?: string | null` to `CreateSuscripcionInput` and subscription view types.

**Services**
- `src/services/supabase/portal/planes.service.ts` — new `getPlanTiposByPlan`, `createPlanTipo`, `updatePlanTipo`, `deletePlanTipo`; updated `getPlanes` with nested select.
- `src/services/supabase/portal/suscripciones.service.ts` — updated `createSuscripcion` and subscription query functions.

**Hooks**
- `src/hooks/portal/planes/usePlanForm.ts` — inline subtype state and diff-upsert logic.
- `src/hooks/portal/planes/usePlanesView.ts` — `getActiveTipos` selector helper.
- `src/hooks/portal/planes/useSuscripcion.ts` — `selectedTipoId` state and subtype-aware submit.

**Components**
- `src/components/portal/planes/PlanFormModal.tsx` — inline subtypes section.
- `src/components/portal/planes/PlanesTable.tsx` — subtypes count column.
- `src/components/portal/planes/SuscripcionModal.tsx` — step 1 subtype selector.

**Migration**
- `supabase/migrations/20260319000300_plan_tipos.sql`

## Non-goals

- Automatic subtype expiration or scheduling.
- Dropping deprecated `planes.precio`, `planes.vigencia_meses`, `planes.clases_incluidas` columns — this is deferred to a future cleanup migration.
- Migrating existing subscriptions to reference a `plan_tipo_id` for historical records.

## Files to Create / Modify

| File | Action |
|------|--------|
| `supabase/migrations/20260319000300_plan_tipos.sql` | CREATE |
| `src/types/portal/planes.types.ts` | MODIFY |
| `src/types/portal/suscripciones.types.ts` | MODIFY |
| `src/services/supabase/portal/planes.service.ts` | MODIFY |
| `src/services/supabase/portal/suscripciones.service.ts` | MODIFY |
| `src/hooks/portal/planes/usePlanForm.ts` | MODIFY |
| `src/hooks/portal/planes/usePlanesView.ts` | MODIFY |
| `src/hooks/portal/planes/useSuscripcion.ts` | MODIFY |
| `src/components/portal/planes/PlanFormModal.tsx` | MODIFY |
| `src/components/portal/planes/PlanesTable.tsx` | MODIFY |
| `src/components/portal/planes/SuscripcionModal.tsx` | MODIFY |

## Step-by-Step Implementation Plan

1. **DB migration** — create `plan_tipos` table + indexes + RLS; add `suscripciones.plan_tipo_id` FK.
2. **Types** — add `PlanTipo` family and extend `Plan` / subscription types.
3. **Service layer** — add `plan_tipos` CRUD to `planes.service.ts`; update `getPlanes` to embed subtypes; update `suscripciones.service.ts` to pass `plan_tipo_id`.
4. **Hooks** — extend `usePlanForm` with inline subtype state + diff-upsert; add `getActiveTipos` to `usePlanesView`; extend `useSuscripcion` with subtype selection.
5. **Components** — add subtypes section to `PlanFormModal`; add count column to `PlanesTable`; add step 1 selector to `SuscripcionModal`.
