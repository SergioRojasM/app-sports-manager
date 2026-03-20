# User Story US-0036 — Plan Subtypes (plan_tipos)

## Metadata

| Field       | Value                                    |
|-------------|------------------------------------------|
| **ID**      | US-0036                                  |
| **Name**    | Plan Subtypes — plan_tipos               |
| **Status**  | Ready for Development                    |

---

## Story

**As an** organization administrator,  
**I want** to define multiple subtypes (variants) for each membership plan — each with its own price, validity in days, and number of included classes —  
**So that** athletes can choose the specific variant that fits their needs when subscribing to a plan (e.g., "Monthly – 8 classes", "Monthly – 4 classes", "Biweekly – 2 classes").

---

## Description

Currently, a plan (`planes`) has a flat structure with a single `precio`, `vigencia_meses`, and `clases_incluidas`. This prevents offering variants of the same plan (e.g., same plan but different periodicity or class quota). This story introduces a new **`plan_tipos`** table that holds plan variants, relocating the pricing/validity/classes columns from `planes` into `plan_tipos`. Each plan must have **at least one subtype** to be purchasable.

### Key rules

1. A plan can have one or many `plan_tipos`.
2. Each `plan_tipo` belongs to exactly one plan.
3. The `precio`, `vigencia_dias`, and `clases_incluidas` are now properties of the subtype, **not** the plan.
4. When creating or editing a plan, the administrator manages the subtypes inline within the same plan form.
5. When an athlete subscribes to a plan, they must **select a subtype first**; the subscription is created using the subtype's data.
6. `suscripciones` gets a new `plan_tipo_id` FK column that references the chosen subtype (snapshot FK — the record remains even if a subtype is later deactivated).
7. `clases_plan` on `suscripciones` continues to store the snapshot of `clases_incluidas` from the subtype at subscription time, to remain immutable after plan changes.
8. Plans without any active subtype cannot be subscribed to (the "Adquirir" button is hidden/disabled).

### Out of scope
- Automatic subtype expiration or scheduling.

---

## Expected Results

### Administrator
- Can navigate to `/portal/orgs/[tenant_id]/gestion-planes` and manage plans as before.
- When creating or editing a plan, the form includes an **inline "Subtypes" section** where subtypes can be added, edited, or removed.
- At least one subtype must exist for the plan to be saved (client-side validation).
- Each subtype row in the form shows: Name, Price, Validity (days), Classes Included, and an active toggle.
- Deleting the last active subtype of a plan produces a validation error.
- The plan list table shows a "Subtypes" column with the count or abbreviated list of subtypes.

### Athlete (usuario)
- Can view the plans list and see, for each plan, the available subtypes displayed as selectable cards/chips.
- When clicking "Adquirir", a **subtype selector step** appears before the payment comment step.
- The subscription is created with `plan_tipo_id = <selected subtype id>` and `clases_plan = <subtype.clases_incluidas>`.

---

## Database

### New Migration File
**File:** `supabase/migrations/20260319000300_plan_tipos.sql`

### New table: `plan_tipos`

```sql
create table if not exists public.plan_tipos (
  id             uuid          primary key default gen_random_uuid(),
  tenant_id      uuid          not null,
  plan_id        uuid          not null,
  nombre         varchar(100)  not null,
  descripcion    text,
  precio         numeric(10,2),
  vigencia_dias  integer,
  clases_incluidas integer,
  activo         boolean       not null default true,
  created_at     timestamptz   not null default timezone('utc', now()),
  updated_at     timestamptz   not null default timezone('utc', now()),

  constraint plan_tipos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint plan_tipos_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete cascade,
  constraint plan_tipos_precio_ck
    check (precio is null or precio >= 0),
  constraint plan_tipos_vigencia_ck
    check (vigencia_dias is null or vigencia_dias > 0),
  constraint plan_tipos_clases_ck
    check (clases_incluidas is null or clases_incluidas >= 0),
  constraint plan_tipos_nombre_plan_uk
    unique (plan_id, nombre)
);
```

### Extend `suscripciones`

```sql
alter table public.suscripciones
  add column if not exists plan_tipo_id uuid
    references public.plan_tipos(id) on delete set null;

create index if not exists idx_suscripciones_plan_tipo_id
  on public.suscripciones (plan_tipo_id);
```

