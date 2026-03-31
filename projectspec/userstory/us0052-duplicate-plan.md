# US-0052 — Duplicate Plan

## ID
US-0052

## Name
Duplicate Membership Plan with Pre-loaded Form

## As a
Tenant Administrator

## I Want
To duplicate an existing membership plan by clicking a "Duplicar" button in the plans table, which opens the plan form modal pre-filled with all the original plan's data (name, description, type, benefits, disciplines, and all plan subtypes)

## So That
I can quickly create variations of existing plans without having to re-enter all information from scratch

---

## Description

### Current State
The `gestion-planes` page (`/portal/orgs/[tenant_id]/gestion-planes`) has a table (`PlanesTable`) showing each plan with "Editar" and "Eliminar" action buttons. There is no duplication capability. Creating a new plan that resembles an existing one requires manually re-entering all fields, including every plan subtype (plan_tipos).

### Proposed Changes
A "Duplicar" button is added to each plan row in `PlanesTable`. Clicking it opens `PlanFormModal` in a new `'duplicate'` mode with all fields pre-loaded from the source plan:

- **nombre**: prefixed with `"Copia de "`, with the source name truncated to a maximum of 91 characters so the total remains within the 100-character DB constraint. The user can edit this before saving.
- **descripcion**, **tipo**, **beneficios**, **activo**, **disciplinaIds**: copied as-is from the source plan.
- **plan_tipos (subtipos)**: all subtypes loaded with their field values but **without `_id`** — this is the critical difference from "edit" mode. Stripping `_id` ensures `computeTiposDiff()` treats every subtype as a new record (`toCreate`), so the submission path creates entirely new `plan_tipos` rows linked to the new plan. The subtype's `activo` flag is preserved from the source.

The modal opens in `'duplicate'` mode but submits as `'create'`: the `submit` function in `usePlanes` calls `planesService.createPlan(...)`. On submit the flow is identical to "Crear plan": validate → `createPlan` → call `createPlanTipo` for each subtype → reload list → show success message. The existing duplicate-name error mapping (`planes_tenant_nombre_uk` → `PlanServiceError('duplicate_name', ...)`) already handles the case where a plan named "Copia de X" already exists.

---

## Database Changes

None. Duplication is entirely a client-side concern using the existing `createPlan` and `createPlanTipo` service functions. No new migrations required.

---

## API / Server Actions

No new server actions or service functions are required.

- **`planesService.createPlan`** (`src/services/supabase/portal/planes.service.ts`) — reused as-is for submitting the duplicated plan.
- **`planesService.createPlanTipo`** (`src/services/supabase/portal/planes.service.ts`) — reused as-is, called once per duplicated subtype.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Add `setFormForDuplicate(plan: PlanWithDisciplinas)` function; export it from the hook return |
| Hook | `src/hooks/portal/planes/usePlanes.ts` | Extend `modalMode` type to `'create' \| 'edit' \| 'duplicate'`; add `openDuplicateModal` callback; update `submit` to treat `'duplicate'` as `'create'`; expose in return type |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Extend `mode` prop to `'create' \| 'edit' \| 'duplicate'`; update `aria-label`, modal title, and submit button text |
| Component | `src/components/portal/planes/PlanesTable.tsx` | Add `onDuplicate?: (plan: PlanWithDisciplinas) => void` prop; add "Duplicar" button in the default actions column |
| Page | `src/components/portal/planes/PlanesPage.tsx` | Destructure `openDuplicateModal` from `usePlanes`; pass `onDuplicate={openDuplicateModal}` to `PlanesTable` |

---

## Acceptance Criteria

