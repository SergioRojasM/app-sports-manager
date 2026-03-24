## Why

Plans currently require at least one discipline to be saved, which blocks the creation of general-purpose plans (e.g., all-access monthly memberships, gym passes) that are not tied to any specific discipline. Making disciplines optional unblocks these use cases without schema changes — the `planes_disciplina` join table already supports zero associations per plan.

## What Changes

- Remove the client-side validation rule that rejects a plan form submission when no disciplines are selected.
- Update the discipline field label in the plan form modal to indicate the field is optional.
- Add a "Sin disciplinas" placeholder in the plans table `Disciplines` column for plans with no associated disciplines.
- Guard the `planes_disciplina` bulk insert in the service layer to skip the insert call when `disciplinaIds` is empty (prevent potential no-op Supabase error).

## Capabilities

### New Capabilities

_None — no new capabilities are introduced._

### Modified Capabilities

- `plan-management`: The requirement "At least one discipline MUST be associated with each plan" is removed. The validation scenario "No disciplines selected → SHALL display a validation error and SHALL NOT submit" is replaced with disciplines being fully optional. The table's Disciplines column gains an empty-state placeholder. The service layer gains a guard for the empty-array insert path.

## Impact

- **`src/hooks/portal/planes/usePlanForm.ts`** — remove `disciplinaIds` validation rule from `validate()`.
- **`src/components/portal/planes/PlanFormModal.tsx`** — update discipline section label to mark field as optional.
- **`src/components/portal/planes/PlanesTable.tsx`** — render "Sin disciplinas" placeholder when `disciplinaNames` is empty.
- **`src/services/supabase/portal/planes.service.ts`** — add guard `if (input.disciplinaIds.length > 0)` around the `planes_disciplina` insert in create and update flows.
- **`openspec/specs/plan-management/`** — delta spec to update the validation and display requirements.
- No database migration required. No API contract change. No breaking changes to any other feature.

## Non-goals

- Filtering plans by "no disciplines" in the admin list.
- Any changes to the subscription or booking flows based on plan discipline membership.
- Hiding the discipline selector from the form — it remains visible and functional for optional selection.
- Changes to trainings or any other entity that references disciplines independently.
