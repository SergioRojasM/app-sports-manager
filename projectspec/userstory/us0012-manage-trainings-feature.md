# User Story: Implement Training Management Feature (`manage_trainings_feature`)

## ID
US-0012

## Name
Create training management feature for tenant administrators (view, create, edit, delete) using a series → instances model

### As a...
As an authenticated tenant administrator in the portal

### I want...
I want to manage trainings from a calendar/list screen, creating and maintaining training series and instance exceptions with explicit edit/delete scope

### So that...
I can operate the tenant training schedule consistently, while preserving recurrent planning rules and one-off exceptions.

## Description
Implement the `entrenamientos` feature slice for the shared tenant route, based on the visual reference in `projectspec/designs/10_entrenamientos.html` and aligned with the hexagonal architecture defined in `projectspec/03-project-structure.md`.

The page `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` must be a presentation entrypoint that **only composes/renders components**. Business logic and data access must be implemented in hook/service layers.

This story includes:
1. A general training management page with list/calendar visualization grouped by series.
2. A creation flow (wizard) for training series and generated instances.
3. Edit and delete flows for both series and single instances with explicit scope modal:
   - `Only this instance`
   - `This and future instances`
   - `Whole series`
4. A right-side form modal for create/edit following the same lateral UX pattern used in scenarios.
5. New feature folders:
   - `src/components/portal/entrenamientos/`
   - `src/hooks/portal/entrenamientos/`

## Functional Scope

### 1) Tenant shared trainings route
- Route: `GET /portal/orgs/[tenant_id]/gestion-entrenamientos`
- File: `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx`
- Constraint: page must only render the feature root component (no direct Supabase calls).

### 2) General trainings page + calendar visualization
- Build a root feature container (e.g., `EntrenamientosPage`) inspired by `10_entrenamientos.html`.
- Provide list/calendar visualization grouped by series (`entrenamientos_grupo`).
- Include loading, empty, and error states.
- Include CTA `Crear entrenamiento`.
- Instance detail must display badge: `Belongs to series <series_name>`.

### 3) Create training wizard (series-first)
Wizard steps:
1. **Base data**: `disciplina`, `escenario`, `entrenador`, `duracion`, `cupo`.
2. **Type selection**: `Único` or `Recurrente`.
   - If `Único`: capture date/time for one occurrence.
   - If `Recurrente`: capture date range + recurrence rules.

Recurrence rules requirements:
- Daily (`dia_semana = null`) or specific weekdays (`dia_semana in 0..6`).
- One or multiple time slots per day.
- Support all-day mode (`todo_el_dia = true`) without start/end times.

Creation result:
- Create parent series in `entrenamientos_grupo`.
- Create recurrence rows in `entrenamientos_grupo_reglas` (if recurrent).
- Generate linked instances in `entrenamientos` with FK to group/rule where applicable.

### 4) Edit behaviors
#### 4.1 Edit series
- Update `entrenamientos_grupo` and sync eligible instances only:
  - future instances (`fecha_hora >= now()` or `fecha_hora is null`),
  - not cancelled,
  - not blocked (`bloquear_sync_grupo = false`).
- Preserve manually customized exceptions.

#### 4.2 Edit single instance
- Mark edited instance as exception:
  - `es_excepcion_serie = true`
  - `bloquear_sync_grupo = true`
- Ensure future series sync does not overwrite that exception.

#### 4.3 Scope modal for edit/delete
For actions initiated from an instance or series context, show a scope modal:
- `Only this instance`
- `This and future instances`
- `Whole series`

### 5) Delete behaviors
- Deleting `Only this instance`: remove/update one `entrenamientos` row.
- Deleting `This and future instances`: apply from selected point in time forward.
- Deleting `Whole series`: remove `entrenamientos_grupo` (+ cascade/linked data according to DB constraints and logic).
- Always require explicit confirmation and show deterministic error messages on failures.

## Data Model and Fields (from current migrations)

### Table: `public.entrenamientos_grupo` (series)
Key fields used in this story:
- `id`, `tenant_id`, `tipo` (`unico|recurrente`), `nombre`, `descripcion`
- `disciplina_id`, `escenario_id`, `entrenador_id`
- `duracion_minutos`, `cupo_maximo`, `timezone`
- `fecha_inicio`, `fecha_fin`, `estado` (`activo|cancelado|finalizado`)