1. A "Duplicar" button appears in each row of the plans table (only in editable view, not when `readOnly={true}`).
2. Clicking "Duplicar" opens the plan form modal pre-filled with source plan data.
3. The modal title reads "Duplicar plan" and the submit button reads "Crear plan".
4. The `nombre` field is pre-filled with `"Copia de " + sourcePlan.nombre` (source name truncated to 91 chars if it exceeds that length).
5. All plan fields (`descripcion`, `tipo`, `beneficios`, `activo`, `disciplinaIds`) are pre-filled with values from the source plan.
6. All plan subtypes appear as pre-filled rows with their field values intact (`nombre`, `descripcion`, `precio`, `vigencia_dias`, `clases_incluidas`, `activo`).
7. Submitting the modal creates a new independent plan with new UUIDs for both the plan and every subtype; the source plan is not modified.
8. If a plan named "Copia de X" already exists, the error "Ya existe un plan con ese nombre en esta organización." is shown inline in the modal.
9. The user can edit any pre-filled field (including the name) before submitting.
10. Closing or cancelling the duplicate modal leaves the plans list unchanged.
11. After successful duplication the table refreshes and shows the new plan; a success message "Plan creado correctamente." is displayed.
12. The "Duplicar" button is absent when `PlanesTable` is rendered with `readOnly={true}`.

---

## Implementation Steps

- [ ] **`usePlanForm.ts`** — add `setFormForDuplicate`:
  - Compute `duplicateName = "Copia de " + plan.nombre.slice(0, 91)`
  - Call `setFormValues({ ...toFormValues(plan), nombre: duplicateName })`
  - Map `plan.plan_tipos` with `planTipoToFormEntry`, then strip `_id` from each entry: `entries.map(({ _id, ...rest }) => rest)`
  - Set `tiposForm` to the stripped entries; reset `tiposErrors` and `tiposGlobalError`
  - Set `initialTipos.current = []` so `computeTiposDiff` generates no `toDelete` entries
  - Export `setFormForDuplicate` in the hook return object
- [ ] **`usePlanes.ts`** — add `openDuplicateModal`:
  - Extend `modalMode` state type to `'create' | 'edit' | 'duplicate'`
  - Add `openDuplicateModal = useCallback((plan) => { setModalMode('duplicate'); setSelectedPlan(null); form.setFormForDuplicate(plan); setModalOpen(true); setSuccessMessage(null); setSubmitError(null); }, [form])`
  - In `submit`, change `if (modalMode === 'create')` to `if (modalMode === 'create' || modalMode === 'duplicate')` so the create branch handles both
  - Add `openDuplicateModal` to `UsePlanesResult` type and to the return object
- [ ] **`PlanFormModal.tsx`** — extend mode prop:
  - Change `mode: 'create' | 'edit'` to `mode: 'create' | 'edit' | 'duplicate'`
  - `aria-label`: `mode === 'edit' ? 'Editar plan' : mode === 'duplicate' ? 'Duplicar plan' : 'Crear plan'`
  - Modal heading: same ternary as above
  - Submit button label: `mode === 'edit' ? 'Guardar cambios' : 'Crear plan'` (both `create` and `duplicate` show "Crear plan")
- [ ] **`PlanesTable.tsx`** — add duplicate action:
  - Add `onDuplicate?: (plan: PlanWithDisciplinas) => void` to `PlanesTableProps`
  - In the default actions column (when `renderRowAction` is not provided), insert a "Duplicar" button between "Editar" and "Eliminar"
- [ ] **`PlanesPage.tsx`** — wire up:
  - Destructure `openDuplicateModal` from `usePlanes({ tenantId })`
  - Pass `onDuplicate={openDuplicateModal}` to `<PlanesTable>`
- [ ] Test manually: duplicate a plan with multiple subtypes → verify new plan appears in table, source plan is unchanged, new `plan_tipos` rows have different UUIDs
- [ ] Test edge cases: plan with `nombre` longer than 91 chars; duplicate when "Copia de X" already exists; close modal without submitting

---

## Non-Functional Requirements

- **Security**: No new RLS policies needed. The duplicate submit path calls `createPlan`, already guarded by the existing `administrador`-only INSERT policy on `planes` and `plan_tipos`. `tenantId` is injected by the service, not taken from the form.
- **Performance**: No additional queries beyond the existing `createPlan` + N×`createPlanTipo` calls used when creating a plan normally. Sequential tipo creation is acceptable given typical subtype counts (< 10).
- **Accessibility**: The "Duplicar" button must use `type="button"` to prevent accidental form submission and have visible text content as its accessible label.
- **Error handling**: Duplicate-name conflict surfaces inline in the modal via the existing `submitError` prop (mapped from `PlanServiceError('duplicate_name', ...)`). All other errors also surface inline in the modal.
