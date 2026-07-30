## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/form-builder-refactor` from the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/{timestamp}_formulario_esquema_secciones.sql` adding `seccion_tipo varchar(20) not null default 'datos'` and `seccion_descripcion text` to `public.formulario_plantilla_esquema`
- [x] 2.2 In the same migration, relax `campo_etiqueta`, `campo_nombre`, and `campo_tipo` to nullable (`alter column ... drop not null`)
- [x] 2.3 Add the `seccion_tipo` enum check constraint (`titulo | subtitulo | texto | datos`)
- [x] 2.4 Add the conditional `seccion_descripcion` check constraint (required non-empty for display types, must be null for `datos`)
- [x] 2.5 Add the conditional `datos` field-definition check constraint (`campo_etiqueta`/`campo_nombre`/`campo_tipo` required and non-null only when `seccion_tipo = 'datos'`; null for all other types, along with `campo_lista_valores`)
- [x] 2.6 Apply the migration locally only (`supabase db reset` or `supabase migration up` against the local stack) — do not push to the remote/hosted Supabase project
- [x] 2.7 Manually verify in local Supabase Studio: pre-existing `formulario_plantilla_esquema` rows (if any) default to `seccion_tipo = 'datos'` and still satisfy every constraint; RLS behavior is unchanged (admin CRUD, non-admin read-only)

## 3. Utility

- [x] 3.1 Add `src/lib/slugify.ts` exporting `slugify(value: string): string` — lowercase, strip diacritics, replace non-alphanumerics with `_`, collapse repeated `_`, trim leading digits/underscores

## 4. Types

- [x] 4.1 In `src/types/portal/formularios.types.ts`, add `FormularioSeccionTipo` union (`'titulo' | 'subtitulo' | 'texto' | 'datos'`), `FORMULARIO_SECCION_TIPOS`, and `FORMULARIO_SECCION_TIPO_LABELS` (Título/Subtítulo/Texto/Datos)
- [x] 4.2 Rename `FormularioCampo` → `FormularioSeccion` and add `seccion_tipo`/`seccion_descripcion` fields; make `campo_etiqueta`/`campo_nombre`/`campo_tipo`/`campo_lista_valores`/`campo_placeholder` nullable to match the relaxed DB columns
- [x] 4.3 Rename `FormularioPlantillaConCampos` → `FormularioPlantillaConSecciones` (`campos` → `secciones`); rename `FormularioPlantillaListItem.camposCount` → `seccionesCount`
- [x] 4.4 Rename `CreateCampoInput`/`UpdateCampoInput` → `CreateSeccionInput`/`UpdateSeccionInput`, adding `seccion_tipo`/`seccion_descripcion` and making the `campo_*` fields optional (required only conditionally on `seccion_tipo === 'datos'`, enforced in the hook/service, not the type system)
- [x] 4.5 Rename `FormularioCampoFormValues`/`FormularioCampoFormField`/`FormularioCampoFieldErrors` → `FormularioSeccionFormValues`/`FormularioSeccionFormField`/`FormularioSeccionFieldErrors`, dropping `campo_nombre` entirely from the form-values shape

## 5. Service Layer

- [x] 5.1 In `src/services/supabase/portal/formularios.service.ts`, rename `getPlantillaConCampos` → `getPlantillaConSecciones` (returns `secciones` instead of `campos`)
- [x] 5.2 Rename `getCamposByPlantilla` → `getSeccionesByPlantilla`, `createCampo` → `createSeccion`, `updateCampo` → `updateSeccion`, `deleteCampo` → `deleteSeccion`, `reorderCampos` → `reorderSecciones`
- [x] 5.3 Update `createSeccion`/`updateSeccion` to write `seccion_tipo`/`seccion_descripcion` and conditionally null out the `campo_*` columns when `seccion_tipo !== 'datos'` (mirroring the existing conditional `campo_lista_valores` handling)
- [x] 5.4 Extend `mapFormularioError` with a friendly fallback for `23514` check-constraint violations on the new constraints (e.g. "Completa los datos requeridos para esta sección.")

## 6. Hooks

- [x] 6.1 Simplify `src/hooks/portal/formularios/useFormularios.ts`: remove the `editingPlantilla`/edit-modal branch (list "Editar" now navigates instead of opening a modal); keep create + delete flows and the create-only modal open/close handlers
- [x] 6.2 Delete `src/hooks/portal/formularios/useFormularioEsquema.ts` and `src/hooks/portal/formularios/useFormularioCampoForm.ts`
- [x] 6.3 Add `src/hooks/portal/formularios/useFormularioEditor.ts` — loads `getPlantillaConSecciones(plantillaId)` once; exposes plantilla header fields with auto-save (calling `updatePlantilla` on blur/change) and `secciones` state with `addSeccion` (local-only until first collapse), `saveSeccion` (creates or updates depending on whether the card already has a persisted id, computing `campo_nombre` via `slugify` + collision-suffix for `datos` sections before calling the service), `deleteSeccion`, `reorderSecciones`
- [x] 6.4 Add `src/hooks/portal/formularios/useFormularioSeccionForm.ts` — controlled state for one section card's edit mode; validation branches by `seccion_tipo` (non-empty `seccion_descripcion` for display types; `campo_etiqueta`/`campo_tipo`/conditional `campo_lista_valores` for `datos`); no `campo_nombre` field
- [x] 6.5 Add `src/hooks/portal/formularios/useFormularioPlantillaName.ts` — mirrors `useTenantName`, fetches a plantilla's `nombre` by id for the breadcrumb

