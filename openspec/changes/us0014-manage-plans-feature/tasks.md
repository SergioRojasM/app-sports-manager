## 1. Branch Setup

- [x] 1.1 Create a new feature branch: `feat/us0014-manage-plans-feature`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260301000200_planes_gestion.sql`
- [x] 2.2 Add `ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS vigencia_meses integer`
- [x] 2.3 Add backfill UPDATE: `vigencia_meses = greatest(1, ceil(duracion_dias / 30))` where null
- [x] 2.4 Apply `ALTER COLUMN vigencia_meses SET NOT NULL, SET DEFAULT 1`
- [x] 2.5 Add `ALTER TABLE public.planes DROP COLUMN IF EXISTS duracion_dias`
- [x] 2.6 Add `ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
- [x] 2.7 Add unique constraint `planes_tenant_nombre_uk` on `(tenant_id, nombre)` (idempotent DO block)
- [x] 2.8 Create or replace `public.set_updated_at()` trigger function and attach to `planes`
- [x] 2.9 Create `public.planes_disciplina` join table with PKs, FKs (`ON DELETE CASCADE`), unique constraint, and indexes
- [x] 2.10 Add RLS mutation policies for `public.planes` (insert/update/delete — admin only via `get_admin_tenants_for_authenticated_user()`)
- [x] 2.11 Enable RLS on `public.planes_disciplina` and add select/insert/delete policies
- [x] 2.12 Apply migration locally (`supabase db reset` or `supabase migration up`) and verify schema

## 3. Types

- [x] 3.1 Create `src/types/portal/planes.types.ts`
- [x] 3.2 Define `Plan`, `PlanDisciplina`, `PlanWithDisciplinas`, `PlanTableItem` types
- [x] 3.3 Define `CreatePlanInput`, `UpdatePlanInput` types
- [x] 3.4 Define `PlanFormValues`, `PlanFormField`, `PlanFieldErrors` types
- [x] 3.5 Define `PlanesViewModel` and `PlanServiceErrorCode` types

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/planes.service.ts`
- [x] 4.2 Implement `getPlanes(supabase, tenantId)` — single query with nested `planes_disciplina(disciplina_id)` join
- [x] 4.3 Implement `createPlan(supabase, input: CreatePlanInput)` — insert into `planes`, then batch-insert `planes_disciplina` rows
- [x] 4.4 Implement `updatePlan(supabase, input: UpdatePlanInput)` — update `planes`, delete existing `planes_disciplina`, re-insert new set
- [x] 4.5 Implement `deletePlan(supabase, tenantId, planId)` — delete plan row (cascade handles `planes_disciplina`)
- [x] 4.6 Implement `mapServiceError(error: unknown): PlanServiceErrorCode` — map unique-constraint and FK violations to typed codes
- [x] 4.7 Export all functions from `src/services/supabase/portal/index.ts`

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/planes/usePlanForm.ts` — form state, field updates, validation logic, submit handler
- [x] 5.2 Implement field-level validation in `usePlanForm`: `nombre` required/max 100, `precio` ≥ 0, `vigencia_meses` integer ≥ 1, `disciplinaIds` non-empty array
- [x] 5.3 Create `src/hooks/portal/planes/usePlanes.ts` — list state, search filtering, modal open/close, delete flow, delegates form to `usePlanForm`
- [x] 5.4 In `usePlanes`, load tenant disciplines (via disciplines service) alongside plans for the multi-select
- [x] 5.5 Expose `openCreateModal()`, `openEditModal(plan)`, `closeModal()`, `deletePlan(planId)`, `refresh()`, `setSearchTerm()` from `usePlanes`

## 6. Components

- [x] 6.1 Create `src/components/portal/planes/PlanesHeaderFilters.tsx` — search input + "New Plan" button, mirrors `DisciplinesHeaderFilters`
- [x] 6.2 Create `src/components/portal/planes/PlanesTable.tsx` — table with columns: Name, Description, Price, Validity, Disciplines (badge chips), Status, Actions (edit/delete)
- [x] 6.3 Create `src/components/portal/planes/PlanFormModal.tsx` — right-side slide-over with all plan fields and discipline checkbox multi-select; supports create/edit modes; backdrop + Esc close; focus trap; loading/disabled state on submit
- [x] 6.4 Create `src/components/portal/planes/PlanesPage.tsx` — client component wiring `usePlanes` to `PlanesHeaderFilters`, `PlanesTable`, and `PlanFormModal`; include loading, empty, and error states
- [x] 6.5 Create `src/components/portal/planes/index.ts` — barrel export for all `planes` components

## 7. Route (Delivery Layer)

- [x] 7.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx` — thin page that resolves `tenant_id` from params and renders `<PlanesPage tenantId={tenantId} />`

## 8. Navigation

- [x] 8.1 Add "Planes" nav entry to `administrador` array in `ROLE_TENANT_ITEMS` in `src/types/portal.types.ts` (actual location of nav config, not RoleBasedMenu.tsx)
- [x] 8.2 N/A — `src/lib/constants.ts` has no `NAV_ROUTES` map; navigation is fully driven by `ROLE_TENANT_ITEMS`

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` — add `planes/` to the directory tree in the routes, components, hooks, services, and types sections

## 10. QA Validation

- [x] 10.1 Verify create plan flow: submit valid form with multiple disciplines → plan appears in table with correct discipline badges
- [x] 10.2 Verify edit plan flow: edit existing plan, change disciplines → table row reflects updated values
- [x] 10.3 Verify delete plan flow: confirm deletion → plan removed; cancel → plan remains
- [x] 10.4 Verify form validation: submit with missing name, negative price, vigencia < 1, no disciplines → appropriate field-level errors shown, no request sent
- [x] 10.5 Verify duplicate name rejection: create/edit plan with an existing name → user-facing error displayed without closing modal
- [x] 10.6 Verify RLS: log in as a non-admin user and attempt to mutate a plan → mutation rejected, no data persisted
- [x] 10.7 Verify navigation entry: administrator sees "Planes" in side menu and link navigates correctly

## 11. Commit & Pull Request

- [x] 11.1 Stage all changed files and create a commit with message: `feat(planes): add membership plan management (US-0014)` — include migration, types, service, hooks, components, route, nav, and docs
- [x] 11.2 Merge feature branch into `develop` (squash not required — incremental commits preserved)
