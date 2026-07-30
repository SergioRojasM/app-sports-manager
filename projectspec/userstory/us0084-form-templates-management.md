# US-0084 — Form Templates Management

## ID
US-0084

## Name
Admin Form Templates Module (formularios_plantillas + esquema)

## As a
Tenant administrator

## I Want
To create and manage reusable form templates (plantillas de formularios) for my organization, defining each template's fields (label, internal key, data type, allowed list values, required flag, and order)

## So That
These templates can later be attached to trainings (in a separate, upcoming user story) to collect structured data (e.g. medical waivers, check-in surveys, equipment sign-off) from athletes, with the UI able to render the right input control automatically based on each field's type

---

## Description

### Current State
- The route `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/page.tsx` exists as an **empty placeholder file** (0 bytes) — it is not wired to any component and does not appear in the admin sidebar menu (`ROLE_TENANT_ITEMS.administrador` in [portal.types.ts](../../src/types/portal.types.ts)).
- There is no database table for form templates or form fields. The closest existing patterns in the schema are:
  - `public.entrenamiento_plantillas` (`supabase/migrations/20260614000100_entrenamiento_plantillas.sql`) — a simple tenant-scoped template table storing a JSONB blob, used for training templates. Not reusable here because we need a **structured, queryable schema of fields** (not a JSON blob), so the field definitions can drive dynamic form rendering later.
  - `public.servicios` + `public.plan_tipos_servicios` (`supabase/migrations/20260610000100_servicios_plan_tipos_servicios.sql`) — a tenant-scoped catalog table (`servicios`) with a child table, admin-only for INSERT/UPDATE/DELETE, `using (true)` for SELECT. This is the RLS pattern this US will follow.
  - `public.disciplinas` + `public.nivel_disciplina` (with `DisciplinesPage` / `NivelesDisciplinaPanel` / `useNivelesDisciplina`) — the closest **UI pattern**: a parent list where each row expands into a collapsible panel to manage child rows (levels). This US will replicate that shape: each `formularios_plantillas` row expands to manage its `formulario_plantilla_esquema` field rows.
- No module in `src/components/portal/`, `src/hooks/portal/`, `src/services/supabase/portal/`, or `src/types/portal/` currently exists for "formularios".

### Proposed Changes

#### Data Model
1. **`public.formularios_plantillas`** — one row per template, scoped to a tenant. Stores template-level metadata (name, description, active flag, audit fields).
2. **`public.formulario_plantilla_esquema`** — one row per field definition inside a template. Stores the field's display label, internal key (`campo_nombre`), data type (`campo_tipo`), allowed values for list-type fields (`campo_lista_valores`), required flag (`campo_obligatorio`), render order, and an active flag so fields can be retired without breaking historical submissions from the future "fill out form" US.

   > **Note on `campo_nombre`**: this is the internal/machine identifier of the field (a `snake_case` key), distinct from `campo_etiqueta` (the human-readable label shown in the UI). It is the key that will be used as the object property name when a filled-out form's answers are persisted as JSON in the future consumer US (e.g. `{ "peso_kg": 72 }`). It is **not** the row's `id` (uuid) — the uuid stays the real FK target for any future `formulario_respuestas` table; `campo_nombre` exists purely so JSON payloads and exports stay human-readable instead of keyed by uuid. The UI should **auto-suggest** `campo_nombre` by slugifying `campo_etiqueta` as the admin types (lowercase, spaces/accents/punctuation stripped to `_`), while leaving the field editable so the admin can override it before saving; the DB `check` regex and the `(formulario_plantilla_id, campo_nombre)` unique constraint are the actual source of truth, not the client-side slugify.

