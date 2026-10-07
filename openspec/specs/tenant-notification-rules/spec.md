# tenant-notification-rules Specification

## Purpose
TBD - created by archiving change tenant-expiry-notification-rules. Update Purpose after archive.
## Requirements
### Requirement: Tenant notification rules table
The system SHALL provide `public.tenant_reglas_notificacion` with columns `id`, `tenant_id` (not null, `on delete cascade`), `tipo` (≤30), `dias` (integer), `destinatarios` (≤20, default `atletas`), `canal_in_app` (default true), `canal_email` (default true), `activo` (default true), `created_at` and `updated_at`.
- `tipo` SHALL be one of `vencimiento_pre | vencimiento_pos`.
- `dias` SHALL be between 1 and 60.
- `destinatarios` SHALL be one of `atletas | administradores | todos`.
- At least one of `canal_in_app` and `canal_email` SHALL be true.
- `(tenant_id, tipo, dias)` SHALL be unique.
- A `before insert` trigger SHALL raise `MAX_REGLAS_NOTIFICACION` when the tenant already has 3 rules of that `tipo`.
- A `before update` trigger SHALL raise `TIPO_INMUTABLE` when `tipo` or `tenant_id` changes.
- `updated_at` SHALL be maintained by the existing `set_updated_at()` trigger function.
- A partial index on `(tipo, dias) where activo` SHALL exist.

#### Scenario: Invalid values rejected
- **WHEN** a rule is written with `tipo = 'otro'`, `dias = 0`, `dias = 61`, `destinatarios = 'entrenadores'`, or both channels false
- **THEN** the write SHALL fail with a check violation

#### Scenario: Duplicate rule rejected
- **WHEN** a second rule with the same `tenant_id`, `tipo` and `dias` is inserted
- **THEN** the insert SHALL fail with a unique violation (`23505`)

#### Scenario: Fourth rule of a type rejected
- **WHEN** a tenant with three `vencimiento_pre` rules inserts a fourth
- **THEN** the insert SHALL fail with `MAX_REGLAS_NOTIFICACION`, while a first `vencimiento_pos` rule SHALL still be accepted

#### Scenario: Type cannot change
- **WHEN** a rule's `tipo` or `tenant_id` is updated
- **THEN** the update SHALL fail with `TIPO_INMUTABLE`

### Requirement: Notification rules access control
RLS SHALL be enabled on `tenant_reglas_notificacion`. Every privilege SHALL be revoked from `anon`. `authenticated` SHALL be granted `select`, `insert`, `update` and `delete`, each limited by a policy to rows whose `tenant_id` is in `get_admin_tenants_for_authenticated_user()`.

#### Scenario: Administrator manages own tenant's rules
- **WHEN** an administrator of tenant A selects, inserts, updates or deletes a rule of tenant A
- **THEN** the statement SHALL succeed

#### Scenario: Other roles cannot read
- **WHEN** a trainer or athlete of tenant A, or an administrator of tenant B, selects the rules of tenant A
- **THEN** no row SHALL be returned

#### Scenario: Other roles cannot write
- **WHEN** a trainer or athlete of tenant A, or an administrator of tenant B, inserts, updates or deletes a rule of tenant A
- **THEN** no row SHALL be written

#### Scenario: Anonymous access denied
- **WHEN** `anon` selects `tenant_reglas_notificacion`
- **THEN** the statement SHALL fail with a permission error

### Requirement: Notification rules service
`reglasNotificacionService` in `src/services/supabase/portal/reglas-notificacion.service.ts` SHALL use the browser client and expose:
- `listReglas(tenantId)` → rules ordered by `tipo`, then `dias` ascending;
- `createRegla(payload)` with `tenant_id`, `tipo`, `dias`, `destinatarios`, `canal_in_app`, `canal_email`, `activo`;
- `updateRegla(id, payload)` with `dias`, `destinatarios`, `canal_in_app`, `canal_email`, `activo`;
- `deleteRegla(id)`.

Errors SHALL be thrown as `ReglaNotificacionServiceError` with the code `duplicate` (`23505`), `max_reached` (message containing `MAX_REGLAS_NOTIFICACION`), `forbidden` (`42501`) or `unknown`.

#### Scenario: Duplicate mapped
- **WHEN** `createRegla` hits the unique violation
- **THEN** it SHALL throw a `ReglaNotificacionServiceError` with code `duplicate`

#### Scenario: Limit mapped
- **WHEN** `createRegla` hits `MAX_REGLAS_NOTIFICACION`
- **THEN** it SHALL throw a `ReglaNotificacionServiceError` with code `max_reached`

### Requirement: Notification rules hook
`useReglasNotificacion({ tenantId })` in `src/hooks/portal/tenant/useReglasNotificacion.ts` SHALL load the tenant's rules and expose `rules`, `isLoading`, `isSubmitting`, `error`, `submitError`, the modal state (`isModalOpen`, `modalMode`, `selectedRule`, `openCreateModal`, `openEditModal`, `closeModal`), `handleCreate`, `handleUpdate`, `handleDelete`, `reload`, and `conteoPorTipo` (rules per type). After a successful create, update or delete it SHALL refresh the list and close the modal.

#### Scenario: Save error keeps the modal open
- **WHEN** `handleCreate` fails with code `duplicate`
- **THEN** `submitError` SHALL be "Ya existe una regla para ese número de días." and the modal SHALL stay open

