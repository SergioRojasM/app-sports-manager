# US-0071 — View Training Detail (Including Past Trainings) and Save as Template

## ID
US-0071

## Name
View Training Detail (Including Past Trainings) and Save as Template

## As a
Tenant member (athlete, trainer, or administrator) viewing a training from "Gestión de Entrenamientos"

## I Want
To open a read-only "Ver entrenamiento" detail view for any training instance — including past/historical ones — that shows its full configuration (basic info, schedule/recurrence, categorías por nivel, and restricciones de reserva), and, if I'm a trainer/admin, to save that configuration as a reusable template directly from this view

## So That
I can review exactly how a training (including ones that already happened) was configured, and quickly reuse a known-good configuration for a new training without re-entering every field manually

---

## Description

### Current State

- `EntrenamientoActionModal` (`src/components/portal/entrenamientos/EntrenamientoActionModal.tsx`) currently offers: "Ver reservas" (all users), "Editar" and "Eliminar" (trainers/admins only, both disabled for historical trainings via `selectedActionContext.canEdit`/`canDelete` computed in `EntrenamientosPage.tsx:169-191`).
- There is no read-only way to see a training's full configuration (categorías por nivel, restricciones de reserva with service requirements, antelación values, recurrence schedule). The only place this detail is currently visible is the edit form (`EntrenamientoFormModal`), which is fully editable and explicitly blocked for historical trainings (`isHistoricalTraining()` guard in `useEntrenamientos.ts:195-200`, enforced in `requestEditInstance` at `useEntrenamientos.ts:489-507`).
- US-0069 added "Guardar como plantilla" (save as template), but only from the create-mode form, snapshotting the form's *current* in-progress values via `form.buildPlantillaContenido()` (`useEntrenamientoForm.ts:477-514`). There is no way to save an *existing* (past or current) training's configuration as a template directly.

### Proposed Changes

**1. New "Ver detalle" action (available for ANY training, including historical)**

- In `EntrenamientoActionModal.tsx`, add a new button "Ver detalle" / "Ver entrenamiento", placed first in the action list (above "Ver reservas"). It is shown to **all users** (`canManage` true or false) and is **never disabled**, regardless of `isHistoricalTraining`.
- Add prop `onViewDetail: () => void` to `EntrenamientoActionModalProps` and render the button unconditionally (mirroring the existing `onViewReservas` button styling, but always present — not optional).

**2. New read-only modal `EntrenamientoDetalleModal.tsx`**

New file: `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx`. Same right-side slide-over shell pattern as `EntrenamientoFormModal` (`aside` with `role="dialog"`, `aria-modal="true"`, ESC-to-close, backdrop click-to-close — reuse the same `useEffect` ESC-listener pattern from `EntrenamientoFormModal.tsx:130-141`), but entirely read-only (no inputs, no add/remove/duplicate controls).

Sections to render, in order:

