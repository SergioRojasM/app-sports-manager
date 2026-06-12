# US-0062 — Services Catalog and Plan Services

## ID
US-0062

## Name
Services Catalog and Plan Service Assignments

## As a
Tenant administrator

## I Want
To define a catalog of services for my organization and associate each service (with a unit quantity) to a plan subtype, complementing the existing `clases_incluidas` field with explicit service-level allocations

## So That
Plans can clearly communicate what each subtype delivers (e.g., "12 Swimming Classes", "5 Personal Training Sessions"), laying the foundation for future per-service subscription tracking and deduction

---

## Description

### Current State
`plan_tipos` stores a generic `clases_incluidas` integer that loosely represents how many class sessions are bundled with the plan subtype. There is no structured catalog of the actual services an organization offers, so the field cannot be linked to a specific activity or service type. The `gestion-servicios` page (`page.tsx`) currently exists as an empty placeholder.

### Proposed Changes

#### 1. Database
- Create a `servicios` table as a tenant-scoped catalog of services (e.g., "Clases de Natación", "Entrenamiento Personal").
- Create a `plan_tipos_servicios` join table that records how many units of a given service are included in a plan subtype.
- **No data migration in this US**: existing `clases_incluidas` values on `plan_tipos` are left untouched. The column is NOT dropped.
- **No changes to booking-deduction logic**: `deduct_classes_on_booking` / `reservas.service.ts` continue reading `clases_incluidas` from `plan_tipos` unchanged. Migration of deduction logic to `plan_tipos_servicios` is deferred to a subsequent US.

#### 2. Services Management Page
A new admin page under `gestion-servicios` lists all tenant services in a table. The admin can:
- Create a service (nombre, descripción opcional, activo default `true`).
- Edit a service (nombre, descripción, activo toggle).
- Delete a service — only if no `plan_tipos_servicios` rows reference it; otherwise show a blocking toast error.
- Toggle active/inactive status inline or via edit modal.

#### 3. Plan Form — Services Section
Inside `PlanFormModal`, the plan-subtype section currently has a `clases_incluidas` number input. **Keep `clases_incluidas` as-is** and add a new **Services section below it** that allows the admin to:
- Add one or more services to the plan tipo, each with a `unidades` (integer ≥ 1) quantity.
- Select from the tenant's active services via a dropdown/combobox.
- Remove a service row.
- A service may only be added once per plan tipo (duplicate service blocked in form).

The Services section is rendered as a repeated row: `[Service dropdown] [Unidades input] [Remove button]` with an "Add service" link below.

> `clases_incluidas` will be removed from the form in a subsequent US once the deduction logic has been migrated to `plan_tipos_servicios`.

---

## Database Changes

### New Table: `servicios`

```sql
create table if not exists public.servicios (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(100)  not null,
  descripcion text,
  activo      boolean       not null default true,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint servicios_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint servicios_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_servicios_tenant_id on public.servicios (tenant_id);
```

RLS: enabled; SELECT all authenticated; INSERT/UPDATE/DELETE admin of tenant only (same pattern as `plan_tipos`).
`set_updated_at` trigger attached.

---

### New Table: `plan_tipos_servicios`

```sql
create table if not exists public.plan_tipos_servicios (
  id            uuid     primary key default gen_random_uuid(),
  plan_tipo_id  uuid     not null,
  servicio_id   uuid     not null,
  unidades      integer  not null default 1,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),

  constraint plan_tipos_servicios_plan_tipo_id_fkey
    foreign key (plan_tipo_id) references public.plan_tipos(id) on delete cascade,
  constraint plan_tipos_servicios_servicio_id_fkey
    foreign key (servicio_id) references public.servicios(id) on delete restrict,
  constraint plan_tipos_servicios_plan_tipo_servicio_uk
    unique (plan_tipo_id, servicio_id),
  constraint plan_tipos_servicios_unidades_ck
    check (unidades >= 1)
);

create index if not exists idx_plan_tipos_servicios_plan_tipo_id
  on public.plan_tipos_servicios (plan_tipo_id);
create index if not exists idx_plan_tipos_servicios_servicio_id
  on public.plan_tipos_servicios (servicio_id);
```

RLS: enabled; SELECT all authenticated; INSERT/UPDATE/DELETE admin of the plan's tenant only.

---

> **Out of scope for this US**: data migration of `clases_incluidas` values and any changes to `deduct_classes_on_booking` / booking-deduction logic are deferred to a subsequent US.

---

## API / Server Actions

### `src/services/supabase/portal/servicios.service.ts` (new)

