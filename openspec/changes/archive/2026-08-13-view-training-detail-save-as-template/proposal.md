## Why

Tenant members currently have no read-only way to inspect a training's full configuration (categorías por nivel, restricciones de reserva, recurrence schedule). The only place that detail is visible is the fully-editable `EntrenamientoFormModal`, which is explicitly blocked for historical trainings via `isHistoricalTraining()`. This means past trainings — often the best reference for "how did we configure this before?" — cannot be reviewed at all, and a known-good past configuration cannot be reused as a starting point for a new training (US-0069's "Guardar como plantilla" only works from the in-progress create form).

## What Changes

- Add a new "Ver detalle" action to `EntrenamientoActionModal`, shown first in the action list, visible to **all users**, and **never disabled** — including for historical trainings where "Editar"/"Eliminar" are disabled.
- Add a new read-only slide-over modal `EntrenamientoDetalleModal.tsx` that renders a training instance's full configuration: basic info (nombre, descripción, punto de encuentro, formulario externo, disciplina/escenario/entrenador labels, duración, cupo máximo, visibilidad), recurrence/schedule info (group recurrence rules or standalone `fecha_hora`), categorías por nivel, and restricciones de reserva — with loading and empty states. No inputs, no add/remove/duplicate controls anywhere.
- Export `VisibilidadBadge` from `EntrenamientosList.tsx` for reuse in the new modal instead of duplicating the badge markup.
- Extend `useEntrenamientos.ts` with `viewTarget`/`isViewModalOpen`/`viewLoading` state, `requestViewInstance`/`closeViewModal` (no `isHistoricalTraining()` gate — works for any instance, past or future), and a new module-level helper `buildPlantillaContenidoFromInstance()` that builds the same versioned `EntrenamientoPlantillaContenido` snapshot as `form.buildPlantillaContenido()`, but sourced from a `TrainingInstance` + its `categorias`/`restricciones` rather than live form state.
- Extend the existing "Guardar como plantilla" plumbing (`plantillas`, `onGuardarPlantilla`, `isGuardarPlantillaModalOpen`, etc.) with a `plantillaContenidoSourceRef` so the same shared `GuardarPlantillaModal`/`createPlantilla` flow can be triggered from either the create form (`onOpenGuardarPlantillaModal`) or the new detail view (`onOpenGuardarPlantillaModalFromView`), and `onGuardarPlantilla` builds `contenido` from the correct source accordingly.
- Wire everything in `EntrenamientosPage.tsx`: new `entrenadorNameById`/`servicioNameById` lookup maps, `onViewDetail` handler, and rendering of `<EntrenamientoDetalleModal>` with its own `<GuardarPlantillaModal>` instance bound to the shared save-template props.

## Capabilities

### New Capabilities
- `training-detail-view`: Read-only "Ver detalle" modal (`EntrenamientoDetalleModal`) showing a training instance's full configuration — basic info, recurrence/schedule, categorías por nivel, and restricciones de reserva — available for any training including historical ones, with role-gated "Guardar como plantilla" in its footer.

### Modified Capabilities
- `training-management`: `EntrenamientoActionModal` gains a new always-visible, never-disabled "Ver detalle" action (first in the list), available regardless of `canManage` or `isHistoricalTraining`.
- `training-templates`: "Guardar como plantilla" can now also be triggered from `EntrenamientoDetalleModal` (an existing past or current training instance), via a new `buildPlantillaContenidoFromInstance()` snapshot builder and a `plantillaContenidoSourceRef` that routes `onGuardarPlantilla` to the correct content source. The resulting template content, RLS rules, and `GuardarPlantillaModal` flow are unchanged — only the source of `contenido` differs.

## Non-goals

- Editing a training's configuration from the detail view — it remains strictly read-only; "Editar" continues to be the only editing entry point and remains gated by `isHistoricalTraining()`.
- Any change to how templates are applied ("Usar plantilla") — a template saved from the detail view is applied identically to one saved from the create form (US-0069 behavior, no regression).
- New database tables, columns, migrations, or RLS policy changes — all four reads (`getEntrenamientoCategorias`, `getInstanceRestrictions`, `getNivelesDisciplina`, and the existing `entrenamiento_plantillas` insert) reuse existing services and policies.
- Showing booking data ("Ver reservas") inside the new detail modal — that remains a separate action/panel.

## Impact

- **Components**: new `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx`; modified `EntrenamientoActionModal.tsx` (new prop + button), `EntrenamientosList.tsx` (export `VisibilidadBadge`), `EntrenamientosPage.tsx` (wiring + lookup maps).
- **Hooks**: `useEntrenamientos.ts` extended (additive) with view-target state, `requestViewInstance`/`closeViewModal`, `buildPlantillaContenidoFromInstance`, `plantillaContenidoSourceRef`, `onOpenGuardarPlantillaModalFromView`, and an updated `onGuardarPlantilla`.
- **Services/Types**: no new services or types; reuses `entrenamientoCategoriasService`, `entrenamientosService.getInstanceRestrictions`, `nivelDisciplinaService.getNivelesDisciplina`, and `entrenamientoPlantillasService.create` (via `useEntrenamientoPlantillas`).
- **Database**: none.
- **No changes** to pages outside `EntrenamientosPage.tsx`, auth flows, or other features' specs.
