# User Story: Manage Plans Feature

## Title
Membership Plan Management for Tenant Administrators

## ID
US-0014

## Name
Manage Plans Feature

## As a
Tenant Administrator

## I Want
To create, view, edit, and delete membership plans for my organization, and associate one or more sports disciplines to each plan.

## So That
I can define the service offerings available to athletes in my organization, specifying pricing, validity period in months, and which disciplines are included in each plan.

---

## Description

This feature introduces full CRUD management for membership plans scoped to a tenant. Each plan can be associated with one or multiple disciplines defined in the organization.

The feature follows the standard **feature-slice / hexagonal-architecture** pattern already used in the codebase (disciplines, scenarios, trainings). It introduces:

1. **Evolve the existing `planes` table** — the table already exists in the initial migration (`20260221000100`) with a `duracion_dias` column. The migration must ALTER it: add `vigencia_meses`, add `updated_at`, drop `duracion_dias`, and add a unique constraint on `(tenant_id, nombre)`.
2. **A new join table `planes_disciplina`** — stores the many-to-many relationship between plans and disciplines.
3. **Full presentation layer** — page route → feature component → table → modal form.
4. **Application layer** — custom hooks for list management and form state.
5. **Infrastructure layer** — Supabase service functions.
6. **Domain contracts** — TypeScript types.

The UI table must follow the design pattern established in `gestion-escenarios/page.tsx` and its component `ScenariosPage`. The column `duracion_dias` used in earlier designs is **replaced** by `vigencia_meses` (integer, number of months the plan is valid).

---

## Expected Results

- The administrator can navigate to `/portal/orgs/[tenant_id]/gestion-planes` and see a paginated/searchable table of plans.
- Each row shows: Name, Description, Price, Validity (months), Associated Disciplines (badges/chips), Status (active/inactive).
- The administrator can open a right modal(like gestion-escenarios) to create a new plan, including selecting one or more disciplines from the tenant's active discipline list.
- The administrator can edit any plan, updating all fields and the discipline associations.
- The administrator can delete (soft-delete via `activo = false` or hard-delete) a plan with a confirmation step.
- All mutations are tenant-scoped and protected by RLS policies that restrict them to users with the `administrador` role.

---

## Database

### New Migration File
**File:** `supabase/migrations/20260301000200_planes_gestion.sql`

> **Context:** The `planes` table was created in the initial migration `20260221000100_migracion_inicial_bd.sql` with columns `duracion_dias`, `clases_incluidas`, `beneficios`, `tipo` and without `updated_at` or a unique name constraint. RLS is already enabled with a permissive SELECT policy (`planes_select_authenticated using (true)`). This migration evolves the table rather than recreating it, and adds the new `planes_disciplina` join table.

### Existing `planes` table (from initial migration)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `tenant_id` | `uuid` | FK → `tenants(id)` |
| `nombre` | `varchar(100)` | |
| `descripcion` | `text` | |
| `precio` | `numeric(10,2)` | |
| `duracion_dias` | `integer` | **→ to be replaced by `vigencia_meses`** |
| `clases_incluidas` | `integer` | keep as-is |
| `beneficios` | `text` | keep as-is |
| `tipo` | `varchar(50)` | keep as-is |
| `activo` | `boolean` | default `true` |
| `created_at` | `timestamptz` | |
| ~~`updated_at`~~ | — | **missing — to be added** |

### Migration SQL

