## Why

Trainings today can only carry a bare external form URL (`formulario_externo`, added ad hoc in an earlier migration) with no way to require it, and no way to reuse the structured form-template module (`formularios_plantillas` / `formulario_plantilla_esquema`) shipped in US-0084/US-0085. Administrators who already built internal templates in `gestion-formularios` have no way to attach one to a training — they can only paste an external link. This change lets any training (single or recurring) optionally require either an external link or an internal template before booking, closing the gap between the two previously-independent modules.

## What Changes

- Add `formulario_id` (uuid, FK to `formularios_plantillas.id`) and `formulario_obligatorio` (boolean) to both `public.entrenamientos` and `public.entrenamientos_grupo`. `formulario_externo` (existing column) is reused unchanged for the external case.
- Add two check constraints per table: `formulario_id` and `formulario_externo` are mutually exclusive, and `formulario_obligatorio` can only be `true` when one of them is set.
- Replace the always-visible "Formulario externo" input in the training create/edit wizard with a new collapsible "Formulario" section offering: enable/disable toggle → external-vs-internal toggle → (URL input | tenant-scoped template `<select>` + "crear nueva plantilla" link, admin-only) → "obligatorio" checkbox.
- Generalize the existing form display (link) in the training detail modal, the calendar/list card, and the booking panel to also render the internal-template case (template name + read-only preview via the existing `FormularioPreviewModal`), plus an "Obligatorio" indicator.
- Persist `formulario_tipo` (`'ninguno' | 'externo' | 'interno'`) and `formulario_obligatorio` into a training template's JSON snapshot (`entrenamiento_plantillas.contenido`) when saved as a reusable template — but never the selected `formulario_id`, so applying a saved template never silently reuses a specific internal template reference.
- No changes to the `formularios_plantillas` module itself (US-0084/US-0085) — its service/hooks/components are reused as-is.
- Not breaking: additive columns with safe defaults (`formulario_id = null`, `formulario_obligatorio = false`); all existing `formulario_externo`-only trainings keep working unchanged.

## Capabilities

### New Capabilities
- `training-form-attachment`: lets a training (single instance or recurring series) optionally require an external URL or an internal form template to book, surfaced consistently across the create/edit wizard, the detail view, the list/calendar card, and the booking panel, and preserved (minus the specific template selection) when saved as a training template.

### Modified Capabilities
_None._ `training-management` (the create/edit wizard) and `training-booking` (the reservation panel) gain new, additive UI/data surfaces from this change, but none of their existing requirements' behavior changes — same precedent as US-0084, which added a sidebar menu entry without a delta spec because it was additive data, not a behavior change to `portal-role-navigation`.

## Impact

- **Database**: 2 new columns + 2 new FKs + 4 new check constraints + 2 new indexes, split across `entrenamientos` and `entrenamientos_grupo`. No changes to `formularios_plantillas` or `formulario_plantilla_esquema`.
- **Code**: `entrenamientos.types.ts`, `entrenamiento-plantillas.types.ts`, `entrenamientos.service.ts`, `useEntrenamientoForm.ts`, `useEntrenamientos.ts`, `EntrenamientoWizard.tsx` (removal), new `EntrenamientoFormularioSection.tsx`, `EntrenamientoFormModal.tsx`, `EntrenamientosPage.tsx`, `EntrenamientoDetalleModal.tsx`, `EntrenamientosList.tsx`, `ReservasPanel.tsx`. `formularios.service.ts` and `FormularioPreviewModal.tsx` are reused unchanged.
- **Design**: no new visual design/mockup needed — the new section reuses the exact card/toggle pattern already established by `EntrenamientoCategoriasSection.tsx` ("¿Usar categorías?"), and the form display in detail/list/booking views generalizes the markup already shipped for `formulario_externo`.
- **Dependencies**: none new; reuses the existing `formulariosService.getPlantillasByTenant` / `getPlantillaConSecciones` and `FormularioPreviewModal` from US-0084/US-0085.
- **Out of scope** (deferred, consistent with US-0084/US-0085): any screen where a form is actually filled out; enforcing `formulario_obligatorio` by blocking the "Reservar" action; DB-level cross-tenant guarantee on `formulario_id` (enforced only by the tenant-scoped picker, matching the existing `disciplina_id`/`escenario_id`/`entrenador_id` pattern).
