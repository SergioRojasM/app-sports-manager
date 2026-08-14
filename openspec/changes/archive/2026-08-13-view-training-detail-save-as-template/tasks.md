## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/view-training-detail-save-as-template` from `main` (or `develop`, per current team convention).
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making any changes.

## 2. Hook — `useEntrenamientos.ts` view-target state and fetch

- [x] 2.1 Add the `ViewTarget` type (`instance`, `relatedGroup`, `categorias`, `restricciones`, `niveles`) and `viewTarget`/`isViewModalOpen`/`viewLoading` state to `useEntrenamientos.ts`.
- [x] 2.2 Import `nivelDisciplinaService` (`@/services/supabase/portal/nivel-disciplina.service`) and `NivelDisciplina` type if not already imported.
- [x] 2.3 Implement `requestViewInstance(instance: TrainingInstance)`: resolve `relatedGroup` from `groupsById` (no `isHistoricalTraining()` check), synchronously set `viewTarget = { instance, relatedGroup, categorias: [], restricciones: [], niveles: [] }`, `isViewModalOpen = true`, `viewLoading = true`.
- [x] 2.4 In `requestViewInstance`, fetch `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)`, `entrenamientosService.getInstanceRestrictions(tenantId, instance.id)` (mapped the same way as `prepareEditFromInstance`, including `descripcion`/`servicio_1_id`–`servicio_4_id`), and `nivelDisciplinaService.getNivelesDisciplina(tenantId, instance.disciplina_id)` in parallel via `Promise.all`, each with its own `.catch(() => [])`; on settle, merge results into `viewTarget` and set `viewLoading = false`.
- [x] 2.5 Implement `closeViewModal()`: sets `isViewModalOpen = false` and `viewTarget = null`.

## 3. Hook — `useEntrenamientos.ts` template-save plumbing for the view

- [x] 3.1 Add module-level helper `buildPlantillaContenidoFromInstance(instance, categorias, restricciones): EntrenamientoPlantillaContenido`, placed alongside `toCategoriasFormState`, mapping fields exactly as `form.buildPlantillaContenido()` does but sourced from `TrainingInstance`/`EntrenamientoCategoria[]`/`EntrenamientoRestriccion[]`.
- [x] 3.2 Add `const plantillaContenidoSourceRef = useRef<'form' | 'view'>('form')`.
- [x] 3.3 Wrap the existing `openGuardarPlantillaModal` (returned to `EntrenamientoFormModal` as `onOpenGuardarPlantillaModal`) so it sets `plantillaContenidoSourceRef.current = 'form'` before calling `plantillas.openSaveModal()`.
- [x] 3.4 Add `onOpenGuardarPlantillaModalFromView()` that sets `plantillaContenidoSourceRef.current = 'view'` before calling `plantillas.openSaveModal()`.
- [x] 3.5 Modify `guardarPlantilla(nombre, descripcion)`: if `plantillaContenidoSourceRef.current === 'view'` and `viewTarget` is set, build `contenido = buildPlantillaContenidoFromInstance(viewTarget.instance, viewTarget.categorias, viewTarget.restricciones)`; otherwise keep `form.buildPlantillaContenido()`. Both branches continue to call `plantillas.createPlantilla({ tenantId, nombre, descripcion, contenido })` and close the save modal on success.
- [x] 3.6 Export `viewTarget`, `isViewModalOpen`, `viewLoading`, `requestViewInstance`, `closeViewModal`, `onOpenGuardarPlantillaModalFromView` from the hook's return object.

## 4. Component — `EntrenamientosList.tsx`

- [x] 4.1 Export `VisibilidadBadge` (`EntrenamientosList.tsx:3`) so it can be imported by `EntrenamientoDetalleModal.tsx`.

## 5. Component — `EntrenamientoActionModal.tsx`

- [x] 5.1 Add `onViewDetail: () => void` to `EntrenamientoActionModalProps`.
- [x] 5.2 Render a "Ver detalle" / "Ver entrenamiento" button first in the action list (above "Ver reservas"), unconditionally visible (both `canManage` true/false) and never disabled, mirroring the `onViewReservas` button styling but always present.

## 6. Component — `EntrenamientoDetalleModal.tsx` (new)

