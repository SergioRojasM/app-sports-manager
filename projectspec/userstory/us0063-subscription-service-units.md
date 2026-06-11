# US-0063 — Subscription Service Units Population

## ID
US-0063

## Name
Load Service Units into Subscription on Plan Purchase

## As a
System (triggered when an athlete or admin creates a subscription)

## I Want
The system to automatically populate a per-service unit ledger on the subscription at creation time, based on the service assignments configured in the purchased plan subtype (`plan_tipo`)

## So That
Each subscription tracks how many units per service the athlete is entitled to, enabling future per-service deduction logic (e.g., bookings consuming units from the correct service counter)

---

## Description

### Current State
When a subscription is created (either self-service by the athlete via `SuscripcionModal`, or by an admin via `CrearSuscripcionModal`), the system stores a single `clases_restantes` integer on the `suscripciones` row. This counter is a flat total with no service distinction.

Plans now support multiple services via `plan_tipos_servicios` (US-0062): a `plan_tipo` can have N services, each with its own `unidades` (nullable — `NULL` means unlimited). The current subscription model cannot represent units per service.

### Proposed Changes

#### Design Decision: New Table vs. Column
A single `servicio_id` column on `suscripciones` would only support one service per subscription. Since a `plan_tipo` can have multiple service assignments (`plan_tipos_servicios`), the correct approach is a **new child table `suscripcion_servicios`** that stores one row per (subscription, service) pair.

#### New Table: `suscripcion_servicios`
Each row represents the service-unit entitlement for a specific service within a subscription:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `suscripcion_id` | `uuid` FK → `suscripciones` | `ON DELETE CASCADE` |
| `servicio_id` | `uuid` FK → `servicios` | `ON DELETE RESTRICT` |
| `unidades_incluidas` | `integer` nullable | Snapshot of `plan_tipos_servicios.unidades` at purchase time. `NULL` = unlimited. |
| `unidades_restantes` | `integer` nullable | Current remaining units. `NULL` = unlimited. Set equal to `unidades_incluidas` on insert. |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

Unique constraint: `(suscripcion_id, servicio_id)`.

#### Population Logic
When a subscription is created **with a `plan_tipo_id`**:
1. Query `plan_tipos_servicios` for all active service assignments with that `plan_tipo_id`.
2. For each row, insert into `suscripcion_servicios` with `unidades_incluidas = plan_tipos_servicios.unidades` and `unidades_restantes = plan_tipos_servicios.unidades`.
3. This is performed by a new SECURITY DEFINER function `populate_suscripcion_servicios(p_suscripcion_id uuid, p_plan_tipo_id uuid)` called immediately after the subscription row is inserted.

If `plan_tipo_id` is `NULL` (plan without subtypes), no rows are inserted into `suscripcion_servicios`. The existing `clases_restantes` column on `suscripciones` is left unchanged and continues to serve the current booking deduction flow (addressed in the next US).

#### No Changes to the Booking/Deduction Flow
The `book_and_deduct_class` / `cancel_and_restore_class` RPCs are **not modified** in this story. Deduction logic that reads from `suscripcion_servicios` will be addressed in the next user story.

---

## Database Changes

### New table: `suscripcion_servicios`

```sql
create table if not exists public.suscripcion_servicios (
  id                 uuid        primary key default gen_random_uuid(),
  suscripcion_id     uuid        not null,
  servicio_id        uuid        not null,
  unidades_incluidas integer,
  unidades_restantes integer,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),

  constraint suscripcion_servicios_suscripcion_id_fkey
    foreign key (suscripcion_id) references public.suscripciones(id) on delete cascade,
  constraint suscripcion_servicios_servicio_id_fkey
    foreign key (servicio_id) references public.servicios(id) on delete restrict,
  constraint suscripcion_servicios_suscripcion_servicio_uk
    unique (suscripcion_id, servicio_id),
  constraint suscripcion_servicios_unidades_incluidas_ck
    check (unidades_incluidas is null or unidades_incluidas >= 0),
  constraint suscripcion_servicios_unidades_restantes_ck
    check (unidades_restantes is null or unidades_restantes >= 0)
);

create index if not exists idx_suscripcion_servicios_suscripcion_id
  on public.suscripcion_servicios (suscripcion_id);

create index if not exists idx_suscripcion_servicios_servicio_id
  on public.suscripcion_servicios (servicio_id);
```

### RLS on `suscripcion_servicios`

