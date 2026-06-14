## Context

`EntrenamientoActionModal` (`src/components/portal/entrenamientos/EntrenamientoActionModal.tsx`) currently exposes "Ver reservas" (all users) and "Editar"/"Eliminar" (trainers/admins, both disabled for historical trainings via `selectedActionContext.canEdit`/`canDelete` computed in `EntrenamientosPage.tsx:169-191`). The only place a training's full configuration (categorías por nivel, restricciones de reserva, recurrence) is visible is `EntrenamientoFormModal`, which is fully editable and blocked for historical trainings by `isHistoricalTraining()` (`useEntrenamientos.ts:195-200`, enforced in `requestEditInstance` at `useEntrenamientos.ts:489-507`).

US-0069 (training-templates, merged via `feat/training-templates`) added "Guardar como plantilla" / "Ver plantillas" to `EntrenamientoFormModal` in create mode only, snapshotting the **live form state** via `form.buildPlantillaContenido()` (`useEntrenamientoForm.ts:477-514`) into `entrenamiento_plantillas.contenido`. That plumbing — `useEntrenamientoPlantillas()` (instantiated as `plantillas` in `useEntrenamientos.ts`), `guardarPlantilla`, `isGuardarPlantillaModalOpen`/`openGuardarPlantillaModal`/`closeGuardarPlantillaModal`/`isSavingPlantilla`/`guardarPlantillaError`, and `<GuardarPlantillaModal>` — is reused as-is here; only the *source* of `contenido` changes.

This change adds a read-only "Ver detalle" view that works for **any** instance (past or future, standalone or recurring), and lets `canManage` users save that instance's configuration as a template without going through the edit form.

## Goals / Non-Goals

**Goals:**
- Provide a read-only detail view (`EntrenamientoDetalleModal`) for any training instance, including historical ones where edit/delete are disabled.
- Reuse existing data-fetching services (`entrenamientoCategoriasService.getEntrenamientoCategorias`, `entrenamientosService.getInstanceRestrictions`, `nivelDisciplinaService.getNivelesDisciplina`) and the existing `entrenamiento_plantillas` save flow — no new services, types, or migrations.
- Let `canManage` users save the viewed instance's configuration as a template via the same `GuardarPlantillaModal`/`createPlantilla` path used by the create form.
- Keep `EntrenamientoFormModal` and its `isHistoricalTraining()` edit guard completely untouched.

**Non-Goals:**
- Editing from the detail view (strictly read-only).
- Changing "Usar plantilla" / template application behavior (US-0069 unchanged).
- New DB tables, columns, RLS policies, or migrations.
- Showing booking data inside the new modal (that remains "Ver reservas").

## Decisions

### 1. New hook state lives in `useEntrenamientos.ts`, modeled after the existing edit-target pattern
Add `viewTarget: ViewTarget | null`, `isViewModalOpen`, `viewLoading`, mirroring the shape of `EditTarget`/`prepareEditFromInstance` but without any `isHistoricalTraining()` gate and without mutating form state. `requestViewInstance(instance)`:
- Resolves `relatedGroup = instance.entrenamiento_grupo_id ? groupsById.get(instance.entrenamiento_grupo_id) ?? null : null` (reuses the existing `groupsById` map at `useEntrenamientos.ts:388`).
- Synchronously sets `viewTarget = { instance, relatedGroup, categorias: [], restricciones: [], niveles: [] }`, `isViewModalOpen = true`, `viewLoading = true` — so Section 1 (basic info) and the recurrence section render immediately from data already in memory.
- Kicks off `Promise.all([...])` for categorias/restricciones/niveles, each with `.catch(() => [])`, mirroring `prepareEditFromInstance`'s existing `.catch(() => form.setRestricciones([]))` / `toCategoriasFormState` pattern (`useEntrenamientos.ts:682-703`). On settle, merges results into `viewTarget` and sets `viewLoading = false`.

`closeViewModal()` resets both `isViewModalOpen` and `viewTarget` to `null`/`false` together (not just hiding the modal) so a subsequent `requestViewInstance` for a different instance can never flash stale data — addresses acceptance criterion 12.

**Alternative considered**: reuse `useEntrenamientoForm`'s state (like edit mode does) and just render it read-only. Rejected — that would require either relaxing `isHistoricalTraining()` (security/UX risk: could make the edit form usable for past trainings) or duplicating the form's hydration logic with an extra "read-only" flag threaded through every input. A small parallel `ViewTarget` struct is simpler and keeps the edit path's guards untouched.

### 2. `buildPlantillaContenidoFromInstance` is a module-level pure function, placed beside `toCategoriasFormState`
Same versioned `EntrenamientoPlantillaContenido` shape (`version: 1`, Section 1 fields, `categorias`, `restricciones`) as `form.buildPlantillaContenido()`, but its inputs are `TrainingInstance` + `EntrenamientoCategoria[]` + `EntrenamientoRestriccion[]` instead of live `TrainingWizardValues`/form arrays. Being a pure function (no hook dependencies) makes it trivially testable and keeps `useEntrenamientos.ts`'s existing helper-function block (`toCategoriasFormState`, `toRuleForm`, etc. around line 226) cohesive.

**Alternative considered**: extend `useEntrenamientoForm` with a second `buildPlantillaContenidoFromInstance` method. Rejected — the form hook's state isn't involved at all for the view-sourced path; adding it there would create a dependency from the form hook on `TrainingInstance`/`EntrenamientoCategoria`/`EntrenamientoRestriccion` types it doesn't otherwise need.

