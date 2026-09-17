## ADDED Requirements

### Requirement: admin_tenants SHALL store platform-owned per-tenant entitlements
The system SHALL create a table `public.admin_tenants` as a 1:1 extension of `public.tenants` with columns `tenant_id uuid primary key references public.tenants(id) on delete cascade`, `aprovisionamiento_administrado_habilitado boolean not null default false`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`. The table SHALL hold entitlements controlled by the platform owner and MUST NOT hold settings editable by tenant administrators.

#### Scenario: Flag defaults to disabled
- **WHEN** a row is inserted into `admin_tenants` without specifying `aprovisionamiento_administrado_habilitado`
- **THEN** the row SHALL have `aprovisionamiento_administrado_habilitado = false`

#### Scenario: Deleting a tenant removes its entitlements row
- **WHEN** a row in `public.tenants` is deleted
- **THEN** the matching `admin_tenants` row SHALL be deleted by cascade

#### Scenario: A tenant cannot have two entitlement rows
- **WHEN** an insert attempts a second `admin_tenants` row with an existing `tenant_id`
- **THEN** the database SHALL reject it with a primary key violation

---

### Requirement: Every tenant SHALL have exactly one admin_tenants row
The migration SHALL backfill one `admin_tenants` row for every existing tenant. An `after insert` trigger on `public.tenants` (`ensure_admin_tenant_row`) SHALL insert the default row for every new tenant using `on conflict (tenant_id) do nothing`.

#### Scenario: Existing tenants are backfilled
- **WHEN** the migration runs on a database with N tenants
- **THEN** `admin_tenants` SHALL contain exactly N rows, all with `aprovisionamiento_administrado_habilitado = false`

#### Scenario: New tenant receives a default row
- **WHEN** a new row is inserted into `public.tenants`
- **THEN** an `admin_tenants` row for that `tenant_id` SHALL exist with `aprovisionamiento_administrado_habilitado = false`

#### Scenario: Re-running the migration does not duplicate rows
- **WHEN** the backfill runs more than once
- **THEN** `admin_tenants` SHALL still contain exactly one row per tenant

---

### Requirement: RLS SHALL let tenant administrators only read their own entitlements
Row-Level Security SHALL be enabled on `public.admin_tenants` with a single SELECT policy allowing an authenticated user to read rows where `tenant_id` is in `get_admin_tenants_for_authenticated_user()`. There SHALL be no INSERT, UPDATE, or DELETE policy for the `authenticated` or `anon` roles; the platform owner SHALL write through the service role or direct database access. New SQL referencing the table SHALL qualify it as `public.admin_tenants` and MUST NOT use `admin_tenants` as an alias.

#### Scenario: Admin reads own tenant entitlements
- **WHEN** an administrator of tenant T selects from `admin_tenants`
- **THEN** the query SHALL return only the row for tenant T

#### Scenario: Admin cannot read other tenants' entitlements
- **WHEN** an administrator of tenant T selects the row for tenant U where they are not an administrator
- **THEN** the query SHALL return no rows

#### Scenario: Non-admin member cannot read entitlements
- **WHEN** a member with role `usuario` or `entrenador` of tenant T selects from `admin_tenants`
- **THEN** the query SHALL return no rows

#### Scenario: Tenant admin cannot enable the flag
- **WHEN** an administrator of tenant T attempts `update admin_tenants set aprovisionamiento_administrado_habilitado = true where tenant_id = T` through the public API
- **THEN** no row SHALL be updated

---

### Requirement: Tenant service SHALL expose the caller's tenant entitlements
`tenant.service.ts` SHALL expose `getTenantEntitlements(supabase, tenantId): Promise<AdminTenantEntitlements>` that reads the `admin_tenants` row and returns `{ aprovisionamientoAdministradoHabilitado: boolean }`. When no row is readable, it SHALL return `aprovisionamientoAdministradoHabilitado: false`. `useTenantEntitlements({ tenantId })` SHALL expose `entitlements`, `loading`, and `error`.

#### Scenario: Entitlement enabled is surfaced to the UI
- **WHEN** an administrator's tenant has `aprovisionamiento_administrado_habilitado = true`
- **THEN** `useTenantEntitlements` SHALL return `entitlements.aprovisionamientoAdministradoHabilitado === true`

#### Scenario: Unreadable row fails closed
- **WHEN** the caller cannot read the `admin_tenants` row for the tenant
- **THEN** `getTenantEntitlements` SHALL return `aprovisionamientoAdministradoHabilitado: false`
