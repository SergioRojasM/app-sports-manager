## MODIFIED Requirements

### Requirement: miembros_tenant SHALL have a tenant-scoped estado column
The system SHALL add a `text` column `estado` to `public.miembros_tenant` with allowed values `('activo', 'mora', 'suspendido', 'inactivo', 'pendiente_activacion')`, enforced by a check constraint `miembros_tenant_estado_ck`. The column SHALL default to `'activo'`. On migration, all existing rows SHALL be backfilled from `usuarios.estado` using a bulk `UPDATE ... FROM usuarios WHERE ...`. This column represents the member's operational status within that specific tenant and is independent of `usuarios.estado`. The value `pendiente_activacion` SHALL be set only by administrator provisioning (`completar_alta_administrada`) and represents a membership that grants no tenant capabilities until activated.

#### Scenario: New membership defaults to activo
- **WHEN** a new membership row is inserted into `miembros_tenant` without specifying `estado`
- **THEN** the row SHALL have `estado = 'activo'`

#### Scenario: Check constraint rejects invalid estado values
- **WHEN** an `UPDATE` attempts to set `estado` to a value outside `('activo', 'mora', 'suspendido', 'inactivo', 'pendiente_activacion')`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: Check constraint accepts pendiente_activacion
- **WHEN** `completar_alta_administrada` inserts a membership with `estado = 'pendiente_activacion'`
- **THEN** the insert SHALL succeed

#### Scenario: Backfill copies usuarios.estado on migration
- **WHEN** the migration runs against a database with existing `miembros_tenant` rows
- **THEN** each row's `estado` SHALL equal the linked `usuarios.estado` value at migration time

#### Scenario: Member estado in Tenant A is independent of Tenant B
- **WHEN** user U is a member in both Tenant A and Tenant B and an admin of Tenant A changes U's estado to `suspendido`
- **THEN** U's membership row in Tenant B SHALL retain its previous `estado` value unchanged

---

### Requirement: Sistema SHALL maintain an immutable audit log of admin-initiated member status changes
The system SHALL create a table `public.miembros_tenant_novedades` that records every status-change event for a tenant member. Each row SHALL capture: `id` (uuid PK), `tenant_id` (FK → tenants), `miembro_id` (FK → miembros_tenant), `tipo` (one of `'falta_pago' | 'inasistencias_acumuladas' | 'suspension_manual' | 'reactivacion' | 'activacion_cuenta' | 'otro'`), `descripcion` (nullable text), `estado_resultante` (one of `'activo' | 'mora' | 'suspendido' | 'inactivo'`), `registrado_por` (FK → usuarios, the admin who made the change, or the member themselves when they activate their own provisioned account), and `created_at`. The table SHALL have no UPDATE or DELETE RLS policies — rows are append-only.

#### Scenario: Novedad row captures all required fields
- **WHEN** a status change is successfully recorded
- **THEN** a row in `miembros_tenant_novedades` SHALL exist with non-null `tenant_id`, `miembro_id`, `tipo`, `estado_resultante`, `registrado_por`, and `created_at`

#### Scenario: tipo check constraint rejects invalid values
- **WHEN** an INSERT into `miembros_tenant_novedades` provides a `tipo` value outside the allowed set
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: activacion_cuenta tipo is accepted
- **WHEN** a novedad is inserted with `tipo = 'activacion_cuenta'` and `estado_resultante = 'activo'`
- **THEN** the insert SHALL succeed

#### Scenario: estado_resultante check constraint rejects invalid values
- **WHEN** an INSERT provides `estado_resultante` outside `('activo', 'mora', 'suspendido', 'inactivo')`
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Novedades cannot be updated or deleted via normal application flows
- **WHEN** an authenticated user attempts to UPDATE or DELETE a row in `miembros_tenant_novedades` via the public API
- **THEN** the operation SHALL be denied (no UPDATE or DELETE RLS policies exist on the table)

#### Scenario: Admin can read novedades for their tenant
- **WHEN** an authenticated administrator queries `miembros_tenant_novedades` for their tenant
- **THEN** the query SHALL return all novedad rows for that tenant

---

### Requirement: cambiar_estado_miembro RPC SHALL atomically update estado and insert novedad
The system SHALL expose a Postgres function `public.cambiar_estado_miembro(p_miembro_id uuid, p_tenant_id uuid, p_nuevo_estado text, p_tipo text, p_descripcion text default null)` as a `SECURITY DEFINER` function. The function SHALL:
1. Verify the calling user (`auth.uid()`) is an `administrador` of `p_tenant_id`, raising `SQLSTATE 42501` if not.
2. Raise `SQLSTATE 22023` when `p_nuevo_estado = 'pendiente_activacion'`, or when the member's current estado is `pendiente_activacion` and `p_nuevo_estado` is not `activo` or `inactivo`.
3. `UPDATE miembros_tenant SET estado = p_nuevo_estado WHERE id = p_miembro_id AND tenant_id = p_tenant_id`, raising `SQLSTATE P0002` if no row is matched.
4. `INSERT INTO miembros_tenant_novedades` with `registrado_por = auth.uid()`.
5. When the member was `pendiente_activacion`, set the linked `altas_administradas_tenant` row to `activada` (with `activated_at = now()`) if the new estado is `activo`.