```sql
-- =============================================
-- Migration: Plans Management Feature
-- US-0014: Manage Plans Feature
-- =============================================
begin;

-- 1. Evolve planes table (already exists from initial migration)

-- 1a. Add vigencia_meses (replaces duracion_dias)
alter table public.planes
  add column if not exists vigencia_meses integer;

-- 1b. Backfill: convert duracion_dias to months (30 days = 1 month, min 1)
update public.planes
  set vigencia_meses = greatest(1, ceil(coalesce(duracion_dias, 30)::float / 30)::integer)
  where vigencia_meses is null;

-- 1c. Apply NOT NULL + default
alter table public.planes
  alter column vigencia_meses set not null,
  alter column vigencia_meses set default 1;

-- 1d. Drop old column
alter table public.planes
  drop column if exists duracion_dias;

-- 1e. Add updated_at column (missing from original table)
alter table public.planes
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- 1f. Add unique constraint on (tenant_id, nombre)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.planes'::regclass
      and conname = 'planes_tenant_nombre_uk'
  ) then
    alter table public.planes
      add constraint planes_tenant_nombre_uk unique (tenant_id, nombre);
  end if;
end $$;

-- 2. Create trigger function for updated_at (shared, reusable)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 3. Attach trigger to planes
drop trigger if exists planes_set_updated_at on public.planes;
create trigger planes_set_updated_at
  before update on public.planes
  for each row execute function public.set_updated_at();

-- 4. Create planes_disciplina join table
create table if not exists public.planes_disciplina (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null,
  disciplina_id uuid not null,
  created_at    timestamptz not null default timezone('utc', now()),
  constraint planes_disciplina_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete cascade,
  constraint planes_disciplina_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete cascade,
  constraint planes_disciplina_plan_disciplina_uk unique (plan_id, disciplina_id)
);

create index if not exists idx_planes_disciplina_plan_id
  on public.planes_disciplina (plan_id);
create index if not exists idx_planes_disciplina_disciplina_id
  on public.planes_disciplina (disciplina_id);

-- 5. Mutation RLS policies for planes
-- (RLS already enabled + SELECT policy planes_select_authenticated already exists)
grant insert, update, delete on table public.planes to authenticated;

drop policy if exists planes_insert_admin_only on public.planes;
create policy planes_insert_admin_only on public.planes
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists planes_update_admin_only on public.planes;
create policy planes_update_admin_only on public.planes
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists planes_delete_admin_only on public.planes;
create policy planes_delete_admin_only on public.planes
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 6. RLS for planes_disciplina (new table)
alter table public.planes_disciplina enable row level security;

grant select, insert, update, delete on table public.planes_disciplina to authenticated;

-- SELECT: all authenticated users (consistent with the rest of the schema)
drop policy if exists planes_disciplina_select_authenticated on public.planes_disciplina;
create policy planes_disciplina_select_authenticated on public.planes_disciplina
  for select to authenticated
  using (true);

-- INSERT / DELETE: admin of the plan's tenant only
drop policy if exists planes_disciplina_insert_admin_only on public.planes_disciplina;
create policy planes_disciplina_insert_admin_only on public.planes_disciplina
  for insert to authenticated
  with check (
    plan_id in (
      select p.id from public.planes p
      where p.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

drop policy if exists planes_disciplina_delete_admin_only on public.planes_disciplina;
create policy planes_disciplina_delete_admin_only on public.planes_disciplina
  for delete to authenticated
  using (
    plan_id in (
      select p.id from public.planes p
      where p.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

commit;
```

> **RLS function reference:** All admin policies use `public.get_admin_tenants_for_authenticated_user()`, which was introduced in migration `20260224000200`. It joins `miembros_tenant` + `roles` to return the tenants where the current user has the `administrador` role. There is no `check_tenant_admin()` function in this project.

---

## Files to Create / Modify

### 1. Route (Delivery Layer)
**Create:** `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`

```tsx
import { PlanesPage } from '@/components/portal/planes';

type GestionPlanesTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionPlanesTenantPage({
  params,
}: GestionPlanesTenantPageProps) {
  const { tenant_id: tenantId } = await params;
  return <PlanesPage tenantId={tenantId} />;
}
```

---

### 2. Types (Domain Layer)
**Create:** `src/types/portal/planes.types.ts`