Relevant DB rules to respect in UX/service:
- `fecha_fin >= fecha_inicio`
- `fecha_fin <= fecha_inicio + 6 months`
- For `tipo = unico`, `fecha_fin` must be `null` or equal to `fecha_inicio`
- `duracion_minutos > 0` and `cupo_maximo > 0` when provided

### Table: `public.entrenamientos_grupo_reglas` (recurrence rules)
Fields:
- `id`, `tenant_id`, `entrenamiento_grupo_id`
- `dia_semana` (`null` = every day, or `0..6`)
- `todo_el_dia`, `hora_inicio`, `hora_fin`

Rules:
- If `todo_el_dia = true`, no hours are allowed.
- If `todo_el_dia = false`, `hora_inicio` and `hora_fin` are required and `hora_fin > hora_inicio`.
- Allow multiple rule rows per day/series.

### Table: `public.entrenamientos` (instances)
Fields:
- `id`, `tenant_id`, `entrenamiento_grupo_id`, `entrenamiento_grupo_regla_id`
- `origen_creacion` (`manual|generado`)
- `es_excepcion_serie`, `bloquear_sync_grupo`
- `nombre`, `descripcion`, `disciplina_id`, `escenario_id`, `entrenador_id`
- `fecha_hora`, `duracion_minutos`, `cupo_maximo`, `estado`

## UX Validations (mandatory)
- `fecha_fin >= fecha_inicio`
- `fecha_fin <= fecha_inicio + 6 months`
- `hora_fin > hora_inicio` (when not all-day)
- If `todo_el_dia = true`, do not request time fields
- Enforce required data before submit:
  - `disciplina_id`, `escenario_id`, `tipo`, `fecha_inicio`
- Prevent mutation while form is submitting.

## Endpoints and URLs

### App route
- `GET /portal/orgs/[tenant_id]/gestion-entrenamientos`

### Internal service contracts (Supabase SDK; no public REST required)
Implement in `src/services/supabase/portal/entrenamientos.service.ts`:
1. `listTrainingGroupsByTenant(tenantId: string)`
2. `listTrainingInstancesByTenantAndRange(tenantId: string, from?: string, to?: string)`
3. `createTrainingSeries(input: CreateTrainingSeriesInput)`
4. `updateTrainingSeries(input: UpdateTrainingSeriesInput)`
5. `updateTrainingInstance(input: UpdateTrainingInstanceInput)`
6. `deleteTrainingWithScope(input: DeleteTrainingWithScopeInput)`
7. `upsertTrainingGroupRules(input: UpsertTrainingGroupRulesInput)`
8. `generateSeriesInstances(input: GenerateSeriesInstancesInput)`

### Scope payload contract (required)
All update/delete actions affecting recurring data must include `scope`:
- `scope = 'single' | 'future' | 'series'`
- plus contextual identifiers (`trainingId`, `trainingGroupId`, `effectiveFrom`) as needed.

## Files to Modify (expected)

### User story artifact
1. `projectspec/userstory/us0012-manage-trainings-feature.md`

### Delivery (`src/app`)
2. `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` (render-only composition)

### Presentation (`src/components`)
3. `src/components/portal/entrenamientos/EntrenamientosPage.tsx`
4. `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx`
5. `src/components/portal/entrenamientos/EntrenamientosList.tsx` (if list split is needed)
6. `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` (right-side modal)
7. `src/components/portal/entrenamientos/EntrenamientoScopeModal.tsx` (scope selector for edit/delete)
8. `src/components/portal/entrenamientos/EntrenamientoWizard.tsx` (step orchestration)
9. `src/components/portal/entrenamientos/index.ts`

### Application (`src/hooks`)
10. `src/hooks/portal/entrenamientos/useEntrenamientos.ts`
11. `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`
12. `src/hooks/portal/entrenamientos/useEntrenamientoScope.ts`
13. `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts` (optional if split improves SRP)

### Infrastructure (`src/services`)
14. `src/services/supabase/portal/entrenamientos.service.ts`
15. `src/services/supabase/portal/index.ts` (export wiring if required)

### Domain (`src/types`)
16. `src/types/portal/entrenamientos.types.ts`

### Documentation
17. `README.md` (add module summary for training management)
18. `projectspec/03-project-structure.md` (include `entrenamientos` feature-slice references)

