## Context

`useEntrenamientos` exposes `prepareEditFromGroup(group, selectedScope)` and `prepareEditFromInstance(instance, selectedScope)`, called when an admin/trainer opens "Editar entrenamiento". Both already call `entrenamientosService.getGroupRestrictions` / `getInstanceRestrictions` and hydrate `restricciones`, `reservaAntelacionHoras`, and `cancelacionAntelacionHoras` via `form.setRestricciones(...)`, `form.setReservaAntelacionHoras(...)`, `form.setCancelacionAntelacionHoras(...)`. Neither function hydrates `categoriasForm`.

Two independent bugs cause the perceived "blank on edit" symptom:

1. **Categorias never fetched**: `entrenamientoCategoriasService.getGrupoCategorias(grupoId)` and `getEntrenamientoCategorias(entrenamientoId)` already exist and return `{ nivel_id, cupos_asignados }` rows, but are unused during edit-prep, so `categoriasForm` stays `{ enabled: false, items: {} }`.

2. **Restrictions hydrate correctly but the section stays collapsed**: `EntrenamientoRestriccionesSection` computes `const [open, setOpen] = useState(hasContent)` once at mount, while `restricciones`/`reservaAntelacionHoras`/`cancelacionAntelacionHoras` are still empty (the restriction fetch resolves asynchronously after mount via `.then()`). The section therefore renders collapsed and never re-evaluates `open`.

US-0069 already solved an analogous problem for "apply template": it added `skipNextCategoriasResetRef` to `useEntrenamientos` so that `setFormValuesFromExternal` (which changes `formValues.disciplina_id` and triggers the discipline-change effect calling `checkDisciplinaHasNiveles({ resetCategorias })`) does not wipe out categorias that were just hydrated externally. It also fixed an analogous collapsed-section bug in `GuardarPlantillaModal.tsx` using an "adjust state during render" pattern.

## Goals / Non-Goals

**Goals:**
- During edit-prep (group, single instance, series/future instance), fetch and hydrate `categoriasForm` from the appropriate existing service function.
- Ensure the discipline-change effect does not reset the freshly hydrated `categoriasForm` (reuse `skipNextCategoriasResetRef`).
- Ensure `EntrenamientoRestriccionesSection` auto-expands once hydrated restriction data arrives, without forcing it open on every render or fighting a user's manual collapse.

**Non-Goals:**
- No new database tables, columns, indexes, or RLS policies — all required read access already exists.
- No change to create-mode UX (sections still start empty/collapsed with nothing to show).
- No change to `aplicarPlantilla` or the manual discipline-change reset path beyond reusing the existing one-shot ref.
- No new service functions — only wiring of existing `getGrupoCategorias` / `getEntrenamientoCategorias`.

## Decisions

### 1. Add `setCategoriasFormFromExternal` to `useEntrenamientoForm`
`categoriasForm`'s setter (`setCategoriasForm`) is currently internal/not exported. Rather than exposing the raw `useState` setter (which would allow arbitrary partial updates and bypass the hook's internal invariants), add a single dedicated function `setCategoriasFormFromExternal(value: CategoriasFormState): void` that replaces the whole state object — mirroring the existing `setFormValuesFromExternal` / `setRestricciones` pattern already used for edit hydration. Exported under the `// Categories` section of the hook's return object.

**Alternative considered**: export `setCategoriasForm` directly. Rejected — naming it `*FromExternal` makes the edit-hydration call sites self-documenting and keeps a single, intentional entry point for "replace everything" vs. the toggle/update-cupos setters used by user interaction.

### 2. Fetch categorias per edit-prep branch, mapping rows to `CategoriasFormState`
- `prepareEditFromGroup`: `entrenamientoCategoriasService.getGrupoCategorias(group.id)`.
- `prepareEditFromInstance`, `selectedScope === 'single'`: `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)`.
- `prepareEditFromInstance`, series/future (when a `sourceGroup` is resolved, mirroring how restrictions are hydrated from the group in that branch): `entrenamientoCategoriasService.getGrupoCategorias(sourceGroup.id)`.

Each returns `{ nivel_id, cupos_asignados }[]`, mapped to:
```ts
const items: Record<string, number> = {};
rows.forEach((row) => { items[row.nivel_id] = row.cupos_asignados; });
form.setCategoriasFormFromExternal({ enabled: rows.length > 0, items });
```
On fetch error, fall back to `{ enabled: false, items: {} }` — consistent with the existing `.catch(() => form.setRestricciones([]))` pattern for restrictions, and with the "no categorias configured" default.

**Alternative considered**: a single shared helper function for all three branches. Rejected for this change — the three branches already follow three slightly different patterns for restriction-hydration (direct group id, instance id, or `sourceGroup` id); mirroring that per-branch structure keeps the categorias hydration consistent with its neighboring restriction-hydration code and easiest to review, at the cost of ~3 small near-duplicate blocks.

