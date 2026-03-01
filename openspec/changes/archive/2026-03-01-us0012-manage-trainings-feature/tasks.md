## 1. Workflow Setup

- [x] 1.1 Create a feature branch named `feat/manage-trainings-feature`
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop`

## 2. Page Layer (Delivery)

- [x] 2.1 Update `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` to render only `EntrenamientosPage`
- [x] 2.2 Verify no Supabase calls or business logic remain in the route page

## 3. Component Layer (Presentation)

- [x] 3.1 Create `src/components/portal/entrenamientos/EntrenamientosPage.tsx` with loading, empty, and error states
- [x] 3.2 Create calendar/list visualization components grouped by series with current-month default and month navigation
- [x] 3.3 Create `EntrenamientoWizard.tsx` for `unico` and `recurrente` creation flow
- [x] 3.4 Create right-side modal `EntrenamientoFormModal.tsx` for create/edit interactions
- [x] 3.5 Create `EntrenamientoScopeModal.tsx` for `single|future|series` mutation scope selection
- [x] 3.6 Add `src/components/portal/entrenamientos/index.ts` exports for feature components

## 4. Hook Layer (Application)

- [x] 4.1 Implement `useEntrenamientos.ts` orchestration for fetch, filters, and mutation lifecycle
- [x] 4.2 Implement `useEntrenamientoForm.ts` with client-side validations and submit guards
- [x] 4.3 Implement `useEntrenamientoScope.ts` to map scope actions and payloads consistently
- [x] 4.4 Add `useEntrenamientosCalendar.ts` if needed to isolate month range/state logic

## 5. Service Layer (Infrastructure)

- [x] 5.1 Create `src/services/supabase/portal/entrenamientos.service.ts` with typed list methods for groups and instances by tenant/range
- [x] 5.2 Implement create flow methods for series, recurrence rules, and immediate generation of all eligible instances
- [x] 5.3 Implement update methods for series/instance preserving exception and sync rules
- [x] 5.4 Implement delete method with explicit `single|future|series` scope behavior
- [x] 5.5 Wire service exports in `src/services/supabase/portal/index.ts`

## 6. Type Layer (Domain Contracts)

- [x] 6.1 Create `src/types/portal/entrenamientos.types.ts` for group, rule, instance, and view-model contracts
- [x] 6.2 Define typed input payloads for create/update/delete scope operations and wizard values
- [x] 6.3 Ensure hooks/components/services consume shared contracts without `any`

## 7. Validation, Error Mapping, and Behavior Checks

- [x] 7.1 Enforce required-field and schedule validations (`fecha_fin`, time ranges, all-day behavior, max 6 months)
- [x] 7.2 Map backend permission/integrity/conflict failures to deterministic user-facing messages
- [x] 7.3 Verify instance-level edits mark exceptions and series sync preserves blocked/customized instances

## 8. Verification and Documentation

- [x] 8.1 Run project lint/type checks and fix trainings-slice issues
- [x] 8.2 Perform manual QA for create/edit/delete with all scope options and month navigation
- [x] 8.3 Update `README.md` with trainings module summary
- [x] 8.4 Update `projectspec/03-project-structure.md` with `entrenamientos` feature-slice structure

## 9. Delivery and Handoff

- [x] 9.1 Prepare a conventional commit message summarizing training-management implementation
- [x] 9.2 Draft pull request description with scope, verification evidence, and known limitations
