# US-0051 — Remove Plan-Level Price, Validity, and Class Columns

## ID
US-0051

## Name
Remove precio, vigencia_meses, and clases_incluidas from the planes table; use plan_tipos as the single source of truth for these values

## As a
Tenant administrator

## I Want
To define pricing, validity period, and class quota exclusively on plan subtypes (plan_tipos), without those fields existing on the parent plan record

## So That
There is a single source of truth for commercial terms — the plan is a container with identity and benefits, while each plan_tipo holds the specific price, duration, and class limit; this eliminates the current duplication where both tables store these fields and where subscription logic had to fall back from tipo → plan when a tipo was not selected

---

## Description

### Current State
The `planes` table has three columns — `precio` (`numeric(10,2)`), `vigencia_meses` (`integer`), and `clases_incluidas` (`integer | null`) — that duplicate intent already covered by `plan_tipos.precio`, `plan_tipos.vigencia_dias`, and `plan_tipos.clases_incluidas`.

The subscription flow currently uses `selectedTipo?.precio ?? selectedPlan.precio` and `selectedTipo?.clases_incluidas ?? selectedPlan.clases_incluidas` as fallback logic, which implicitly allows a plan to exist without subtypes. The admin validation modal reads `plan_vigencia_meses` from the plan to compute a default `fecha_fin`.

The `PlanFormModal` exposes plan-level `precio`, `vigencia_meses`, and `clases_incluidas` inputs alongside the subtype rows, creating confusion.

### Proposed Changes

#### Database
- Drop `precio`, `vigencia_meses`, and `clases_incluidas` from `planes`.
- The `plan_tipos.clases_incluidas` column already allows `NULL` (per migration `20260319000300_plan_tipos.sql`); no structural change is needed there.

#### Types
- Remove `precio`, `vigencia_meses`, and `clases_incluidas` from `Plan`, `CreatePlanInput`, `UpdatePlanInput`, `PlanFormValues`, and `PlanFormField`.
- Make `PlanTipo.clases_incluidas`, `CreatePlanTipoInput.clases_incluidas`, and `UpdatePlanTipoInput.clases_incluidas` explicitly `number | null`.
- In `PlanTipoFormValues` keep `clases_incluidas: string` but treat an empty string as "sin límite" (maps to `null`).
- Add `plan_tipo_vigencia_dias: number | null` to `SuscripcionAdminRow` in `gestion-suscripciones.types.ts`.
- Remove `plan_vigencia_meses` and `plan_clases_incluidas` from `SuscripcionAdminRow`.

#### Validation rule (new)
Creating or updating a plan requires at least one plan_tipo. The form must enforce this: the submit action is blocked if `tiposForm.length === 0`. An inline error message reads "El plan debe tener al menos un subtipo."

#### Subscription flow
Since a plan always has at least one tipo, there is no need to fall back to plan-level fields. Everywhere that previously used `selectedTipo?.precio ?? selectedPlan.precio` or similar must require `selectedTipo` to be defined.

#### Validity date computation (admin validation)
`useValidarSuscripcion` currently computes `fecha_fin` using `addMonths(start, row.plan_vigencia_meses)`. After the change it must use `addDays(start, row.plan_tipo_vigencia_dias!)`.

The `vigenciaLabel` on `PlanTableItem` is currently derived from `plan.vigencia_meses`. After the change it must be derived from `plan_tipos`: if all active tipos have the same `vigencia_dias`, show that value; otherwise show the range (e.g. "30–90 días"). If no active tipos exist, show `'—'`.

---

## Database Changes

### Migration: `supabase/migrations/{timestamp}_remove_planes_precio_vigencia_clases.sql`

```sql
-- US-0051: Remove precio, vigencia_meses, clases_incluidas from planes
-- These fields are now exclusively on plan_tipos.

alter table public.planes
  drop column if exists precio,
  drop column if exists vigencia_meses,
  drop column if exists clases_incluidas;

-- Drop constraints that referenced those columns (if they still exist)
alter table public.planes
  drop constraint if exists planes_precio_ck,
  drop constraint if exists planes_clases_ck;
```

No new RLS policies are required; the existing `plan_tipos` policies remain unchanged.

---

## API / Server Actions

