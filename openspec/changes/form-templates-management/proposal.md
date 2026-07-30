## Why

Tenant administrators need a way to define reusable form templates (name, description, and a structured list of fields with type, label, internal key, required flag, and order) so that future user stories can attach these templates to trainings and render dynamic data-collection forms (medical waivers, check-in surveys, equipment sign-off, etc.). Today the route `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/page.tsx` exists only as an empty 0-byte placeholder — there is no database schema, service, or UI for form templates at all.

## What Changes

- Add two new tables: `formularios_plantillas` (tenant-scoped template metadata) and `formulario_plantilla_esquema` (ordered field definitions per template), with RLS following the existing `servicios` catalog pattern (open `SELECT`, admin-only `INSERT`/`UPDATE`/`DELETE` via `get_admin_tenants_for_authenticated_user()`).
- Add a `formularios.service.ts` service layer exposing CRUD for both templates and fields, plus a `reorderCampos` bulk-update helper.
- Add hooks (`useFormularios`, `useFormularioForm`, `useFormularioEsquema`, `useFormularioCampoForm`) following the `useServicios`/`useNivelesDisciplina` pattern: parent list + CRUD, and per-template expandable child-field CRUD.
- Add components (`FormulariosPage`, `FormulariosTable`, `FormularioFormModal`, `FormularioCamposPanel`, `FormularioCampoFormModal`, `FormularioTipoCampoBadge`) reusing the existing right-side slide-modal and collapsible-panel UI patterns already established by `gestion-servicios` and `gestion-disciplinas` — no new design/mockup is required since this module intentionally mirrors those two admin catalogs pixel-for-pixel in layout and interaction.
- Replace the empty placeholder page with `<FormulariosPage tenantId={tenantId} />`.
- Add a "Formularios" entry to the admin sidebar menu (`ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`), positioned after "Servicios".
- Client-side UX addition: `campo_nombre` (the internal snake_case field key) auto-suggests from `campo_etiqueta` as the admin types, while remaining a distinct, independently editable, DB-validated column.

**Non-breaking**: this is a net-new module; it does not modify any existing table, route, or component behavior.

## Capabilities

### New Capabilities
- `form-templates-management`: Admin CRUD for form templates (`formularios_plantillas`) and their field definitions (`formulario_plantilla_esquema`), including field-type-driven validation (e.g. conditional list values) and tenant-admin-only write access.

### Modified Capabilities
_None — no existing capability's requirements change. `portal-role-navigation` gains a new menu entry, but its existing requirements (role-based menu resolution logic) are unchanged; this is additive data, not a behavior change, so no delta spec is needed._

## Impact

- **Database**: 2 new tables, 2 new RLS policy sets, 2 new triggers, 2 new indexes. No changes to existing tables.
- **Code**: new files only under `src/types/portal/formularios.types.ts`, `src/services/supabase/portal/formularios.service.ts`, `src/hooks/portal/formularios/*`, `src/components/portal/formularios/*`; one placeholder file replaced (`gestion-formularios/page.tsx`); one existing file edited (`src/types/portal.types.ts` — add one menu item array entry).
- **Dependencies**: none new; reuses existing Supabase client, `get_admin_tenants_for_authenticated_user()`, and `set_updated_at()` trigger function.
- **Out of scope** (deferred to a future US per the source User Story): any screen where a form is actually filled out, attaching templates to trainings, and storing submitted answers.