- **Basic info**: `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, disciplina (resolved label), escenario (resolved label), entrenador (resolved label or "Sin asignar" if `entrenador_id` is null), `duracion_minutos`, `cupo_maximo`, `visibilidad`. For the visibilidad badge, export the local `VisibilidadBadge` function from `EntrenamientosList.tsx` (currently defined at `EntrenamientosList.tsx:3`, not exported) and reuse it here, instead of duplicating the markup.

- **Horario / Recurrencia** (read-only, informational only — NOT part of the saved template payload, mirroring US-0069's exclusion of scheduling fields):
  - If the instance has no `entrenamiento_grupo_id` (standalone `unico` training): show its `fecha_hora` formatted as date + time (reuse `toDateTimeLocalInBogota` from `useEntrenamientos.ts:165`, or a display-friendly variant).
  - If the instance belongs to a group (`entrenamiento_grupo_id` set, `relatedGroup` resolved): show the group's `tipo`, `fecha_inicio`/`fecha_fin`, `dias_semana` (translate the `0-6` indices to weekday names — add a small `WEEKDAY_LABELS` lookup array), `repetir_cada_semanas`, and each rule's `tipo_bloque`/`hora_inicio`/`hora_fin`/`horas_especificas` from `TrainingGroupWithDetails.reglas`, plus this specific instance's own `fecha_hora`.

- **Categorías por nivel** (rendered only if `categorias.length > 0`): list/table of nivel name → `cupos_asignados`, resolved by matching each `categoria.nivel_id` against `niveles` (fetched via `nivelDisciplinaService.getNivelesDisciplina(tenantId, instance.disciplina_id)`). If a `categoria.nivel_id` has no match in `niveles` (level was deactivated/deleted since), display "Nivel no disponible" as a fallback label rather than failing.

- **Restricciones de reserva** (rendered only if `restricciones.length > 0` OR `reserva_antelacion_horas != null` OR `cancelacion_antelacion_horas != null`): show `reserva_antelacion_horas` / `cancelacion_antelacion_horas`, and for each restriction row: `usuario_estado`, `validar_nivel_disciplina`, `descripcion`, and resolved labels for `servicio_1_id`–`servicio_4_id` (look up against the `servicios: SelectOption[]` already loaded by `useEntrenamientos`). Reuse the existing label/formatting conventions from `EntrenamientoRestriccionesSection.tsx` where practical, but this section must contain no inputs and no add/remove/duplicate controls.

- **Empty states**: if "Categorías por nivel" has no rows, render a short "Sin configuración de categorías" message instead of an empty table. If "Restricciones de reserva" has no rows and both antelación values are `null`, render "Sin restricciones configuradas" instead of an empty list.

- **Loading state**: basic info and recurrence info come directly from `instance`/`relatedGroup` and render immediately. While `viewLoading` is `true` (categorias/restricciones/niveles still fetching), show a small loading indicator in place of the "Categorías por nivel" and "Restricciones de reserva" sections.

- **Footer**:
  - "Guardar como plantilla" button — visible **only when `canManage` is `true`** (mirrors the RLS rule that only trainer/admin can INSERT into `entrenamiento_plantillas`). Disabled while `viewLoading` is `true`.
  - "Cerrar" button — always available, closes the modal via `onClose`.

**3. Hook changes — `useEntrenamientos.ts`**

Add new state:
```ts
type ViewTarget = {
  instance: TrainingInstance;
  relatedGroup: TrainingGroupWithDetails | null;
  categorias: EntrenamientoCategoria[];
  restricciones: EntrenamientoRestriccion[];
  niveles: NivelDisciplina[];
};
const [viewTarget, setViewTarget] = useState<ViewTarget | null>(null);
const [isViewModalOpen, setIsViewModalOpen] = useState(false);
const [viewLoading, setViewLoading] = useState(false);
```

Add new function `requestViewInstance(instance: TrainingInstance)`:
- Does **NOT** call `isHistoricalTraining()` — must work for any instance, past or future.
- Resolves `relatedGroup = instance.entrenamiento_grupo_id ? groupsById.get(instance.entrenamiento_grupo_id) ?? null : null`.
- Immediately sets `viewTarget = { instance, relatedGroup, categorias: [], restricciones: [], niveles: [] }`, `isViewModalOpen = true`, `viewLoading = true` (so basic info/recurrence render instantly).
- Fetches in parallel (`Promise.all`, each with its own `.catch(() => [])` fallback, mirroring the existing pattern at `useEntrenamientos.ts:682-703`):
  - `entrenamientoCategoriasService.getEntrenamientoCategorias(instance.id)`
  - `entrenamientosService.getInstanceRestrictions(tenantId, instance.id)` — map rows the same way `prepareEditFromInstance` does (lines 684-696), including `descripcion`/`servicio_1_id`–`servicio_4_id`
  - `nivelDisciplinaService.getNivelesDisciplina(tenantId, instance.disciplina_id)`
- On settle, merges the three results into `viewTarget` and sets `viewLoading = false`.

Add new function `closeViewModal()`: sets `isViewModalOpen = false` and `viewTarget = null` (so reopening for a different training never briefly shows stale data).

Add new module-level helper `buildPlantillaContenidoFromInstance(instance: TrainingInstance, categorias: EntrenamientoCategoria[], restricciones: EntrenamientoRestriccion[]): EntrenamientoPlantillaContenido`, placed alongside the existing `toCategoriasFormState` helper, mapping fields exactly as `form.buildPlantillaContenido()` does (`useEntrenamientoForm.ts:477-514`) but sourced from `TrainingInstance`/`EntrenamientoCategoria[]`/`EntrenamientoRestriccion[]` instead of live form state — e.g.:
```ts
function buildPlantillaContenidoFromInstance(
  instance: TrainingInstance,
  categorias: EntrenamientoCategoria[],
  restricciones: EntrenamientoRestriccion[],
): EntrenamientoPlantillaContenido {
  return {
    version: 1,
    nombre: instance.nombre,
    descripcion: instance.descripcion ?? '',
    punto_encuentro: instance.punto_encuentro ?? '',
    formulario_externo: instance.formulario_externo ?? '',
    disciplina_id: instance.disciplina_id,
    escenario_id: instance.escenario_id,
    entrenador_id: instance.entrenador_id ?? '',
    duracion_minutos: instance.duracion_minutos != null ? String(instance.duracion_minutos) : '',
    cupo_maximo: instance.cupo_maximo != null ? String(instance.cupo_maximo) : '',
    visibilidad: instance.visibilidad ?? 'privado',
    categorias: {
      enabled: categorias.length > 0,
      items: categorias.map((c) => ({ nivel_id: c.nivel_id, cupos_asignados: c.cupos_asignados })),
    },
    restricciones: {
      reserva_antelacion_horas: instance.reserva_antelacion_horas,
      cancelacion_antelacion_horas: instance.cancelacion_antelacion_horas,
      items: restricciones.map((r, i) => ({
        usuario_estado: r.usuario_estado,
        plan_id: r.plan_id,
        disciplina_id: r.disciplina_id,
        validar_nivel_disciplina: r.validar_nivel_disciplina,
        orden: i + 1,
        descripcion: r.descripcion,
        servicio_1_id: r.servicio_1_id,
        servicio_2_id: r.servicio_2_id,
        servicio_3_id: r.servicio_3_id,
        servicio_4_id: r.servicio_4_id,
      })),
    },
  };
}
```

**Reuse existing template-save plumbing** (`plantillas = useEntrenamientoPlantillas()`, already instantiated in `useEntrenamientos.ts`):
- Add `const plantillaContenidoSourceRef = useRef<'form' | 'view'>('form')`.
- Wrap the existing `onOpenGuardarPlantillaModal` (passed to `EntrenamientoFormModal`) so it sets `plantillaContenidoSourceRef.current = 'form'` before calling `plantillas.openSaveModal()`.
- Add a new returned function `onOpenGuardarPlantillaModalFromView()` that sets `plantillaContenidoSourceRef.current = 'view'` before calling `plantillas.openSaveModal()`.
- Modify the existing `onGuardarPlantilla(nombre, descripcion)` handler: if `plantillaContenidoSourceRef.current === 'view'` and `viewTarget` is set, build `contenido = buildPlantillaContenidoFromInstance(viewTarget.instance, viewTarget.categorias, viewTarget.restricciones)`; otherwise keep the current `form.buildPlantillaContenido()` behavior. Both branches call `plantillas.createPlantilla({ tenantId, nombre, descripcion, contenido })` as today.
- `isGuardarPlantillaModalOpen`, `isSavingPlantilla`, `guardarPlantillaError`, `onCloseGuardarPlantillaModal` are reused unchanged (already generic, not form-specific). Both `EntrenamientoFormModal` and `EntrenamientoDetalleModal` render their own `<GuardarPlantillaModal>` bound to these same shared props — only one parent modal is open at a time, so there is no state collision.

Export from the hook's return object: `viewTarget`, `isViewModalOpen`, `viewLoading`, `requestViewInstance`, `closeViewModal`, `onOpenGuardarPlantillaModalFromView`.

**4. `EntrenamientosPage.tsx` wiring**

- Add `entrenadorNameById` and `servicioNameById` lookup maps using the same `reduce` pattern as `disciplineNameById`/`scenarioNameById` (`EntrenamientosPage.tsx:155-167`), built from `entrenadores`/`servicios` (already returned by `useEntrenamientos` and already destructured/used for the form modal at lines 359-377).
- Add `onViewDetail={() => { if (selectedInstanceForAction) { requestViewInstance(selectedInstanceForAction); closeActionModal(); } }}` to `<EntrenamientoActionModal>`.
- Render `<EntrenamientoDetalleModal>` near the other modals, passing: `open={isViewModalOpen}`, `viewTarget`, `viewLoading`, `canManage`, the lookup maps (`disciplineNameById`, `scenarioNameById`, `entrenadorNameById`, `servicioNameById`), `onClose={closeViewModal}`, plus the shared template-save props (`isGuardarPlantillaModalOpen`, `isSavingPlantilla`, `guardarPlantillaError`, `onOpenGuardarPlantillaModal={onOpenGuardarPlantillaModalFromView}`, `onCloseGuardarPlantillaModal`, `onGuardarPlantilla`), so `EntrenamientoDetalleModal` can render its own `<GuardarPlantillaModal>` instance (same component used by `EntrenamientoFormModal`).

---

## Database Changes

None. This feature is read-only against existing tables (`entrenamiento_grupos`, `entrenamientos`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `entrenamiento_grupo_categorias`, `entrenamiento_grupo_restricciones`, `nivel_disciplina`) and reuses the existing `entrenamiento_plantillas` table + RLS policies from `supabase/migrations/20260614000100_entrenamiento_plantillas.sql` for "Guardar como plantilla".

---

## API / Server Actions

No new service functions required — all reused as-is:

- `entrenamientoCategoriasService.getEntrenamientoCategorias(entrenamientoId: string): Promise<EntrenamientoCategoria[]>` — `src/services/supabase/portal/entrenamiento-categorias.service.ts`
- `entrenamientosService.getInstanceRestrictions(tenantId: string, entrenamientoId: string)` — `src/services/supabase/portal/entrenamientos.service.ts:1041`
- `nivelDisciplinaService.getNivelesDisciplina(tenantId: string, disciplinaId: string): Promise<NivelDisciplina[]>` — `src/services/supabase/portal/nivel-disciplina.service.ts:34`
- `entrenamientoPlantillasService.create(input: CreateEntrenamientoPlantillaInput): Promise<EntrenamientoPlantilla>` (via `useEntrenamientoPlantillas().createPlantilla`) — `src/services/supabase/portal/entrenamiento-plantillas.service.ts`

All four already have RLS policies in place: SELECT for any tenant member (categorias/restricciones/niveles — no temporal restriction), and INSERT for trainer/admin only (plantillas) — which matches the `canManage`-gated "Guardar como plantilla" button.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx` | New read-only training detail modal (basic info, recurrence, categorías, restricciones, footer with "Guardar como plantilla" + "Cerrar") |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | Add `onViewDetail` prop + always-visible "Ver detalle" button |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Export `VisibilidadBadge` for reuse in the new detail modal |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Wire `EntrenamientoDetalleModal`, `onViewDetail`, `entrenadorNameById`/`servicioNameById` maps |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Add `viewTarget`, `isViewModalOpen`, `viewLoading`, `requestViewInstance`, `closeViewModal`, `buildPlantillaContenidoFromInstance`, `onOpenGuardarPlantillaModalFromView`, `plantillaContenidoSourceRef`, updated `onGuardarPlantilla` |

