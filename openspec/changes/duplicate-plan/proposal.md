## Why

Administrators often need to create plans that are slight variations of existing ones (different subtype name, price, or validity). Today, every new plan requires re-entering all fields from scratch — including every subtype row — which is error-prone and time-consuming. Adding a "Duplicar" action removes this friction.

## What Changes

- Add a **"Duplicar" button** to each row in `PlanesTable` (admin editable view only).
- Clicking "Duplicar" opens `PlanFormModal` in a new `'duplicate'` mode, pre-filled with all source plan data: name (prefixed with `"Copia de "`), description, type, benefits, active status, associated disciplines, and all plan subtypes.
- Plan subtypes are loaded **without their `_id`** so `computeTiposDiff()` treats each one as a new record to create, ensuring the duplicated plan gets entirely new `plan_tipos` rows.
- The modal title shows "Duplicar plan"; the submit button shows "Crear plan".
- On submit the existing `createPlan` + `createPlanTipo` service path is reused unchanged.
- The plan name is pre-filled as `"Copia de " + sourceName.slice(0, 91)` to respect the 100-character DB constraint.
- The existing duplicate-name error mapping (`planes_tenant_nombre_uk`) surfaces the conflict inline.

## Capabilities

### New Capabilities

- `plan-duplication`: Duplicate an existing membership plan (with all its subtypes) through the plan management UI, opening a pre-filled creation form.

### Modified Capabilities

- `plan-management`: The plan table and modal now support a `'duplicate'` mode action alongside the existing create and edit actions.

## Impact

- **`src/hooks/portal/planes/usePlanForm.ts`** — new `setFormForDuplicate` function
- **`src/hooks/portal/planes/usePlanes.ts`** — new `openDuplicateModal` callback; extended `modalMode` type; updated `submit` condition
- **`src/components/portal/planes/PlanFormModal.tsx`** — extended `mode` prop type; updated labels/title
- **`src/components/portal/planes/PlanesTable.tsx`** — new `onDuplicate` prop; new "Duplicar" button in actions column
- **`src/components/portal/planes/PlanesPage.tsx`** — wire `openDuplicateModal` to `PlanesTable`
- No database migrations required
- No new service functions required
- No impact on subscriptions, bookings, or other features
