# Capability: plan-subtypes

## Purpose
Manages plan subtypes (`plan_tipos`) that allow a single plan to offer multiple pricing and duration variants. Provides the database schema, RLS policies, TypeScript types, and service layer for CRUD operations on subtypes, along with UI integration in the plan form and athlete subscription flow.

## Requirements

### Requirement: plan_tipos table exists with required schema
The database SHALL contain a `public.plan_tipos` table with columns: `id` (uuid PK), `tenant_id` (uuid FK → `tenants`, NOT NULL), `plan_id` (uuid FK → `planes` ON DELETE CASCADE, NOT NULL), `nombre` (varchar(100), NOT NULL), `descripcion` (text, nullable), `precio` (numeric(10,2), nullable), `vigencia_dias` (integer, nullable), `clases_incluidas` (integer, nullable), `activo` (boolean NOT NULL default true), `created_at` (timestamptz), `updated_at` (timestamptz). A unique constraint `plan_tipos_nombre_plan_uk` on `(plan_id, nombre)` SHALL be enforced.

#### Scenario: Duplicate subtype name within the same plan is rejected
- **WHEN** an insert or update attempts to create a second `plan_tipos` row with the same `(plan_id, nombre)` combination
- **THEN** the database SHALL reject the operation with a unique constraint violation

#### Scenario: Deleting a plan cascades to its subtypes
- **WHEN** a `planes` row is hard-deleted
- **THEN** all associated `plan_tipos` rows SHALL be deleted automatically via ON DELETE CASCADE

#### Scenario: precio constraint rejects negative values
- **WHEN** a `plan_tipos` row is inserted or updated with `precio < 0`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: vigencia_dias constraint rejects non-positive values
- **WHEN** a `plan_tipos` row is inserted or updated with `vigencia_dias <= 0`
- **THEN** the database SHALL reject the operation with a check constraint violation

---

### Requirement: suscripciones extended with plan_tipo_id FK
The `public.suscripciones` table SHALL have a nullable `plan_tipo_id` column of type uuid referencing `public.plan_tipos(id)` with `ON DELETE SET NULL`. The column SHALL be nullable to preserve backward compatibility with existing subscription rows.

#### Scenario: Existing subscriptions are not broken
- **WHEN** the migration is applied to a database with existing `suscripciones` rows
- **THEN** all existing rows SHALL have `plan_tipo_id = null` and remain valid

#### Scenario: Deactivating a subtype does not invalidate subscriptions
- **WHEN** a `plan_tipos` row's `activo` is set to false
- **THEN** all `suscripciones` referencing that `plan_tipo_id` SHALL remain intact with their `plan_tipo_id` value unchanged

#### Scenario: Hard-deleting a subtype sets plan_tipo_id to null on subscriptions
- **WHEN** a `plan_tipos` row is hard-deleted
- **THEN** all `suscripciones` referencing that `plan_tipo_id` SHALL have `plan_tipo_id` set to null via ON DELETE SET NULL

---

### Requirement: RLS policies restrict plan_tipos mutations to tenant admins
The database SHALL enable Row Level Security on `plan_tipos`. SELECT SHALL be open to all authenticated users. INSERT, UPDATE, and DELETE SHALL be restricted to authenticated users with `rol = 'administrador'` and `activo = true` in `public.miembros_tenant` for the row's `tenant_id`.

#### Scenario: Any authenticated user can read plan subtypes
- **WHEN** an authenticated user issues a SELECT on `public.plan_tipos`
- **THEN** the database RLS SHALL allow the query to return all rows

#### Scenario: Tenant administrator can insert a subtype
- **WHEN** an authenticated administrator for a tenant inserts a `plan_tipos` row with a matching `tenant_id`
- **THEN** the database RLS SHALL permit the insert

#### Scenario: Non-administrator cannot insert a subtype
- **WHEN** an authenticated user with `rol = 'usuario'` or `rol = 'entrenador'` attempts to insert a `plan_tipos` row
- **THEN** the database RLS SHALL deny the insert

#### Scenario: Administrator can update and delete subtypes in their tenant
- **WHEN** an authenticated administrator issues UPDATE or DELETE on a `plan_tipos` row whose `tenant_id` matches a tenant they administrate
- **THEN** the database RLS SHALL permit the operation

#### Scenario: Administrator cannot mutate subtypes in a foreign tenant
- **WHEN** an authenticated administrator issues INSERT, UPDATE, or DELETE on a `plan_tipos` row whose `tenant_id` belongs to a tenant they do not administrate
- **THEN** the database RLS SHALL deny the operation

---