All writes occur within a single implicit Postgres transaction.

#### Scenario: Admin successfully changes member status
- **WHEN** an authenticated administrator calls `cambiar_estado_miembro` for a valid member in their tenant with a valid estado and tipo
- **THEN** `miembros_tenant.estado` SHALL be updated to the new value AND exactly one row SHALL be inserted into `miembros_tenant_novedades` with `estado_resultante = p_nuevo_estado`

#### Scenario: Non-admin caller is rejected
- **WHEN** an authenticated user without `administrador` role in the tenant calls `cambiar_estado_miembro`
- **THEN** the function SHALL raise an exception with SQLSTATE `42501` and neither the UPDATE nor INSERT SHALL be persisted

#### Scenario: Unknown member raises not-found error
- **WHEN** `cambiar_estado_miembro` is called with a `p_miembro_id` that does not exist in the given `p_tenant_id`
- **THEN** the function SHALL raise an exception with SQLSTATE `P0002` and no novedad SHALL be inserted

#### Scenario: Status and novedad are atomic
- **WHEN** the novedad INSERT fails after the UPDATE succeeds (simulated by passing an invalid tipo)
- **THEN** the UPDATE SHALL also be rolled back and `miembros_tenant.estado` SHALL remain unchanged

#### Scenario: Admin activates a pending member
- **WHEN** an administrator calls the RPC for a `pendiente_activacion` member with `p_nuevo_estado = 'activo'` and `p_tipo = 'activacion_cuenta'`
- **THEN** the membership SHALL become `activo`, a novedad SHALL be inserted, and the linked alta SHALL become `activada`

#### Scenario: Admin inactivates a pending member
- **WHEN** an administrator calls the RPC for a `pendiente_activacion` member with `p_nuevo_estado = 'inactivo'`
- **THEN** the membership SHALL become `inactivo` and a novedad SHALL be inserted

#### Scenario: Pending member cannot move to mora or suspendido
- **WHEN** an administrator calls the RPC for a `pendiente_activacion` member with `p_nuevo_estado = 'suspendido'`
- **THEN** the function SHALL raise `22023` and the membership SHALL remain `pendiente_activacion`

#### Scenario: No transition into pendiente_activacion
- **WHEN** an administrator calls the RPC with `p_nuevo_estado = 'pendiente_activacion'` for any member
- **THEN** the function SHALL raise `22023` and nothing SHALL be persisted

---

### Requirement: CambiarEstadoModal SHALL allow admins to change a member's tenant status with a required justification
`CambiarEstadoModal` SHALL be a controlled modal component that receives `member: MiembroTableItem | null`, `isOpen: boolean`, `onClose: () => void`, and `onConfirm: (nuevoEstado, tipo, descripcion?) => Promise<void>` props. The modal SHALL display the member's name in the title ("Cambiar estado de [Nombre Apellido]") and their current `estado` via `EquipoStatusBadge`. It SHALL render three fields:
- `nuevoEstado` (required select: Activo, Mora, Suspendido, Inactivo). When `member.estado === 'pendiente_activacion'`, only Activo and Inactivo are offered. "Pendiente de activación" is never offered as a target.
- `tipo` (required select: Falta de pago, Inasistencias acumuladas, Suspensión manual, Reactivación, Activación de cuenta, Otro).
- `descripcion` (optional textarea, max 500 chars).

On confirm it SHALL call `onConfirm`, show a loading state while in flight, close on success, and display an inline error on failure without closing.

#### Scenario: Modal title includes member name
- **WHEN** `CambiarEstadoModal` opens for a member
- **THEN** the modal title SHALL read "Cambiar estado de [Nombre Apellido]"

#### Scenario: Current estado is displayed before the form
- **WHEN** the modal opens
- **THEN** the member's current `estado` SHALL be shown as an `EquipoStatusBadge`

#### Scenario: Confirm button is disabled while required fields are empty
- **WHEN** `nuevoEstado` or `tipo` is not selected
- **THEN** the confirm button SHALL be disabled

#### Scenario: Confirm triggers onConfirm and closes modal on success
- **WHEN** the admin selects valid `nuevoEstado` and `tipo` and clicks confirm
- **THEN** `onConfirm` SHALL be called, the modal SHALL show loading, and SHALL close after the promise resolves

#### Scenario: Inline error is shown on failure without closing
- **WHEN** `onConfirm` rejects
- **THEN** the modal SHALL remain open and SHALL display the error message inline; the form SHALL return to an active (non-loading) state

#### Scenario: Pending member options are restricted
- **WHEN** the modal opens for a member with `estado = 'pendiente_activacion'`
- **THEN** the `nuevoEstado` select SHALL offer only Activo and Inactivo

#### Scenario: Pendiente de activación is never a target option
- **WHEN** the modal opens for any member
- **THEN** the `nuevoEstado` select SHALL NOT include "Pendiente de activación"
