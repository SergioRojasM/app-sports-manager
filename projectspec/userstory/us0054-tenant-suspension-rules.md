# US-0054 — Tenant Suspension Rules Configuration

## ID
US-0054

## Name
Tenant Suspension Rules Configuration

## As a
Organization administrator

## I Want
To define up to 3 automatic suspension rules for my tenant, specifying how many consecutive absences (within a subscription or within a rolling window of days) trigger a suspension and how long that suspension lasts

## So That
Athletes who accumulate the configured number of absences are flagged (or can be automatically suspended), reducing the need for manual intervention and enforcing attendance accountability

---

## Description

### Current State
There is no mechanism for a tenant to configure absence-based suspension rules. Administrators must manually monitor attendance and block members when needed. The `tenants` table and its companion tables have no concept of suspension thresholds.

### Proposed Changes

#### Data Model
A new table `tenant_reglas_suspension` is added as a child of `tenants` (max 3 rows per tenant enforced via a check constraint + application-level guard). Each rule captures:

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | Unique identifier |
| `tenant_id` | `uuid` FK → `tenants.id` | Owning organization |
| `nombre` | `varchar(100)` NOT NULL | Human-readable rule name (e.g., "Suspensión por acumulación mensual") |
| `num_inasistencias` | `integer` NOT NULL ≥ 1 | Number of absences that trigger the suspension |
| `por_suscripcion` | `boolean` NOT NULL DEFAULT `false` | When `true`, counts absences accumulated within the same active subscription |
| `por_dias_atras` | `integer` NOT NULL DEFAULT `0` ≥ 0 | When > 0, counts absences in the last N calendar days. `0` means this dimension is not used |
| `duracion` | `integer` NOT NULL DEFAULT `0` ≥ 0 | Suspension length in days. `0` = indefinite (until manually unlocked by admin) |
| `activo` | `boolean` NOT NULL DEFAULT `true` | Allows soft-disabling a rule without deleting it |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-updated via trigger |

**Constraints:**
- `tenant_id + nombre` unique per tenant
- `num_inasistencias >= 1` check
- `por_dias_atras >= 0` check
- `duracion >= 0` check
- At least one of `por_suscripcion = true` OR `por_dias_atras > 0` must be true (enforced at application level in the form)
- Maximum 3 active rules per tenant (enforced at application level before insert)

#### UI
A new card `TenantReglasSuspensionCard` is added to the `gestion-organizacion` page, rendered below `TenantPaymentMethodsCard`. It follows the same card/list/modal pattern as `TenantPaymentMethodsCard`:
- Displays a list of current rules (compact rows) or an empty state if none exist
- Shows a disabled "Add Rule" button with a tooltip when 3 rules already exist
- Each row has edit and delete actions
- A right-side slide-in `ReglaSuspensionFormModal` handles both create and edit (mode: `'create' | 'edit'`)

**Form fields in the modal:**
- `nombre` — text input (required, max 100)
- `num_inasistencias` — integer input (required, min 1; label: "Número de inasistencias")
- `por_suscripcion` — toggle/checkbox (label: "Contar inasistencias en la suscripción activa")
- `por_dias_atras` — integer input (min 0, step 1; label: "En los últimos N días"; `0` displays as "No aplica")
- `duracion` — integer input (min 0, step 1; label: "Duración de la suspensión (días)"; `0` displays as "Permanente")
- `activo` — toggle (label: "Regla activa")

**Validation in form:**
- `nombre` required, max 100 chars
- `num_inasistencias` required ≥ 1
- At least one condition (`por_suscripcion = true` OR `por_dias_atras > 0`) must be set — show inline error if neither
- `por_dias_atras` ≥ 0
- `duracion` ≥ 0
- On create: if tenant already has 3 rules, the modal must not open (guard in hook); "New rule" button renders disabled with tooltip "Máximo 3 reglas por organización"

---

## Database Changes

