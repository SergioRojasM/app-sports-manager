## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0036-plan-subtypes` from the current development base
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260319000300_plan_tipos.sql`
- [x] 2.2 Add `CREATE TABLE IF NOT EXISTS public.plan_tipos` with all columns: `id`, `tenant_id`, `plan_id`, `nombre`, `descripcion`, `precio`, `vigencia_dias`, `clases_incluidas`, `activo`, `created_at`, `updated_at`
- [x] 2.3 Add FK constraints: `plan_tipos_tenant_id_fkey` → `tenants(id)` ON DELETE CASCADE, `plan_tipos_plan_id_fkey` → `planes(id)` ON DELETE CASCADE
- [x] 2.4 Add check constraints: `plan_tipos_precio_ck` (`precio >= 0`), `plan_tipos_vigencia_ck` (`vigencia_dias > 0`), `plan_tipos_clases_ck` (`clases_incluidas >= 0`)
- [x] 2.5 Add unique constraint `plan_tipos_nombre_plan_uk` on `(plan_id, nombre)`
- [x] 2.6 Add indexes `idx_plan_tipos_plan_id` and `idx_plan_tipos_tenant_id`
- [x] 2.7 Enable RLS on `plan_tipos` and add policies: `plan_tipos_select_authenticated` (SELECT, all authenticated), `plan_tipos_insert_admin`, `plan_tipos_update_admin`, `plan_tipos_delete_admin` (scoped to tenant admin via `miembros_tenant`)
- [x] 2.8 Grant `SELECT, INSERT, UPDATE, DELETE` on `plan_tipos` to `authenticated` role
- [x] 2.9 Add `ALTER TABLE public.suscripciones ADD COLUMN IF NOT EXISTS plan_tipo_id uuid REFERENCES public.plan_tipos(id) ON DELETE SET NULL`
- [x] 2.10 Add index `idx_suscripciones_plan_tipo_id` on `suscripciones (plan_tipo_id)`
- [x] 2.11 Apply the migration locally with `supabase db reset` or `supabase migration up` and verify no errors

## 3. TypeScript Types

- [x] 3.1 In `src/types/portal/planes.types.ts`, rename the existing `PlanTipo` union type (`'virtual' | 'presencial' | 'mixto'`) to `PlanModalidad` and update all references in the same file
- [x] 3.2 Add `PlanTipo` interface (DB entity: `id`, `tenant_id`, `plan_id`, `nombre`, `descripcion`, `precio`, `vigencia_dias`, `clases_incluidas`, `activo`, `created_at`, `updated_at`)
- [x] 3.3 Add `CreatePlanTipoInput` type
- [x] 3.4 Add `UpdatePlanTipoInput` type
- [x] 3.5 Add `PlanTipoFormValues` type (numeric fields as `string`, `activo` as `boolean`)
- [x] 3.6 Extend the `Plan` / `PlanWithDisciplinas` type with `plan_tipos?: PlanTipo[]`
- [x] 3.7 In `src/types/portal/suscripciones.types.ts`, add `plan_tipo_id?: string | null` to `SuscripcionInsert` and `Suscripcion`
- [x] 3.8 Fix any TypeScript compile errors caused by the `PlanModalidad` rename across the codebase (`planes.service.ts`, `usePlanForm.ts`, `PlanFormModal.tsx`, etc.)

## 4. Service Layer

- [x] 4.1 In `src/services/supabase/portal/planes.service.ts`, update the `getPlanes` query select string to include nested `plan_tipos(*)` alongside `planes_disciplina(...)`
- [x] 4.2 Update `mapPlanRow` and its `PlanRow` type to include `plan_tipos` from the nested select result
- [x] 4.3 Add `getPlanTiposByPlan(planId: string): Promise<PlanTipo[]>` — SELECT from `plan_tipos` WHERE `plan_id = planId` ORDER BY `nombre`
- [x] 4.4 Add `createPlanTipo(input: CreatePlanTipoInput): Promise<PlanTipo>` — INSERT into `plan_tipos`; `tenant_id` must be sourced from the parent plan, not from client input
- [x] 4.5 Add `updatePlanTipo(id: string, input: UpdatePlanTipoInput): Promise<PlanTipo>` — UPDATE `plan_tipos` WHERE `id = id`
- [x] 4.6 Add `deletePlanTipo(id: string): Promise<{ deleted: boolean; deactivated: boolean }>` — check for active/pending `suscripciones` first; if found, set `activo = false` and return `{ deleted: false, deactivated: true }`; otherwise hard-delete and return `{ deleted: true, deactivated: false }`
- [x] 4.7 In `src/services/supabase/portal/suscripciones.service.ts`, update `SuscripcionInsert` usage and the `createSuscripcion` INSERT to persist `plan_tipo_id`

## 5. Hooks

- [x] 5.1 In `src/hooks/portal/planes/usePlanForm.ts`, add `tiposForm: PlanTipoFormValues[]` state and `initialTipos` ref (snapshot loaded when edit modal opens)
- [x] 5.2 Add `addTipo()` action — appends a new empty `PlanTipoFormValues` row with `activo: true`
- [x] 5.3 Add `updateTipo(index: number, values: Partial<PlanTipoFormValues>)` action
- [x] 5.4 Add `removeTipo(index: number)` action — removes the row from `tiposForm`
- [x] 5.5 Add `setTiposFromPlan(plan: PlanWithDisciplinas)` to populate `tiposForm` and `initialTipos` when opening in edit mode
- [x] 5.6 Extend `validate()` to check that at least one `tiposForm` entry has `activo: true`, and that each entry with data has a non-empty `nombre`
- [x] 5.7 Add `computeTiposDiff()` helper that returns `{ toCreate, toUpdate, toDeactivate }` arrays by comparing current `tiposForm` against `initialTipos`
- [x] 5.8 In `src/hooks/portal/planes/usePlanesView.ts`, add `getActiveTipos(plan: Plan): PlanTipo[]` selector that returns `plan.plan_tipos?.filter(t => t.activo).sort(...)` 
- [x] 5.9 In `src/hooks/portal/planes/useSuscripcion.ts`, add `selectedTipoId: string | null` state and `selectTipo(id: string)` action
- [x] 5.10 Reset `selectedTipoId` to `null` in `closeModal` and on success
- [x] 5.11 In the `submit` function, validate that `selectedTipoId` is non-null before proceeding; resolve the matching `PlanTipo` from `selectedPlan.plan_tipos`
- [x] 5.12 Pass `plan_tipo_id: selectedTipoId` and `clases_plan: selectedTipo.clases_incluidas` (not `selectedPlan.clases_incluidas`) to `createSuscripcion`
- [x] 5.13 Pass `monto: selectedTipo.precio ?? selectedPlan.precio` to `createPago`

## 6. Components

- [x] 6.1 In `src/components/portal/planes/PlanFormModal.tsx`, replace all uses of `PlanTipo` (the old union) with `PlanModalidad`
- [x] 6.2 Add the "Tipos de plan / Subtipos" section below the main plan fields — render `tiposForm` as inline rows (table or card style)
- [x] 6.3 Each subtype row renders: `nombre` text input, `precio` number input, `vigencia_dias` number input, `clases_incluidas` number input, `activo` toggle, Remove button
- [x] 6.4 Wire "+ Agregar subtipo" button to the `addTipo()` action
- [x] 6.5 Wire each row's field changes to `updateTipo(index, ...)` and Remove button to `removeTipo(index)`
- [x] 6.6 On Remove, if the result from `deletePlanTipo` returns `{ deactivated: true }`, show the inline notice: _"Este subtipo tiene suscripciones activas y no puede eliminarse. Se marcará como inactivo."_
- [x] 6.7 Display the subtypes-level validation error when no active subtype exists
- [x] 6.8 Wire `setTiposFromPlan` call when the modal opens in edit mode
- [x] 6.9 On form submit, after saving the plan, run the diff and call `createPlanTipo` / `updatePlanTipo` / `deletePlanTipo` for each set in `computeTiposDiff()`
- [x] 6.10 In `src/components/portal/planes/PlanesTable.tsx`, add a "Subtipos" column — display count of active subtypes from `getActiveTipos(plan).length` or "—" if zero
- [x] 6.11 In `src/components/portal/planes/SuscripcionModal.tsx`, add `step: 1 | 2` state, initialized to `1` on `openModal`
- [x] 6.12 Render Step 1: list of selectable cards for each active subtype (`getActiveTipos(selectedPlan)`), each showing `nombre`, `precio`, `vigencia_dias`, `clases_incluidas`; wire card click to `selectTipo(id)`
- [x] 6.13 Render "Continuar" CTA on Step 1 — disabled when `selectedTipoId === null`; on click advance `step` to `2`
- [x] 6.14 Update Step 2 modal title to `"Suscribirse a [Plan Name] — [Subtype Name]"`
- [x] 6.15 In athlete plan view, hide "Adquirir" button for plans where `getActiveTipos(plan).length === 0`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` to document the `plan_tipos` table and the new service functions in `planes.service.ts`
- [x] 7.2 Note the `PlanModalidad` rename in the types section of the spec file if referenced there

## 8. Wrap-up

- [x] 8.1 Run `tsc --noEmit` and resolve any remaining TypeScript errors
- [x] 8.2 Test the admin flow end-to-end: create a plan with subtypes, edit subtypes, verify count column
- [x] 8.3 Test the athlete flow end-to-end: view plans, select subtype, confirm subscription, verify `plan_tipo_id` stored
- [x] 8.4 Write the commit message: `feat: add plan subtypes (plan_tipos) with inline admin management and athlete subtype selection (US-0036)`
- [x] 8.5 Write the pull request description summarising the DB migration, type rename, new service functions, hook extensions, and UI changes for reviewer context
