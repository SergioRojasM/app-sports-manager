## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/training-form-attachment` from `develop`
- [x] 1.2 Verify the current working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database

- [x] 2.1 Write `supabase/migrations/20260722010000_entrenamientos_formulario_plantilla.sql`: add `formulario_id` (uuid, FK to `formularios_plantillas.id`, `on delete set null`) and `formulario_obligatorio` (boolean, not null, default `false`) to `public.entrenamientos_grupo`
- [x] 2.2 In the same migration, add the mutual-exclusivity check constraint (`formulario_id`/`formulario_externo`) and the obligatorio-requires-a-form check constraint on `entrenamientos_grupo`, plus an index on `formulario_id`
- [x] 2.3 Repeat 2.1-2.2 for `public.entrenamientos`
- [x] 2.4 Apply the migration locally only (`supabase db reset` or equivalent) — do not push to the remote Supabase project as part of this change
- [x] 2.5 Verify the migration applies cleanly on top of `20260721223051_formulario_esquema_secciones.sql` and that all pre-existing rows remain valid against the new check constraints

## 3. Types

- [x] 3.1 In `src/types/portal/entrenamientos.types.ts`: add `TrainingFormularioTipo = 'ninguno' | 'externo' | 'interno'`
- [x] 3.2 Add `formulario_id: string | null`, `formulario_obligatorio: boolean`, `formulario_plantilla?: { nombre: string } | null` to `TrainingGroup` and `TrainingInstance`
- [x] 3.3 Add `formulario_id?: string | null`, `formulario_obligatorio?: boolean` to `CreateTrainingSeriesInput['group']`, `UpdateTrainingSeriesInput['groupPatch']`, and `UpdateTrainingInstanceInput['patch']`
- [x] 3.4 Add `'formulario_tipo'` and `'formulario_id'` to the `TrainingField` union (for `TrainingFieldErrors` keys)
- [x] 3.5 In `src/types/portal/entrenamiento-plantillas.types.ts`: add optional `formulario_tipo?: TrainingFormularioTipo` and `formulario_obligatorio?: boolean` to `EntrenamientoPlantillaContenido`

## 4. Service

- [x] 4.1 In `src/services/supabase/portal/entrenamientos.service.ts`, extend the `entrenamientos_grupo` and `entrenamientos` `select(...)` strings in `listTrainingGroupsByTenant`, `listTrainingInstancesByTenantAndRange`, and every insert/update `.select(...)` call to include `formulario_id, formulario_obligatorio, formulario_plantilla:formularios_plantillas(nombre)`
- [x] 4.2 Extend `createTrainingSeries`'s `entrenamientos` (único) and `entrenamientos_grupo` (recurrente) insert payloads with `formulario_id` and `formulario_obligatorio` from `input.group`
- [x] 4.3 Extend `updateTrainingSeries`'s `entrenamientos_grupo` update payload and `updateTrainingInstance`'s `entrenamientos` update payload with `formulario_id`/`formulario_obligatorio` from `input.groupPatch`/`input.patch`
- [x] 4.4 Extend `mapTrainingGroup` and `mapTrainingInstance` to map the new raw columns (including the joined `formulario_plantilla.nombre`) onto the typed `TrainingGroup`/`TrainingInstance` objects
- [x] 4.5 Confirm `formularios.service.ts` needs no changes — `getPlantillasByTenant` and `getPlantillaConSecciones` are reused as-is

## 5. Hooks

- [x] 5.1 In `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`, add a `formularioForm` state slice (`{ tipo: TrainingFormularioTipo; formulario_id: string; obligatorio: boolean }`) with `setFormularioTipo`, `setFormularioPlantillaId`, `setFormularioObligatorio` setters; clear the irrelevant field on each `tipo` switch
- [x] 5.2 Extend `validate` to require `formulario_externo` when `formularioForm.tipo === 'externo'` and `formulario_id` when `formularioForm.tipo === 'interno'`
- [x] 5.3 Extend `buildPlantillaContenido`/`applyPlantillaContenido` (lines ~477-559) to include `formulario_tipo`/`formulario_obligatorio` in the snapshot (never `formulario_id`), with the backward-compatible defaulting rule for pre-existing templates on apply
- [x] 5.4 In `src/hooks/portal/entrenamientos/useEntrenamientos.ts`, extend `toCreatePayload`/`toUpdatePatch` (lines ~307-389) to accept `formularioForm` and compute `formulario_id`/`formulario_externo`/`formulario_obligatorio` with mutual exclusion enforced client-side before hitting the service layer
- [x] 5.5 Extend `buildPlantillaContenidoFromInstance` (lines ~250-288) the same way as 5.3, for the "guardar como plantilla" flow from the detail view
- [x] 5.6 Wire `form.formularioForm` into all four `submitForm` call sites (create único, create recurrente, update instance, update series) and re-export `formularioForm` + its setters from the hook's return value
- [x] 5.7 Fetch `formulariosService.getPlantillasByTenant(tenantId)` in `EntrenamientosPage.tsx` (or a dedicated call inside `useEntrenamientos`), filtered client-side to `activo === true` and sorted by `nombre`, for the internal template picker