```sql
-- Migration: 20260407000100_tenant_reglas_suspension.sql

create table if not exists public.tenant_reglas_suspension (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null,
  nombre             varchar(100) not null,
  num_inasistencias  integer not null default 1,
  por_suscripcion    boolean not null default false,
  por_dias_atras     integer not null default 0,
  duracion           integer not null default 0,
  activo             boolean not null default true,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  constraint tenant_reglas_suspension_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint tenant_reglas_suspension_tenant_nombre_uk
    unique (tenant_id, nombre),
  constraint tenant_reglas_suspension_num_inasistencias_ck
    check (num_inasistencias >= 1),
  constraint tenant_reglas_suspension_por_dias_atras_ck
    check (por_dias_atras >= 0),
  constraint tenant_reglas_suspension_duracion_ck
    check (duracion >= 0)
);

create index if not exists idx_tenant_reglas_suspension_tenant_id
  on public.tenant_reglas_suspension (tenant_id);

-- Auto-update updated_at
drop trigger if exists tenant_reglas_suspension_set_updated_at on public.tenant_reglas_suspension;
create trigger tenant_reglas_suspension_set_updated_at
  before update on public.tenant_reglas_suspension
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tenant_reglas_suspension enable row level security;
grant select, insert, update, delete on table public.tenant_reglas_suspension to authenticated;

-- SELECT: any authenticated user (read-only for non-admins)
drop policy if exists tenant_reglas_suspension_select_member on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_select_member on public.tenant_reglas_suspension
  for select to authenticated using (true);

-- INSERT: admin only
drop policy if exists tenant_reglas_suspension_insert_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_insert_admin on public.tenant_reglas_suspension
  for insert to authenticated
  with check (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- UPDATE: admin only
drop policy if exists tenant_reglas_suspension_update_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_update_admin on public.tenant_reglas_suspension
  for update to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  )
  with check (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- DELETE: admin only
drop policy if exists tenant_reglas_suspension_delete_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_delete_admin on public.tenant_reglas_suspension
  for delete to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );
```

---

## API / Server Actions

All operations go through the Supabase JS client (no edge functions needed).

**File:** `src/services/supabase/portal/reglas-suspension.service.ts`

### `getReglasSuspension(tenantId: string): Promise<ReglaSuspension[]>`
- Query: `SELECT * FROM tenant_reglas_suspension WHERE tenant_id = $1 ORDER BY created_at ASC`
- Returns all rules for a tenant (max 3)
- No auth header needed beyond the session token (RLS handles it)

### `createReglaSuspension(payload: ReglaSuspensionCreatePayload): Promise<ReglaSuspension>`
- `INSERT INTO tenant_reglas_suspension (...) VALUES (...) RETURNING *`
- Input: `{ tenant_id, nombre, num_inasistencias, por_suscripcion, por_dias_atras, duracion, activo }`
- Returns the created row
- RLS: admin only

### `updateReglaSuspension(id: string, payload: ReglaSuspensionUpdatePayload): Promise<ReglaSuspension>`
- `UPDATE tenant_reglas_suspension SET ... WHERE id = $1 RETURNING *`
- Input: Partial of `{ nombre, num_inasistencias, por_suscripcion, por_dias_atras, duracion, activo }`
- Returns the updated row
- RLS: admin only (tenant_id matched via RLS policy)

### `deleteReglaSuspension(id: string): Promise<void>`
- `DELETE FROM tenant_reglas_suspension WHERE id = $1`
- RLS: admin only

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260407000100_tenant_reglas_suspension.sql` | New table, indexes, trigger, RLS |
| Types | `src/types/portal/reglas-suspension.types.ts` | New: `ReglaSuspension`, `ReglaSuspensionCreatePayload`, `ReglaSuspensionUpdatePayload`, `ReglaSuspensionFormValues` |
| Service | `src/services/supabase/portal/reglas-suspension.service.ts` | New: `getReglasSuspension`, `createReglaSuspension`, `updateReglaSuspension`, `deleteReglaSuspension` |
| Hook | `src/hooks/portal/tenant/useReglasSuspension.ts` | New: CRUD state, 3-rule limit guard, modal open/close, error state |
| Component | `src/components/portal/tenant/TenantReglasSuspensionCard.tsx` | New: list card with empty state, add button (disabled at ≥3), rule rows |
| Component | `src/components/portal/tenant/ReglaSuspensionFormModal.tsx` | New: right-side slide-in modal, create/edit mode, full validation |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` | Add `<TenantReglasSuspensionCard tenantId={tenantId} />` below `TenantPaymentMethodsCard` |