No new Supabase server functions are needed. All changes are in existing client-side services and hooks.

### `src/services/supabase/portal/planes.service.ts`

**`getPlanes(tenantId)`**
- Remove `precio, vigencia_meses, clases_incluidas` from the `.select(...)` string for the `planes` table.
- Update the internal `PlanRow` type to remove those three fields.
- Update `mapPlanRow` to not include them.

**`createPlan(input)`**
- Remove `precio`, `vigencia_meses`, `clases_incluidas` from the `.insert({...})` object and from the `.select(...)` return projection.
- Remove those fields from `CreatePlanInput` (already reflected in types).

**`updatePlan(input)`**
- Same removals in `.update({...})` and `.select(...)`.

### `src/services/supabase/portal/gestion-suscripciones.service.ts`

**Subscription join query**
- Change:
  ```
  plan:planes!suscripciones_plan_id_fkey(nombre, vigencia_meses, clases_incluidas)
  plan_tipo:plan_tipos!suscripciones_plan_tipo_id_fkey(nombre, clases_incluidas)
  ```
  To:
  ```
  plan:planes!suscripciones_plan_id_fkey(nombre)
  plan_tipo:plan_tipos!suscripciones_plan_tipo_id_fkey(nombre, vigencia_dias, clases_incluidas)
  ```

