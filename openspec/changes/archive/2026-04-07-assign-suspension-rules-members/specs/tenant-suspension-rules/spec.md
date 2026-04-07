## MODIFIED Requirements

### Requirement: tenant_reglas_suspension table exists with correct structure
The system SHALL have a `public.tenant_reglas_suspension` table with columns: `id uuid PK`, `tenant_id uuid FK→tenants`, `nombre varchar(100) NOT NULL`, `num_inasistencias integer NOT NULL DEFAULT 1`, `por_suscripcion boolean NOT NULL DEFAULT false`, `por_dias_atras integer NOT NULL DEFAULT 0`, `duracion integer NOT NULL DEFAULT 0`, `activo boolean NOT NULL DEFAULT true`, `created_at timestamptz`, `updated_at timestamptz`. The table SHALL have constraints: unique `(tenant_id, nombre)`, `num_inasistencias >= 1`, `por_dias_atras >= 0`, `duracion >= 0`, cascade delete on `tenant_id`. An index SHALL exist on `tenant_id`. The `miembros_tenant` table SHALL reference this table via `tenant_regla_suspension_id uuid NULL` with `ON DELETE SET NULL`.

#### Scenario: Table is created after migration
- **WHEN** migration `20260407000100_tenant_reglas_suspension.sql` is applied
- **THEN** `public.tenant_reglas_suspension` SHALL exist with all specified columns, constraints, and the `idx_tenant_reglas_suspension_tenant_id` index

#### Scenario: updated_at is auto-updated on row change
- **WHEN** any row in `tenant_reglas_suspension` is updated
- **THEN** the `updated_at` column SHALL be set to the current UTC timestamp via the `set_updated_at` trigger

#### Scenario: Duplicate nombre for same tenant is rejected
- **WHEN** an INSERT uses a `(tenant_id, nombre)` pair that already exists
- **THEN** the database SHALL reject the operation with a unique constraint violation

#### Scenario: num_inasistencias below 1 is rejected
- **WHEN** an INSERT or UPDATE sets `num_inasistencias = 0`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: Deleting a rule cascades SET NULL on member assignments
- **WHEN** a `tenant_reglas_suspension` row is deleted and 3 members had that rule assigned
- **THEN** all 3 `miembros_tenant` rows SHALL have `tenant_regla_suspension_id` set to `NULL`