```sql
alter table public.suscripcion_servicios enable row level security;
grant select, insert, update, delete on table public.suscripcion_servicios to authenticated;

-- SELECT: own athlete OR tenant admin
create policy suscripcion_servicios_select
  on public.suscripcion_servicios for select to authenticated
  using (
    suscripcion_id in (
      select id from public.suscripciones
      where atleta_id = auth.uid()
         or tenant_id in (
           select id from public.get_admin_tenants_for_authenticated_user()
         )
    )
  );

-- INSERT / UPDATE / DELETE: only via SECURITY DEFINER function (revoke direct DML from authenticated)
-- No direct INSERT policy — all writes go through populate_suscripcion_servicios RPC
```

> **Note**: Direct INSERT/UPDATE/DELETE from `authenticated` role is blocked. All writes to `suscripcion_servicios` are performed by the `populate_suscripcion_servicios` SECURITY DEFINER function (which runs as the `postgres` superuser, bypassing RLS).

### updated_at trigger

```sql
drop trigger if exists suscripcion_servicios_set_updated_at on public.suscripcion_servicios;
create trigger suscripcion_servicios_set_updated_at
  before update on public.suscripcion_servicios
  for each row execute function public.set_updated_at();
```

### New SECURITY DEFINER function: `populate_suscripcion_servicios`

```sql
create or replace function public.populate_suscripcion_servicios(
  p_suscripcion_id uuid,
  p_plan_tipo_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.suscripcion_servicios (
    suscripcion_id,
    servicio_id,
    unidades_incluidas,
    unidades_restantes
  )
  select
    p_suscripcion_id,
    pts.servicio_id,
    pts.unidades,        -- NULL = unlimited
    pts.unidades         -- same snapshot value
  from public.plan_tipos_servicios pts
  where pts.plan_tipo_id = p_plan_tipo_id
  on conflict (suscripcion_id, servicio_id) do nothing;
end;
$$;

grant execute on function public.populate_suscripcion_servicios(uuid, uuid) to authenticated;
```

---

## API / Server Actions

### 1. `populate_suscripcion_servicios` (Supabase RPC)
- **File**: `supabase/migrations/{timestamp}_suscripcion_servicios.sql`
- **Verb**: Supabase RPC `rpc('populate_suscripcion_servicios', { p_suscripcion_id, p_plan_tipo_id })`
- **Input**: `p_suscripcion_id: uuid`, `p_plan_tipo_id: uuid`
- **Return**: `void`
- **Auth**: Callable by `authenticated`; writes bypass RLS via SECURITY DEFINER

### 2. `suscripcionesService.createSuscripcion()` — updated
- **File**: `src/services/supabase/portal/suscripciones.service.ts`
- **Change**: After inserting the subscription, if `plan_tipo_id` is set, call `rpc('populate_suscripcion_servicios', { p_suscripcion_id: data.id, p_plan_tipo_id })`.
- **Return**: `Suscripcion` (unchanged)

### 3. `gestionSuscripcionesService.crearSuscripcionAdmin()` — updated
- **File**: `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Change**: After inserting the subscription, if `payload.plan_tipo_id` is set, call `rpc('populate_suscripcion_servicios', { p_suscripcion_id: suscripcionData.id, p_plan_tipo_id: payload.plan_tipo_id })`.
- **Return**: `void` (unchanged)

### 4. `getSuscripcionServicios()` — new read function
- **File**: `src/services/supabase/portal/suscripciones.service.ts`
- **Input**: `suscripcionId: string`
- **Return**: `SuscripcionServicio[]`
- **Auth**: Own athlete or tenant admin (enforced by RLS)
- **Purpose**: Used by future deduction UI and display components to show per-service unit balances.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260611000100_suscripcion_servicios.sql` | Create `suscripcion_servicios` table, RLS, trigger, `populate_suscripcion_servicios` RPC |
| Types | `src/types/portal/suscripciones.types.ts` | Add `SuscripcionServicio` type |
| Service | `src/services/supabase/portal/suscripciones.service.ts` | Update `createSuscripcion()` to call RPC; add `getSuscripcionServicios()` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Update `crearSuscripcionAdmin()` to call RPC after subscription insert |

---

## Acceptance Criteria