## 6. Components

- [x] 6.1 Remove the "Formulario externo" input block (lines ~173-184) from `src/components/portal/entrenamientos/EntrenamientoWizard.tsx`
- [x] 6.2 Create `src/components/portal/entrenamientos/EntrenamientoFormularioSection.tsx`, styled like `EntrenamientoCategoriasSection.tsx`, implementing: enable/disable toggle → external/internal toggle → URL input or template `<select>` + role-gated "crear nueva plantilla" link → obligatorio checkbox
- [x] 6.3 Wire `EntrenamientoFormularioSection` into `EntrenamientoFormModal.tsx` alongside `EntrenamientoCategoriasSection`/`EntrenamientoRestriccionesSection`; extend `EntrenamientoFormModalProps` with `role`, `tenantId`, the template list, `formularioForm`, and its setters
- [x] 6.4 Thread `role` and `tenantId` from `EntrenamientosPage.tsx` down to `EntrenamientoFormModal`
- [x] 6.5 Generalize the "Formulario externo" block in `EntrenamientoDetalleModal.tsx` (lines ~180-194) into a "Formulario" block handling both external and internal cases, an "Obligatorio" badge, and a "Ver formulario" action opening `FormularioPreviewModal` (lazy-loaded via `formulariosService.getPlantillaConSecciones`)
- [x] 6.6 Generalize the compact indicator in `EntrenamientosList.tsx` (lines ~172-190) the same way, without a preview trigger
- [x] 6.7 Generalize the form link in `ReservasPanel.tsx` (lines ~365-372) the same way, plus an informational "Obligatorio" note (no booking gate)

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: note the new `EntrenamientoFormularioSection.tsx` component and the extended `formulario_id`/`formulario_obligatorio` fields in the `entrenamientos` feature slice comments (components, hooks, services, types sections)

## 8. Testing

- [ ] 8.1 Create a training with no form, an external URL, and an internal template (each with obligatorio on/off); verify persisted values match the selection in each case
- [ ] 8.2 Edit each of the three cases and verify the wizard pre-fills correctly (AC 7 / spec "Correct pre-fill when editing an existing training")
- [ ] 8.3 Attempt direct-SQL inserts violating the mutual-exclusivity and obligatorio-requires-a-form check constraints; confirm both are rejected by the database
- [ ] 8.4 Verify the "crear nueva plantilla" link is visible only for `administrador` and hidden for `entrenador`
- [ ] 8.5 Verify the detail view, list card, and booking panel render the external case, internal case (incl. "Ver formulario" preview), the "Obligatorio" indicator, and the no-form case correctly
- [ ] 8.6 Save a training with each form type as a reusable template, then apply it, and confirm `formulario_id` never carries over while `formulario_tipo`/`formulario_obligatorio` do (incl. the "interno" re-selection requirement)
- [ ] 8.7 Apply a template saved before this change (missing `formulario_tipo`/`formulario_obligatorio`) and confirm the backward-compatible defaulting works without error
- [ ] 8.8 Delete a `formularios_plantillas` row referenced by a training's `formulario_id` and confirm it detaches gracefully (`formulario_id` becomes null) without deleting the training
- [ ] 8.9 Confirm no regressions in `gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`, `gestion-formularios`, and existing `formulario_externo`-only trainings

## 9. Wrap-up

- [ ] 9.1 Write the commit message summarizing the change (DB columns, wizard section, view generalization, template persistence rule)
- [ ] 9.2 Write the pull request description referencing US-0086, summarizing changes, and including a manual test plan checklist drawn from section 8