### Requirement: PlanTipo TypeScript interface and related input types are defined
The system SHALL define the following TypeScript types in `src/types/portal/planes.types.ts`:
- `PlanTipo` interface with all `plan_tipos` columns. The `clases_incluidas` field SHALL be typed as `number | null`, where `null` indicates unlimited classes.
- `CreatePlanTipoInput` for service create calls. The `clases_incluidas` field SHALL be typed as `number | null`.
- `UpdatePlanTipoInput` for service update calls. The `clases_incluidas` field SHALL be typed as `number | null`.
- `PlanTipoFormValues` for controlled form inputs (numeric fields as strings, `activo` as boolean). The `clases_incluidas` field SHALL remain typed as `string`; an empty string SHALL map to `null` (unlimited) at form submit time.
- The existing `PlanModalidad` type SHALL remain unchanged.

#### Scenario: PlanTipoFormValues clases_incluidas empty string maps to null
- **WHEN** a `PlanTipoFormValues` object has `clases_incluidas` set to an empty string `''`
- **THEN** the form submission logic SHALL map it to `null` in the `CreatePlanTipoInput` or `UpdatePlanTipoInput` payload, indicating unlimited classes

#### Scenario: PlanTipoFormValues clases_incluidas with numeric string maps to integer
- **WHEN** a `PlanTipoFormValues` object has `clases_incluidas` set to a numeric string like `'10'`
- **THEN** the form submission logic SHALL parse it to the integer `10` in the input payload

#### Scenario: PlanTipo.clases_incluidas null renders as unlimited in UI
- **WHEN** a `PlanTipo` record has `clases_incluidas = null`
- **THEN** the UI SHALL display "Ilimitadas" or "Sin límite" wherever class count is shown

#### Scenario: PlanModalidad rename does not change runtime values
- **WHEN** a plan's delivery modality is read or written
- **THEN** the valid string values `'virtual'`, `'presencial'`, `'mixto'` SHALL remain unchanged; only the TypeScript identifier changes from `PlanTipo` to `PlanModalidad`

#### Scenario: PlanTipoFormValues uses string types for numeric fields
- **WHEN** a `PlanTipoFormValues` object is constructed
- **THEN** `precio`, `vigencia_dias`, and `clases_incluidas` SHALL be typed as `string` to support controlled HTML inputs and SHALL be parsed to numbers only at form submit time

---

### Requirement: planesService exposes CRUD operations for plan_tipos
The system SHALL provide the following functions on `planesService` in `src/services/supabase/portal/planes.service.ts`:
- `getPlanTiposByPlan(planId: string): Promise<PlanTipo[]>` — returns all subtypes for a plan ordered by `nombre`.
- `createPlanTipo(input: CreatePlanTipoInput): Promise<PlanTipo>` — inserts a new subtype row.
- `updatePlanTipo(id: string, input: UpdatePlanTipoInput): Promise<PlanTipo>` — updates an existing subtype row.
- `deletePlanTipo(id: string): Promise<{ deleted: boolean; deactivated: boolean }>` — hard-deletes the row if no active or pending subscriptions reference it; otherwise soft-deactivates (`activo = false`) and returns `{ deleted: false, deactivated: true }`.

#### Scenario: deletePlanTipo hard-deletes when no active subscriptions exist
- **WHEN** `deletePlanTipo` is called for a subtype that has no `suscripciones` rows with `estado IN ('activa', 'pendiente')`
- **THEN** the service SHALL delete the `plan_tipos` row and return `{ deleted: true, deactivated: false }`

#### Scenario: deletePlanTipo soft-deactivates when active subscriptions exist
- **WHEN** `deletePlanTipo` is called for a subtype that has one or more `suscripciones` rows with `estado IN ('activa', 'pendiente')`
- **THEN** the service SHALL set `activo = false` on the `plan_tipos` row and return `{ deleted: false, deactivated: true }`

#### Scenario: getPlanes embeds plan_tipos in each plan object
- **WHEN** `getPlanes(tenantId)` is called
- **THEN** each returned plan object SHALL include a nested `plan_tipos: PlanTipo[]` array fetched in the same query (no N+1 queries)

---

### Requirement: indexes on plan_tipos ensure efficient lookups
The database SHALL create the following indexes on `public.plan_tipos`:
- `idx_plan_tipos_plan_id` on `(plan_id)`
- `idx_plan_tipos_tenant_id` on `(tenant_id)`

#### Scenario: Index exists after migration
- **WHEN** the migration `20260319000300_plan_tipos.sql` is applied
- **THEN** both indexes SHALL exist on the `plan_tipos` table
