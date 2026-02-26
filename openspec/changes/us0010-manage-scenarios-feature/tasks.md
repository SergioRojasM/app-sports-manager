## 1. Branch and Workspace Safety

- [x] 1.1 Create a feature branch using format feat/description (example: feat/scenario-management).
- [x] 1.2 Validate current branch is not main, master, or develop before starting implementation.

## 2. Delivery Layer (page)

- [x] 2.1 Refactor src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx to render only the feature root component.
- [x] 2.2 Verify the route page contains no direct Supabase/data-fetching logic and delegates orchestration to hooks/services.

## 3. Domain Layer (types)

- [x] 3.1 Create src/types/portal/scenarios.types.ts with Scenario, ScenarioSchedule, ScenarioAvailability, CreateScenarioInput, UpdateScenarioInput, UpsertScenarioSchedulesInput, ScenarioFormValues, and ScenariosViewModel contracts.
- [x] 3.2 Ensure all scenario contracts enforce tenant-scoped identifiers and typed validation error structures.

## 4. Infrastructure Layer (service)

- [x] 4.1 Create src/services/supabase/portal/scenarios.service.ts with listScenariosByTenant(tenantId).
- [x] 4.2 Implement createScenario(payload) and updateScenario(scenarioId, payload) with tenant-scoped filters.
- [x] 4.3 Implement listScenarioSchedules(tenantId, escenarioId) and upsertScenarioSchedules(tenantId, escenarioId, payload).
- [x] 4.4 Export service wiring from src/services/supabase/portal/index.ts if needed by hooks.

## 5. Application Layer (hooks)

- [x] 5.1 Create src/hooks/portal/scenarios/useScenarios.ts to orchestrate list loading, modal open/close, selected scenario, and create/edit submissions.
- [x] 5.2 Add optional src/hooks/portal/scenarios/useScenarioForm.ts only if form complexity requires extraction.
- [x] 5.3 Implement validation/normalization rules in hook flow (required nombre/tipo, positive capacidad, dia_semana range, hora_fin > hora_inicio, URL format, trimmed text).
- [x] 5.4 Implement post-mutation refetch flow so cards reflect persisted data after create/edit.

## 6. Presentation Layer (components)

- [x] 6.1 Create src/components/portal/scenarios/ScenariosPage.tsx as feature container using hook state/view model.
- [x] 6.2 Create src/components/portal/scenarios/ScenarioCard.tsx with availability badge, scenario metadata, and action buttons.
- [x] 6.3 Create src/components/portal/scenarios/ScenarioFormModal.tsx as a shared right-side modal for create/edit modes.
- [x] 6.4 Create src/components/portal/scenarios/ScenariosHeaderFilters.tsx (if separated) and wire search/filter controls.
- [x] 6.5 Create src/components/portal/scenarios/index.ts barrel exports and connect to page entrypoint.

## 7. Role Navigation Alignment

- [x] 7.1 Update role-based menu behavior to ensure gestion-escenarios entry is visible only for administrador in active tenant context.
- [x] 7.2 Verify unauthorized tenant context does not render tenant-scoped menu and preserves redirect to /portal/orgs.

## 8. Documentation Updates

- [x] 8.1 Update projectspec/03-project-structure.md with the new scenarios feature-slice references.
- [x] 8.2 Update README.md to document administrator scenario management capability and route expectations.

## 9. Verification and QA

- [x] 9.1 Run lint/type checks for touched files and resolve only scenario-feature-related issues.
- [ ] 9.2 Execute manual QA for list/loading/empty states and create/edit modal flows on /portal/orgs/[tenant_id]/gestion-escenarios.
- [x] 9.3 Validate tenant scoping and that persistence touches only public.escenarios and public.horarios_escenarios.

## 10. Delivery Artifacts

- [x] 10.1 Prepare a conventional commit message summarizing scenario-management implementation scope.
- [x] 10.2 Draft pull request description including scope, architecture decisions, validation/QA evidence, and non-goals.