```typescript
export type Plan = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_meses: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanDisciplina = {
  id: string;
  plan_id: string;
  disciplina_id: string;
  created_at: string;
};

export type PlanWithDisciplinas = Plan & {
  disciplinas: string[]; // array of disciplina IDs associated with this plan
};

export type PlanTableItem = PlanWithDisciplinas & {
  statusLabel: string;
  vigenciaLabel: string;       // e.g. "3 months"
  disciplinaNames: string[];   // resolved discipline names for display
};

export type CreatePlanInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  vigencia_meses: number;
  activo?: boolean;
  disciplinaIds: string[];
};

export type UpdatePlanInput = CreatePlanInput & {
  planId: string;
};

export type PlanFormValues = {
  nombre: string;
  descripcion: string;
  precio: string;         // string for controlled input, parsed on submit
  vigencia_meses: string; // string for controlled input
  activo: boolean;
  disciplinaIds: string[];
};

export type PlanFormField = 'nombre' | 'descripcion' | 'precio' | 'vigencia_meses' | 'disciplinaIds';
export type PlanFieldErrors = Partial<Record<PlanFormField, string>>;

export type PlanesViewModel = {
  planes: PlanWithDisciplinas[];
  filteredPlanes: PlanTableItem[];
  loading: boolean;
  error: string | null;
  modalOpen: boolean;
  modalMode: 'create' | 'edit';
  selectedPlan: PlanWithDisciplinas | null;
  submitError: string | null;
  successMessage: string | null;
};

export type PlanServiceErrorCode =
  | 'duplicate_name'
  | 'fk_dependency'
  | 'forbidden'
  | 'unknown';
```

---

### 3. Service (Infrastructure Layer)
**Create:** `src/services/supabase/portal/planes.service.ts`

Responsibilities:
- `getPlanes(supabase, tenantId)` — fetch all plans with their associated discipline IDs (join `planes_disciplina`).
- `createPlan(supabase, input: CreatePlanInput)` — insert into `planes`, then insert rows into `planes_disciplina`.
- `updatePlan(supabase, input: UpdatePlanInput)` — update `planes`, delete existing `planes_disciplina` entries for the plan, then re-insert the new discipline associations.
- `deletePlan(supabase, tenantId, planId)` — delete from `planes` (cascades to `planes_disciplina`).
- `mapServiceError(error: unknown): PlanServiceErrorCode` — translate Supabase Postgres errors to typed error codes (e.g. unique constraint → `'duplicate_name'`).

All functions receive a Supabase browser client and perform tenant-scoped queries. Never use `service_role`; rely on RLS.

**Update:** `src/services/supabase/portal/index.ts`  
Export `planes.service.ts` from the portal services barrel.

---

### 4. Hooks (Application Layer)

**Create:** `src/hooks/portal/planes/usePlanes.ts`

State to manage:
- `planes: PlanWithDisciplinas[]` — raw list from service.
- `disciplines: Discipline[]` — fetched from disciplines service for the multiselect.
- `filteredPlanes: PlanTableItem[]` — derived from search.
- `loading`, `error` — async state.
- `searchTerm`, `setSearchTerm`.
- `modalOpen`, `modalMode: 'create' | 'edit'`.
- `selectedPlan: PlanWithDisciplinas | null`.
- `formValues: PlanFormValues`, `fieldErrors`, `submitError`, `successMessage`, `isSubmitting`.
- Methods: `openCreateModal()`, `openEditModal(plan)`, `closeModal()`, `updateField(field, value)`, `submit()`, `deletePlan(planId)`, `refresh()`.

**Create:** `src/hooks/portal/planes/usePlanForm.ts`  
Extract form validation and submit logic if needed to keep `usePlanes` lean.

---

### 5. Components (Presentation Layer)

**Create directory:** `src/components/portal/planes/`

#### `PlansPage.tsx`
- Client component (`'use client'`).
- Wires `usePlanes` hook to the UI.
- Renders: page header, `PlanesHeaderFilters`, `PlanesTable`, `PlanFormModal`.
- Follows the same structure as `DisciplinesPage.tsx`.

#### `PlanesHeaderFilters.tsx`
- Search input + "New Plan" button.
- Mirrors `DisciplinesHeaderFilters.tsx`.

#### `PlanesTable.tsx`