**Row mapping**
- Remove: `plan_vigencia_meses`, `plan_clases_incluidas`
- Add: `plan_tipo_vigencia_dias: row.plan_tipo?.vigencia_dias ?? null`
- `plan_tipo_clases_incluidas` remains.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_remove_planes_precio_vigencia_clases.sql` | Drop 3 columns + constraints from `planes` |
| Types | `src/types/portal/planes.types.ts` | Remove `precio`, `vigencia_meses`, `clases_incluidas` from `Plan`, `CreatePlanInput`, `UpdatePlanInput`, `PlanFormValues`, `PlanFormField`; make `PlanTipo.clases_incluidas` / `CreatePlanTipoInput.clases_incluidas` / `UpdatePlanTipoInput.clases_incluidas` `number \| null` |
| Types | `src/types/portal/gestion-suscripciones.types.ts` | Remove `plan_vigencia_meses`, `plan_clases_incluidas` from `SuscripcionAdminRow`; add `plan_tipo_vigencia_dias: number \| null` |
| Service | `src/services/supabase/portal/planes.service.ts` | Remove the 3 fields from `PlanRow`, `mapPlanRow`, `createPlan`, and `updatePlan` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Update join query; remove `plan_vigencia_meses`/`plan_clases_incluidas`; add `plan_tipo_vigencia_dias` |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Remove `precio`/`vigencia_meses`/`clases_incluidas` from plan-level initial values and validation; make plan_tipo `clases_incluidas` optional (empty = null/unlimited); validate at least 1 tipo present |
| Hook | `src/hooks/portal/planes/usePlanes.ts` | Remove the 3 fields from create/update inputs; recompute `vigenciaLabel` from plan_tipos |
| Hook | `src/hooks/portal/planes/usePlanesView.ts` | Recompute `vigenciaLabel` from plan_tipos |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Remove fallback `?? selectedPlan.precio` and `?? selectedPlan.clases_incluidas` |
| Hook | `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts` | Replace `addMonths(start, row.plan_vigencia_meses)` with `addDays(start, row.plan_tipo_vigencia_dias!)` |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Remove plan-level `precio`, `vigencia_meses`, `clases_incluidas` field groups; make `clases_incluidas` in plan_tipo rows optional with placeholder "Sin límite (dejar vacío)"; add inline error when `tiposForm.length === 0` on submit |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Remove all fallback logic referencing `plan.precio`, `plan.vigencia_meses`, `plan.clases_incluidas` |
| Component | `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx` | Replace `plan_vigencia_meses` display with `plan_tipo_vigencia_dias`; remove reference to `plan_clases_incluidas` |

---

## Acceptance Criteria

1. The `planes` table no longer has `precio`, `vigencia_meses`, or `clases_incluidas` columns after applying the migration.
2. Attempting to create a plan without adding at least one plan_tipo is blocked by the form: a validation error "El plan debe tener al menos un subtipo." appears and the submit is prevented.
3. The plan creation form no longer shows fields for plan-level precio, vigencia, or clases.
4. Plan subtypes (plan_tipos) show `clases_incluidas` as an optional field: leaving it blank saves `NULL` to the database and displays "Sin límite" / "Ilimitadas" in all UI surfaces.
5. `PlanTableItem.vigenciaLabel` is derived from the plan's plan_tipos: same value for all → show that value; range → show "Xd – Yd"; no active tipos → "—".
6. The subscription modal (`SuscripcionModal`) no longer reads or falls back to plan-level precio, vigencia, or clases; it requires a tipo to be selected before proceeding.
7. Admin validation modal (`ValidarSuscripcionModal`) computes the suggested `fecha_fin` using `plan_tipo.vigencia_dias` (addDays), not `plan.vigencia_meses` (addMonths).
8. `gestion-suscripciones.service.ts` no longer queries `vigencia_meses` or `clases_incluidas` from the `planes` join; it queries `vigencia_dias` and `clases_incluidas` from the `plan_tipos` join.
9. No TypeScript compile errors exist after all changes.
10. Editing an existing plan (which already has plan_tipos) works correctly: all plan_tipo data loads, can be modified, and saves correctly.
11. Plans that previously had `clases_incluidas = NULL` on the plan row now treat class limits as determined solely by the selected plan_tipo.

---

## Implementation Steps

- [ ] Generate migration timestamp and create `supabase/migrations/{timestamp}_remove_planes_precio_vigencia_clases.sql`
- [ ] Apply migration locally: `supabase db reset` or `supabase migration up`
- [ ] Update `src/types/portal/planes.types.ts`: remove 3 fields from Plan/CreatePlanInput/UpdatePlanInput/PlanFormValues/PlanFormField; update PlanTipo/CreatePlanTipoInput/UpdatePlanTipoInput `clases_incluidas` to `number | null`
- [ ] Update `src/types/portal/gestion-suscripciones.types.ts`: remove `plan_vigencia_meses`/`plan_clases_incluidas`; add `plan_tipo_vigencia_dias: number | null`
- [ ] Update `src/services/supabase/portal/planes.service.ts`: PlanRow, mapPlanRow, createPlan, updatePlan
- [ ] Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: join query + row mapping
- [ ] Update `src/hooks/portal/planes/usePlanForm.ts`: remove plan-level fields, loosen tipo clases validation, add at-least-one-tipo guard
- [ ] Update `src/hooks/portal/planes/usePlanes.ts`: remove 3 fields from submit; recompute vigenciaLabel
- [ ] Update `src/hooks/portal/planes/usePlanesView.ts`: recompute vigenciaLabel
- [ ] Update `src/hooks/portal/planes/useSuscripcion.ts`: remove plan fallback logic
- [ ] Update `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: addDays with plan_tipo_vigencia_dias
- [ ] Update `src/components/portal/planes/PlanFormModal.tsx`: remove plan-level fields; optional clases in tipo rows; at-least-one-tipo error
- [ ] Update `src/components/portal/planes/SuscripcionModal.tsx`: remove plan fallback references
- [ ] Update `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`: replace plan_vigencia_meses display
- [ ] Run `tsc --noEmit` and resolve all TypeScript errors
- [ ] Manually test: create plan with 1 tipo → succeeds; create plan with 0 tipos → blocked; tipo with empty clases → saved as null, displays "Sin límite"; edit existing plan with tipos → loads correctly; admin validates subscription → fecha_fin computed from tipo vigencia_dias

---

## Non-Functional Requirements

- **Security**: No new tables or RLS changes are needed. The existing `plan_tipos` RLS policies (admin-only insert/update/delete) remain in effect. The migration only drops columns — no data is exposed.
- **Performance**: No new indexes required; existing `idx_plan_tipos_plan_id` and `idx_plan_tipos_tenant_id` remain and cover all access patterns.
- **Accessibility**: The plan_tipo `clases_incluidas` input must retain its label. When left empty, screen readers should read the placeholder text "Sin límite (dejar vacío)".
- **Error handling**: If submission fails after the at-least-one-tipo guard is bypassed (server error), the existing `submitError` toast mechanism surfaces the error. No new error surfaces are needed.
