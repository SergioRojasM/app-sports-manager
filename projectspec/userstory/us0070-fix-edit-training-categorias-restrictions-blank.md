# US-0070 — Fix Blank Category Levels and Service Restrictions When Editing a Training

## ID
US-0070

## Name
Hydrate Category Levels (Niveles) and Service Restrictions When Opening the Edit Training Modal

## As a
Trainer or administrator managing trainings

## I Want
The "Editar entrenamiento" modal to load the previously saved "Categorías por nivel" (category level capacity) configuration and the "Restricciones de reserva" (service-based booking restrictions) configuration, instead of showing them empty/collapsed

## So That
I can review and adjust the existing configuration of a training group or instance without having to re-enter all category-level capacities and booking restrictions from scratch, and without accidentally wiping out saved configuration when I save the form again

---

## Description

### Current State

This is the same class of bug recently fixed for the "apply training template" feature (US-0069): state that is populated asynchronously after the edit modal opens is either never fetched, or gets reset/hidden before the user sees it.

1. **Category levels ("niveles de categorias") load blank**
   - `prepareEditFromGroup` and `prepareEditFromInstance` in [src/hooks/portal/entrenamientos/useEntrenamientos.ts](src/hooks/portal/entrenamientos/useEntrenamientos.ts) populate `formValues`, `restricciones`, `reservaAntelacionHoras` and `cancelacionAntelacionHoras` for editing, but **never fetch the saved per-level capacities**.
   - The functions `entrenamientoCategoriasService.getGrupoCategorias(grupoId)` and `entrenamientoCategoriasService.getEntrenamientoCategorias(entrenamientoId)` (in [src/services/supabase/portal/entrenamiento-categorias.service.ts](src/services/supabase/portal/entrenamiento-categorias.service.ts)) already exist and return `EntrenamientoGrupoCategoria[]` / `EntrenamientoCategoria[]` (each row has `nivel_id` and `cupos_asignados`), but they are unused in the edit flow.
   - As a result, `categoriasForm` stays at its default `{ enabled: false, items: {} }` when editing. If the training's discipline has active levels, the "Categorías por nivel" section renders (because `disciplinaHasNiveles` is computed correctly via `checkDisciplinaHasNiveles`), but the "¿Usar categorías?" toggle is unchecked and all per-level inputs are empty — even though the group/instance has saved capacities in `entrenamiento_grupo_categorias` / `entrenamiento_categorias`.
   - Additionally, when `setFormValuesFromExternal(values)` is called during edit-prep, `formValues.disciplina_id` changes. This triggers the discipline-change effect in `useEntrenamientos.ts`:
     ```ts
     useEffect(() => {
       const disciplinaId = form.formValues.disciplina_id;
       if (disciplinaId && formOpen) {
         const resetCategorias = !skipNextCategoriasResetRef.current;
         skipNextCategoriasResetRef.current = false;
         void form.checkDisciplinaHasNiveles(disciplinaId, tenantId, { resetCategorias });
       } else {
         skipNextCategoriasResetRef.current = false;
       }
     }, [form.formValues.disciplina_id, formOpen, tenantId]);
     ```
     Since `skipNextCategoriasResetRef.current` is `false` during edit-prep (it is only set by `aplicarPlantilla`), `resetCategorias` evaluates to `true` and `checkDisciplinaHasNiveles` will call `setCategoriasForm({ enabled: false, items: {} })`. **Any categorias hydration added to the edit flow must reuse the same `skipNextCategoriasResetRef` mechanism added for US-0069**, otherwise the freshly-hydrated `categoriasForm` will be wiped out by this effect, reproducing the exact bug that was just fixed for templates.