## 7. Components — List Page

- [x] 7.1 Update `FormulariosTable.tsx`: replace text "Editar"/"Eliminar" buttons with icon buttons (`edit`/`delete`, `material-symbols-outlined`) with descriptive `aria-label`s; add a "Previsualizar" icon button (`visibility`); remove the expand-chevron column and inline `FormularioCamposPanel` row; rename the "Campos" column header to "Secciones"; "Editar" navigates via `useRouter().push()` to `gestion-formularios/{id}`
- [x] 7.2 Update `FormulariosPage.tsx`: after a successful create in `FormularioFormModal`, `router.push` to the new plantilla's editor page instead of closing the modal in place; wire the "Previsualizar" icon to lazy-load `getPlantillaConSecciones` and open `FormularioPreviewModal`
- [x] 7.3 Simplify `FormularioFormModal.tsx` to create-only: drop `mode`/`editingPlantilla`/`activo` props, keep `nombre` (required) + `descripcion` (optional)

## 8. Components — Section Builder and Preview

- [x] 8.1 Delete `FormularioCamposPanel.tsx` and `FormularioCampoFormModal.tsx`
- [x] 8.2 Add `FormularioSeccionCard.tsx` — collapsed mode (per-`seccion_tipo` rendering: heading/subheading/paragraph/disabled input preview, plus hover toolbar with edit/move-up/move-down/delete icons) and expanded mode (type selector first, live-swapped sub-fields below, "Listo" control that validates-then-collapses-and-saves)
- [x] 8.3 Add `FormularioSeccionesBuilder.tsx` — renders the ordered list of `FormularioSeccionCard`s plus the pinned "+ Añadir sección de formulario" button that appends a new card in expanded mode
- [x] 8.4 Add `FormularioEditorPage.tsx` — back link to the list, inline-editable auto-saving header (`nombre`/`descripcion`/`activo`), "Vista previa" button, renders `FormularioSeccionesBuilder`
- [x] 8.5 Add `FormularioPreviewModal.tsx` — read-only render of an ordered `secciones` list (headings/text as static content, `datos` as disabled input previews sized/typed per `campo_tipo`, required-marker when `campo_obligatorio`), no submit control
- [x] 8.6 Update `src/components/portal/formularios/index.ts` barrel exports for the additions/removals above

## 9. Page and Breadcrumb Wiring

- [x] 9.1 Add `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/[formulario]/page.tsx` — `export default async function` reading `tenant_id` and `formulario` from `params`, rendering `<FormularioEditorPage tenantId={tenantId} plantillaId={formulario} />`
- [x] 9.2 Delete the stray placeholder `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/formulario/page.tsx`
- [x] 9.3 Update `src/components/portal/PortalBreadcrumb.tsx`: add `'gestion-formularios': 'Formularios'` to `SLUG_LABELS`; change the UUID-segment logic so only the first UUID segment (immediately after `orgs`) uses `tenantName`, and any later UUID segment uses `useFormularioPlantillaName`

## 10. Verification

- [x] 10.1 Manually test: create a template from the list → redirected into its (empty) editor page
- [x] 10.2 Manually test: add one section of each type (Título, Subtítulo, Texto, Datos); confirm the edit form swaps live when changing `seccion_tipo`; confirm collapsing a valid section persists it (reload the page and confirm it's still there) and an invalid one stays expanded with an inline error
- [x] 10.3 Manually test: give two `datos` sections the same `campo_etiqueta` and confirm the second gets a suffixed `campo_nombre` (verify in Supabase Studio, since it's never shown in the UI)
- [x] 10.4 Manually test: reorder sections via move-up/move-down and confirm persistence after reload; delete a section and confirm only it is removed
- [x] 10.5 Manually test: add a new section, then delete it (or navigate away) before collapsing it, and confirm no row was written
- [x] 10.6 Manually test: "Vista previa" from the editor page and "Previsualizar" from the list both render the same read-only section list with no way to submit
- [x] 10.7 Manually test: breadcrumb on both `gestion-formularios` and `gestion-formularios/{id}` shows the correct labels ("Formularios", then the template's own name)
- [x] 10.8 Manually test: non-admin (usuario/entrenador) is redirected from both routes, and reads still succeed for non-admins via the API
- [x] 10.9 Confirm no regressions in sibling admin pages (`gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`)

## 11. Documentation

- [x] 11.1 Update `projectspec/03-project-structure.md` to reflect the new `gestion-formularios/[formulario]` route and the renamed/added `formularios` feature-slice files (types, service, hooks, components), following the existing `gestion-formularios` entry as the format reference

## 12. Commit and Pull Request

- [ ] 12.1 Write a commit message summarizing the section-based form builder refactor (migration, renamed types/service/hooks, new editor page and components, icon-based list actions, breadcrumb fix)
- [ ] 12.2 Write a pull request description covering: why (US-0085), what changed (including the **BREAKING** schema/type/service renames), database migration notes (local-only, not yet pushed to remote), and a manual test plan checklist derived from section 10