#### UI / Admin Module
- Replace the empty placeholder page with a full CRUD module, admin-only, following the `gestion-servicios` file/page pattern:
  - A table listing all templates for the tenant (name, description, field count, active badge, actions).
  - A modal to create/edit a template (nombre, descripcion, activo).
  - A confirmation dialog to delete a template (blocked with a friendly message if it's already referenced elsewhere once the future "assign to training" US ships — for now, delete is a hard delete cascading to its fields).
  - A collapsible panel per template row (mirroring `NivelesDisciplinaPanel`) listing that template's fields in `orden` sequence, with add/edit/delete actions and drag-free "move up/down" ordering controls (or numeric `orden` input — see Implementation Steps).
  - A modal to create/edit a field (`campo_etiqueta`, `campo_nombre`, `campo_tipo` select, `campo_lista_valores` — shown only when `campo_tipo = 'lista'`, comma-separated — `campo_obligatorio` checkbox, `orden`).
- Add the new route to the admin sidebar menu (`ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`), between "Servicios" and "Entrenamientos" (logical proximity: both are admin catalogs configured before being used elsewhere).

#### Out of Scope (explicitly deferred to a future US, per requirement #6)
- Any screen where an athlete/coach actually **fills out** a form generated from a template.
- Attaching/linking a `formularios_plantillas` row to `entrenamientos` / `entrenamientos_grupo`.
- Storing submitted form answers (a future `formulario_respuestas` table).

---

## Database Changes

New migration file: `supabase/migrations/{timestamp}_formularios_plantillas.sql`

```sql
-- =============================================
-- Migration: Form Templates
-- US-0084: Admin Form Templates Module
-- =============================================

-- 1. Create formularios_plantillas table
create table if not exists public.formularios_plantillas (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(150)  not null,
  descripcion text,
  activo      boolean       not null default true,
  created_by  uuid,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint formularios_plantillas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint formularios_plantillas_created_by_fkey
    foreign key (created_by) references public.usuarios(id) on delete set null,
  constraint formularios_plantillas_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_formularios_plantillas_tenant_id
  on public.formularios_plantillas (tenant_id);

-- 2. Create formulario_plantilla_esquema table
create table if not exists public.formulario_plantilla_esquema (
  id                    uuid          primary key default gen_random_uuid(),
  formulario_plantilla_id uuid        not null,
  campo_etiqueta        varchar(150)  not null,
  campo_nombre           varchar(100)  not null,
  campo_tipo            varchar(20)   not null,
  campo_lista_valores   text,
  campo_obligatorio     boolean       not null default false,
  campo_placeholder     varchar(200),
  orden                 integer       not null default 0,
  activo                boolean       not null default true,
  created_at            timestamptz   not null default timezone('utc', now()),
  updated_at            timestamptz   not null default timezone('utc', now()),

  constraint formulario_plantilla_esquema_plantilla_id_fkey
    foreign key (formulario_plantilla_id) references public.formularios_plantillas(id) on delete cascade,
  constraint formulario_plantilla_esquema_plantilla_nombre_uk
    unique (formulario_plantilla_id, campo_nombre),
  constraint formulario_plantilla_esquema_campo_nombre_format_ck
    check (campo_nombre ~ '^[a-z][a-z0-9_]*$'),
  constraint formulario_plantilla_esquema_campo_tipo_ck
    check (campo_tipo in ('fecha', 'texto_corto', 'texto_largo', 'numerico', 'imagen', 'lista')),
  constraint formulario_plantilla_esquema_lista_valores_ck
    check (
      (campo_tipo = 'lista' and campo_lista_valores is not null and length(trim(campo_lista_valores)) > 0)
      or (campo_tipo <> 'lista')
    ),
  constraint formulario_plantilla_esquema_orden_ck
    check (orden >= 0)
);

create index if not exists idx_formulario_plantilla_esquema_plantilla_id
  on public.formulario_plantilla_esquema (formulario_plantilla_id);

-- 3. Enable RLS
alter table public.formularios_plantillas enable row level security;
alter table public.formulario_plantilla_esquema enable row level security;

grant select, insert, update, delete on table public.formularios_plantillas to authenticated;
grant select, insert, update, delete on table public.formulario_plantilla_esquema to authenticated;

-- formularios_plantillas: SELECT authenticated (catalog-style, matches servicios pattern)
drop policy if exists formularios_plantillas_select_authenticated on public.formularios_plantillas;
create policy formularios_plantillas_select_authenticated on public.formularios_plantillas
  for select to authenticated
  using (true);

-- formularios_plantillas: INSERT/UPDATE/DELETE admin only
drop policy if exists formularios_plantillas_insert_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_insert_admin_only on public.formularios_plantillas
  for insert to authenticated
  with check (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

drop policy if exists formularios_plantillas_update_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_update_admin_only on public.formularios_plantillas
  for update to authenticated
  using (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  )
  with check (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

drop policy if exists formularios_plantillas_delete_admin_only on public.formularios_plantillas;
create policy formularios_plantillas_delete_admin_only on public.formularios_plantillas
  for delete to authenticated
  using (
    tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
  );

-- formulario_plantilla_esquema: SELECT authenticated
drop policy if exists formulario_plantilla_esquema_select_authenticated on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_select_authenticated on public.formulario_plantilla_esquema
  for select to authenticated
  using (true);

-- formulario_plantilla_esquema: INSERT/UPDATE/DELETE admin only (via parent tenant)
drop policy if exists formulario_plantilla_esquema_insert_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_insert_admin_only on public.formulario_plantilla_esquema
  for insert to authenticated
  with check (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

drop policy if exists formulario_plantilla_esquema_update_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_update_admin_only on public.formulario_plantilla_esquema
  for update to authenticated
  using (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  )
  with check (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

drop policy if exists formulario_plantilla_esquema_delete_admin_only on public.formulario_plantilla_esquema;
create policy formulario_plantilla_esquema_delete_admin_only on public.formulario_plantilla_esquema
  for delete to authenticated
  using (
    formulario_plantilla_id in (
      select fp.id from public.formularios_plantillas fp
      where fp.tenant_id in (select admin_tenants.id from public.get_admin_tenants_for_authenticated_user() admin_tenants)
    )
  );

-- 4. updated_at triggers (public.set_updated_at() already exists, see 20260225000300_scenario_update_and_insert.sql)
drop trigger if exists formularios_plantillas_set_updated_at on public.formularios_plantillas;
create trigger formularios_plantillas_set_updated_at
  before update on public.formularios_plantillas
  for each row execute function public.set_updated_at();

drop trigger if exists formulario_plantilla_esquema_set_updated_at on public.formulario_plantilla_esquema;
create trigger formulario_plantilla_esquema_set_updated_at
  before update on public.formulario_plantilla_esquema
  for each row execute function public.set_updated_at();
```

**Notes**:
- `public.get_admin_tenants_for_authenticated_user()` already exists (`20260224000200_admin_tenants_function_and_policy copy.sql`) — reused as-is, no new function needed.
- `public.set_updated_at()` trigger function already exists in the schema (used by `servicios`, `entrenamiento_plantillas`, etc.) — confirm its exact origin migration before writing the file and reuse it; do not redefine it.
- SELECT policies use `using (true)` (catalog-style, same as `servicios`) rather than a `miembros_tenant` membership check, matching the sibling admin-catalog table `servicios` exactly. If stricter tenant-membership scoping is preferred instead, swap to the `entrenamiento_plantillas`-style `exists (select 1 from miembros_tenant …)` policy — flag this decision for review since it changes who can read templates cross-tenant.

---

## API / Server Actions

All operations go through the Supabase client directly from the service layer (no custom API routes), consistent with the rest of the codebase.

**File**: `src/services/supabase/portal/formularios.service.ts`

| Function | Params | Returns | Notes |
|---|---|---|---|
| `getPlantillasByTenant` | `tenantId: string` | `FormularioPlantilla[]` | Ordered by `nombre` |
| `getPlantillaConCampos` | `plantillaId: string` | `FormularioPlantillaConCampos` | Plantilla + its `esquema` fields ordered by `orden` |
| `createPlantilla` | `input: CreatePlantillaInput` | `FormularioPlantilla` | `tenant_id`, `nombre`, `descripcion`, `created_by` |
| `updatePlantilla` | `id: string, input: UpdatePlantillaInput` | `FormularioPlantilla` | `nombre`, `descripcion`, `activo` |
| `deletePlantilla` | `id: string` | `void` | Cascades to `formulario_plantilla_esquema` |
| `getCamposByPlantilla` | `plantillaId: string` | `FormularioCampo[]` | Ordered by `orden` |
| `createCampo` | `input: CreateCampoInput` | `FormularioCampo` | Validates `campo_lista_valores` required when `campo_tipo === 'lista'` client-side (DB check constraint is the source of truth) |
| `updateCampo` | `id: string, input: UpdateCampoInput` | `FormularioCampo` | |
| `deleteCampo` | `id: string` | `void` | |
| `reorderCampos` | `plantillaId: string, orderedIds: string[]` | `void` | Bulk-updates `orden` per id (sequential updates or a single upsert) |

Auth / RLS: all reads open to any authenticated user (per RLS above); all writes rejected by RLS unless the caller is an `administrador` of the template's tenant — the service layer does not need to duplicate this check, but the UI should still hide write affordances from non-admins (defense in depth, and this route already sits behind the `(administrador)` layout guard).

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Migration | `supabase/migrations/{timestamp}_formularios_plantillas.sql` | New tables, RLS, triggers (see SQL above) |
| Types | `src/types/portal/formularios.types.ts` | `FormularioPlantilla`, `FormularioCampo`, `FormularioTipoCampo` union, `FormularioPlantillaConCampos`, Create/Update input types, form-values types, `FormularioServiceError` class |
| Service | `src/services/supabase/portal/formularios.service.ts` | New — CRUD functions per API table above |
| Hook | `src/hooks/portal/formularios/useFormularios.ts` | List + CRUD + modal coordination for plantillas (mirrors `useServicios.ts`) |
| Hook | `src/hooks/portal/formularios/useFormularioForm.ts` | Controlled form state for plantilla modal (nombre, descripcion, activo) |
| Hook | `src/hooks/portal/formularios/useFormularioEsquema.ts` | List + CRUD for a selected plantilla's campos (mirrors `useNivelesDisciplina.ts`) |
| Hook | `src/hooks/portal/formularios/useFormularioCampoForm.ts` | Controlled form state for campo modal, incl. conditional `campo_lista_valores` validation and `campo_etiqueta` → `campo_nombre` slugify-on-type (create mode only, stops once the admin manually edits `campo_nombre`) |
| Component | `src/components/portal/formularios/FormulariosPage.tsx` | Main page container |
| Component | `src/components/portal/formularios/FormulariosTable.tsx` | Table: nombre, descripcion, field count, activo badge, actions |
| Component | `src/components/portal/formularios/FormularioFormModal.tsx` | Right-side slide modal, create/edit plantilla |
| Component | `src/components/portal/formularios/FormularioCamposPanel.tsx` | Collapsible per-row panel listing campos in order, add/edit/delete/reorder |
| Component | `src/components/portal/formularios/FormularioCampoFormModal.tsx` | Right-side slide modal, create/edit campo; `campo_tipo` select drives conditional `campo_lista_valores` textarea |
| Component | `src/components/portal/formularios/FormularioTipoCampoBadge.tsx` | Small badge/label mapping `campo_tipo` value to a human-readable Spanish label + icon |
| Component | `src/components/portal/formularios/index.ts` | Barrel export |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-formularios/page.tsx` | Replace empty placeholder — mirror `gestion-servicios/page.tsx`: `export default async function` reading `tenant_id` from `params`, rendering `<FormulariosPage tenantId={tenantId} />` |
| Menu | `src/types/portal.types.ts` | Add `{ label: 'Formularios', path: 'gestion-formularios', icon: 'description' }` to `ROLE_TENANT_ITEMS.administrador`, after `'Servicios'` |

---

## Acceptance Criteria

1. An administrador viewing `/portal/orgs/{tenant_id}/gestion-formularios` sees a table of all form templates (`formularios_plantillas`) belonging to their tenant, or an empty state if none exist.
2. "Formularios" appears as a new item in the admin sidebar menu, linking to the route above.
3. A non-admin (usuario/entrenador) navigating directly to `/portal/orgs/{tenant_id}/gestion-formularios` is redirected by the existing `(administrador)/layout.tsx` guard, same as other admin-only routes.
4. Clicking "Nueva plantilla" opens a modal to create a template with `nombre` (required) and `descripcion` (optional); submitting persists a row in `formularios_plantillas` scoped to the current tenant and refreshes the table.
5. Creating a second template with a `nombre` that already exists for the same tenant shows an inline error ("Ya existe una plantilla con este nombre.") without a page crash, mapped from the Postgres `23505` unique-violation error.
6. Editing a template updates `nombre`, `descripcion`, and `activo`; toggling `activo` off marks the template inactive without deleting it or its fields.
7. Deleting a template (with confirmation) removes it and cascades deletion to all its `formulario_plantilla_esquema` rows.
8. Expanding a template row shows its fields (`formulario_plantilla_esquema`) ordered by `orden`, each displaying `campo_etiqueta`, a type badge, an "Obligatorio" indicator when true, and edit/delete actions.
9. Clicking "Agregar campo" within an expanded template opens a modal with: `campo_etiqueta` (required text), `campo_nombre` (required, must match `^[a-z][a-z0-9_]*$`, inline validation before submit), `campo_tipo` (required select: Fecha, Texto corto, Texto largo, Numérico, Imagen, Lista), `campo_obligatorio` (checkbox), `orden` (numeric, defaults to next available position).
10. While typing `campo_etiqueta` in create mode, `campo_nombre` auto-fills with a slugified suggestion (lowercase, accents/spaces/punctuation replaced with `_`) until the admin manually edits `campo_nombre`, after which auto-sync stops for that session; in edit mode, `campo_nombre` never auto-changes from the label.
11. When `campo_tipo` is set to "Lista", a `campo_lista_valores` textarea appears and is required (comma-separated values); for any other type, the field is hidden and not required. Submitting a "Lista" field with an empty value list shows an inline error before hitting the database.
12. Creating a field with a `campo_nombre` that already exists within the same template shows an inline error mapped from the `23505` unique-violation on `(formulario_plantilla_id, campo_nombre)`.
13. Editing or deleting a field updates/removes only that row and refreshes the panel; the parent template's `updated_at`/field list stays consistent (no stale UI state).
14. All list/detail reads succeed for any authenticated tenant member (per the catalog-style SELECT policy); all create/update/delete attempts by a non-admin fail at the RLS layer (return a Postgres `42501` permission error) and surface as a friendly toast/inline error, not a raw stack trace.
15. Deleting a template or field the user doesn't have admin rights to (e.g. stale UI state, RLS denies) shows the same friendly "No tienes permisos" message as other admin modules (`ServicioServiceError`-style mapping).
16. No existing menu item, route, or admin page regresses — verified by loading `gestion-servicios`, `gestion-disciplinas`, and `gestion-escenarios` after the change.

---

## Implementation Steps

- [ ] Write and apply the migration (`formularios_plantillas`, `formulario_plantilla_esquema`, RLS, indexes, triggers); run `supabase db reset` (or equivalent local workflow) to verify it applies cleanly on top of the existing migration chain
- [ ] Confirm the exact name/origin of the existing `set_updated_at()` trigger function before referencing it in the new migration
- [ ] Add `src/types/portal/formularios.types.ts`
- [ ] Add `src/services/supabase/portal/formularios.service.ts` with Postgres error code mapping (`23505` duplicate, `23503` FK violation, `42501` forbidden) following `serviciosService`'s `mapServicioError` pattern
- [ ] Add hooks: `useFormularios`, `useFormularioForm`, `useFormularioEsquema`, `useFormularioCampoForm`
- [ ] Build components: `FormulariosPage`, `FormulariosTable`, `FormularioFormModal`, `FormularioCamposPanel`, `FormularioCampoFormModal`, `FormularioTipoCampoBadge`, barrel `index.ts`
- [ ] Wire `gestion-formularios/page.tsx` to `<FormulariosPage tenantId={tenantId} />`
- [ ] Add the "Formularios" entry to `ROLE_TENANT_ITEMS.administrador` in `src/types/portal.types.ts`
- [ ] Verify RLS manually in Supabase: as admin, CRUD succeeds; as usuario/entrenador, writes are rejected and reads still succeed
- [ ] Test manually: create/edit/delete template; create each of the 6 field types incl. "Lista" with values; duplicate-name and duplicate-`campo_nombre` error paths; empty-state rendering; non-admin redirect
- [ ] Confirm no regressions in sibling admin pages (`gestion-servicios`, `gestion-disciplinas`)

---

## Non-Functional Requirements

- **Security**: All writes enforced server-side via RLS (admin-only), not just UI hiding. `campo_nombre` format constrained at the DB level (`check` regex) to keep it safe for future use as a JSON key / form field name. Route already protected by the `(administrador)` layout guard.
- **Performance**: Indexes on `formularios_plantillas.tenant_id` and `formulario_plantilla_esquema.formulario_plantilla_id` to keep the plantilla list and per-template field list queries fast. No pagination needed initially — same assumption as `servicios` and `disciplinas` (tenant-scoped catalogs are expected to stay small, tens of rows).
- **Accessibility**: Modals reuse existing right-side slide modal components/patterns (keyboard-dismissible, focus-trapped) already used by `ServicioFormModal` / `NivelDisciplinaFormModal`. Form fields have associated `<label>`s; the conditional `campo_lista_valores` textarea must be reachable via keyboard when `campo_tipo` changes via select.
- **Error handling**: Inline field-level validation errors in modals (client-side, mirroring `DisciplineFieldErrors`/`ServicioFormModal` patterns) plus a service-error class (`FormularioServiceError`) mapping Postgres error codes to user-facing Spanish messages, following `ServicioServiceError`.