## Suggested Type Contracts
- `TrainingGroup`
- `TrainingGroupRule`
- `TrainingInstance`
- `TrainingScope = 'single' | 'future' | 'series'`
- `CreateTrainingSeriesInput`
- `UpdateTrainingSeriesInput`
- `UpdateTrainingInstanceInput`
- `DeleteTrainingWithScopeInput`
- `TrainingWizardValues`
- `TrainingFieldErrors`
- `TrainingCalendarItem`
- `TrainingsViewModel`

## Implementation Steps
1. Create `entrenamientos` feature folders in `components/portal` and `hooks/portal`.
2. Define domain contracts in `src/types/portal/entrenamientos.types.ts`.
3. Implement Supabase service methods for series/rules/instances operations.
4. Implement `useEntrenamientos` orchestration hook (loading, filtering, CRUD, scope actions).
5. Implement `EntrenamientosPage` and `EntrenamientosCalendar` using `10_entrenamientos.html` as UI reference.
6. Implement right-side `EntrenamientoFormModal` with create/edit behavior.
7. Implement scope modal and apply `single|future|series` logic in update/delete flows.
8. Keep route `page.tsx` as a thin render-only entrypoint.
9. Add error mapping for deterministic user messages (validation, FK, permission, conflict).
10. Update docs and verify lint/type checks.

## Definition of Done
1. `gestion-entrenamientos/page.tsx` only renders the feature root component(s).
2. `components/portal/entrenamientos` and `hooks/portal/entrenamientos` exist and are used.
3. Admin user can view trainings in list/calendar grouped by series.
4. Admin user can create `unico` and `recurrente` series via wizard.
5. Creating a series generates linked instances in `entrenamientos`.
6. Admin user can edit/delete with explicit scope (`single|future|series`).
7. Editing a single instance marks it as exception and future sync respects it.
8. Validation rules match DB constraints and UX requirements.
9. Architecture rule is respected: Components → Hooks → Services → Supabase.
10. Touched files pass TypeScript/lint checks.

## Testing and Validation

### Manual QA checklist
- Open `/portal/orgs/<tenant_id>/gestion-entrenamientos` as tenant admin.
- Verify loading/empty/error states.
- Create a unique training and verify one linked instance is created.
- Create a recurrent series with multiple rules and verify generated instances.
- Edit one instance with `Only this instance` and verify exception flags are applied.
- Edit series and verify only eligible future/non-blocked/non-cancelled instances sync.
- Delete using each scope option and verify expected impact.
- Verify non-admin mutation attempts are rejected by backend policies.

### Unit/Integration guidance
If test harness exists, add tests for:
1. `useEntrenamientos` state transitions and mutation orchestration.
2. Wizard validations (dates, time ranges, all-day behavior, 6-month cap).
3. Scope logic (`single|future|series`) and exception behavior.
4. Service payload mapping for `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `entrenamientos`.
5. Modal behavior parity with scenarios lateral modal pattern.

If no test harness exists, document pending tests in PR notes.

## Non-Functional Requirements

### Security
- Mutations must remain admin-only at tenant scope (RLS already enforced).
- Service queries must always filter by `tenant_id` to prevent cross-tenant access.
- Do not bypass route/role constraints in UI orchestration.

### Performance
- Calendar/list interactions must remain responsive for medium dataset sizes.
- Avoid unnecessary refetches after mutations; prefer targeted refresh where possible.
- Batch/generate instances efficiently for recurrent series creation.

### Maintainability
- Keep all training-specific code co-located in the `entrenamientos` slice.
- Reuse shared UI primitives from `src/components/ui`.
- Keep modal and state management patterns consistent with existing scenarios module.

### Accessibility
- Right-side modal supports keyboard interaction (`Esc` when safe) and focus-safe behavior.
- Inputs/buttons include accessible labels.
- Calendar/list actions remain keyboard reachable.

## Expected Results
- A complete tenant training management feature is specified for implementation using a series → instances model.
- The UI/UX follows `projectspec/designs/10_entrenamientos.html`, including calendar/list, create wizard, and right-side modal editing.
- Users can create, edit, and delete trainings with explicit scope selection.
- Individual exceptions are preserved across future series synchronizations.
- The implementation path is fully aligned with the project hexagonal architecture and current Supabase schema.
