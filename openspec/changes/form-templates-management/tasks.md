## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/form-templates-management` from the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Confirm the exact origin/name of the existing `set_updated_at()` trigger function before referencing it in the new migration
- [x] 2.2 Create `supabase/migrations/{timestamp}_formularios_plantillas.sql` with the `formularios_plantillas` table, its indexes, RLS policies (SELECT open, INSERT/UPDATE/DELETE admin-only via `get_admin_tenants_for_authenticated_user()`), and `updated_at` trigger
- [x] 2.3 Extend the same migration with the `formulario_plantilla_esquema` table (including `campo_nombre` format check, `campo_tipo` enum check, conditional `campo_lista_valores` check, unique `(formulario_plantilla_id, campo_nombre)`), its indexes, RLS policies, and `updated_at` trigger
- [x] 2.4 Apply the migration locally only (e.g. `supabase db reset` or `supabase migration up` against the local stack) — do not push to the remote/hosted Supabase project
- [x] 2.5 Manually verify RLS in local Supabase Studio: administrador can CRUD both tables; usuario/entrenador can read but not write

## 3. Types

- [x] 3.1 Add `src/types/portal/formularios.types.ts`: `FormularioPlantilla`, `FormularioCampo`, `FormularioTipoCampo` union (`fecha | texto_corto | texto_largo | numerico | imagen | lista`), `FormularioPlantillaConCampos`, `CreatePlantillaInput`, `UpdatePlantillaInput`, `CreateCampoInput`, `UpdateCampoInput`, form-values types, and `FormularioServiceError` class

## 4. Service Layer

- [x] 4.1 Add `src/services/supabase/portal/formularios.service.ts` with `getPlantillasByTenant`, `getPlantillaConCampos`, `createPlantilla`, `updatePlantilla`, `deletePlantilla`
- [x] 4.2 Add `getCamposByPlantilla`, `createCampo`, `updateCampo`, `deleteCampo`, `reorderCampos` to the same service
- [x] 4.3 Implement Postgres error-code mapping (`23505` duplicate, `23503` FK violation, `42501` forbidden) into `FormularioServiceError`, following `serviciosService`'s `mapServicioError` pattern

## 5. Hooks

- [x] 5.1 Add `src/hooks/portal/formularios/useFormularios.ts` — list + CRUD + modal coordination for plantillas (mirrors `useServicios.ts`)
- [x] 5.2 Add `src/hooks/portal/formularios/useFormularioForm.ts` — controlled form state for the plantilla modal (`nombre`, `descripcion`, `activo`)
- [x] 5.3 Add `src/hooks/portal/formularios/useFormularioEsquema.ts` — list + CRUD for a selected plantilla's campos (mirrors `useNivelesDisciplina.ts`)
- [x] 5.4 Add `src/hooks/portal/formularios/useFormularioCampoForm.ts` — controlled form state for the campo modal, including conditional `campo_lista_valores` validation and `campo_etiqueta` → `campo_nombre` slugify-on-type (create mode only, stops once the admin manually edits `campo_nombre`)

## 6. Components

- [x] 6.1 Add `src/components/portal/formularios/FormulariosPage.tsx` — main page container
- [x] 6.2 Add `src/components/portal/formularios/FormulariosTable.tsx` — table with nombre, descripcion, field count, activo badge, actions
- [x] 6.3 Add `src/components/portal/formularios/FormularioFormModal.tsx` — right-side slide modal, create/edit plantilla
- [x] 6.4 Add `src/components/portal/formularios/FormularioCamposPanel.tsx` — collapsible per-row panel listing campos in `orden` sequence with add/edit/delete/reorder actions
- [x] 6.5 Add `src/components/portal/formularios/FormularioCampoFormModal.tsx` — right-side slide modal, create/edit campo, with conditional `campo_lista_valores` textarea and `campo_nombre` auto-slug behavior
- [x] 6.6 Add `src/components/portal/formularios/FormularioTipoCampoBadge.tsx` — badge mapping `campo_tipo` to a human-readable Spanish label/icon
- [x] 6.7 Add `src/components/portal/formularios/index.ts` barrel export

## 7. Page and Navigation Wiring

- [x] 7.1 Replace the empty placeholder at `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/page.tsx` with `export default async function` reading `tenant_id` from `params` and rendering `<FormulariosPage tenantId={tenantId} />`, mirroring `gestion-servicios/page.tsx`
- [x] 7.2 Add `{ label: 'Formularios', path: 'gestion-formularios', icon: 'description' }` to `ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`, after `'Servicios'`

## 8. Verification

- [x] 8.1 Manually test: create/edit/delete a template, including the duplicate-name error path
- [x] 8.2 Manually test: create each of the 6 field types, including "Lista" with values and its empty-value validation error
- [x] 8.3 Manually test: duplicate `campo_nombre` error path, `campo_nombre` auto-slugify while typing `campo_etiqueta`, and manual-override behavior
- [x] 8.4 Manually test: empty-state rendering when a tenant has no templates
- [x] 8.5 Manually test: non-admin (usuario/entrenador) is redirected from the route, and confirm reads still succeed for non-admins via the API
- [x] 8.6 Confirm no regressions in sibling admin pages (`gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`)

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` to add the `gestion-formularios` route, the `formularios` component/hook/service/type feature slice entries, and the new admin menu item — following the existing entries for `gestion-servicios`/`servicios` as the format reference

## 10. Commit and Pull Request

- [x] 10.1 Write a commit message summarizing the new form templates admin module (migration, types, service, hooks, components, page, menu entry, docs)
- [x] 10.2 Write a pull request description covering: why (US-0084), what changed, database migration notes (local-only, not yet pushed to remote), and a manual test plan checklist derived from section 8
