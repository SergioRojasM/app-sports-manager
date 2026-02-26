# User Story: Implement Discipline Management Feature (`manage_disciplines_feature`)

## ID
US-0011

## Name
Create discipline management feature for administrators (view, create, edit, delete)

### As a...
As an authenticated tenant administrator in the portal

### I want...
I want to view, create, edit, and delete sports disciplines from the tenant administration area

### So that...
I can keep the organization discipline catalog accurate and ready for training/session configuration workflows.

## Description
Implement the `disciplines` feature slice under the tenant administrator route, based on the visual reference in `projectspec/designs/09_disciplines.html` and aligned with the project hexagonal architecture defined in `projectspec/03-project-structure.md`.

The page `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx` must be a presentation entrypoint that **only composes/renders components**. Business logic and data access must live in hook/service layers.

This story includes:
1. Discipline listing UI in **table format** (view).
2. Discipline create flow using a **right-side modal panel**.
3. Discipline edit flow using the **same right-side modal interaction pattern already used for scenarios**.
4. Discipline delete flow from table actions (with confirmation and dependency-safe error handling).
5. New feature folders:
   - `src/components/portal/disciplines/`
   - `src/hooks/portal/disciplines/`

> Note: The requirement "general scenarios page" is interpreted as a **general feature page container component** analogous to scenarios, but for disciplines (e.g., `DisciplinesPage.tsx`).

## Functional Scope

### 1) Tenant admin disciplines route
- Route: `GET /portal/orgs/[tenant_id]/gestion-disciplinas`
- File: `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx`
- Constraint: this page must only render the feature root component (no direct fetching, no Supabase calls).

### 2) Discipline list/table (view)
- Render a responsive table inspired by `09_disciplines.html`:
  - Header title + subtitle.
  - Primary CTA: `Add Discipline`.
  - Table columns: `Discipline`, `Category`, `Status`, `Actions`.
- Include loading, empty, and error states.
- Include search/filter capability over discipline name and description.
- Row actions:
  - `Edit` opens right-side modal prefilled.
  - `Delete` requests confirmation before mutation.

### 3) Discipline create/edit (right-side modal)
- Reuse lateral modal UX pattern equivalent to `ScenarioFormModal` behavior:
  - slides in from right;
  - backdrop click + close button + `Esc` (when not submitting);
  - submit/cancel controls with disabled/loading state;
  - inline validation errors;
  - success/error feedback integrated in page state.
- Same modal component supports both modes (`create` and `edit`) through props/state.

### 4) Discipline delete behavior
- Implement delete from table action.
- If discipline is linked to `entrenamientos` and cannot be deleted due to FK restrictions, show user-friendly error and preserve list state.
- No silent failures.

### 5) Data orchestration and persistence
- Hook layer handles:
  - data loading by `tenant_id`;
  - search/filter state;
  - modal open/close + mode switching;
  - selected discipline state;
  - create/update/delete submission;
  - optimistic UI or refetch strategy after mutations.
- Service layer handles Supabase data access only.
- Domain types define contracts and form payloads.

## Data / Fields to Create or Update

### Discipline entity fields (from `public.disciplinas`)
- `id` (uuid, read-only)
- `tenant_id` (uuid, required)
- `nombre` (varchar(100), required)
- `descripcion` (text, optional)
- `activo` (boolean, required, default `true`)
- `created_at` (timestamptz, system)
- `updated_at` (timestamptz, system)

### UI/View model fields (required for table UX)
- `categoria` (derived/presentational field for table badge; no DB column required in this story)
- `statusLabel` (`Active` / `Inactive`, derived from `activo`)

### Form fields
- Required: `nombre`
- Optional: `descripcion`, `activo`
- Optional (if design keeps category badge editable at UI level): `categoria` as local/client field only unless DB scope is explicitly expanded later.

### Validations
- `nombre`: required, trimmed, max 100 chars, must be unique per tenant (`disciplinas_tenant_nombre_uk`).
- `descripcion`: optional, trimmed.
- `activo`: boolean.
- Prevent submit while invalid or while mutation is in progress.

## Endpoints and URLs

### App route (Next.js)
- `GET /portal/orgs/[tenant_id]/gestion-disciplinas` → discipline management screen.

### Service contracts (Supabase SDK / internal service methods)
No external REST endpoint is required for this story. Implement service methods in:
- `src/services/supabase/portal/disciplines.service.ts`

Required methods:
1. `listDisciplinesByTenant(tenantId: string)`
2. `createDiscipline(payload: CreateDisciplineInput)`
3. `updateDiscipline(disciplineId: string, payload: UpdateDisciplineInput)`
4. `deleteDiscipline(disciplineId: string, tenantId: string)`

### Optional future API routes (only if architecture decision changes)
- `POST /api/portal/orgs/[tenant_id]/disciplines`
- `PATCH /api/portal/orgs/[tenant_id]/disciplines/[discipline_id]`
- `DELETE /api/portal/orgs/[tenant_id]/disciplines/[discipline_id]`