| Function | Inputs | Returns | Notes |
|---|---|---|---|
| `getServiciosByTenant(tenantId)` | `tenantId: string` | `Servicio[]` | All services for tenant, ordered by nombre |
| `getServiciosActivosByTenant(tenantId)` | `tenantId: string` | `Servicio[]` | Only `activo = true` |
| `createServicio(input)` | `CreateServicioInput` | `Servicio` | INSERT; unique constraint enforced by DB |
| `updateServicio(id, input)` | `id: string`, `UpdateServicioInput` | `Servicio` | UPDATE by id |
| `deleteServicio(id)` | `id: string` | `void` | DELETE; will fail at DB level if referenced by `plan_tipos_servicios` (FK `on delete restrict`) — caller must handle |

### `src/services/supabase/portal/servicios.service.ts` — Plan Tipo Services

| Function | Inputs | Returns | Notes |
|---|---|---|---|
| `getPlanTipoServicios(planTipoId)` | `planTipoId: string` | `PlanTipoServicio[]` | Includes joined `servicio_nombre` |
| `syncPlanTipoServicios(planTipoId, rows)` | `planTipoId: string`, `rows: {servicioId, unidades}[]` | `void` | Delete all existing rows for plan tipo then insert new ones (full replace) |

All functions in services layer are **queries only** — no business logic. Auth/RLS is enforced at the DB level.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_servicios_plan_tipos_servicios.sql` | Create `servicios` and `plan_tipos_servicios` tables with RLS only — no data migration, no column drops |
| Types | `src/types/portal/servicios.types.ts` | New: `Servicio`, `CreateServicioInput`, `UpdateServicioInput`, `ServicioFormValues`, `PlanTipoServicio`, `PlanTipoServicioRow`, `SyncPlanTipoServiciosInput` |
| Types | `src/types/portal/planes.types.ts` | Add `servicios?: PlanTipoServicioRow[]` to `PlanTipo`; `clases_incluidas` fields remain unchanged |
| Service | `src/services/supabase/portal/servicios.service.ts` | New: CRUD for `servicios` + `plan_tipos_servicios` (see above) |
| Service | `src/services/supabase/portal/planes.service.ts` | Add `getPlanTipoServicios` and `syncPlanTipoServicios` calls when creating/updating plan tipos; `clases_incluidas` fields remain unchanged |
| Hook | `src/hooks/portal/servicios/useServicios.ts` | New: list, create, update, delete state for tenant services |
| Hook | `src/hooks/portal/servicios/useServicioForm.ts` | New: controlled form state for create/edit modal |
| Hook | `src/hooks/portal/planes/usePlanTipoServicios.ts` | New: manages the services rows within the plan tipo sub-form (add, remove, update unidades, fetch available services) |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Modify: integrate `usePlanTipoServicios` state; `clases_incluidas` field remains unchanged |
| Component | `src/components/portal/servicios/ServiciosPage.tsx` | New: full page container (header, table, modals) |
| Component | `src/components/portal/servicios/ServiciosTable.tsx` | New: table with nombre, descripcion, activo badge, edit/delete row actions |
| Component | `src/components/portal/servicios/ServicioFormModal.tsx` | New: right-side slide modal for create/edit service |
| Component | `src/components/portal/servicios/index.ts` | New: barrel export |
| Component | `src/components/portal/planes/PlanTipoServiciosSection.tsx` | New: repeated service rows (service select + unidades input + remove button + add row link) inside plan tipo form |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Modify: add `<PlanTipoServiciosSection />` below the existing `clases_incluidas` input (do not remove it) |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-servicios/page.tsx` | Replace empty placeholder with server component that passes `tenantId` to `<ServiciosPage />` |

---

## Acceptance Criteria