#### Scenario: Limit error message
- **WHEN** `handleCreate` fails with code `max_reached`
- **THEN** `submitError` SHALL be "Solo puedes tener 3 reglas de cada tipo."

### Requirement: Notificaciones automáticas card
The `gestion-organizacion` page SHALL render `<TenantReglasNotificacionCard tenantId={tenantId} />` full width below the grid that holds `TenantPaymentMethodsCard` and `TenantReglasSuspensionCard`. The card SHALL follow the visual design of `TenantReglasSuspensionCard`.
- Header: title "Notificaciones automáticas", subtitle "Avisa a tus atletas y administradores antes y después de que venza una suscripción.", and the button "Agregar". The button SHALL be disabled, with the hint "Máximo 3 reglas por tipo", when both types already have 3 rules.
- Rules SHALL be listed in two groups, "Antes del vencimiento" and "Después del vencimiento", each ordered by `dias` ascending. A group without rules SHALL not be rendered.
- Each row SHALL show "{N} días antes de vencer" or "{N} días después de vencer" ("1 día" when `N = 1`), an "Activa" / "Inactiva" badge, the recipients label ("Solo atletas", "Solo administradores" or "Administradores y atletas"), the channels ("En la plataforma" and/or "Correo"), and "Editar" and "Eliminar" actions with accessible names.
- "Eliminar" SHALL ask for confirmation in a dialog before deleting.
- States: a loading indicator; an inline `role="alert"` error with "Reintentar" when loading fails; the empty state "Aún no hay reglas. Sin reglas no se envían avisos de vencimiento."
- A footnote SHALL read "Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá)."

#### Scenario: Empty state
- **WHEN** an administrator opens "Gestión de organización" for a tenant without rules
- **THEN** the card SHALL show the empty state and an enabled "Agregar" button

#### Scenario: Rules grouped and ordered
- **WHEN** the tenant has `vencimiento_pre` rules of 7 and 1 days and a `vencimiento_pos` rule of 3 days
- **THEN** "Antes del vencimiento" SHALL list "1 día antes de vencer" then "7 días antes de vencer", and "Después del vencimiento" SHALL list "3 días después de vencer"

#### Scenario: Row details
- **WHEN** a rule is for `todos`, email only and inactive
- **THEN** its row SHALL show "Administradores y atletas", "Correo" and the "Inactiva" badge

#### Scenario: Delete with confirmation
- **WHEN** the administrator activates "Eliminar" and confirms
- **THEN** the rule SHALL be deleted and removed from the list; cancelling the dialog SHALL delete nothing

#### Scenario: Add disabled at the limit
- **WHEN** both types have 3 rules
- **THEN** "Agregar" SHALL be disabled and the hint "Máximo 3 reglas por tipo" SHALL be available

#### Scenario: Not reachable by other roles
- **WHEN** a trainer or athlete requests the `gestion-organizacion` route
- **THEN** the `(administrador)` layout guard SHALL redirect them and the card SHALL not render

### Requirement: Notification rule form
`ReglaNotificacionFormModal` SHALL be a right-side modal following `ReglaSuspensionFormModal`, with the title "Nueva regla de notificación" or "Editar regla de notificación" and these fields:
- "Tipo": radio group "Antes del vencimiento" / "Después del vencimiento"; read-only when editing. When creating, a type that already has 3 rules SHALL be disabled.
- "Días": integer input, required, 1 to 60.
- "Destinatarios": native select, required, with "Solo atletas" (default), "Solo administradores" and "Administradores y atletas".
- "Canales": checkboxes "En la plataforma" and "Correo electrónico", both checked by default; at least one required.
- "Activa": checkbox, checked by default.

Validation errors SHALL be shown inline with `role="alert"` and tied to their field with `aria-describedby`:
- days empty, non-integer or out of range → "Ingresa un número de días entre 1 y 60."
- no channel → "Selecciona al menos un canal."
- duplicate type and days → "Ya existe una regla para ese número de días."
- limit reached → "Solo puedes tener 3 reglas de cada tipo."

The modal SHALL close on `Escape` and on "Cancelar" unless a save is in progress, and SHALL return focus to the element that opened it.

#### Scenario: Create a rule
- **WHEN** the administrator chooses "Antes del vencimiento", 7 days, "Solo atletas", both channels and saves
- **THEN** the rule SHALL be stored and appear in "Antes del vencimiento"

#### Scenario: Invalid days
- **WHEN** the administrator saves with days empty, 0, 61 or 2.5
- **THEN** "Ingresa un número de días entre 1 y 60." SHALL be shown and nothing SHALL be saved

#### Scenario: No channel
- **WHEN** the administrator unchecks both channels and saves
- **THEN** "Selecciona al menos un canal." SHALL be shown and nothing SHALL be saved

#### Scenario: Duplicate days
- **WHEN** the administrator saves a rule whose type and days already exist
- **THEN** "Ya existe una regla para ese número de días." SHALL be shown and the modal SHALL stay open

#### Scenario: Edit keeps the type
- **WHEN** the administrator edits a rule
- **THEN** the type SHALL be shown read-only, and days, recipients, channels and active state SHALL be editable

#### Scenario: Default recipients
- **WHEN** the create form opens
- **THEN** "Solo atletas" SHALL be selected

