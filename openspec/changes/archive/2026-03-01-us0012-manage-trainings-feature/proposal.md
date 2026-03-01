## Why

Tenant administrators currently lack a dedicated workflow to operate trainings using the already-modeled series + instances data model, including recurrence and exception handling. This change is needed now to complete the core operational module set (scenarios, disciplines, trainings) with consistent architecture and UX patterns.

## What Changes

- Add a tenant-scoped training management capability for `gestion-entrenamientos` with list/calendar visualization grouped by training series.
- Add create flow (wizard) for `unico` and `recurrente` trainings, including recurrence rules and generated instances.
- Add edit/delete flows with explicit scope selection (`single`, `future`, `series`) for recurring data operations.
- Add right-side create/edit modal and deterministic validation/error messaging aligned with current portal behavior.
- Enforce architecture boundaries: page as render-only composition, business logic in hooks, data access in services, contracts in types.

## Capabilities

### New Capabilities
- `training-management`: Manage tenant trainings end-to-end (view, create, edit, delete) using series, recurrence rules, and instance-level exceptions with explicit mutation scope.

### Modified Capabilities
- None.

## Impact

- Affected app route: `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx`.
- New feature slice across layers following project conventions:
  - `src/components/portal/entrenamientos/*`
  - `src/hooks/portal/entrenamientos/*`
  - `src/services/supabase/portal/entrenamientos.service.ts`
  - `src/types/portal/entrenamientos.types.ts`
- Supabase usage impact: training group/rule/instance reads and mutations must respect tenant scoping, recurrence constraints, and scope-based update/delete behavior.
- Documentation impact: update module references in `README.md` and `projectspec/03-project-structure.md`.

## Non-goals

- No redesign of global portal shell/navigation beyond what is necessary to access and use the trainings module.
- No changes to non-training bounded contexts (auth, tenant profile, scenarios, disciplines behavior).
- No introduction of public REST endpoints; the feature remains based on internal Supabase service contracts.
- No expansion of training enrollment/attendance workflows beyond training schedule management.

## Files to Create or Modify

- `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx`
- `src/components/portal/entrenamientos/EntrenamientosPage.tsx`
- `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx`
- `src/components/portal/entrenamientos/EntrenamientosList.tsx` (if split required)
- `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`
- `src/components/portal/entrenamientos/EntrenamientoScopeModal.tsx`
- `src/components/portal/entrenamientos/EntrenamientoWizard.tsx`
- `src/components/portal/entrenamientos/index.ts`
- `src/hooks/portal/entrenamientos/useEntrenamientos.ts`
- `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`
- `src/hooks/portal/entrenamientos/useEntrenamientoScope.ts`
- `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts` (optional split)
- `src/services/supabase/portal/entrenamientos.service.ts`
- `src/services/supabase/portal/index.ts` (exports)
- `src/types/portal/entrenamientos.types.ts`
- `README.md`
- `projectspec/03-project-structure.md`

## Step-by-step Implementation Plan

1. **Page**: Keep tenant shared route page as render-only entrypoint composing the trainings feature root.
2. **Components**: Build trainings UI from the provided design reference (`projectspec/designs/10_entrenamientos.html`), including list/calendar, right-side form modal, wizard orchestration, and scope modal.
3. **Hooks**: Implement orchestration hooks for loading states, CRUD flows, wizard validation, and scope-aware mutations.
4. **Service**: Implement Supabase service contracts for series/rules/instances listing, creation, updates, scoped deletes, and instance generation.
5. **Types**: Define contracts/view models for groups, rules, instances, wizard payloads, scope payloads, and UI state.
6. **Validation & Error Mapping**: Enforce business validations (date/time/all-day/required fields) and map backend errors to deterministic user-facing messages.
7. **Docs**: Update README and structure documentation to include the trainings feature slice.
8. **Verification**: Validate architecture flow (`components -> hooks -> services -> supabase`) and execute lint/type checks once implemented.