### 3. Reuse `skipNextCategoriasResetRef` for edit-prep
Set `skipNextCategoriasResetRef.current = true` immediately before each `form.setFormValuesFromExternal(values)` call in `prepareEditFromGroup` and both branches of `prepareEditFromInstance`. This is the exact mechanism added in US-0069 for `aplicarPlantilla`; reusing it means the discipline-change effect's next run computes `resetCategorias = false` and calls `checkDisciplinaHasNiveles(disciplinaId, tenantId, { resetCategorias: false })`, preserving the categorias hydrated in step 2.

**Alternative considered**: skip calling `checkDisciplinaHasNiveles` entirely during edit-prep. Rejected — `checkDisciplinaHasNiveles` also computes `disciplinaHasNiveles`/`activeNiveles` (needed to decide whether to render the categories section at all and to know which level IDs are valid), so it must still run; only the *reset* behavior needs to be suppressed.

### 4. Fix `EntrenamientoRestriccionesSection` open-state with adjust-during-render
Replace the mount-only `useState(hasContent)` with a `prevHasContent` comparison performed synchronously during render (no `useEffect`, avoiding `react-hooks/set-state-in-effect`):
```tsx
const hasContent = restricciones.length > 0 || reservaAntelacionHoras != null || cancelacionAntelacionHoras != null;
const [open, setOpen] = useState(hasContent);
const [prevHasContent, setPrevHasContent] = useState(hasContent);

if (hasContent !== prevHasContent) {
  setPrevHasContent(hasContent);
  if (hasContent) {
    setOpen(true);
  }
}
```
This auto-expands the section the first time `hasContent` flips from `false` to `true` (the async hydration), while leaving `open` untouched on the reverse transition (`true` → `false`) so a user's manual collapse after hydration is not overridden.

**Alternative considered**: a `useEffect` that calls `setOpen(true)` when `hasContent` becomes true. Rejected — triggers `react-hooks/set-state-in-effect` and is the exact pattern already replaced in `GuardarPlantillaModal.tsx` for US-0069; the adjust-during-render approach is now the established convention in this codebase for this class of bug.

### 5. Fix dropped `descripcion`/`servicio_*_id` columns on restriction update
`createTrainingSeries` (group + per-instance inserts) and `updateTrainingInstance`'s create-equivalent paths already write `descripcion`, `servicio_1_id`–`servicio_4_id` for `entrenamiento_grupo_restricciones` / `entrenamiento_restricciones`. However, the **update** (delete-and-reinsert) paths — `updateTrainingSeries`'s grupo-restriction sync and `updateTrainingInstance`'s `scope === 'single'` instance-restriction sync — only mapped `usuario_estado`, `plan_id`, `disciplina_id`, `validar_nivel_disciplina`, `orden`, omitting the five service-restriction columns added by `20260612000100_restricciones_por_servicio.sql`. The row is still inserted (so `restricciones.length > 0` on the next edit), but `descripcion`/`servicio_1_id`–`servicio_4_id` are `null`, so the saved service selections are lost — this is the actual root cause behind "service restrictions added during edit don't load on the next edit, but the row exists in the DB."

**Fix**: add `descripcion: r.descripcion ?? null` and `servicio_1_id`–`servicio_4_id: r.servicio_N_id ?? null` to both `grupoRestRows` (in `updateTrainingSeries`) and `restRows` (in `updateTrainingInstance`, `scope === 'single'`), mirroring the create-path mapping exactly.

**Alternative considered**: switch from delete-and-reinsert to per-row upsert keyed on `id`. Rejected — out of scope for this fix; the delete-and-reinsert pattern is pre-existing and works correctly once all columns are included, and changing it would touch `orden`/ordering semantics unnecessarily.

## Risks / Trade-offs

- **[Risk]** Forgetting to set `skipNextCategoriasResetRef.current = true` in any one of the three edit-prep branches would silently reproduce the categorias-reset bug for that branch only → **Mitigation**: acceptance criteria and manual test steps explicitly cover group, single-instance, and series/future scopes individually.
- **[Risk]** An extra query per edit-modal open (categorias fetch alongside the existing restrictions fetch) → **Mitigation**: both queries are small (indexed by `grupo_id`/`entrenamiento_id`, at most one row per active discipline level), already proven low-cost by the existing restrictions fetch, and can run independently/in parallel with it.
- **[Risk]** Auto-expanding "Restricciones de reserva" could be visually jarring if it expands a moment after the modal opens → **Mitigation**: this is the same UX already shipped for `GuardarPlantillaModal` post-US-0069, and the fetch typically resolves within one render cycle of the modal mounting.

## Migration Plan

No database migration. Purely a frontend code change in `useEntrenamientoForm.ts`, `useEntrenamientos.ts`, and `EntrenamientoRestriccionesSection.tsx`. Rollback is a simple revert of these files; no data migration or backfill is involved.

## Open Questions

None — the existing US-0069 patterns (`skipNextCategoriasResetRef`, adjust-during-render auto-expand) directly cover both root causes, and the required read services already exist.
