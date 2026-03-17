## ADDED Requirements

### Requirement: Administrator and coach can assign a discipline level to an athlete
The system SHALL allow authenticated users with `administrador` or `entrenador` role to assign (upsert) a certified level to any tenant member for a given discipline. The operation SHALL use `UPSERT` on the unique key `(usuario_id, tenant_id, disciplina_id)` — creating the row if absent or updating `nivel_id` if already present. The `asignado_por` column SHALL be set from `auth.uid()` in the service layer, never from client input.

#### Scenario: Administrator assigns a level to an athlete
- **WHEN** an administrator selects a level for a discipline in `AsignarNivelModal` and submits
- **THEN** the system SHALL upsert a row in `public.usuario_nivel_disciplina` with the correct `usuario_id`, `tenant_id`, `disciplina_id`, `nivel_id`, and `asignado_por = auth.uid()`

#### Scenario: Coach assigns a level to an athlete
- **WHEN** an authenticated user with `entrenador` role submits the `AsignarNivelModal` for a member
- **THEN** the system SHALL upsert the `usuario_nivel_disciplina` row and the operation SHALL succeed under RLS

#### Scenario: Re-assigning an existing level updates the record
- **WHEN** an administrator selects a different level for a discipline that the athlete already has a record for
- **THEN** the system SHALL update the existing `usuario_nivel_disciplina` row with the new `nivel_id` and `asignado_por`

#### Scenario: Athlete role cannot mutate usuario_nivel_disciplina
- **WHEN** an authenticated user with `atleta` role attempts to insert or update a `usuario_nivel_disciplina` row
- **THEN** the database RLS policy SHALL deny the operation

---

### Requirement: AsignarNivelModal SHALL pre-populate current assigned levels
`AsignarNivelModal` SHALL fetch the existing `usuario_nivel_disciplina` records for the target user and tenant on open. For each discipline that has at least one active `nivel_disciplina` row for the tenant, the modal SHALL show a dropdown pre-selected to the athlete's current level (if any).

#### Scenario: Modal opens with current level pre-selected
- **WHEN** an administrator opens `AsignarNivelModal` for an athlete who already has a level assigned for "Natación"
- **THEN** the dropdown for "Natación" SHALL be pre-selected to that athlete's current level

#### Scenario: Modal opens with empty selection for unassigned discipline
- **WHEN** an administrator opens `AsignarNivelModal` for a discipline where the athlete has no `usuario_nivel_disciplina` record
- **THEN** the dropdown for that discipline SHALL show no pre-selected value (placeholder state)

#### Scenario: Modal only shows disciplines with at least one active level
- **WHEN** the modal opens for a tenant
- **THEN** only disciplines that have at least one `nivel_disciplina` row with `activo = true` SHALL appear in the modal

---

### Requirement: usuario_nivel_disciplina enforces one level per user per discipline per tenant
The table SHALL enforce the unique constraint `(usuario_id, tenant_id, disciplina_id)` so that a user can hold at most one certified level per discipline per tenant.

#### Scenario: Upsert replaces the existing row rather than inserting a duplicate
- **WHEN** an upsert is issued for `(usuario_id, tenant_id, disciplina_id)` that already exists
- **THEN** the existing row SHALL be updated (not a second row inserted)

#### Scenario: Deleting a nivel_disciplina row referenced by usuario_nivel_disciplina is blocked
- **WHEN** an attempt is made to delete a `nivel_disciplina` row that is referenced by `usuario_nivel_disciplina`
- **THEN** the database SHALL reject the delete with an FK RESTRICT violation

---

### Requirement: usuario_nivel_disciplina database migration SHALL create correct schema
The migration SHALL create `public.usuario_nivel_disciplina` with columns `id`, `usuario_id` (FK → `public.usuarios` ON DELETE CASCADE), `tenant_id` (FK → `public.tenants` ON DELETE CASCADE), `disciplina_id` (FK → `public.disciplinas` ON DELETE CASCADE), `nivel_id` (FK → `public.nivel_disciplina` ON DELETE RESTRICT), `asignado_por` (FK → `public.usuarios`), `created_at`, `updated_at`. It SHALL include:
- `UNIQUE (usuario_id, tenant_id, disciplina_id)`
- RLS: SELECT for authenticated tenant members; INSERT/UPDATE restricted to `get_trainer_or_admin_tenants_for_authenticated_user()`; no DELETE policy
- Indexes on `(usuario_id, tenant_id)` and `nivel_id`

#### Scenario: Valid usuario_nivel_disciplina row is inserted by admin
- **WHEN** an authenticated administrator inserts a valid row into `public.usuario_nivel_disciplina`
- **THEN** the insert SHALL succeed

#### Scenario: Index on nivel_id exists for FK lookup performance
- **WHEN** the migration is applied
- **THEN** an index SHALL exist on `public.usuario_nivel_disciplina.nivel_id`
