## Why

Opening "Editar entrenamiento" for a training group or instance currently shows the "Categorías por nivel" and "Restricciones de reserva" sections as empty/collapsed, even when saved configuration exists (`entrenamiento_grupo_categorias` / `entrenamiento_categorias` rows for categories, and `entrenamiento_restricciones` / `entrenamiento_grupo_restricciones` rows plus `reserva_antelacion_horas` / `cancelacion_antelacion_horas` for restrictions). This is the same class of async-hydration bug recently fixed for the "apply training template" feature (US-0069). If left unfixed, trainers/admins either re-enter configuration manually or — worse — save the form and silently wipe out the existing categories/restrictions configuration.

Additionally, during manual verification of this change, a related but distinct bug was found: when restrictions are added/edited via the "Editar entrenamiento" form (not present at creation time), the `descripcion` and `servicio_1_id`–`servicio_4_id` columns are silently dropped on save. The restriction row itself is persisted (with `usuario_estado`/`validar_nivel_disciplina`/`orden`), but the selected services and description are lost — which is why a subsequent edit appears to "not load" the service restriction even though a row exists in the database. Restrictions configured at creation time are unaffected because the create path already writes these columns.

## What Changes

- Hydrate `categoriasForm` (the "¿Usar categorías?" toggle and per-level `cupos_asignados`) when the edit modal opens, for groups, single instances, and series/future-scope edits, by calling the existing (currently unused in this flow) `entrenamientoCategoriasService.getGrupoCategorias` / `getEntrenamientoCategorias`.
- Add a new exported setter `setCategoriasFormFromExternal(value: CategoriasFormState): void` on `useEntrenamientoForm` so edit-prep code can hydrate `categoriasForm` directly, mirroring `setFormValuesFromExternal` / `setRestricciones`.
- In `prepareEditFromGroup` and both branches of `prepareEditFromInstance` (single and series/future), set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal(...)` — reusing the one-shot mechanism introduced in US-0069 — so the discipline-change effect's `checkDisciplinaHasNiveles({ resetCategorias: true })` does not immediately overwrite the freshly hydrated `categoriasForm`.
- Fix `EntrenamientoRestriccionesSection`'s `open` (expanded/collapsed) state, which is currently computed once at mount from props that are still empty (`restricciones = []`, `reservaAntelacionHoras = null`, `cancelacionAntelacionHoras = null`) before the async restriction fetch resolves. Use the "adjust state during render" pattern (same as `GuardarPlantillaModal.tsx` from US-0069) so the section auto-expands the first time hydrated data arrives, without re-collapsing if the user manually collapses it afterward.
- Fix `entrenamientosService.updateTrainingSeries` (group restriction sync) and `entrenamientosService.updateTrainingInstance` (`scope === 'single'` instance restriction sync) so the delete-and-reinsert of `entrenamiento_grupo_restricciones` / `entrenamiento_restricciones` includes `descripcion`, `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, and `servicio_4_id`, matching the columns already written by the create paths and read back by `getGroupRestrictions` / `getInstanceRestrictions`.

## Capabilities

### New Capabilities
(none — this change fixes existing edit-flow behavior, it does not introduce a new capability)

### Modified Capabilities
- `training-session-categories`: Add a requirement that opening "Editar entrenamiento" for a group/instance/series with existing `entrenamiento_grupo_categorias` or `entrenamiento_categorias` rows SHALL hydrate the `categoriasForm` toggle and per-level `cupos_asignados` values from those rows, and SHALL NOT have them reset to empty by the discipline-change effect.
- `training-booking-restrictions`: Add a requirement that opening "Editar entrenamiento" for a group/instance with existing restriction rows and/or non-null `reserva_antelacion_horas` / `cancelacion_antelacion_horas` SHALL render the "Restricciones de reserva" section expanded by default, showing the saved configuration. Add a requirement that saving restriction rows from the edit form SHALL persist `descripcion` and `servicio_1_id`–`servicio_4_id` to `entrenamiento_grupo_restricciones` / `entrenamiento_restricciones`.

## Impact

- **Files**:
  - `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` — add `setCategoriasFormFromExternal`.
  - `src/hooks/portal/entrenamientos/useEntrenamientos.ts` — import `entrenamientoCategoriasService`, hydrate `categoriasForm` in `prepareEditFromGroup` and `prepareEditFromInstance`, set `skipNextCategoriasResetRef.current = true` before `setFormValuesFromExternal`.
  - `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx` — fix `open` initial-state logic.
  - `src/services/supabase/portal/entrenamientos.service.ts` — fix `updateTrainingSeries` and `updateTrainingInstance` (`scope === 'single'`) restriction-row mapping to include `descripcion` and `servicio_1_id`–`servicio_4_id`.
- **Database**: none — no new tables, columns, indexes, or RLS policy changes. Reuses existing columns/SELECT policies on `entrenamiento_grupo_categorias`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `entrenamiento_grupo_restricciones` (added by `20260612000100_restricciones_por_servicio.sql`).
- **Dependencies**: none beyond existing services (`entrenamientoCategoriasService`, `entrenamientosService`).
- **Breaking changes**: none.

## Non-goals

- No changes to create-mode UX (sections still start empty/collapsed when there is nothing to show).
- No changes to "apply template" (`aplicarPlantilla`) behavior — only reuses the `skipNextCategoriasResetRef` mechanism it introduced.
- No changes to manual discipline-change reset behavior in the wizard.
- No new database tables, columns, indexes, or RLS policies.