### 3. Single shared save pipeline via `plantillaContenidoSourceRef`
Both entry points ("Guardar como plantilla" in `EntrenamientoFormModal` and in the new `EntrenamientoDetalleModal`) must end up calling the same `plantillas.createPlantilla({ tenantId, nombre, descripcion, contenido })` and share the same `GuardarPlantillaModal` open/close/loading/error state (`isGuardarPlantillaModalOpen`/`openGuardarPlantillaModal`/`closeGuardarPlantillaModal`/`isSavingPlantilla`/`guardarPlantillaError` — all already generic, not form-specific). The only thing that differs is *which snapshot builder* runs.

- `plantillaContenidoSourceRef = useRef<'form' | 'view'>('form')`.
- The existing `openGuardarPlantillaModal` (passed to `EntrenamientoFormModal` as `onOpenGuardarPlantillaModal`) is wrapped to set the ref to `'form'` before calling `plantillas.openSaveModal()`.
- A new `onOpenGuardarPlantillaModalFromView()` sets the ref to `'view'` before calling `plantillas.openSaveModal()`.
- `guardarPlantilla(nombre, descripcion)` branches on the ref: `'view'` (with `viewTarget` set) → `buildPlantillaContenidoFromInstance(viewTarget.instance, viewTarget.categorias, viewTarget.restricciones)`; otherwise → `form.buildPlantillaContenido()` (current behavior, default `'form'`).

**Alternative considered**: a second, parallel set of `isGuardarPlantillaModalOpen`/`guardarPlantilla`/etc. for the view modal. Rejected — `EntrenamientoFormModal` and `EntrenamientoDetalleModal` are never open at the same time, so there's no state collision; a second copy would duplicate five pieces of state and the `GuardarPlantillaModal` wiring for no behavioral benefit. A one-field ref is the minimal discriminator.

### 4. `EntrenamientoDetalleModal` is a new component, not a read-only mode of `EntrenamientoFormModal`
It reuses the same slide-over shell pattern (ESC listener `useEffect`, backdrop click, `role="dialog"`/`aria-modal="true"`, `aside` — `EntrenamientoFormModal.tsx:130-141` and `:157-159`) but is a separate file because:
- `EntrenamientoFormModal` is a multi-step wizard with significant internal state (`formValues`, step navigation, validation) that has nothing to do with a static display.
- Threading a `readOnly` flag through every input/section of the wizard (categorías, restricciones, recurrence editors) would touch far more files than writing a focused display component, and risks accidentally making a "read-only" form editable via a missed prop.
- The detail modal's data shape (`ViewTarget`) is simpler than `TrainingWizardValues` and doesn't need step/validation state at all.

### 5. `VisibilidadBadge` export instead of duplication
`VisibilidadBadge` (`EntrenamientosList.tsx:3`) is a small, pure presentational function already matching the exact visual the US wants in the detail modal's basic-info section. Exporting it (`export function VisibilidadBadge(...)`) avoids copy-pasting the two-branch badge markup into a second file, which would otherwise drift if the badge styling changes later.

### 6. Weekday labels via a small local `WEEKDAY_LABELS` lookup
`dias_semana` is stored as `0-6` indices (Sunday=0, matching JS `Date.getDay()` convention used elsewhere in the codebase). A `const WEEKDAY_LABELS = ['Domingo', 'Lunes', ..., 'Sábado']` array, local to `EntrenamientoDetalleModal.tsx`, maps index → Spanish label for display. This is display-only and not reused elsewhere, so it doesn't need to live in a shared util.

### 7. New `entrenadorNameById`/`servicioNameById` maps in `EntrenamientosPage.tsx`
Built with the same `reduce` pattern as the existing `disciplineNameById`/`scenarioNameById` (`EntrenamientosPage.tsx:155-167`), sourced from `entrenadores`/`servicios` (already returned by `useEntrenamientos` and already used for the form modal). These are passed into `EntrenamientoDetalleModal` for resolving `entrenador_id` and `servicio_1_id`–`servicio_4_id` labels — the same resolution pattern already used for `disciplina_id`/`escenario_id` elsewhere on the page.

## Risks / Trade-offs

- **[Risk] Stale `viewTarget` flashing old data when reopening for a different instance.** → Mitigation: `closeViewModal()` clears `viewTarget` to `null` synchronously (not just `isViewModalOpen = false`), and `requestViewInstance` always sets a fresh `viewTarget` synchronously before any async fetch resolves (acceptance criterion 12).
- **[Risk] `categoria.nivel_id` referencing a deactivated/deleted `nivel_disciplina` row.** → Mitigation: `EntrenamientoDetalleModal` falls back to "Nivel no disponible" when no match is found in the fetched `niveles` array, consistent with how `EntrenamientoCategoriasSection` already tolerates missing levels.
- **[Risk] One of the three parallel detail fetches fails (network blip).** → Mitigation: each fetch has its own `.catch(() => [])`, so a single failure degrades that section to its empty state rather than blocking the whole modal — consistent with the existing `.catch(() => form.setRestricciones([]))` pattern.
- **[Trade-off] A small amount of duplication between `buildPlantillaContenidoFromInstance` and `form.buildPlantillaContenido()`** (same field list, different sources) is accepted in exchange for not coupling the form hook to instance/category/restriction types it doesn't otherwise need (see Decision 2).
- **[Risk] Saving from the view, then reopening the (still-open) detail modal, doesn't reflect the new template** — not applicable, since saving creates a new `entrenamiento_plantillas` row and does not change the viewed `entrenamientos` row (acceptance criterion 10); no refresh of `viewTarget` is needed.

## Migration Plan

Purely additive frontend change — no migrations, no feature flag needed. Deploy as a normal PR; no rollback considerations beyond reverting the PR (no persisted-state or schema changes to undo).

## Open Questions

None — the User Story (`projectspec/userstory/us0071-view-training-detail-save-as-template.md`) fully specifies field-by-field behavior, empty states, and the loading sequence.
