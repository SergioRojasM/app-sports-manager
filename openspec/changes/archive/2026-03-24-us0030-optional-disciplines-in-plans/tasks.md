## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0030-optional-disciplines-in-plans` from `develop`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Hook — Remove Discipline Validation

- [x] 2.1 In `src/hooks/portal/planes/usePlanForm.ts`, remove the validation block inside `validate()` that sets `errors.disciplinaIds` when `values.disciplinaIds.length === 0`

## 3. Component — Update Form Label

- [x] 3.1 In `src/components/portal/planes/PlanFormModal.tsx`, update the discipline section label or heading to indicate optionality (e.g., add `(opcional)` hint text alongside the section title)

## 4. Component — Add Empty-State Placeholder in Table

- [x] 4.1 In `src/components/portal/planes/PlanesTable.tsx`, add an `else` branch to the discipline names render: when `disciplinaNames.length === 0`, render a muted italic `"Sin disciplinas"` placeholder span

## 5. Verification

- [x] 5.1 Verify `src/services/supabase/portal/planes.service.ts` — confirm both `createPlan` and `updatePlan` already guard `planes_disciplina` insert with `if (input.disciplinaIds.length > 0)` (no code change needed, read-only check)
- [x] 5.2 Verify `src/hooks/portal/planes/usePlanes.ts` — confirm `toTableItem` maps an empty `disciplinas` array to an empty `disciplinaNames` array without errors
- [x] 5.3 Run `npm run build` (or `tsc --noEmit`) to confirm no TypeScript errors introduced
- [x] 5.4 Manual smoke test: create a plan with no disciplines selected → plan saves successfully and displays "Sin disciplinas" in the table
- [x] 5.5 Manual smoke test: edit an existing plan and remove all disciplines → plan saves and table reflects the change
- [x] 5.6 Manual smoke test: existing plans with disciplines continue to display and function normally

## 6. Commit and Pull Request

- [x] 6.1 Stage and commit all changes with message: `feat(planes): make discipline selection optional in plan form`
- [x] 6.2 Push branch and open a Pull Request to `develop` with the following description:

  **Title:** `feat(us0030): Optional disciplines in plans`

  **Description:**
  ```
  ## Summary
  Makes discipline selection optional when creating or editing a plan.
  Previously, at least one discipline was required — this was a client-side
  validation constraint with no database-level enforcement.

  ## Changes
  - `usePlanForm.ts`: Removed validation rule that blocked form submission with zero disciplines.
  - `PlanFormModal.tsx`: Updated discipline section label to indicate field is optional.
  - `PlanesTable.tsx`: Added "Sin disciplinas" placeholder for plans with no discipline associations.
  - No service or database changes needed (service already guarded empty insert; no migration required).

  ## Testing
  - Create plan with no disciplines → saves and shows "Sin disciplinas" in table.
  - Edit plan, remove all disciplines → saves correctly.
  - Existing plans with disciplines unaffected.

  Closes #US-0030
  ```
