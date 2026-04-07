## Why

The `planes` table currently stores `precio`, `vigencia_meses`, and `clases_incluidas` — the same commercial terms that already exist on `plan_tipos` (`precio`, `vigencia_dias`, `clases_incluidas`). This duplication forces every downstream consumer (subscription creation, admin validation, plan table display) to implement fallback logic (`selectedTipo?.precio ?? selectedPlan.precio`), which is error-prone and allows plans to exist without subtypes. Consolidating these fields exclusively on `plan_tipos` establishes a single source of truth and enforces that every plan must have at least one subtype.

## What Changes

- **BREAKING** — Drop columns `precio`, `vigencia_meses`, and `clases_incluidas` from the `planes` database table (and their check constraints).
- Enforce that every plan must have at least one `plan_tipo` at form-validation level.
- Make `plan_tipos.clases_incluidas` explicitly optional: `NULL` means "sin límite" (unlimited classes).
- Remove all fallback logic in types, services, hooks, and components that references plan-level pricing/validity/class fields.
- Update subscription admin validation to compute `fecha_fin` using `plan_tipo.vigencia_dias` (addDays) instead of `plan.vigencia_meses` (addMonths).
- Derive `PlanTableItem.vigenciaLabel` from plan_tipos rather than from the plan itself.

## Non-Goals

- Migrating from `vigencia_dias` (days) on plan_tipos to months or any other unit — the existing `vigencia_dias` is kept as-is.
- Changing the `plan_tipos` database schema (columns, constraints, RLS policies) — only `planes` columns are dropped.
- Making `plan_tipo_id` required on `suscripciones` — it remains nullable for backward compatibility with existing rows.
- Backfilling or removing existing plan_tipos data — only the parent `planes` columns are affected.

## Capabilities

### New Capabilities
_None — no new capabilities are introduced._

### Modified Capabilities
- `plan-management`: Remove `precio`, `vigencia_meses`, and `clases_incluidas` from the plan entity definition, form, table display, and service layer. Enforce at-least-one plan_tipo on creation/update. Derive `vigenciaLabel` from plan_tipos.
- `plan-subtypes`: Make `clases_incluidas` explicitly nullable/optional (empty = unlimited). Remove plan-level fallback logic in the subscription creation flow.
- `subscription-management`: Update admin validation to use `plan_tipo.vigencia_dias` for `fecha_fin` computation; remove join on plan-level `vigencia_meses`/`clases_incluidas`.

## Impact

### Database
- Migration drops 3 columns + 2 check constraints from `public.planes`.

### Types (`src/types/portal/`)
- `planes.types.ts` — Remove fields from `Plan`, `CreatePlanInput`, `UpdatePlanInput`, `PlanFormValues`, `PlanFormField`. Update `PlanTipo`/`CreatePlanTipoInput`/`UpdatePlanTipoInput` `clases_incluidas` to `number | null`.
- `gestion-suscripciones.types.ts` — Remove `plan_vigencia_meses`, `plan_clases_incluidas` from `SuscripcionAdminRow`; add `plan_tipo_vigencia_dias: number | null`.

### Services (`src/services/supabase/portal/`)
- `planes.service.ts` — Remove the 3 fields from `PlanRow`, `mapPlanRow`, `createPlan`, `updatePlan`, and all `.select()` projections.
- `gestion-suscripciones.service.ts` — Update join query and row mapping.

### Hooks (`src/hooks/portal/`)
- `planes/usePlanForm.ts` — Remove plan-level field defaults and validation; make tipo `clases_incluidas` optional; add at-least-one-tipo guard.
- `planes/usePlanes.ts` — Remove the 3 fields from create/update inputs; recompute `vigenciaLabel` from plan_tipos.
- `planes/usePlanesView.ts` — Recompute `vigenciaLabel` from plan_tipos.
- `planes/useSuscripcion.ts` — Remove `?? selectedPlan.precio` and `?? selectedPlan.clases_incluidas` fallbacks.
- `gestion-suscripciones/useValidarSuscripcion.ts` — Replace `addMonths(start, row.plan_vigencia_meses)` with `addDays(start, row.plan_tipo_vigencia_dias!)`.

### Components (`src/components/portal/`)
- `planes/PlanFormModal.tsx` — Remove plan-level price/validity/clases inputs; make tipo `clases_incluidas` optional; show error when no tipos.
- `planes/SuscripcionModal.tsx` — Remove plan-level fallback display logic.
- `gestion-suscripciones/ValidarSuscripcionModal.tsx` — Use `plan_tipo_vigencia_dias` for date display.

## Step-by-Step Implementation Plan

1. Create and apply database migration to drop the 3 columns from `planes`.
2. Update TypeScript types in `planes.types.ts` and `gestion-suscripciones.types.ts`.
3. Update `planes.service.ts` — remove fields from queries, inserts, updates, and internal types.
4. Update `gestion-suscripciones.service.ts` — adjust join query and row mapping.
5. Update hooks: `usePlanForm.ts`, `usePlanes.ts`, `usePlanesView.ts`, `useSuscripcion.ts`, `useValidarSuscripcion.ts`.
6. Update components: `PlanFormModal.tsx`, `SuscripcionModal.tsx`, `ValidarSuscripcionModal.tsx`.
7. Run `tsc --noEmit` and fix any remaining compile errors.
8. Manual testing: plan CRUD, subscription flow, admin validation.