If API routes are not needed now, keep direct hook → service usage.

## Files to Modify (expected)

### User story artifact
1. `projectspec/userstory/us0011-manage-disciplines-feature.md`

### Delivery (`src/app`)
2. `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx`

### Presentation (`src/components`)
3. `src/components/portal/disciplines/DisciplinesPage.tsx` (general feature page container)
4. `src/components/portal/disciplines/DisciplinesTable.tsx`
5. `src/components/portal/disciplines/DisciplineFormModal.tsx`
6. `src/components/portal/disciplines/DisciplinesHeaderFilters.tsx` (if kept separate)
7. `src/components/portal/disciplines/index.ts`

### Application (`src/hooks`)
8. `src/hooks/portal/disciplines/useDisciplines.ts`
9. `src/hooks/portal/disciplines/useDisciplineForm.ts` (optional split if it improves SRP)

### Infrastructure (`src/services`)
10. `src/services/supabase/portal/disciplines.service.ts`
11. `src/services/supabase/portal/index.ts` (export wiring if needed)

### Domain (`src/types`)
12. `src/types/portal/disciplines.types.ts`

### Documentation
13. `projectspec/03-project-structure.md` (include `disciplines` feature slice examples if missing)
14. `README.md` (brief note on administrator disciplines capability)

## Suggested Type Contracts
- `Discipline`
- `DisciplineStatus = 'active' | 'inactive'`
- `DisciplineTableItem`
- `CreateDisciplineInput`
- `UpdateDisciplineInput`
- `DisciplineFormValues`
- `DisciplineFieldErrors`
- `DisciplinesViewModel`

## Implementation Steps
1. Create `disciplines` folders in components and hooks, following feature-slice conventions.
2. Define domain contracts in `src/types/portal/disciplines.types.ts`.
3. Implement Supabase service with list/create/update/delete methods.
4. Implement `useDisciplines` hook to orchestrate list state, search, modal state, and mutations.
5. Build `DisciplinesPage`, `DisciplinesTable`, and `DisciplineFormModal` UI components aligned to `09_disciplines.html`.
6. Keep route `page.tsx` as thin composition layer that only renders `DisciplinesPage`.
7. Add validation and UX feedback for create/edit/delete.
8. Update exports/docs and run lint/type checks.

## Definition of Done
1. `gestion-disciplinas/page.tsx` only renders feature component(s), with no business/data logic.
2. `components/portal/disciplines` and `hooks/portal/disciplines` folders exist and are in use.
3. Administrator can view disciplines in a table aligned with `09_disciplines.html` intent.
4. Administrator can create a discipline from right-side modal and see list refresh.
5. Administrator can edit a discipline from right-side modal and see updated data.
6. Administrator can delete a discipline, with clear handling of FK/dependency failures.
7. Architecture rule is respected: Components → Hooks → Services → Supabase.
8. TypeScript + lint checks pass for touched files.

## Testing and Validation

### Manual QA checklist
- Open `/portal/orgs/<tenant_id>/gestion-disciplinas` as administrator.
- Verify table renders with loading/empty/error fallbacks.
- Create a discipline and verify row appears.
- Edit a discipline and verify row updates.
- Delete a discipline and verify row disappears when allowed.
- Attempt deleting a discipline in use by trainings and verify user-friendly failure message.
- Verify non-admin access remains restricted by existing role routing.

### Unit/Integration guidance
If test harness exists, add tests for:
1. `useDisciplines` state transitions (load, create, edit, delete, modal state).
2. Validation rules (`nombre` required/max length/trim).
3. Service mappings and tenant scoping for all CRUD methods.
4. `DisciplineFormModal` mode behavior (create vs edit).
5. `DisciplinesTable` action callbacks and empty states.

If no test harness exists, document pending tests in PR notes.

## Non-Functional Requirements

### Security
- Enforce tenant scope on all CRUD operations via `tenant_id` filters.
- Prevent cross-tenant updates/deletes by query constraints.
- Keep feature available only in administrator route segment.

### Performance
- Keep list interaction responsive for medium datasets (100+ disciplines).
- Avoid unnecessary refetches and re-renders.
- Ensure mutations refresh only needed data.

### Maintainability
- Keep discipline-specific logic co-located in the `disciplines` slice.
- Reuse existing UI primitives from `src/components/ui`.
- Follow file naming and layering rules from `projectspec/03-project-structure.md`.

### Accessibility
- Modal must support keyboard close (`Esc`) and focus-safe navigation.
- Inputs/buttons require accessible labels.
- Preserve semantic table structure and sufficient contrast.

## Expected Results
- A complete administrator-facing discipline management feature exists under tenant-scoped portal routes.
- UI matches the direction of `09_disciplines.html` with table + right-side modal workflows.
- View, create, edit, and delete operations are fully functional and architecture-compliant.
- The project structure remains consistent with documented hexagonal feature-slice conventions.
