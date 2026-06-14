## 1. Branch Setup

- [x] 1.1 Create a new branch named `fix/edit-training-categorias-restrictions-blank` from `main` (or `develop`, per current team convention).
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making any changes.

## 2. Hooks — Categories Hydration

- [x] 2.1 In `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`, add an exported `setCategoriasFormFromExternal(value: CategoriasFormState): void` that calls the internal `setCategoriasForm(value)`, placed under the `// Categories` section of the returned object alongside `categoriasForm`, `checkDisciplinaHasNiveles`, `toggleCategorias`, `updateCategoriasCupos`, `validateCategorias`.
- [x] 2.2 In `src/hooks/portal/entrenamientos/useEntrenamientos.ts`, import `entrenamientoCategoriasService` from `@/services/supabase/portal/entrenamiento-categorias.service`.
- [x] 2.3 In `prepareEditFromGroup`: set `skipNextCategoriasResetRef.current = true` immediately before `form.setFormValuesFromExternal(values)`.
- [x] 2.4 In `prepareEditFromGroup`: after hydrating restrictions, call `entrenamientoCategoriasService.getGrupoCategorias(group.id)`, map the returned rows (`{ nivel_id, cupos_asignados }[]`) to `{ enabled: rows.length > 0, items: Record<nivel_id, cupos_asignados> }`, and call `form.setCategoriasFormFromExternal(...)`; on fetch error, fall back to `form.setCategoriasFormFromExternal({ enabled: false, items: {} })`.
- [x] 2.5 In `prepareEditFromInstance`, `selectedScope === 'single'` branch: set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`, then fetch `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)` and hydrate `categoriasForm` using the same mapping/fallback as 2.4.
- [x] 2.6 In `prepareEditFromInstance`, `series`/`future` branch (when `sourceGroup` is resolved): set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`, then fetch `entrenamientoCategoriasService.getGrupoCategorias(sourceGroup.id)` and hydrate `categoriasForm` using the same mapping/fallback as 2.4.

## 3. Component — Restrictions Section Auto-Expand

- [x] 3.1 In `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx`, replace the mount-only `const [open, setOpen] = useState(hasContent)` with the adjust-during-render pattern: add `const [prevHasContent, setPrevHasContent] = useState(hasContent)`, and when `hasContent !== prevHasContent`, call `setPrevHasContent(hasContent)` and, if `hasContent` is now `true`, call `setOpen(true)`.
- [x] 3.2 Confirm the component does not introduce a `react-hooks/set-state-in-effect` violation (no new `useEffect` was added).

## 4. Validation

- [x] 4.1 Run `npx tsc --noEmit -p tsconfig.json` and confirm no new type errors.
- [x] 4.2 Run `npx eslint` on the three modified files and confirm no new errors or warnings.

## 4A. Service — Fix Dropped Restriction Columns on Update

- [x] 4A.1 In `src/services/supabase/portal/entrenamientos.service.ts`, `updateTrainingSeries`'s grupo-restriction sync (`grupoRestRows`): add `descripcion`, `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id` from `r`, matching the create-path mapping.
- [x] 4A.2 In `updateTrainingInstance`, `scope === 'single'` instance-restriction sync (`restRows`): add the same five fields.
- [x] 4A.3 Run `npx tsc --noEmit -p tsconfig.json` and `npx eslint` on `entrenamientos.service.ts` — confirm no new errors/warnings.

## 5. Manual Testing

- [x] 5.1 Edit a recurring group that has saved categorias (`entrenamiento_grupo_categorias`) and restrictions (`entrenamiento_grupo_restricciones` and/or antelación values) configured — confirm "Categorías por nivel" shows the toggle checked with saved cupos, and "Restricciones de reserva" is expanded with saved data.
- [x] 5.2 Edit a single instance (scope `single`) with saved categorias (`entrenamiento_categorias`) and restrictions (`entrenamiento_restricciones`) configured — confirm both sections show saved data immediately on open.
- [x] 5.3 Edit an instance with scope `series`/`future` belonging to a group with saved group categorias — confirm "Categorías por nivel" hydrates from the group's data.
- [x] 5.4 Edit a group/instance with no categorias and no restrictions configured — confirm both sections show their empty/collapsed default state, with no false positives.
- [x] 5.5 Manually collapse "Restricciones de reserva" after it auto-expands during edit — confirm it stays collapsed and is not re-expanded on subsequent re-renders within the same modal session.
- [x] 5.6 Create a new training, apply a saved template via "Usar plantilla", then change the discipline manually — confirm `categoriasForm` resets/populates correctly in all cases (no regression to the US-0069 fix).
- [x] 5.7 Create a training group/instance with NO restrictions, edit it to add a restriction row with a service (`servicio_1_id`) and a `descripcion`, save with the relevant scope, then re-open "Editar entrenamiento" — confirm the saved service and description load correctly (verify `entrenamiento_grupo_restricciones`/`entrenamiento_restricciones` row has `servicio_1_id`/`descripcion` populated, not `null`).

## 6. Documentation

- [x] 6.1 Review `projectspec/03-project-structure.md` and update it only if this change introduces new exported hooks/services or alters documented edit-flow behavior; otherwise no update needed. (Reviewed — `useEntrenamientoForm.ts` and `entrenamiento-categorias.service.ts` are already documented at the file level; no new files or services were added, so no update is needed.)

## 7. Commit and Pull Request

- [x] 7.1 Create a commit with a message summarizing the fix (e.g., `fix(entrenamientos): hydrate categorias and auto-expand restrictions on edit`).
- [ ] 7.2 Write a pull request description covering: the two root causes, the fix for each (categorias hydration + `skipNextCategoriasResetRef` reuse; restrictions section auto-expand), files changed, and the manual test steps from section 5.
