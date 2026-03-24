## ADDED Requirements

### Requirement: miembros_tenant SHALL have a tenant-scoped estado column
The system SHALL add a `text` column `estado` to `public.miembros_tenant` with allowed values `('activo', 'mora', 'suspendido', 'inactivo')`, enforced by a check constraint `miembros_tenant_estado_ck`. The column SHALL default to `'activo'`. On migration, all existing rows SHALL be backfilled from `usuarios.estado` using a bulk `UPDATE ... FROM usuarios WHERE ...`. This column represents the member's operational status within that specific tenant and is independent of `usuarios.estado`.

#### Scenario: New membership defaults to activo
- **WHEN** a new membership row is inserted into `miembros_tenant` without specifying `estado`
- **THEN** the row SHALL have `estado = 'activo'`

#### Scenario: Check constraint rejects invalid estado values
- **WHEN** an `UPDATE` attempts to set `estado` to a value outside `('activo', 'mora', 'suspendido', 'inactivo')`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: Backfill copies usuarios.estado on migration
- **WHEN** the migration runs against a database with existing `miembros_tenant` rows
- **THEN** each row's `estado` SHALL equal the linked `usuarios.estado` value at migration time

#### Scenario: Member estado in Tenant A is independent of Tenant B
- **WHEN** user U is a member in both Tenant A and Tenant B and an admin of Tenant A changes U's estado to `suspendido`
- **THEN** U's membership row in Tenant B SHALL retain its previous `estado` value unchanged

---

### Requirement: Sistema SHALL maintain an immutable audit log of admin-initiated member status changes
The system SHALL create a table `public.miembros_tenant_novedades` that records every status-change event for a tenant member. Each row SHALL capture: `id` (uuid PK), `tenant_id` (FK → tenants), `miembro_id` (FK → miembros_tenant), `tipo` (one of `'falta_pago' | 'inasistencias_acumuladas' | 'suspension_manual' | 'reactivacion' | 'otro'`), `descripcion` (nullable text), `estado_resultante` (one of `'activo' | 'mora' | 'suspendido' | 'inactivo'`), `registrado_por` (FK → usuarios, the admin who made the change), and `created_at`. The table SHALL have no UPDATE or DELETE RLS policies — rows are append-only.

#### Scenario: Novedad row captures all required fields
- **WHEN** a status change is successfully recorded
- **THEN** a row in `miembros_tenant_novedades` SHALL exist with non-null `tenant_id`, `miembro_id`, `tipo`, `estado_resultante`, `registrado_por`, and `created_at`

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

---

### Requirement: Sistema SHALL expose v_miembros_equipo view with flat shape and inasistencias counter
The system SHALL create a Postgres view `public.v_miembros_equipo` that flattens the join of `miembros_tenant`, `usuarios`, and `roles`, and adds an `inasistencias_recientes` column: a count of `asistencias` rows where `asistio = false` linked via `reservas.atleta_id = miembros_tenant.usuario_id` and `reservas.tenant_id = miembros_tenant.tenant_id` in the last 30 days. The view SHALL NOT use `SECURITY DEFINER` so that RLS on underlying tables continues to apply. `estado` in the view SHALL come from `miembros_tenant.estado`.

#### Scenario: View returns flat row shape with inasistencias_recientes
- **WHEN** an admin queries `v_miembros_equipo` for a tenant
- **THEN** each row SHALL include `id`, `tenant_id`, `usuario_id`, `rol_id`, `estado` (from miembros_tenant), `inasistencias_recientes` (integer), and the flattened user/role fields

#### Scenario: inasistencias_recientes counts only the last 30 days
- **WHEN** a member has 3 absences older than 30 days and 2 absences within the last 30 days
- **THEN** `inasistencias_recientes` SHALL be `2`

#### Scenario: inasistencias_recientes is 0 when member has no recent absences
- **WHEN** a member has no `asistencias` rows with `asistio = false` in the last 30 days
- **THEN** `inasistencias_recientes` SHALL be `0`

#### Scenario: estado in the view reflects miembros_tenant.estado not usuarios.estado
- **WHEN** `miembros_tenant.estado` is `'mora'` and `usuarios.estado` is `'activo'`
- **THEN** the view SHALL return `estado = 'mora'` for that member row

---

### Requirement: cambiar_estado_miembro RPC SHALL atomically update estado and insert novedad
The system SHALL expose a Postgres function `public.cambiar_estado_miembro(p_miembro_id uuid, p_tenant_id uuid, p_nuevo_estado text, p_tipo text, p_descripcion text default null)` as a `SECURITY DEFINER` function. The function SHALL: (1) verify the calling user (`auth.uid()`) is an `administrador` of `p_tenant_id` — raising `SQLSTATE 42501` if not; (2) `UPDATE miembros_tenant SET estado = p_nuevo_estado WHERE id = p_miembro_id AND tenant_id = p_tenant_id` — raising `SQLSTATE P0002` if no row is matched; (3) `INSERT INTO miembros_tenant_novedades` with `registrado_por = auth.uid()`. Both writes occur within a single implicit Postgres transaction.

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

---

### Requirement: equipo.service SHALL expose cambiarEstadoMiembro and getNovedadesMiembro methods
`equipo.service.ts` SHALL expose two new methods:
- `cambiarEstadoMiembro(input: CambiarEstadoMiembroInput): Promise<void>` — calls `supabase.rpc('cambiar_estado_miembro', ...)` and throws `EquipoServiceError` on RPC failure.
- `getNovedadesMiembro(miembroId: string, tenantId: string): Promise<MiembroNovedad[]>` — queries `miembros_tenant_novedades` filtered by `miembro_id` and `tenant_id`, ordered by `created_at desc`.