### Deprecation of columns in `planes`
The columns `precio`, `vigencia_meses`, and `clases_incluidas` on `planes` **remain in place** in this migration but are treated as deprecated. They should be removed in a future cleanup migration after all application code transitions to `plan_tipos`. **Do not drop them in this migration** to avoid breaking existing data consistency during rollout.

### Indexes

```sql
create index if not exists idx_plan_tipos_plan_id  on public.plan_tipos (plan_id);
create index if not exists idx_plan_tipos_tenant_id on public.plan_tipos (tenant_id);
```

### RLS Policies for `plan_tipos`

```sql
-- Enable RLS
alter table public.plan_tipos enable row level security;

-- SELECT: any authenticated user (plans are visible to all)
create policy plan_tipos_select_authenticated on public.plan_tipos
  for select to authenticated using (true);

-- INSERT: only tenant admins
create policy plan_tipos_insert_admin on public.plan_tipos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = plan_tipos.tenant_id
        and mt.usuario_id = auth.uid()
        and mt.rol = 'administrador'
        and mt.activo = true
    )
  );

-- UPDATE: only tenant admins
create policy plan_tipos_update_admin on public.plan_tipos
  for update to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = plan_tipos.tenant_id
        and mt.usuario_id = auth.uid()
        and mt.rol = 'administrador'
        and mt.activo = true
    )
  );

-- DELETE: only tenant admins
create policy plan_tipos_delete_admin on public.plan_tipos
  for delete to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = plan_tipos.tenant_id
        and mt.usuario_id = auth.uid()
        and mt.rol = 'administrador'
        and mt.activo = true
    )
  );

grant select, insert, update, delete on public.plan_tipos to authenticated;
```

### Updated `plan_tipos` table overview

| Column            | Type            | Notes                                          |
|-------------------|-----------------|------------------------------------------------|
| `id`              | `uuid`          | PK                                             |
| `tenant_id`       | `uuid`          | FK → `tenants(id)` (denormalized for RLS)      |
| `plan_id`         | `uuid`          | FK → `planes(id)` ON DELETE CASCADE            |
| `nombre`          | `varchar(100)`  | e.g., "Mensual", "4 clases", "2 clases"        |
| `descripcion`     | `text`          | optional                                       |
| `precio`          | `numeric(10,2)` | moved from `planes.precio`                     |
| `vigencia_dias`   | `integer`       | renamed from `planes.duracion_dias`/`vigencia_meses`; unit is **days** |
| `clases_incluidas`| `integer`       | moved from `planes.clases_incluidas`           |
| `activo`          | `boolean`       | default `true`                                 |
| `created_at`      | `timestamptz`   | auto                                           |
| `updated_at`      | `timestamptz`   | updated via trigger or app layer               |

### Updated `suscripciones` table (delta)

| Column          | Type   | Notes                                                     |
|-----------------|--------|-----------------------------------------------------------|
| `plan_tipo_id`  | `uuid` | FK → `plan_tipos(id)` ON DELETE SET NULL; nullable for backward compat |

---

## API / Service Layer

### File: `src/services/supabase/portal/planes.service.ts`

Add / modify the following functions:

| Function                        | Description                                                   |
|---------------------------------|---------------------------------------------------------------|
| `getPlanTiposByPlan(planId)`     | Fetch all `plan_tipos` for a given plan (ordered by nombre)  |
| `createPlanTipo(input)`          | Insert a new plan_tipo record                                |
| `updatePlanTipo(id, input)`      | Update an existing plan_tipo record                          |
| `deletePlanTipo(id)`             | Hard-delete a plan_tipo (only allowed if no `suscripciones` reference it) |
| `getPlanes(tenantId)`            | Extend existing query to JOIN `plan_tipos` and include them nested in each plan object |

The `getPlanes` query should return each plan with an embedded `plan_tipos: PlanTipo[]` array to avoid N+1 queries in the UI. Use Supabase's PostgREST nested select syntax:

```ts
supabase
  .from('planes')
  .select(`*, plan_tipos(*), planes_disciplina(disciplina_id, disciplinas(id, nombre))`)
  .eq('tenant_id', tenantId)
  .order('nombre')
```