2. **Service restrictions ("restricciones de servicios") appear blank/collapsed**
   - Unlike categorias, the restriction data IS fetched correctly: `prepareEditFromGroup` and `prepareEditFromInstance` already call `entrenamientosService.getGroupRestrictions(tenantId, grupoId)` / `getInstanceRestrictions(tenantId, entrenamientoId)` and populate `restricciones`, `reservaAntelacionHoras`, and `cancelacionAntelacionHoras` via `form.setRestricciones(...)`, `form.setReservaAntelacionHoras(...)`, `form.setCancelacionAntelacionHoras(...)`.
   - However, [src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx](src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx) computes its collapsed/expanded state once, at mount, from the **initial** props:
     ```tsx
     const hasContent = restricciones.length > 0 || reservaAntelacionHoras != null || cancelacionAntelacionHoras != null;
     const [open, setOpen] = useState(hasContent);
     ```
   - When the edit modal first mounts, `restricciones` is still `[]` and `reservaAntelacionHoras`/`cancelacionAntelacionHoras` are still `null` (the `.then()` callbacks from `getGroupRestrictions`/`getInstanceRestrictions` resolve a moment later, asynchronously). So `hasContent` is `false` at mount time, `open` initializes to `false`, and the "Restricciones de reserva" section renders **collapsed**. Once the async data arrives and `restricciones`/antelación values update, `open` is never re-evaluated, so the section stays collapsed — the saved restrictions appear to be "blank"/missing to the user even though the data was loaded correctly into state.

### Proposed Changes

#### A. Hydrate `categoriasForm` during edit-prep

1. Add a new exported setter `setCategoriasFormFromExternal(value: CategoriasFormState): void` to [src/hooks/portal/entrenamientos/useEntrenamientoForm.ts](src/hooks/portal/entrenamientos/useEntrenamientoForm.ts) that directly calls the existing internal `setCategoriasForm(value)`. This mirrors the existing `setFormValuesFromExternal` / `setRestricciones` pattern used for edit hydration.

2. In [src/hooks/portal/entrenamientos/useEntrenamientos.ts](src/hooks/portal/entrenamientos/useEntrenamientos.ts):
   - Import `entrenamientoCategoriasService` from `@/services/supabase/portal/entrenamiento-categorias.service`.
   - In `prepareEditFromGroup`, **before** calling `form.setFormValuesFromExternal(values)`, set `skipNextCategoriasResetRef.current = true` (so the upcoming discipline-change effect does not wipe the categorias we are about to hydrate — same mechanism as `aplicarPlantilla`).
   - After hydrating restrictions, call `entrenamientoCategoriasService.getGrupoCategorias(group.id)`, map the returned rows (`{ nivel_id, cupos_asignados }[]`) into a `CategoriasFormState`:
     ```ts
     const items: Record<string, number> = {};
     rows.forEach((row) => { items[row.nivel_id] = row.cupos_asignados; });
     form.setCategoriasFormFromExternal({ enabled: rows.length > 0, items });
     ```
     and on fetch error, fall back to `form.setCategoriasFormFromExternal({ enabled: false, items: {} })`.
   - Repeat the same pattern in `prepareEditFromInstance`:
     - For the `selectedScope === 'single'` branch, use `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)`.
     - For the series/future-scope branch (where restrictions are hydrated from `sourceGroup` via `getGroupRestrictions`), use `entrenamientoCategoriasService.getGrupoCategorias(sourceGroup.id)`.
   - Set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal(values)` in **both** branches of `prepareEditFromInstance` as well.

3. No change is needed to `checkDisciplinaHasNiveles` itself or the discipline-change effect — both were already updated for US-0069 and the `skipNextCategoriasResetRef` one-shot mechanism is reused as-is.

#### B. Auto-expand "Restricciones de reserva" once data is hydrated

4. In [src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx](src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx), fix the `open` state so it re-syncs when `restricciones`/`reservaAntelacionHoras`/`cancelacionAntelacionHoras` transition from empty to populated after the initial mount. Use the "adjust state during render" pattern (consistent with the fix applied to `GuardarPlantillaModal.tsx` for US-0069) to avoid the `react-hooks/set-state-in-effect` lint rule:
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
   This keeps the current create-mode UX (section starts collapsed when there is nothing to show) while ensuring the section auto-expands the first time hydrated edit data arrives. It does not forcibly re-collapse the section if the user manually collapses it after data has loaded (the `prevHasContent` guard only fires on the empty→populated transition).

---

## Database Changes

None. This is a frontend state-hydration fix; no new tables, columns, indexes, or RLS policy changes are required. The existing SELECT policies on `entrenamiento_grupo_categorias`, `entrenamiento_categorias`, `entrenamiento_restricciones`, and `entrenamiento_grupo_restricciones` already allow any authenticated tenant member to read these rows.

---

## API / Server Actions

No new service functions are required. This US wires up **existing** read functions that are currently unused in the edit flow:

- **File**: `src/services/supabase/portal/entrenamiento-categorias.service.ts`
  - `getGrupoCategorias(grupoId: string): Promise<EntrenamientoGrupoCategoria[]>` — returns rows `{ id, grupo_id, nivel_id, cupos_asignados, created_at }`. Used in `prepareEditFromGroup` and the series/future branch of `prepareEditFromInstance`.
  - `getEntrenamientoCategorias(entrenamientoId: string): Promise<EntrenamientoCategoria[]>` — returns rows `{ id, entrenamiento_id, nivel_id, cupos_asignados, sincronizado_grupo, created_at }`. Used in the `selectedScope === 'single'` branch of `prepareEditFromInstance`.
  - Both functions are called client-side (Supabase RLS-protected), authenticated as the current tenant member; no auth changes needed.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Add exported `setCategoriasFormFromExternal(value: CategoriasFormState): void` callback that calls the internal `setCategoriasForm(value)`; export it from the hook's returned object under `// Categories`. |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Import `entrenamientoCategoriasService`. In `prepareEditFromGroup`: set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`, then fetch `getGrupoCategorias(group.id)` and call `form.setCategoriasFormFromExternal(...)`. In `prepareEditFromInstance` (both `single` and series/future branches): same pattern using `getEntrenamientoCategorias(instance.id)` (single) and `getGrupoCategorias(sourceGroup.id)` (series). |