---

## Acceptance Criteria

1. The `tenant_reglas_suspension` table is created in the database with all specified columns, constraints, indexes, and RLS policies.
2. The `gestion-organizacion` page shows a "Suspension Rules" section below the Payment Methods section when accessed by an admin.
3. The section displays an empty-state message ("No hay reglas configuradas") when no rules exist.
4. An admin can create a new suspension rule; it appears in the list immediately after saving.
5. The "New rule" button is disabled and shows a tooltip "Máximo 3 reglas por organización" when 3 rules already exist.
6. An admin can edit any existing rule via the form modal; changes are reflected immediately in the list.
7. An admin can delete a rule; it is removed from the list immediately.
8. The form validates that `nombre` is non-empty (max 100 chars) and `num_inasistencias ≥ 1`.
9. The form shows an inline error if neither `por_suscripcion` nor `por_dias_atras > 0` is set when submitting.
10. `por_dias_atras = 0` renders as "No aplica" in both the form hint and the rule row display.
11. `duracion = 0` renders as "Permanente" in both the form hint and the rule row display.
12. A non-admin user cannot see the add/edit/delete controls (buttons are not rendered for non-admin roles).
13. RLS policies prevent any non-admin from inserting, updating, or deleting a rule even via direct API calls.
14. The `activo` toggle works: inactive rules are shown with a dimmed style in the list.
15. Toast notifications appear on successful create, update, and delete operations, and on error.

---

## Implementation Steps

- [ ] Create and apply migration `20260407000100_tenant_reglas_suspension.sql`
- [ ] Define types in `src/types/portal/reglas-suspension.types.ts` (`ReglaSuspension`, `ReglaSuspensionCreatePayload`, `ReglaSuspensionUpdatePayload`, `ReglaSuspensionFormValues`)
- [ ] Create service `src/services/supabase/portal/reglas-suspension.service.ts` with all four CRUD functions
- [ ] Create hook `src/hooks/portal/tenant/useReglasSuspension.ts` (fetch, create, update, delete, modal state, 3-rule limit guard)
- [ ] Create `ReglaSuspensionFormModal.tsx` with controlled form, validation, create/edit mode
- [ ] Create `TenantReglasSuspensionCard.tsx` with list rendering, empty state, and add button with limit guard
- [ ] Add `<TenantReglasSuspensionCard tenantId={tenantId} />` to `gestion-organizacion/page.tsx`
- [ ] Verify RLS policies in Supabase Studio (test insert/update/delete as non-admin → expect 403)
- [ ] Test manually: create 1st, 2nd, 3rd rule → verify add button disables; delete one → verify button re-enables
- [ ] Test form validation: submit with empty nombre, with num_inasistencias = 0, with no condition selected
- [ ] Test `duracion = 0` and `por_dias_atras = 0` display as "Permanente" / "No aplica"
- [ ] Test edit: change nombre and num_inasistencias → verify list reflects updated values

---

## Non-Functional Requirements

- **Security**: RLS policies restrict insert/update/delete to admins of the tenant only using `get_admin_tenants_for_authenticated_user()`. Select is open to all authenticated users (consistent with `tenant_metodos_pago` pattern). The 3-rule maximum is enforced both in the hook (application layer) and can optionally be added as a DB-level trigger for extra safety.
- **Performance**: The `idx_tenant_reglas_suspension_tenant_id` index ensures fast lookup by tenant. The result set is always ≤ 3 rows, so no pagination is needed.
- **Accessibility**: The form modal must be keyboard-navigable. The disabled "Add Rule" button must include an `aria-disabled="true"` attribute and a visible tooltip. Integer inputs must have proper `min` attributes.
- **Error handling**: Service errors surface as toast notifications (error variant). Form submission errors from the DB (e.g., duplicate `nombre`) map to an inline field error under the `nombre` input.