### File: `src/services/supabase/portal/suscripciones.service.ts`

- Update `createSuscripcion(input)` to accept and persist `plan_tipo_id`.
- Update `clases_plan` population logic: read `clases_incluidas` from the selected `plan_tipo` instead of from `planes`.
- Update `getSuscripcionesByAtleta` and `getSuscripciones` to join `plan_tipos` for display (subtype name, price).

---

## TypeScript Types

### File: `src/types/portal/planes.types.ts`

Add:

```ts
export interface PlanTipo {
  id: string;
  tenant_id: string;
  plan_id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  vigencia_dias?: number | null;
  clases_incluidas?: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanTipoInput {
  tenant_id: string;
  plan_id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  vigencia_dias?: number | null;
  clases_incluidas?: number | null;
  activo?: boolean;
}

export interface UpdatePlanTipoInput {
  nombre?: string;
  descripcion?: string | null;
  precio?: number | null;
  vigencia_dias?: number | null;
  clases_incluidas?: number | null;
  activo?: boolean;
}

export interface PlanTipoFormValues {
  nombre: string;
  descripcion: string;
  precio: string;          // string for input binding, parsed on submit
  vigencia_dias: string;   // string for input binding
  clases_incluidas: string;
  activo: boolean;
}
```

Extend the existing `Plan` interface to include the embedded subtypes:

```ts
export interface Plan {
  // ... existing fields ...
  plan_tipos?: PlanTipo[];
}
```

### File: `src/types/portal/suscripciones.types.ts`

Add `plan_tipo_id` to `CreateSuscripcionInput` and to the subscription view types:

```ts
export interface CreateSuscripcionInput {
  // ... existing fields ...
  plan_tipo_id?: string | null;
}
```

---

## Application Layer (Hooks)

### File: `src/hooks/portal/planes/usePlanForm.ts`

Extend to manage an inline list of `PlanTipoFormValues` within the plan form:

- State: `tiposForm: PlanTipoFormValues[]`
- Actions: `addTipo()`, `updateTipo(index, values)`, `removeTipo(index)`
- On submit: the hook first creates/updates the plan, then performs a diff-based upsert of plan_tipos (create new, update existing, soft-delete removed ones with `activo = false`).
- Validation: at least one active subtype must be present; each subtype requires `nombre` and at least one of `precio` or `vigencia_dias`.

### File: `src/hooks/portal/planes/usePlanesView.ts`

No structural change. The fetched `Plan` objects will now include the nested `plan_tipos` array; expose `getActiveTipos(plan: Plan): PlanTipo[]` as a selector helper.

### File: `src/hooks/portal/planes/useSuscripcion.ts`

Extend to handle subtype selection:

- State: `selectedTipoId: string | null`
- Action: `selectTipo(id: string)`
- Validation: `selectedTipoId` must be set before the subscription can be submitted.
- On submit: pass `plan_tipo_id: selectedTipoId` and `clases_plan: selectedTipo.clases_incluidas` to the service.

---

## Presentation Layer (Components)

### File: `src/components/portal/planes/PlanFormModal.tsx`

Add an **"Subtypes" section** below the main plan fields:

- Renders a list of inline subtype rows (table or card style).
- Each row shows: Name*, Price, Validity (days), Classes, Active toggle, Remove button.
- An **"+ Add Subtype"** button appends a new empty row.
- If the form is in edit mode, existing subtypes are loaded and pre-populated.
- Client-side validation: at least one active subtype required.
- The section is visually separated with a heading "Tipos de plan / Subtipos".

### File: `src/components/portal/planes/PlanesTable.tsx`

Add a **"Subtypes"** column showing the count of active subtypes (e.g., "3 subtypes") or a dash if none. Clicking the count can open a tooltip/popover listing the subtype names.

### File: `src/components/portal/planes/SuscripcionModal.tsx`

Add a **subtype selection step** before the payment comment:

1. **Step 1 — Select subtype:** Show a list of active `plan_tipos` for the selected plan as selectable cards. Each card shows: Subtype Name, Price, Validity (days), Classes Included.
2. **Step 2 — Payment comment:** Existing comment + comprobante fields, unchanged.