| Component | `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx` | Fix `open` initial-state logic so the section auto-expands once `restricciones`/`reservaAntelacionHoras`/`cancelacionAntelacionHoras` are hydrated asynchronously after mount (adjust-during-render pattern, no `useEffect`). |

---

## Acceptance Criteria

1. Opening "Editar entrenamiento" for a **recurring group** whose discipline has active levels and that has saved rows in `entrenamiento_grupo_categorias`: the "Categorías por nivel" toggle ("¿Usar categorías?") is checked, and each active level shows its saved `cupos_asignados` value.
2. Opening "Editar entrenamiento" for a **single instance** (`selectedScope === 'single'`) that has saved rows in `entrenamiento_categorias`: same as above, using `entrenamiento_categorias` data.
3. Opening "Editar entrenamiento" with scope `series`/`future` for an instance belonging to a group: categorias are hydrated from the group's `entrenamiento_grupo_categorias` rows (via `getGrupoCategorias(sourceGroup.id)`).
4. Opening "Editar entrenamiento" for a group/instance whose discipline has active levels but **no** saved categorias rows: the toggle remains unchecked and all per-level inputs are empty (no regression — matches current "create" behavior).
5. Opening "Editar entrenamiento" for a group/instance that has rows in `entrenamiento_grupo_restricciones`/`entrenamiento_restricciones` and/or non-null `reserva_antelacion_horas`/`cancelacion_antelacion_horas`: the "Restricciones de reserva" section is **expanded by default** and displays the saved rows (descripción, estado usuario, servicio 1–4, validar nivel) and antelación values.
6. Opening "Editar entrenamiento" for a group/instance with **no** restrictions and no antelación values: the "Restricciones de reserva" section remains **collapsed by default** (no regression to current create-mode UX).
7. Manually collapsing the "Restricciones de reserva" section after it auto-expands (step 5) keeps it collapsed — the auto-expand does not re-trigger on every render.
8. Applying a saved template via "Usar plantilla" (`aplicarPlantilla`, US-0069) continues to populate `categoriasForm` correctly and is not affected by this change (no regression to the discipline-change reset fix from US-0069).
9. Manually changing the discipline in the wizard (not via edit-hydration or template application) still resets `categoriasForm` to `{ enabled: false, items: {} }` as before.
10. `npx tsc --noEmit -p tsconfig.json` and `npx eslint` report no new errors or warnings.

