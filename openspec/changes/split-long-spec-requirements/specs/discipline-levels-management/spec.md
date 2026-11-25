# Spec Delta

## MODIFIED Requirements

### Requirement: nivel_disciplina database migration SHALL create correct schema
The migration SHALL create `public.nivel_disciplina` with columns `id`, `tenant_id` (FK → `public.tenants`), `disciplina_id` (FK → `public.disciplinas`), `nombre varchar(50)`, `orden integer`, `activo boolean DEFAULT true`, `created_at timestamptz DEFAULT now()`.

#### Scenario: Valid nivel_disciplina row is inserted
- **WHEN** an authenticated administrator inserts a valid row into `public.nivel_disciplina`
- **THEN** the insert SHALL succeed and the row SHALL be retrievable

#### Scenario: orden = 0 is rejected by check constraint
- **WHEN** a row is inserted with `orden = 0`
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Deleting a disciplina cascades to its nivel_disciplina rows
- **WHEN** a `public.disciplinas` row is deleted
- **THEN** all associated `nivel_disciplina` rows for that discipline SHALL be deleted via CASCADE

## ADDED Requirements

### Requirement: nivel_disciplina constraints
`public.nivel_disciplina` SHALL enforce `UNIQUE (tenant_id, disciplina_id, nombre)`, `UNIQUE (tenant_id, disciplina_id, orden)` and `CHECK (orden > 0)`.

#### Scenario: Duplicate orden in the same discipline is rejected
- **WHEN** a row is inserted with an `orden` already used by another level of the same `(tenant_id, disciplina_id)`
- **THEN** the database SHALL reject the insert with a unique constraint violation

#### Scenario: Same name in another discipline is accepted
- **WHEN** a level named "Principiante" exists for one discipline and another is inserted with that name for a different discipline
- **THEN** the insert SHALL succeed

### Requirement: nivel_disciplina row-level security
RLS on `public.nivel_disciplina` SHALL allow SELECT to any authenticated member of the tenant and restrict INSERT / UPDATE / DELETE to the tenants returned by `get_admin_tenants_for_authenticated_user()`.

#### Scenario: Member reads levels
- **WHEN** an authenticated athlete of the tenant selects its levels
- **THEN** the rows SHALL be returned

#### Scenario: Non-administrator write is denied
- **WHEN** a trainer or athlete attempts to insert, update or delete a level
- **THEN** RLS SHALL deny the operation

### Requirement: nivel_disciplina lookup index
An index on `(tenant_id, disciplina_id)` SHALL exist on `public.nivel_disciplina`.

#### Scenario: Index present after migration
- **WHEN** the migration has been applied
- **THEN** the catalog SHALL list an index of `public.nivel_disciplina` on `(tenant_id, disciplina_id)`