- [x] 6.1 Create `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx` with the same slide-over shell pattern as `EntrenamientoFormModal` (`aside`, `role="dialog"`, `aria-modal="true"`, ESC-to-close `useEffect`, backdrop click-to-close), entirely read-only.
- [x] 6.2 Define props: `open`, `viewTarget: ViewTarget | null`, `viewLoading: boolean`, `canManage: boolean`, `disciplineNameById`, `scenarioNameById`, `entrenadorNameById`, `servicioNameById`, `onClose`, plus the shared template-save props (`isGuardarPlantillaModalOpen`, `isSavingPlantilla`, `guardarPlantillaError`, `onOpenGuardarPlantillaModal`, `onCloseGuardarPlantillaModal`, `onGuardarPlantilla`).
- [x] 6.3 Render "Basic info" section: `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, resolved disciplina/escenario/entrenador labels ("Sin asignar" if `entrenador_id` is null), `duracion_minutos`, `cupo_maximo`, and the imported `VisibilidadBadge`.
- [x] 6.4 Add local `WEEKDAY_LABELS` lookup (`0`=Domingo … `6`=Sábado) and render "Horario / Recurrencia": for standalone (`entrenamiento_grupo_id` null) show the instance's `fecha_hora` via `toDateTimeLocalInBogota` (or a display-friendly variant); for group-based, show `relatedGroup.tipo`, `fecha_inicio`/`fecha_fin`, translated `dias_semana`, `repetir_cada_semanas`, each rule's `tipo_bloque`/`hora_inicio`/`hora_fin`/`horas_especificas`, plus the instance's own `fecha_hora`.
- [x] 6.5 Render "Categorías por nivel": while `viewLoading`, show a loading indicator; otherwise if `categorias.length > 0`, list nivel name (matched via `niveles`, fallback "Nivel no disponible") → `cupos_asignados`; if empty, show "Sin configuración de categorías".
- [x] 6.6 Render "Restricciones de reserva": while `viewLoading`, show a loading indicator; otherwise if `restricciones.length > 0` or either antelación value is non-null, show `reserva_antelacion_horas`/`cancelacion_antelacion_horas` and each row's `usuario_estado`, `validar_nivel_disciplina`, `descripcion`, and resolved `servicio_1_id`–`servicio_4_id` names (via `servicioNameById`); otherwise show "Sin restricciones configuradas".
- [x] 6.7 Render footer: "Guardar como plantilla" button visible only when `canManage` is `true`, disabled while `viewLoading`, calling `onOpenGuardarPlantillaModal`; "Cerrar" button always present, calling `onClose`.
- [x] 6.8 Render `<GuardarPlantillaModal>` bound to `isGuardarPlantillaModalOpen`/`isSavingPlantilla`/`guardarPlantillaError`/`onCloseGuardarPlantillaModal`/`onGuardarPlantilla`.

## 7. Page — `EntrenamientosPage.tsx` wiring

- [x] 7.1 Add `entrenadorNameById` and `servicioNameById` lookup maps using the same `reduce` pattern as `disciplineNameById`/`scenarioNameById`, built from `entrenadores`/`servicios`.
- [x] 7.2 Add `onViewDetail={() => { if (selectedInstanceForAction) { requestViewInstance(selectedInstanceForAction); closeActionModal(); } }}` to `<EntrenamientoActionModal>`.
- [x] 7.3 Render `<EntrenamientoDetalleModal>` near the other modals, passing `open={isViewModalOpen}`, `viewTarget`, `viewLoading`, `canManage`, the four lookup maps, `onClose={closeViewModal}`, and the shared template-save props with `onOpenGuardarPlantillaModal={onOpenGuardarPlantillaModalFromView}`.

## 8. Validation

- [x] 8.1 Run `npx tsc --noEmit -p tsconfig.json` and confirm no new type errors.
- [x] 8.2 Run `npx eslint` on all new/modified files and confirm no new errors or warnings.

## 9. Manual Testing

- [x] 9.1 "Ver detalle" for a future training: confirm basic info renders immediately, then categorías/restricciones populate after the brief loading state.
- [x] 9.2 "Ver detalle" for a past (historical) training: confirm it opens even though "Editar"/"Eliminar" are disabled, and shows the same sections read-only.
- [x] 9.3 "Ver detalle" for a recurring-group instance: confirm the recurrence section shows `tipo`, `dias_semana` (weekday names), `repetir_cada_semanas`, `fecha_inicio`/`fecha_fin`, each rule's schedule, plus the instance's own `fecha_hora`.
- [x] 9.4 "Ver detalle" for a standalone (`unico`) training: confirm the recurrence section shows only its own `fecha_hora`.
- [x] 9.5 "Ver detalle" for a training with no categorías and no restricciones/antelación: confirm both sections show their empty-state messages.
- [x] 9.6 "Ver detalle" for a training with a categoria referencing a deactivated/deleted `nivel_disciplina`: confirm it shows "Nivel no disponible" instead of failing.
- [x] 9.7 As an athlete (`canManage = false`): confirm "Ver detalle" opens and renders fully, but "Guardar como plantilla" is not in the footer.
- [x] 9.8 As trainer/admin, click "Guardar como plantilla" from the detail view of a **past** training, save with a `nombre`, then confirm a new `entrenamiento_plantillas` row exists with `contenido` matching Section 1 + categorías + restricciones (no scheduling fields), and the viewed training is unchanged.
- [x] 9.9 Create a new training and apply the template saved in 9.8 via "Usar plantilla": confirm Section 1, categorías, and restricciones populate exactly as for a template saved from the create form (no regression to US-0069).
- [x] 9.10 Confirm ESC, backdrop click, and "Cerrar" all close `EntrenamientoDetalleModal` and that reopening for a different training never briefly shows the previous training's data.

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` to list the new `EntrenamientoDetalleModal.tsx` component and the new `useEntrenamientos.ts` hook additions (`viewTarget`, `isViewModalOpen`, `viewLoading`, `requestViewInstance`, `closeViewModal`, `buildPlantillaContenidoFromInstance`, `onOpenGuardarPlantillaModalFromView`).

## 11. Commit and Pull Request

- [x] 11.1 Create a commit with a message summarizing the change (e.g., `feat(entrenamientos): add read-only training detail view with save-as-template`).
- [x] 11.2 Write a pull request description covering: the new "Ver detalle" action and `EntrenamientoDetalleModal`, the view-sourced "Guardar como plantilla" flow, files changed, and the manual test steps from section 9.
