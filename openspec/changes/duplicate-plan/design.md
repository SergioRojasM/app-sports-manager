## Context

The `gestion-planes` screen already supports creating and editing plans through `PlanFormModal`. The modal receives a `mode` prop (`'create' | 'edit'`) and the `usePlanes` hook manages modal state. Plan subtypes (`plan_tipos`) are loaded into `usePlanForm` via `setFormFromPlan`, which preserves their `_id` values — this is the mechanism `computeTiposDiff` uses to distinguish new rows (no `_id`) from existing ones (with `_id`).

## Goals / Non-Goals

**Goals:**
- Add a "Duplicar" action to each plan row that pre-fills the creation modal with source plan data.
- Ensure duplicated plan subtypes are created as new DB rows (new UUIDs), not linked to the source plan.
- Reuse the existing `createPlan` + `createPlanTipo` submission path without modifications to service functions.

**Non-Goals:**
- Deep-clone or copy subscriptions, payments, or any records linked to the source plan.
- Add a dedicated "duplicate confirmation" step or screen.
- Support bulk duplication.
- Change the database schema or RLS policies.

## Decisions

### Decision: `'duplicate'` as a third `mode` value rather than a separate boolean prop

**Rationale**: `PlanFormModal` already branches on `mode` for labels and title. Adding `'duplicate'` as a third union member co-locates all display logic in one prop. A separate `isDuplicate: boolean` would create two props that together encode three states, violating the single-responsibility of `mode`.

**Alternative considered**: Add a `sourceplan` prop to the create modal and detect duplication by its presence. Rejected — it blurs the semantics of existing props and would require changing callers.

### Decision: Strip `_id` from tipo entries in `setFormForDuplicate` rather than modifying `computeTiposDiff`

**Rationale**: `computeTiposDiff` already treats entries without `_id` as `toCreate`. Stripping `_id` at population time (in `usePlanForm.setFormForDuplicate`) cleanly reuses the existing diff logic with zero changes to the submit path. The approach works because the function is called only once per modal open event.

**Alternative considered**: Add a `forceCreate` flag to `computeTiposDiff`. Rejected — adds complexity to the diff engine for a concern that belongs in the population phase.

### Decision: Set `initialTipos.current = []` in `setFormForDuplicate`

**Rationale**: `initialTipos` is the baseline used by `computeTiposDiff` to identify deleted rows (`toDelete` = IDs in initial but not in current). For a duplicate, there is no baseline — all tipos are new — so setting it to empty ensures `toDelete` is always `[]`, preventing accidental deletion API calls.

### Decision: Name prefix `"Copia de "` with source truncated to 91 chars

**Rationale**: The `planes` table has a 100-character limit on `nombre` enforced by a DB constraint. `"Copia de "` is 9 characters. Truncating the source name to 91 chars guarantees the prefixed name never exceeds the constraint. The user can edit the name before saving.

## Risks / Trade-offs

- **`"Copia de X"` conflict**: If the same plan has been duplicated before, the name will collide with the existing `planes_tenant_nombre_uk` constraint. This is handled by the existing error mapping that surfaces `PlanServiceError('duplicate_name', ...)` inline in the modal — no additional handling needed.
- **Many subtypes**: For plans with a large number of `plan_tipos`, the submit path issues one `createPlanTipo` call per tipo sequentially. This is acceptable given the practical upper bound (< 10 subtypes per plan) and is consistent with the existing create flow.
