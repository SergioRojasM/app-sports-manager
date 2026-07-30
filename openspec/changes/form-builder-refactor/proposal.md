## Why

The current form templates module ([US-0084](../../../projectspec/userstory/us0084-form-templates-management.md), capability `form-templates-management`) only supports one kind of row in a template: a data-collecting field. Admins have no way to add headings or instructional text between questions, editing happens through generic side-modals and an in-place edit modal instead of a dedicated visual builder, list-row actions are unlabeled text buttons with no preview option, and admins are forced to see/edit an internal machine key (`campo_nombre`) that should be computed for them. [US-0085](../../../projectspec/userstory/us0085-form-builder-refactor.md) refactors the module into a Google-Forms-style, section-based builder so creating a form is visual and low-friction.

## What Changes

- **BREAKING**: `formulario_plantilla_esquema` rows now represent a "sección" with a `seccion_tipo` (`titulo | subtitulo | texto | datos`), not only a data field. `campo_etiqueta` / `campo_nombre` / `campo_tipo` become nullable and are only populated (and required) when `seccion_tipo = 'datos'`; a new `seccion_descripcion` column holds the content for display-only (`titulo`/`subtitulo`/`texto`) sections.
- **BREAKING**: `campo_nombre` is no longer shown or editable in the UI — it is computed automatically from `campo_etiqueta` via slugify, with a numeric suffix on collision.
- The templates list (`FormulariosTable`) replaces text "Editar"/"Eliminar" buttons with icon buttons and adds a new "Previsualizar" (read-only preview) icon action; the inline expand-to-edit campos panel is removed.
- "Editar" now navigates to a new dedicated route, `gestion-formularios/[formulario]/page.tsx`, instead of opening an in-place modal.
- New `FormularioEditorPage`: an inline-auto-saving template header (nombre/descripcion/activo) plus a Google-Forms-style section builder (`FormularioSeccionesBuilder` / `FormularioSeccionCard`) with a pinned "+ Añadir sección de formulario" button. Each section card expands to edit, and collapsing it (not a separate submit) persists the change.
- "Nueva plantilla" becomes create-only (`nombre` + `descripcion`) and redirects into the new editor page on success instead of just closing a modal.
- A stray empty placeholder route, `gestion-formularios/formulario/page.tsx`, is deleted.
- `PortalBreadcrumb` gains a `gestion-formularios` label and stops mislabeling the new plantilla-id path segment with the tenant's name.
- Service/type/hook layer renamed from "Campo" to "Seccion" terminology to match the new domain concept (`createCampo` → `createSeccion`, etc.).

## Capabilities

### New Capabilities
_None — this change extends the existing form-templates module rather than introducing a new one._

### Modified Capabilities
- `form-templates-management`: template fields become typed "secciones" (heading/subtitle/text/data), the internal field key is no longer admin-visible/editable, list actions become icon-based with a new preview capability, and template editing moves from in-place modals to a dedicated per-template editor page.

## Impact

- **Database**: 1 new migration altering `formulario_plantilla_esquema` (2 new columns, 3 relaxed-nullability columns, 3 new check constraints). No changes to `formularios_plantillas`, RLS policies, grants, or triggers.
- **Code**: renames/extends `src/types/portal/formularios.types.ts` and `src/services/supabase/portal/formularios.service.ts`; adds `src/lib/slugify.ts`; replaces `useFormularioEsquema.ts`/`useFormularioCampoForm.ts` with `useFormularioEditor.ts`/`useFormularioSeccionForm.ts` (plus new `useFormularioPlantillaName.ts`); deletes `FormularioCamposPanel.tsx`/`FormularioCampoFormModal.tsx`, adds `FormularioEditorPage.tsx`/`FormularioSeccionesBuilder.tsx`/`FormularioSeccionCard.tsx`/`FormularioPreviewModal.tsx`; adds the `gestion-formularios/[formulario]/page.tsx` route and deletes the stray `gestion-formularios/formulario/page.tsx`; edits `PortalBreadcrumb.tsx`.
- **Dependencies**: none new.
- **Data migration risk**: existing `formulario_plantilla_esquema` rows (if any) are automatically classified as `seccion_tipo = 'datos'` by the new column's default, preserving current behavior with no manual backfill.
- **Out of scope** (unchanged from US-0084): filling out a form as an athlete/coach, attaching templates to trainings, storing submitted answers.
