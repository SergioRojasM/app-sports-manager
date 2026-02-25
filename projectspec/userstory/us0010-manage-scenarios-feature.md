# User Story: Implement Scenario Management Feature (`manage_scenarios_feature`)

## ID
US-0010

## Name
Create scenario management feature for administrators (view, create, edit)

### As a...
As an authenticated tenant administrator in the portal

### I want...
I want to view, create, and edit training scenarios from the tenant administration area using the new scenarios UI

### So that...
I can keep tenant scenarios up to date and ready to be used by other portal workflows.

## Description
Implement the `scenarios` feature slice under the tenant administrator route, based on the visual reference in `projectspec/designs/08_scenarios.html` and aligned with the project hexagonal architecture.

The page `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx` must be a presentation entrypoint that **only composes/render components**. Business logic and data access must live in hook/service layers.

This story includes:
1. Scenario listing page UI with cards per scenario (view).
2. Scenario create flow through a lateral modal (create).
3. Scenario edit flow through the same lateral modal pattern used in tenant edit (modify).
4. New feature folders:
   - `src/components/portal/scenarios/`
   - `src/hooks/portal/scenarios/`

## Functional Scope

### 1) Tenant admin scenarios route
- Route: `GET /portal/orgs/[tenant_id]/gestion-escenarios`
- File: `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx`
- Constraint: this page must only render the feature root component (no direct fetching, no Supabase calls).

### 2) Scenario list (view)
- Render a responsive scenarios grid inspired by `08_scenarios.html`.
- Include filter/search header section and cards section.
- Each scenario card must support at minimum:
  - availability badge based on `escenarios.activo` and schedule availability (`horarios_escenarios.disponible`)
  - scenario name
  - location
  - summary attributes (capacity/surface/type)
  - action buttons: `Details` (or equivalent view action) and `Edit`
- Include empty state and loading state.

### 3) Scenario create/edit (lateral modal)
- Provide a right-side modal panel for both create and edit actions.
- Reuse the same lateral interaction pattern as tenant edit UX:
  - open from right side
  - close/cancel controls
  - submit with loading/disabled state
  - field validation messages
- Same component must support both modes (`create` and `edit`) based on props/state.

### 4) Data persistence and orchestration
- Use hook layer for orchestration and UI state management:
  - load scenarios by `tenant_id`
  - open/close modal
  - select scenario for editing
  - submit create/edit
- Use service layer for data access only.
- Use domain types for contracts and form payloads.

## Data / Fields to Create or Update

### Scenario entity fields (minimum contract)
- `id` (uuid, read-only)
- `tenant_id` (uuid, required)
- `nombre` (varchar(100), optional in DB, required at business/UI level)
- `descripcion` (text, optional)
- `ubicacion` (varchar(255), optional)
- `direccion` (varchar(255), optional)
- `coordenadas` (varchar(50), optional, format `lat,long`)
- `capacidad` (integer, optional in DB, recommended as required in UI when applicable)
- `tipo` (varchar(50), optional)
- `activo` (boolean, required, default `true`)
- `image_url` (varchar(500), optional)
- `created_at` (timestamptz, system)
- `updated_at` (timestamptz, system)

### Schedule entity fields (minimum contract)
- Table: `public.horarios_escenarios`
- `id` (uuid, read-only)
- `tenant_id` (uuid, required)
- `escenario_id` (uuid, required, FK to `escenarios.id`)
- `dia_semana` (integer, required, valid range `0..6`)
- `hora_inicio` (time, required)
- `hora_fin` (time, required, must be greater than `hora_inicio`)
- `disponible` (boolean, required, default `true`)
- `created_at` (timestamptz, system)

### Feature data boundary (mandatory)
- This feature must use only:
  - `public.escenarios`
  - `public.horarios_escenarios`
- Do not add direct dependencies on other tables to create, list, or edit escenarios/horarios in this story.

### Form validations
- Required in UI: `nombre`, `tipo`, with optional schedule blocks (`dia_semana`, `hora_inicio`, `hora_fin`).
- `capacidad`, when provided, must be a positive integer.
- Validate `dia_semana` in range `0..6`.
- Validate `hora_fin > hora_inicio` (aligned with constraint `horarios_escenarios_horas_ck`).
- Trim text fields before persisting (`nombre`, `descripcion`, `ubicacion`, `direccion`, `tipo`).
- Validate `image_url` URL format when present.

## Endpoints and URLs

### App routes (Next.js)
- `GET /portal/orgs/[tenant_id]/gestion-escenarios` → scenarios management screen.

### Service contracts (Supabase SDK / internal service methods)
No external REST endpoint is required. Implement service methods in:
- `src/services/supabase/portal/scenarios.service.ts`

Required methods:
1. `listScenariosByTenant(tenantId: string)`
2. `createScenario(payload: CreateScenarioInput)`
3. `updateScenario(scenarioId: string, payload: UpdateScenarioInput)`
4. `listScenarioSchedules(tenantId: string, escenarioId: string)`
5. `upsertScenarioSchedules(tenantId: string, escenarioId: string, payload: UpsertScenarioSchedulesInput)`

