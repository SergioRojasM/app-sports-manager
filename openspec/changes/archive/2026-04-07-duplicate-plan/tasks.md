## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/duplicate-plan`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Hook — `usePlanForm`

- [x] 2.1 Add `setFormForDuplicate(plan: PlanWithDisciplinas)` function in `src/hooks/portal/planes/usePlanForm.ts`:
  - Compute `duplicateName = "Copia de " + plan.nombre.slice(0, 91)`
  - Call `setFormValues({ ...toFormValues(plan), nombre: duplicateName })`
  - Map `plan.plan_tipos` with `planTipoToFormEntry`, then strip `_id` from each entry: `entries.map(({ _id, ...rest }) => rest)`
  - Set `tiposForm` to the stripped entries; reset `tiposErrors` and `tiposGlobalError`
  - Set `initialTipos.current = []`
- [x] 2.2 Export `setFormForDuplicate` in the return object of `usePlanForm`

## 3. Hook — `usePlanes`

- [x] 3.1 Extend the `modalMode` state type from `'create' | 'edit'` to `'create' | 'edit' | 'duplicate'` in `src/hooks/portal/planes/usePlanes.ts`
- [x] 3.2 Add `openDuplicateModal` callback: set `modalMode('duplicate')`, `setSelectedPlan(null)`, call `form.setFormForDuplicate(plan)`, open modal, clear messages
- [x] 3.3 In the `submit` callback, change `if (modalMode === 'create')` to `if (modalMode === 'create' || modalMode === 'duplicate')` so the create path handles both modes
- [x] 3.4 Add `openDuplicateModal` to the `UsePlanesResult` type definition
- [x] 3.5 Include `openDuplicateModal` in the hook's return object

## 4. Component — `PlanFormModal`

- [x] 4.1 Extend the `mode` prop type from `'create' | 'edit'` to `'create' | 'edit' | 'duplicate'` in `src/components/portal/planes/PlanFormModal.tsx`
- [x] 4.2 Update the modal `aria-label` to: `mode === 'edit' ? 'Editar plan' : mode === 'duplicate' ? 'Duplicar plan' : 'Crear plan'`
- [x] 4.3 Update the modal heading text with the same ternary
- [x] 4.4 Update the submit button label to: `mode === 'edit' ? 'Guardar cambios' : 'Crear plan'` (create and duplicate both show "Crear plan")

## 5. Component — `PlanesTable`

- [x] 5.1 Add `onDuplicate?: (plan: PlanWithDisciplinas) => void` to `PlanesTableProps` in `src/components/portal/planes/PlanesTable.tsx`
- [x] 5.2 In the default actions column (when `renderRowAction` is not provided), insert a "Duplicar" button between "Editar" and "Eliminar" that calls `onDuplicate?.(row)`, styled consistently with the "Editar" button

## 6. Page — `PlanesPage`

- [x] 6.1 Destructure `openDuplicateModal` from the `usePlanes({ tenantId })` call in `src/components/portal/planes/PlanesPage.tsx`
- [x] 6.2 Pass `onDuplicate={openDuplicateModal}` to the `<PlanesTable>` component

## 7. Verification

- [x] 7.1 Run `npm run build` (or `npx tsc --noEmit`) and confirm zero TypeScript errors
- [x] 7.2 Manually test: duplicate a plan with multiple subtypes → verify new plan appears in the table and source plan is unchanged
- [x] 7.3 Manually test: duplicate a plan with `nombre` longer than 91 chars → verify prefixed name stays within 100 chars
- [x] 7.4 Manually test: duplicate when "Copia de X" already exists → verify inline error appears in the modal
- [x] 7.5 Manually test: close the duplicate modal without submitting → verify no plan is created
- [x] 7.6 Verify the "Duplicar" button is absent when `PlanesTable` receives `readOnly={true}`

## 8. Documentation & Commit

- [x] 8.1 Update `projectspec/03-project-structure.md`: add `onDuplicate` prop note to `PlanesTable` entry; add `openDuplicateModal` to `usePlanes` hook entry; note `'duplicate'` mode in `PlanFormModal`
- [x] 8.2 Create the final commit with message: `feat(planes): add duplicate plan action with pre-filled modal`
- [x] 8.3 Open a pull request with description:
  - **What**: Adds a "Duplicar" button to each plan row that opens the creation modal pre-filled with all source plan data (name prefixed with "Copia de", all subtypes pre-loaded without IDs so they are created as new rows).
  - **Why**: Allows admins to quickly create plan variants without re-entering all fields.
  - **How**: New `setFormForDuplicate` in `usePlanForm` (strips `_id` from tipos); new `openDuplicateModal` in `usePlanes`; extended `mode` union in `PlanFormModal`; new `onDuplicate` prop in `PlanesTable`; wired in `PlanesPage`. No DB migrations or new service functions.
  - **Testing**: Manual happy path + name truncation + duplicate name conflict + cancel + readOnly.