Columns:

| Column | Description |
|---|---|
| Name | `plan.nombre` |
| Description | `plan.descripcion` truncated |
| Price | `plan.precio` formatted as currency |
| Validity | `plan.vigencia_meses` + " month(s)" |
| Disciplines | Rendered as badge chips (`plan.disciplinaNames`) |
| Status | Active / Inactive badge |
| Actions | Edit / Delete icon buttons |

- Follows the design pattern in `ScenariosPage.tsx` (glass card, table with `thead`/`tbody`, Tailwind prose).

#### `PlanFormModal.tsx`

Fields:

| Field | Type | Validation |
|---|---|---|
| `nombre` | Text input | Required, max 100 chars |
| `descripcion` | Textarea | Optional |
| `precio` | Number input | Required, ≥ 0 |
| `vigencia_meses` | Number input | Required, integer ≥ 1 |
| `activo` | Toggle/Checkbox | Default `true` |
| `disciplinaIds` | Multi-select checkboxes | At least one discipline required |

- The disciplines list in the modal is loaded from the hook's `disciplines` state (tenant's active disciplines).
- Displays field-level validation errors.
- Displays `submitError` / `successMessage` at form level.
- Shows loading spinner on `isSubmitting`.

#### `index.ts`  
Barrel export for all components in the `planes` folder.

---

## Navigation Integration

**Modify:** `src/components/portal/RoleBasedMenu.tsx` (or the equivalent nav config / constants file)

Add the "Gestión de Planes" entry to the administrator role menu, pointing to `/portal/orgs/[tenant_id]/gestion-planes`.

Check `src/lib/constants.ts` for any `NAV_ROUTES` or similar constants that need updating to include the new route.

---

## Steps for Completion

1. **Migration** — Create and apply `20260301000200_planes_gestion.sql`: ALTER `planes` (add `vigencia_meses`, `updated_at`, drop `duracion_dias`, add unique constraint), create `planes_disciplina`, attach `updated_at` trigger, add mutation RLS policies.
2. **Types** — Create `src/types/portal/planes.types.ts`.
3. **Service** — Create `src/services/supabase/portal/planes.service.ts` and update the barrel `index.ts`.
4. **Hooks** — Create `src/hooks/portal/planes/usePlanes.ts` (and optionally `usePlanForm.ts`).
5. **Components** — Create the `src/components/portal/planes/` folder with `PlanesPage.tsx`, `PlanesHeaderFilters.tsx`, `PlanesTable.tsx`, `PlanFormModal.tsx`, and `index.ts`.
6. **Route** — Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-planes/page.tsx`.
7. **Navigation** — Add the route to the administrator menu in `RoleBasedMenu.tsx` / constants.
8. **Validation** — Manual QA: create, edit, delete a plan with single and multiple disciplines; verify RLS by testing with a non-admin user (should return empty/403).

---

## Non-Functional Requirements

### Security
- All Supabase queries must rely on RLS; no `service_role` bypass.
- The `(administrador)` route group is protected by the tenant layout's role gate (`layout.tsx`) — no additional middleware changes needed.
- Validate `tenantId` is a valid UUID before passing it to services.

### Performance
- `getPlanes` should join `planes_disciplina` in a single query (Supabase `select` with nested relation, e.g. `planes(*, planes_disciplina(disciplina_id))`).
- Avoid N+1: load disciplines once and cross-reference in the hook.

### Code Quality
- Follow existing naming conventions: PascalCase components, `useCamelCase` hooks, kebab-case route folders.
- No direct Supabase calls from components or pages.
- Export all public members through the feature's `index.ts` barrel.
- TypeScript strict mode; no `any`.

### Accessibility
- Form inputs must have associated `<label>` elements.
- Modal must trap focus and close on Escape key (reuse the modal pattern from `DisciplineFormModal.tsx`).

---

## Documentation Updates
- Update `projectspec/03-project-structure.md` to add the `planes/` feature slice to the directory tree in all relevant sections (components, hooks, services, types).