---

## Acceptance Criteria

1. Selecting "Ver detalle" from `EntrenamientoActionModal` opens `EntrenamientoDetalleModal` for **both future and past (historical)** trainings — including ones where "Editar"/"Eliminar" are disabled.
2. The modal shows, immediately on open: `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, resolved disciplina/escenario/entrenador names, `duracion_minutos`, `cupo_maximo`, and `visibilidad` — without waiting for any async fetch.
3. While categorias/restricciones/niveles are loading (`viewLoading === true`), the "Categorías por nivel" and "Restricciones de reserva" sections show a loading indicator; once loaded, "Categorías por nivel" shows each configured nivel's name and `cupos_asignados` (or "Nivel no disponible" if the nivel was deactivated/removed), and "Restricciones de reserva" shows `reserva_antelacion_horas`/`cancelacion_antelacion_horas` plus each row's `usuario_estado`, `validar_nivel_disciplina`, `descripcion`, and resolved `servicio_1_id`–`servicio_4_id` names.
4. If a training has no categorias configured and no restrictions/antelación values, both sections show their respective empty-state message ("Sin configuración de categorías" / "Sin restricciones configuradas") instead of empty tables.
5. For a recurring (group-based) training, the modal additionally shows the group's recurrence schedule (`tipo`, días de semana, `repetir_cada_semanas`, reglas de horario, `fecha_inicio`/`fecha_fin`) plus this instance's own `fecha_hora`. For a standalone (`unico`) training, only its own `fecha_hora` is shown.
6. The modal is entirely read-only: no input fields and no add/remove/duplicate controls anywhere in the modal.
7. "Guardar como plantilla" is visible in the footer **only** when the current user `canManage` is `true` (trainer/admin); it is not rendered for athlete users.
8. Clicking "Guardar como plantilla" from the detail view opens the same `GuardarPlantillaModal` used by the create form; entering a `nombre` (and optional `descripcion`) and saving creates a row in `entrenamiento_plantillas` whose `contenido` matches the displayed configuration (Section-1 fields + categorías + restricciones), **excluding** scheduling/recurrence fields — consistent with US-0069.
9. A template saved from a **past** training can subsequently be applied via "Usar plantilla" when creating a new training, populating Section 1, categorías, and restricciones exactly as it would for a template saved from the create form (no regression to US-0069 behavior).
10. Saving as a template from the view does not modify the viewed training in any way — it is purely additive (new `entrenamiento_plantillas` row only).
11. "Ver detalle" remains available and functions identically regardless of `canManage` (athletes can open and read the same detail view, minus the "Guardar como plantilla" button).
12. Closing the modal (ESC, backdrop click, or "Cerrar" button) resets `viewTarget` to `null` and `isViewModalOpen` to `false`, so reopening for a different training never briefly shows stale data.

---

## Implementation Steps

- [ ] Add `viewTarget`/`isViewModalOpen`/`viewLoading` state and `requestViewInstance`/`closeViewModal` to `useEntrenamientos.ts`
- [ ] Add `buildPlantillaContenidoFromInstance` helper and wire `plantillaContenidoSourceRef` + `onOpenGuardarPlantillaModalFromView` into the existing `onGuardarPlantilla`/`plantillas` plumbing
- [ ] Export `VisibilidadBadge` from `EntrenamientosList.tsx`
- [ ] Create `EntrenamientoDetalleModal.tsx` (basic info, recurrence info, categorías, restricciones, empty states, footer)
- [ ] Add `onViewDetail` prop + "Ver detalle" button to `EntrenamientoActionModal.tsx`
- [ ] Wire everything in `EntrenamientosPage.tsx`, including `entrenadorNameById`/`servicioNameById` maps
- [ ] Verify RLS: confirm `getEntrenamientoCategorias`/`getInstanceRestrictions`/`getNivelesDisciplina` SELECT policies allow any tenant member (athletes) to read this data for historical trainings
- [ ] Test manually: view detail for a future training, a past training, a recurring-group instance, a standalone training, one with no categorías/restricciones, save-as-template from a past training, then apply that template when creating a new training
- [ ] Update `projectspec/03-project-structure.md` with the new component and hook additions

---

## Non-Functional Requirements

- **Security**: "Guardar como plantilla" button only rendered when `canManage` is `true`; the underlying INSERT is already protected by the `entrenamiento_plantillas` RLS policy (trainer/admin only) from `20260614000100_entrenamiento_plantillas.sql`, so even a manipulated client request would be rejected for non-managers.
- **Performance**: The three detail fetches (categorias, restricciones, niveles) run in parallel via `Promise.all`; each is a small, indexed query already used elsewhere (`prepareEditFromInstance`), so no new indexes are needed.
- **Accessibility**: Modal uses `role="dialog"` / `aria-modal="true"` / `aria-label`, consistent with `EntrenamientoFormModal`; ESC key and backdrop click close the modal (matching the existing pattern).
- **Error handling**: If any of the three detail fetches fails, default to an empty array for that section (consistent with the existing `.catch(() => form.setRestricciones([]))` pattern) rather than blocking the whole modal; "Guardar como plantilla" failures surface via `guardarPlantillaError` in `GuardarPlantillaModal`, same as the existing create-mode flow.