1. The `suscripcion_servicios` table exists in the database with all columns, constraints, indexes, and RLS policies as specified.
2. When a subscription is created **with a `plan_tipo_id`** that has one or more entries in `plan_tipos_servicios`, the system automatically inserts one row in `suscripcion_servicios` per service, with `unidades_incluidas` and `unidades_restantes` both set to the value from `plan_tipos_servicios.unidades`.
3. When `plan_tipos_servicios.unidades` is `NULL` (unlimited), the inserted `suscripcion_servicios` rows have both `unidades_incluidas = NULL` and `unidades_restantes = NULL`.
4. When a subscription is created **without a `plan_tipo_id`** (plan has no subtypes), no rows are inserted into `suscripcion_servicios`.
5. When a subscription is created via the **athlete self-service flow** (`SuscripcionModal` → `useSuscripcion.ts`), `suscripcion_servicios` is populated correctly.
6. When a subscription is created via the **admin flow** (`CrearSuscripcionModal` → `useCrearSuscripcion.ts`), `suscripcion_servicios` is populated correctly.
7. An athlete can SELECT their own `suscripcion_servicios` rows; they cannot INSERT, UPDATE, or DELETE directly.
8. A tenant admin can SELECT `suscripcion_servicios` for any subscription in their tenant; they cannot INSERT, UPDATE, or DELETE directly.
9. If `populate_suscripcion_servicios` is called twice for the same `(suscripcion_id, servicio_id)` pair, the second call is a silent no-op (`ON CONFLICT DO NOTHING`).
10. The existing `clases_restantes` column on `suscripciones` and the `book_and_deduct_class` / `cancel_and_restore_class` RPCs are **not modified** by this story.
11. `getSuscripcionServicios(suscripcionId)` returns all `suscripcion_servicios` rows for a given subscription, including the `servicio_id`, `unidades_incluidas`, and `unidades_restantes` fields.

---

## Implementation Steps

- [ ] Create migration `supabase/migrations/20260611000100_suscripcion_servicios.sql`:
  - Create `suscripcion_servicios` table with constraints and indexes
  - Enable RLS and define SELECT policy
  - Attach `set_updated_at` trigger
  - Create `populate_suscripcion_servicios` SECURITY DEFINER function and grant EXECUTE
- [ ] Apply migration locally: `npx supabase db reset` or `npx supabase migration up`
- [ ] Add `SuscripcionServicio` type to `src/types/portal/suscripciones.types.ts`
- [ ] Update `suscripcionesService.createSuscripcion()` in `src/services/supabase/portal/suscripciones.service.ts`:
  - After the subscription insert succeeds, if `payload.plan_tipo_id` is set, call `supabase.rpc('populate_suscripcion_servicios', { p_suscripcion_id: data.id, p_plan_tipo_id: payload.plan_tipo_id })`
  - Throw on RPC error
  - Add `getSuscripcionServicios(suscripcionId: string)` function
- [ ] Update `gestionSuscripcionesService.crearSuscripcionAdmin()` in `src/services/supabase/portal/gestion-suscripciones.service.ts`:
  - After the subscription insert succeeds, if `payload.plan_tipo_id` is set, call `supabase.rpc('populate_suscripcion_servicios', ...)`
  - Throw on RPC error (new specific error code: `'populate_servicios_failed'`)
- [ ] Verify RLS policies in Supabase Studio: athlete sees own rows, admin sees tenant rows, no direct INSERT from authenticated
- [ ] Test manually:
  - Create subscription for plan_tipo with 2 services → verify 2 rows in `suscripcion_servicios`
  - Create subscription for plan_tipo with unlimited service (unidades = NULL) → verify `NULL` values
  - Create subscription for plan without subtypes → verify 0 rows in `suscripcion_servicios`
  - Repeat via admin CrearSuscripcionModal flow
- [ ] Run full test of existing booking flow to confirm `book_and_deduct_class` still works correctly and `clases_restantes` still deducts properly

---

## Non-Functional Requirements

- **Security**:
  - `suscripcion_servicios` has no INSERT/UPDATE/DELETE RLS policies for `authenticated` role — all writes are exclusively through the `populate_suscripcion_servicios` SECURITY DEFINER function.
  - The RPC function validates that `p_plan_tipo_id` exists in `plan_tipos_servicios` implicitly (no rows inserted if invalid FK, since it's a SELECT join).
  - No athlete can directly modify their unit balances; `unidades_restantes` deduction will be done via SECURITY DEFINER RPCs in the next US.
- **Performance**:
  - Index on `suscripcion_servicios(suscripcion_id)` ensures fast lookup by subscription.
  - The `populate_suscripcion_servicios` function performs a single INSERT ... SELECT with no loops, making it O(N) where N is the number of services in the plan tipo (expected to be small, typically 1–5).
- **Accessibility**: No UI changes in this story.
- **Error handling**:
  - If `populate_suscripcion_servicios` RPC fails after the subscription is inserted, the service layer throws an error that surfaces to the user as a toast notification via the existing error-handling patterns in `useSuscripcion.ts` and `useCrearSuscripcion.ts`.
  - In `gestion-suscripciones.service.ts`, the new error case should use a distinct `GestionSuscripcionesServiceError` code (`'populate_servicios_failed'`) so the UI can display a specific message.