The modal title should update to reflect the selected subtype, e.g., "Suscribirse a [Plan Name] — [Subtype Name]".

Disable the "Continue" CTA on step 1 if no subtype is selected.

---

## Files to Create / Modify

| File                                                                          | Action   | Description                                                  |
|-------------------------------------------------------------------------------|----------|--------------------------------------------------------------|
| `supabase/migrations/20260319000300_plan_tipos.sql`                           | CREATE   | DB migration: new table, data migration, FK, indexes, RLS    |
| `src/types/portal/planes.types.ts`                                            | MODIFY   | Add `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, `PlanTipoFormValues`; extend `Plan` |
| `src/types/portal/suscripciones.types.ts`                                     | MODIFY   | Add `plan_tipo_id` to subscription input/view types          |
| `src/services/supabase/portal/planes.service.ts`                              | MODIFY   | Add CRUD functions for `plan_tipos`; update `getPlanes` query |
| `src/services/supabase/portal/suscripciones.service.ts`                       | MODIFY   | Accept `plan_tipo_id`; read `clases_plan` from subtype       |
| `src/hooks/portal/planes/usePlanForm.ts`                                      | MODIFY   | Add inline subtype form state and diff-upsert logic          |
| `src/hooks/portal/planes/usePlanesView.ts`                                    | MODIFY   | Expose `getActiveTipos` selector                              |
| `src/hooks/portal/planes/useSuscripcion.ts`                                   | MODIFY   | Add `selectedTipoId` state and subtype-aware submit          |
| `src/components/portal/planes/PlanFormModal.tsx`                              | MODIFY   | Add inline subtype management section                        |
| `src/components/portal/planes/PlanesTable.tsx`                                | MODIFY   | Add "Subtypes" count column                                  |
| `src/components/portal/planes/SuscripcionModal.tsx`                           | MODIFY   | Add subtype selection step (step 1 of 2)                     |

---

## Acceptance Criteria

1. A `plan_tipos` table exists in the database with the schema described above.
2. The `suscripciones` table has a nullable `plan_tipo_id` FK column referencing `plan_tipos`.
4. Administrator can open the plan form modal and see a "Subtypes" section.
5. Administrator can add, edit, and remove subtypes within the plan form; changes are persisted on save.
6. Saving a plan without at least one active subtype shows a validation error.
7. The plan list table shows the count of active subtypes per plan.
8. An athlete viewing the plans page sees each plan's active subtypes displayed.
9. When clicking "Adquirir", the athlete is shown a subtype selection step before the payment comment step.
10. The subscription created after enrollment includes `plan_tipo_id` pointing to the chosen subtype and `clases_plan` matching the subtype's `clases_incluidas`.
11. RLS policies allow any authenticated user to SELECT `plan_tipos` and restrict INSERT/UPDATE/DELETE to tenant administrators only.
12. The `plan_tipos_nombre_plan_uk` unique constraint prevents duplicate subtype names within the same plan.

---

## Non-Functional Requirements

### Security
- All `plan_tipos` mutations are gated by RLS policies that verify the `administrador` role within the tenant.
- The `tenant_id` column on `plan_tipos` is populated from the parent plan at insertion time and must never be overrideable by the client.
- No direct user input is interpolated into raw SQL; all queries use parameterized Supabase client methods.

### Performance
- `plan_tipos` are fetched in a single nested query alongside plans (no N+1 queries).
- Indexes on `plan_id` and `tenant_id` ensure efficient lookups.

### Data Integrity
- `plan_tipos.plan_id` references `planes(id)` with `ON DELETE CASCADE` — deleting a plan cascades to its subtypes.
- `suscripciones.plan_tipo_id` references `plan_tipos(id)` with `ON DELETE SET NULL` — deactivating a subtype does not invalidate existing subscriptions.
- Removing a subtype with existing subscriptions should be blocked at the service layer (check before hard-delete).

### Backward Compatibility
- The deprecated columns `planes.precio`, `planes.vigencia_meses`, and `planes.clases_incluidas` remain in place for this iteration and are not read by new code paths but are not dropped. They will be removed in a future cleanup migration.
- Since there is no existing production data, no data migration script is required.