1. The `servicios` table exists in the database with PK, unique `(tenant_id, nombre)` constraint, and FK to `tenants(id) ON DELETE CASCADE`.
2. The `plan_tipos_servicios` table exists with PK, unique `(plan_tipo_id, servicio_id)` constraint, FK to `plan_tipos(id) ON DELETE CASCADE`, FK to `servicios(id) ON DELETE RESTRICT`, and `unidades >= 1` check constraint.
3. The `clases_incluidas` column still exists on `plan_tipos` and is not modified by this migration.
4. The booking-deduction flow is not affected: `deduct_classes_on_booking` and `reservas.service.ts` continue to read `clases_incluidas` without changes.
5. The admin can navigate to `/portal/orgs/[tenant_id]/gestion-servicios` and sees a table of services for the tenant.
7. The admin can create a new service; duplicate names within the same tenant are rejected with an inline error (unique constraint violation surfaced as a toast or inline message).
8. The admin can edit a service's nombre, descripcion, and activo flag.
8. The admin cannot delete a service that is referenced by at least one `plan_tipos_servicios` row; a clear error message is shown (e.g., "Este servicio está asociado a uno o más tipos de plan y no puede eliminarse.").
9. The admin can delete a service that is not referenced by any plan tipo.
10. In the Plan Form Modal (`PlanFormModal`), the `clases_incluidas` input remains visible and functional inside the plan tipo subform.
11. In the Plan Form Modal, the plan tipo subform shows a new **Services** section (below `clases_incluidas`) where the admin can add one or more services (selected from the tenant's active services) and set a `unidades` integer (≥ 1) per service.
12. Attempting to add the same service twice to a single plan tipo in the form is blocked (duplicate row prevented client-side).
13. Saving a plan tipo persists the service assignments in `plan_tipos_servicios`; editing the plan tipo and changing the services re-syncs the rows correctly.
14. All new tables have RLS enabled; only authenticated tenant admins can INSERT/UPDATE/DELETE; all authenticated users can SELECT.
15. The `gestion-servicios` page is accessible only to users with the `administrador` role (protected by the existing `(administrador)` layout route guard).

---

## Implementation Steps

- [ ] Write migration SQL: create `servicios` table with RLS and `set_updated_at` trigger
- [ ] Write migration SQL: create `plan_tipos_servicios` table with RLS
- [ ] Apply migration locally (`npx supabase db push` or incremental apply)
- [ ] Add `servicios.types.ts` with all required types
- [ ] Update `planes.types.ts`: add `servicios?: PlanTipoServicioRow[]` to `PlanTipo` (no other changes)
- [ ] Create `servicios.service.ts` with CRUD for `servicios` and `syncPlanTipoServicios` / `getPlanTipoServicios` for `plan_tipos_servicios`
- [ ] Update `planes.service.ts`: call `syncPlanTipoServicios` and load `servicios` when creating/updating plan tipos; leave `clases_incluidas` unchanged
- [ ] Create `useServicios.ts` hook (list + CRUD state)
- [ ] Create `useServicioForm.ts` hook (form state for create/edit modal)
- [ ] Create `usePlanTipoServicios.ts` hook (service rows state for plan tipo sub-form)
- [ ] Update `usePlanForm.ts`: integrate service rows state; leave `clases_incluidas` field unchanged
- [ ] Create `ServicioFormModal.tsx` (right-side slide modal, controlled inputs, validation)
- [ ] Create `ServiciosTable.tsx` (table with activo badge, edit/delete actions)
- [ ] Create `ServiciosPage.tsx` (header + table + modals wired together)
- [ ] Create `src/components/portal/servicios/index.ts` barrel export
- [ ] Create `PlanTipoServiciosSection.tsx` (repeated rows: service combobox + unidades input + remove button + add row link)
- [ ] Modify `PlanFormModal.tsx`: add `<PlanTipoServiciosSection />` below the existing `clases_incluidas` input
- [ ] Replace empty placeholder in `gestion-servicios/page.tsx` with server component calling `<ServiciosPage tenantId={tenantId} />`
- [ ] Verify RLS policies in Supabase Studio for both new tables
- [ ] Manual test: create service → associate to plan tipo → confirm rows saved in `plan_tipos_servicios`
- [ ] Manual test: attempt to delete a service referenced by a plan tipo → confirm error message
- [ ] Manual test: duplicate service name in same tenant → confirm rejection
- [ ] Test empty state on services page for a new tenant
- [ ] Confirm `clases_incluidas` field still works normally in the plan tipo form

---

## Non-Functional Requirements

- **Security**: Both new tables have RLS enabled. INSERT/UPDATE/DELETE restricted to tenant admins via `get_admin_tenants_for_authenticated_user()`. The `servicios(id) ON DELETE RESTRICT` constraint on `plan_tipos_servicios` prevents orphaned service assignments but does not bypass RLS. Service deletion errors from the FK constraint must be caught in the service layer and surfaced as a user-friendly message (not a raw Postgres error).
- **Performance**: Indexes on `servicios.tenant_id`, `plan_tipos_servicios.plan_tipo_id`, and `plan_tipos_servicios.servicio_id` ensure efficient lookups. Service dropdown in the plan tipo form should load only active services for the current tenant (filtered query, not the full table).
- **Accessibility**: Service form modal uses `<label>` elements linked to inputs; focus is trapped within the modal while open; closing via Escape key is supported.
- **Error handling**: Unique constraint violations on `servicios (tenant_id, nombre)` surface as "Ya existe un servicio con este nombre." FK restrict violations on service deletion surface as "Este servicio está asociado a uno o más tipos de plan y no puede eliminarse." Both are displayed as toast notifications or inline form errors. Network errors fallback to a generic toast.