---

## Implementation Steps

- [ ] Add `setCategoriasFormFromExternal(value: CategoriasFormState): void` to `useEntrenamientoForm.ts` (wraps `setCategoriasForm`) and export it.
- [ ] Import `entrenamientoCategoriasService` in `useEntrenamientos.ts`.
- [ ] In `prepareEditFromGroup`: set `skipNextCategoriasResetRef.current = true` before `form.setFormValuesFromExternal(values)`.
- [ ] In `prepareEditFromGroup`: after hydrating restrictions, fetch `entrenamientoCategoriasService.getGrupoCategorias(group.id)`, map rows to `CategoriasFormState` (`enabled: rows.length > 0`, `items: Record<nivel_id, cupos_asignados>`), call `form.setCategoriasFormFromExternal(...)`; on error fall back to `{ enabled: false, items: {} }`.
- [ ] In `prepareEditFromInstance` (`selectedScope === 'single'` branch): set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`, then fetch `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)` and hydrate `categoriasForm` the same way.
- [ ] In `prepareEditFromInstance` (series/future branch, when `sourceGroup` exists): set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`, then fetch `entrenamientoCategoriasService.getGrupoCategorias(sourceGroup.id)` and hydrate `categoriasForm` the same way.
- [ ] Fix `EntrenamientoRestriccionesSection.tsx` `open` state with the `prevHasContent` adjust-during-render pattern so the section auto-expands once hydrated data arrives.
- [ ] Run `npx tsc --noEmit -p tsconfig.json` — confirm no new type errors.
- [ ] Run `npx eslint` on the modified files — confirm no new errors/warnings.
- [ ] Manual test: edit a recurring group that has categorias + restrictions configured — confirm both sections show saved data immediately on open.
- [ ] Manual test: edit a single instance (scope `single`) that has categorias + restrictions configured — confirm both sections show saved data immediately on open.
- [ ] Manual test: edit a group/instance with no categorias/restrictions configured — confirm sections show empty/collapsed as before (no false positives).
- [ ] Manual test: create a new training, apply a saved template, change discipline manually afterward — confirm categorias reset/populate correctly in all cases (no regression to US-0069 fix).
- [ ] Update `openspec` change tracking or `projectspec` docs if this fix is tracked as part of an OpenSpec change.

---

## Non-Functional Requirements

- **Security**: No new tables or RLS policies. Reuses existing SELECT policies (`entrenamiento_grupo_categorias`, `entrenamiento_categorias` — tenant-member read access) which already permit the trainer/administrator roles editing the training.
- **Performance**: Adds one additional indexed lookup query (`getGrupoCategorias` or `getEntrenamientoCategorias`, filtered by `grupo_id`/`entrenamiento_id`) per edit-modal open, alongside the existing restrictions query. Both are small result sets (at most one row per active discipline level) and run in parallel with no added round trips beyond the existing restriction fetch.
- **Accessibility**: No new interactive elements are introduced. The auto-expand of "Restricciones de reserva" must not steal keyboard focus or scroll position when the modal opens.
- **Error handling**: If `getGrupoCategorias`/`getEntrenamientoCategorias` fails, fall back silently to `{ enabled: false, items: {} }` (same as the current default for trainings without categorias) — no blocking error banner, consistent with the existing `.catch(() => form.setRestricciones([]))` pattern for restrictions.