### Future-ready API route (optional, only if architectural decision requires)
- `POST /api/portal/orgs/[tenant_id]/scenarios`
- `PATCH /api/portal/orgs/[tenant_id]/scenarios/[scenario_id]`

If these API routes are not needed in current architecture, keep direct service usage from hooks and do not over-engineer.

## Files to Modify (expected)

### User story artifact
1. `projectspec/userstory/us0010-manage-scenarios-feature.md`

### Delivery (`src/app`)
2. `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx`

### Presentation (`src/components`)
3. `src/components/portal/scenarios/ScenariosPage.tsx`
4. `src/components/portal/scenarios/ScenarioCard.tsx`
5. `src/components/portal/scenarios/ScenarioFormModal.tsx`
6. `src/components/portal/scenarios/ScenariosHeaderFilters.tsx` (if kept separate)
7. `src/components/portal/scenarios/index.ts`

### Application (`src/hooks`)
8. `src/hooks/portal/scenarios/useScenarios.ts`
9. `src/hooks/portal/scenarios/useScenarioForm.ts` (optional if separation improves clarity)

### Infrastructure (`src/services`)
10. `src/services/supabase/portal/scenarios.service.ts`
11. `src/services/supabase/portal/index.ts` (export wiring if needed)

### Domain (`src/types`)
12. `src/types/portal/scenarios.types.ts`

### Documentation
13. `projectspec/03-project-structure.md` (add `scenarios` feature slice references if missing)
14. `README.md` (briefly document new portal administrator scenarios capability)

## Suggested Type Contracts
- `Scenario`
- `ScenarioSchedule`
- `ScenarioAvailability = { activo: boolean; hasAvailableSchedule: boolean }`
- `CreateScenarioInput`
- `UpdateScenarioInput`
- `UpsertScenarioSchedulesInput`
- `ScenarioFormValues`
- `ScenariosViewModel`

## Implementation Steps
1. Create `scenarios` folders in components and hooks following feature-slice naming.
2. Define scenario domain types in `src/types/portal/scenarios.types.ts`.
3. Implement Supabase service methods for list/create/update.
4. Implement `useScenarios` hook for listing and modal state orchestration.
5. Build `ScenarioCard`, `ScenarioFormModal`, and `ScenariosPage` components.
6. Keep `page.tsx` as a thin composition layer rendering `ScenariosPage` only.
7. Integrate create/edit flows with optimistic or refetch-based refresh.
8. Add form validation and error/success feedback.
9. Update docs and verify lint/type checks.

## Definition of Done
1. `gestion-escenarios/page.tsx` only renders feature component(s), no data logic.
2. `components/portal/scenarios` and `hooks/portal/scenarios` folders exist and are used.
3. Admin can view tenant scenarios in card layout aligned with `08_scenarios.html` intent.
4. Admin can open lateral modal to create scenario and save successfully.
5. Admin can open lateral modal with prefilled data to edit scenario and save successfully.
6. Form validation and user feedback are implemented for success/failure.
7. Architecture rule is respected: Components → Hooks → Services → Supabase.
8. TypeScript build/lint pass for touched files.

## Testing and Validation

### Manual QA checklist
- Open `/portal/orgs/<tenant_id>/gestion-escenarios` as administrator.
- Verify scenarios list appears with cards and expected fields.
- Open create modal, submit valid payload, confirm card appears/refreshes.
- Open edit modal from existing card, modify data, confirm update is reflected.
- Verify invalid form data shows validation errors.
- Verify non-admin access remains blocked by existing route authorization.

### Unit/Integration guidance
If testing setup exists, add tests for:
1. `useScenarios` loading and modal state transitions.
2. Form validation rules for required fields/capacity/url.
3. Service mapping for list/create/update payloads.
4. Component behavior for create vs edit mode in `ScenarioFormModal`.

If no test harness exists, document the pending tests in PR notes.

## Non-Functional Requirements

### Security
- Enforce tenant scoping in all list/create/update operations using `tenant_id`.
- Prevent cross-tenant updates by validating scenario ownership server-side/service query constraints.
- Keep authorization aligned with administrator-only access for this route.

### Performance
- Avoid N+1 fetches in list rendering.
- Keep list rendering responsive for medium-sized datasets (50+ scenarios).
- Use efficient revalidation strategy after mutations.

### Maintainability
- Keep all scenario-specific UI/logic co-located in `scenarios` feature slice.
- Reuse shared UI primitives from `src/components/ui` when available.
- Keep modal behavior consistent with existing tenant edit pattern.

### Accessibility
- Modal must trap focus and support keyboard close (`Esc`).
- Buttons/inputs must have accessible labels.
- Ensure sufficient contrast and semantic heading structure.

## Expected Results
- A complete administrator-facing scenario management feature exists under tenant-scoped portal routes.
- The UI follows the visual direction of `08_scenarios.html` and uses scenario cards + lateral modal workflows.
- Create and edit operations are fully functional and architecture-compliant.
- The project structure remains consistent with the documented hexagonal feature-slice conventions.
