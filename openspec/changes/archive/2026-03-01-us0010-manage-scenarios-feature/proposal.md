## Why

Administrators currently have a tenant-scoped route for scenarios but no complete feature to manage scenario data end-to-end, which blocks operational updates for training spaces. Implementing this now unlocks a core admin workflow already planned in the product journey and aligns the route with the target hexagonal feature-slice architecture.

## What Changes

- Implement tenant administrator scenario management at `/portal/orgs/[tenant_id]/gestion-escenarios` for view, create, and edit flows.
- Add a scenarios feature slice using the project methodology: page -> component -> hook -> service -> types.
- Build scenario list UI with card grid, loading state, and empty state, aligned with the visual reference in `projectspec/designs/08_scenarios.html`.
- Add a right-side create/edit modal with shared component behavior, validation feedback, submit loading state, and cancel/close controls.
- Introduce Supabase service methods for scenario and schedule listing/mutation scoped to tenant context.
- Add scenario domain contracts and view/form payload types for typed orchestration across layers.
- Update docs to reflect the new `scenarios` feature slice and admin capability.

## Capabilities

### New Capabilities
- `scenario-management`: Administrator can list, create, and edit tenant-scoped scenarios with schedule-aware availability and validated form workflows.

### Modified Capabilities
- `portal-role-navigation`: Clarify and enforce administrator access/entry expectations for tenant-scoped scenario management route behavior under `/portal/orgs/[tenant_id]/gestion-escenarios`.

## Impact

- Affected areas:
  - Delivery: tenant admin scenarios route page composition.
  - Presentation: new scenarios feature components for list/cards/modal/filter header.
  - Application: scenario orchestration hooks (list, modal state, create/edit submit).
  - Infrastructure: Supabase portal scenarios service (scenario/schedule read-write methods).
  - Domain: new scenario and schedule contracts in portal types.
- Data scope: `public.escenarios` and `public.horarios_escenarios` only.
- APIs/dependencies:
  - Uses existing Supabase SDK integration (no mandatory new external dependency).
  - No required breaking API changes.

## Non-goals

- Implementing unrelated tenant modules or cross-feature admin workflows outside scenario management.
- Introducing additional data-table dependencies beyond `escenarios` and `horarios_escenarios`.
- Building a new standalone REST layer unless implementation later requires it for architectural reasons.
- Redesigning shared portal shell/navigation visuals beyond the scenario feature surface.

## Files to be Modified or Created

- `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx`
- `src/components/portal/scenarios/ScenariosPage.tsx`
- `src/components/portal/scenarios/ScenarioCard.tsx`
- `src/components/portal/scenarios/ScenarioFormModal.tsx`
- `src/components/portal/scenarios/ScenariosHeaderFilters.tsx` (if split)
- `src/components/portal/scenarios/index.ts`
- `src/hooks/portal/scenarios/useScenarios.ts`
- `src/hooks/portal/scenarios/useScenarioForm.ts` (optional)
- `src/services/supabase/portal/scenarios.service.ts`
- `src/services/supabase/portal/index.ts` (if export wiring needed)
- `src/types/portal/scenarios.types.ts`
- `projectspec/03-project-structure.md`
- `README.md`

## Step-by-step Implementation Plan

1. Confirm UI behavior and structure against `projectspec/designs/08_scenarios.html` and keep route page as a thin presentation entrypoint.
2. Create scenario domain types and payload contracts in `src/types/portal/scenarios.types.ts`.
3. Implement Supabase scenarios service methods for list/create/update and schedule list/upsert with tenant scoping.
4. Implement `useScenarios` orchestration hook (loading, selected scenario, modal open/close, create/edit submission and refresh).
5. Implement scenarios presentation components (`ScenariosPage`, `ScenarioCard`, `ScenarioFormModal`, optional filters header) and compose via feature index exports.
6. Integrate create/edit flows with validation rules (`nombre`, `tipo`, numeric/time constraints, URL format) and user feedback states.
7. Update docs (`projectspec/03-project-structure.md`, `README.md`) to include the new feature slice and capability behavior.
8. Validate lint/type checks and run manual QA for admin route access, list rendering, create/edit success path, and invalid-form handling.