Additionally, the existing `getEquipo` method SHALL be updated to query `v_miembros_equipo` instead of `miembros_tenant`, adapt `RawMiembroRow` to the flat view shape, and map `inasistencias_recientes` directly.

#### Scenario: cambiarEstadoMiembro delegates to the RPC
- **WHEN** `cambiarEstadoMiembro` is called with valid input
- **THEN** it SHALL call `supabase.rpc('cambiar_estado_miembro')` with the corresponding parameters and resolve without error on success

#### Scenario: cambiarEstadoMiembro surfaces RPC authorization errors
- **WHEN** the RPC returns a `42501` error code
- **THEN** `cambiarEstadoMiembro` SHALL throw an `EquipoServiceError` with code `'forbidden'`

#### Scenario: getNovedadesMiembro returns history ordered newest-first
- **WHEN** `getNovedadesMiembro` is called for a member with multiple novedades
- **THEN** the service SHALL return an array of `MiembroNovedad` objects sorted by `created_at` descending

#### Scenario: getEquipo uses v_miembros_equipo and includes inasistencias_recientes
- **WHEN** `getEquipo` is called for a tenant
- **THEN** the service SHALL query `v_miembros_equipo` and each returned `MiembroRow` SHALL include an `inasistencias_recientes` integer field

---

### Requirement: useEquipo hook SHALL expose cambiarEstado, getNovedades, and isCambiandoEstado
`useEquipo` SHALL expose:
- `cambiarEstado(miembroId: string, nuevoEstado: MiembroEstado, tipo: MiembroNovedadTipo, descripcion?: string): Promise<void>` — calls `equipoService.cambiarEstadoMiembro` and on success calls `refresh()`.
- `getNovedades(miembroId: string): Promise<MiembroNovedad[]>` — calls `equipoService.getNovedadesMiembro` with the current `tenantId`. Novedades are NOT preloaded on mount; this method is lazy.
- `isCambiandoEstado: boolean` — `true` while `cambiarEstado`'s async call is in flight.

#### Scenario: cambiarEstado refreshes equipo list on success
- **WHEN** `cambiarEstado` is called and the RPC succeeds
- **THEN** `refresh()` SHALL be called and the `members` list SHALL be reloaded with the updated estado

#### Scenario: isCambiandoEstado is true during the RPC call
- **WHEN** `cambiarEstado` is called and the RPC is in flight
- **THEN** `isCambiandoEstado` SHALL be `true` until the call settles

#### Scenario: cambiarEstado propagates error on RPC failure
- **WHEN** `cambiarEstado` is called and the service throws
- **THEN** the hook SHALL rethrow the error to the caller and `isCambiandoEstado` SHALL return to `false`

---

### Requirement: CambiarEstadoModal SHALL allow admins to change a member's tenant status with a required justification
`CambiarEstadoModal` SHALL be a controlled modal component that receives `member: MiembroTableItem | null`, `isOpen: boolean`, `onClose: () => void`, and `onConfirm: (nuevoEstado, tipo, descripcion?) => Promise<void>` props. The modal SHALL display the member's name in the title ("Cambiar estado de [Nombre Apellido]") and their current `estado` via `EquipoStatusBadge`. It SHALL render three fields: `nuevoEstado` (required select: Activo, Mora, Suspendido, Inactivo), `tipo` (required select: Falta de pago, Inasistencias acumuladas, Suspensión manual, Reactivación, Otro), and `descripcion` (optional textarea, max 500 chars). On confirm it SHALL call `onConfirm`, show a loading state while in flight, close on success, and display an inline error on failure without closing.

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

---

### Requirement: NovedadesMiembroModal SHALL display a read-only history of status changes for a member
`NovedadesMiembroModal` SHALL receive `member: MiembroTableItem | null`, `isOpen: boolean`, and `onClose: () => void` props. On open it SHALL lazily call `getNovedades(member.miembro_id)` from `useEquipo` and display the resulting list. The title SHALL read "Historial de novedades — [Nombre Apellido]". Each novedad row SHALL display: formatted `created_at`, `tipo` label, `descripcion` (or `—` if null), and `estado_resultante` as `EquipoStatusBadge`. Rows SHALL be displayed newest-first. The modal SHALL show a loading skeleton while fetching. If no novedades exist, an empty state SHALL be shown.

#### Scenario: Modal title includes member name
- **WHEN** `NovedadesMiembroModal` opens for a member
- **THEN** the title SHALL read "Historial de novedades — [Nombre Apellido]"

#### Scenario: Loading skeleton shown while fetching
- **WHEN** the modal opens and `getNovedades` is in flight
- **THEN** the system SHALL display a loading skeleton in place of the novedad rows

#### Scenario: Novedades are listed newest-first
- **WHEN** a member has multiple novedades
- **THEN** the modal SHALL display them sorted by `created_at` descending

#### Scenario: Empty state shown when no novedades exist
- **WHEN** `getNovedades` resolves with an empty array
- **THEN** the modal SHALL display an empty state message

#### Scenario: estado_resultante displayed as a badge
- **WHEN** a novedad row is rendered
- **THEN** `estado_resultante` SHALL be displayed using `EquipoStatusBadge`
