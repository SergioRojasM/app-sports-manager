## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/remove-plan-price-validity-classes` from the current working branch
- [x] 1.2 Validate that working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/{timestamp}_remove_planes_precio_vigencia_clases.sql` that drops columns `precio`, `vigencia_meses`, and `clases_incluidas` from `public.planes`, along with check constraints `planes_precio_ck` and `planes_clases_ck`
- [x] 2.2 Apply migration locally with `supabase db reset` and verify `planes` table no longer has the three columns

## 3. TypeScript Types

- [x] 3.1 Update `src/types/portal/planes.types.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from `Plan` type
- [x] 3.2 Update `src/types/portal/planes.types.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from `CreatePlanInput` and `UpdatePlanInput`
- [x] 3.3 Update `src/types/portal/planes.types.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from `PlanFormValues` and remove them from `PlanFormField` union; remove `PlanTableItem.vigenciaLabel` from plan-level computation (it will be derived from plan_tipos)
- [x] 3.4 Update `src/types/portal/planes.types.ts`: change `PlanTipo.clases_incluidas`, `CreatePlanTipoInput.clases_incluidas`, and `UpdatePlanTipoInput.clases_incluidas` to `number | null`
- [x] 3.5 Update `src/types/portal/gestion-suscripciones.types.ts`: remove `plan_vigencia_meses` and `plan_clases_incluidas` from `SuscripcionAdminRow`; add `plan_tipo_vigencia_dias: number | null`

## 4. Services

- [x] 4.1 Update `src/services/supabase/portal/planes.service.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from `PlanRow` internal type
- [x] 4.2 Update `src/services/supabase/portal/planes.service.ts`: remove the three fields from `mapPlanRow` mapping function
- [x] 4.3 Update `src/services/supabase/portal/planes.service.ts`: remove the three fields from `getPlanes` `.select()` projection
- [x] 4.4 Update `src/services/supabase/portal/planes.service.ts`: remove the three fields from `createPlan` `.insert()` object and `.select()` projection
- [x] 4.5 Update `src/services/supabase/portal/planes.service.ts`: remove the three fields from `updatePlan` `.update()` object and `.select()` projection
- [x] 4.6 Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: change join query from `plan:planes!...(nombre, vigencia_meses, clases_incluidas)` to `plan:planes!...(nombre)` and from `plan_tipo:plan_tipos!...(nombre, clases_incluidas)` to `plan_tipo:plan_tipos!...(nombre, vigencia_dias, clases_incluidas)`
- [x] 4.7 Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: remove `plan_vigencia_meses` and `plan_clases_incluidas` from row mapping; add `plan_tipo_vigencia_dias: row.plan_tipo?.vigencia_dias ?? null`; update internal `PlanJoin` type to remove the two fields

## 5. Hooks

- [x] 5.1 Update `src/hooks/portal/planes/usePlanForm.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from plan-level initial values and defaults
- [x] 5.2 Update `src/hooks/portal/planes/usePlanForm.ts`: remove plan-level validation for `precio`, `vigencia_meses`, `clases_incluidas`
- [x] 5.3 Update `src/hooks/portal/planes/usePlanForm.ts`: make plan_tipo `clases_incluidas` validation optional — empty string is valid (maps to `null` / unlimited); only validate if non-empty
- [x] 5.4 Update `src/hooks/portal/planes/usePlanForm.ts`: add at-least-one-tipo validation guard — if `tiposForm.length === 0`, set `tiposGlobalError` to "El plan debe tener al menos un subtipo." and block submission
- [x] 5.5 Update `src/hooks/portal/planes/usePlanForm.ts`: in `buildTipoChanges` and new-tipo submission, map empty `clases_incluidas` string to `null` instead of parsing to integer
- [x] 5.6 Update `src/hooks/portal/planes/usePlanes.ts`: remove `precio`, `vigencia_meses`, `clases_incluidas` from create/update input construction
- [x] 5.7 Update `src/hooks/portal/planes/usePlanes.ts`: recompute `vigenciaLabel` from `plan.plan_tipos` — if all active tipos share the same `vigencia_dias`, show that value; if range, show "Xd – Yd"; if none, show "—"
- [x] 5.8 Update `src/hooks/portal/planes/usePlanesView.ts`: recompute `vigenciaLabel` from `plan.plan_tipos` using the same logic as 5.7
- [x] 5.9 Update `src/hooks/portal/planes/useSuscripcion.ts`: remove fallback `?? selectedPlan.precio` in `monto` computation — use `selectedTipo.precio` directly
- [x] 5.10 Update `src/hooks/portal/planes/useSuscripcion.ts`: remove fallback `?? selectedPlan.clases_incluidas` in `clases_plan` computation — use `selectedTipo.clases_incluidas` directly
- [x] 5.11 Update `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: replace `addMonths(start, row.plan_vigencia_meses)` with `addDays(start, row.plan_tipo_vigencia_dias!)` for `fecha_fin` computation
- [x] 5.12 Update `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: update `clasesRestantes` default to use `row.plan_tipo_clases_incluidas` only (remove `?? row.plan_clases_incluidas` fallback)

## 6. Components

- [x] 6.1 Update `src/components/portal/planes/PlanFormModal.tsx`: remove plan-level `precio`, `vigencia_meses`, `clases_incluidas` input fields from the form
- [x] 6.2 Update `src/components/portal/planes/PlanFormModal.tsx`: make plan_tipo `clases_incluidas` input optional with placeholder "Sin límite (dejar vacío)"
- [x] 6.3 Update `src/components/portal/planes/PlanFormModal.tsx`: display `tiposGlobalError` inline error message when present (above the tipos list)
- [x] 6.4 Update `src/components/portal/planes/SuscripcionModal.tsx`: remove plan-level `vigencia` and `clasesLabel` computed from `plan.vigencia_meses` and `plan.clases_incluidas`
- [x] 6.5 Update `src/components/portal/planes/SuscripcionModal.tsx`: remove fallback `selectedTipo?.precio ?? plan.precio` — use `selectedTipo.precio` directly
- [x] 6.6 Update `src/components/portal/planes/SuscripcionModal.tsx`: remove fallback references to plan-level `clases_incluidas` and `vigencia_meses` in summary display
- [x] 6.7 Update `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`: replace `plan_vigencia_meses` display with `plan_tipo_vigencia_dias` in date hint text
- [x] 6.8 Update `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`: remove reference to `plan_clases_incluidas` — use `plan_tipo_clases_incluidas` only

## 7. Verification

- [x] 7.1 Run `npx tsc --noEmit` and resolve all TypeScript compile errors
- [x] 7.2 Manually test: create a new plan with 1 tipo → succeeds; create with 0 tipos → validation error blocks submission
- [x] 7.3 Manually test: plan_tipo with empty `clases_incluidas` → saves as `null`, displays "Sin límite" / "Ilimitadas"
- [x] 7.4 Manually test: edit existing plan with tipos → all tipo data loads correctly, modifications save correctly
- [x] 7.5 Manually test: admin validates subscription → `fecha_fin` computed from `plan_tipo.vigencia_dias` (addDays)

## 8. Documentation & Finalization

- [x] 8.1 Update `projectspec/03-project-structure.md` if the change affects documented architecture (e.g., types, hooks, or services section)
- [x] 8.2 Create commit message and pull request description summarizing: migration drop, types cleanup, service/hook/component updates, at-least-one-tipo enforcement, optional clases_incluidas on tipos
