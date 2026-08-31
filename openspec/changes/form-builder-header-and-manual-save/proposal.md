## Why

The admin-facing form template editor (`gestion-formularios/[formulario]`, US-0084/US-0085) auto-saves every keystroke and toggle directly to Supabase, has no visual header (logo/título/subtítulo/eyebrow/badges) even though registration forms are shown to athletes as the first impression of a training's sign-up flow, only supports free-text/date/numeric/lista/imagen fields, renders sections as a flat list with no card grouping or two-column layout, and only allows appending new fields at the end. This makes the templates look and behave less polished than the rest of the product's public-facing pages, and makes editing a long template noisy (one DB write per field) and risky (a mistaken edit is persisted immediately, with no draft/undo). US-0108 redesigns the builder against the `P43Yo` visual reference and switches it to an explicit, batched save.

## What Changes

- Add an editable "Hero" header — company logo (read from `tenants.logo_url`/`nombre`, not editable here), eyebrow, título, subtítulo, and up to 5 badges — auto-created as 4 fixed rows on every new template and rendered/edited via a dedicated header editor, styled per `P43Yo` (`projectspec/designs/pencil/grit-arena.pen`).
- Add two new "Datos" field types: `checkbox` (boolean) and `seleccion` (single-choice tiles, reusing the existing comma-separated `campo_lista_valores` column).
- Add a two-column layout toggle (`columna_ancho`: `completo`/`mitad`) for "Datos" fields; consecutive `mitad` fields render side by side.
- Add two new section kinds: `seccion` (a numbered, bordered card that visually groups every row that follows it, until the next `seccion` row) and `separador` (a horizontal divider). Grouping is positional (derived from row order), not a parent-child foreign key.
- Add the ability to insert a new field/section between two existing rows, not only at the end.
- **BREAKING (data model)**: `formulario_plantilla_esquema`'s `seccion_tipo` and `campo_tipo` CHECK constraints, and its `seccion_descripcion`/`campo_lista_valores`/`datos_campos` CHECK constraints, are widened to accept the new values above; two new columns (`columna_ancho`, `seccion_subtitulo`) are added. Existing rows/constraints remain valid (additive), so no backfill is required for existing data to keep working, but the editor logic that used to key exclusively off the old 4 `seccion_tipo` values must handle the widened set.
- **BREAKING (editor UX)**: the editor stops writing to the database on every field/checkbox change. All edits (header, plantilla metadata, sections create/update/delete/reorder) accumulate in an in-memory draft; a new "Guardar cambios" button performs the actual persistence in one batched action. `useFormularioEditor`'s public API changes accordingly (adds `isDirty`, `saving`, `saveError`, `saveAll()`; per-section `onSave` callbacks become synchronous local mutators instead of `Promise`-returning Supabase calls).
- Extend the live booking fill-out form (`FormularioRespuestaModal`), its read-only viewer (`FormularioRespuestaViewerModal`), and the responses Excel export to render/format the two new field types and the new section/separator/column layout consistently with the builder and preview.

## Capabilities

### New Capabilities
- `form-template-builder`: Admin authoring surface for form templates — the editable Hero header, the section/field type catalog (including the new `checkbox`, `seleccion`, `seccion`, `separador`, two-column layout, and mid-list insertion), and the manual/batched save lifecycle (draft state, dirty tracking, `Guardar cambios`).

### Modified Capabilities
*(none — no existing `openspec/specs/` capability currently covers the form-templates feature; the live booking fill-out/response-viewing surface introduced by prior US-0084/0085/0087 work was never captured as an OpenSpec capability, so it is folded into the new `form-template-builder` spec above rather than tracked as a modification.)*

## Impact

- **Database**: one new migration on `formulario_plantilla_esquema` (widened CHECK constraints + `columna_ancho` + `seccion_subtitulo` columns). No RLS changes. No changes to `formularios_plantillas` or to the `book_and_deduct_service_units` RPC.
- **Types**: `src/types/portal/formularios.types.ts` — new enum members, new fields on `FormularioSeccion`/`CreateSeccionInput`/`UpdateSeccionInput`/`FormularioSeccionFormValues`, a `HEADER_SECCION_TIPOS` constant.
- **Services**: `src/services/supabase/portal/formularios.service.ts` (`createPlantilla` auto-inserts header rows; new `saveEsquemaBatch`); new lightweight `useTenantLogo` hook mirroring the existing `useTenantName` pattern.
- **Hooks**: `useFormularioEditor` rewritten around a draft/`saveAll()` model; `useFormularioSeccionForm` gains validation for the new field/section kinds.
- **Components**: `FormularioEditorPage`, `FormularioSeccionesBuilder`, `FormularioSeccionCard`, `FormularioSeccionContent`, `FormularioCampoPreviewInput`, `FormularioTipoCampoBadge`, `FormularioPreviewModal` (admin/template side); `FormularioRespuestaModal`, `FormularioRespuestaViewerModal` (live booking side); two new components (`FormularioHeaderEditor`, `FormularioBadgeChipInput`).
- **No API routes change** — everything is client-side Supabase access through the existing service layer.
- **Downstream consumers unaffected**: `entrenamientos.service.ts`'s `formulario_id`/`formulario_obligatorio` attachment flow, `book_and_deduct_service_units`'s required-field validation (already generic over `campo_nombre`/`campo_obligatorio`), and the perfil-requirements feature (US-0095/US-0096) are untouched by this change.
