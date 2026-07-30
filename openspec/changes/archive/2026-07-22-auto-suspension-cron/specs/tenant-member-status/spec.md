## MODIFIED Requirements

### Requirement: Sistema SHALL maintain an immutable audit log of admin-initiated and system-initiated member status changes
The system SHALL create a table `public.miembros_tenant_novedades` that records every status-change event for a tenant member. Each row SHALL capture: `id` (uuid PK), `tenant_id` (FK → tenants), `miembro_id` (FK → miembros_tenant), `tipo` (one of `'falta_pago' | 'inasistencias_acumuladas' | 'suspension_manual' | 'reactivacion' | 'otro'`), `descripcion` (nullable text), `estado_resultante` (one of `'activo' | 'mora' | 'suspendido' | 'inactivo'`), `registrado_por` (nullable FK → usuarios — the admin who made the change, or NULL for system-automated actions such as the suspension cron), and `created_at`. The table SHALL have no UPDATE or DELETE RLS policies — rows are append-only.

#### Scenario: Novedad row captures all required fields for admin action
- **WHEN** a status change is initiated by an admin
- **THEN** a row in `miembros_tenant_novedades` SHALL exist with non-null `tenant_id`, `miembro_id`, `tipo`, `estado_resultante`, non-null `registrado_por`, and `created_at`

#### Scenario: Novedad row captures system-automated action with null registrado_por
- **WHEN** a status change is initiated by the automated suspension cron
- **THEN** a row in `miembros_tenant_novedades` SHALL exist with non-null `tenant_id`, `miembro_id`, `tipo`, `estado_resultante`, `registrado_por = NULL`, and `created_at`

#### Scenario: tipo check constraint rejects invalid values
- **WHEN** an INSERT into `miembros_tenant_novedades` provides a `tipo` value outside the allowed set
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: estado_resultante check constraint rejects invalid values
- **WHEN** an INSERT provides `estado_resultante` outside `('activo', 'mora', 'suspendido', 'inactivo')`
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Novedades cannot be updated or deleted via normal application flows
- **WHEN** an authenticated user attempts to UPDATE or DELETE a row in `miembros_tenant_novedades` via the public API
- **THEN** the operation SHALL be denied (no UPDATE or DELETE RLS policies exist on the table)

#### Scenario: Admin can read novedades for their tenant
- **WHEN** an authenticated administrator queries `miembros_tenant_novedades` for their tenant
- **THEN** the query SHALL return all novedad rows for that tenant
