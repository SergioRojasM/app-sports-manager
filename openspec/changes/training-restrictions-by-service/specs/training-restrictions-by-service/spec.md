## ADDED Requirements

### Requirement: Service-based restriction column schema
The system SHALL add four nullable foreign-key columns (`servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id`) referencing `public.servicios(id) ON DELETE SET NULL` and a nullable `descripcion text` column to both `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones`. The legacy `plan_id` and `disciplina_id` columns SHALL remain in the schema (unused) and be removed in a future dedicated clean-up migration.

#### Scenario: Migration adds service columns without dropping legacy columns
- **WHEN** the migration `20260612000100_restricciones_por_servicio.sql` is applied
- **THEN** both `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones` have columns `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id` (nullable uuid FKs to `servicios`) and `descripcion` (nullable text), while `plan_id` and `disciplina_id` columns still exist

#### Scenario: Service FK columns accept NULL (no service required for a slot)
- **WHEN** an admin saves a restriction row with only `servicio_1_id` set and leaves `servicio_2_id`…`servicio_4_id` empty
- **THEN** the row is persisted with `servicio_1_id` populated and the other three service columns as NULL; only the non-null slot is evaluated at booking time

#### Scenario: Deleting a service sets FK column to NULL
- **WHEN** a `servicios` record referenced by a restriction row is deleted
- **THEN** `ON DELETE SET NULL` fires and the corresponding slot column is set to NULL; the restriction row remains and the deleted slot is ignored at evaluation time

---

### Requirement: Admin restriction rule description
The system SHALL allow tenant administrators to optionally provide a `descripcion` (up to 200 characters) on each restriction rule. This text is displayed inside the rule row as an admin-visible guide label and is not shown to athletes.

#### Scenario: Admin saves description for a restriction rule
- **WHEN** an administrator types a description in the description field of a restriction row and saves the training
- **THEN** the `descripcion` column on the corresponding `entrenamiento_restricciones` row stores the entered text

#### Scenario: Admin leaves description empty
- **WHEN** an administrator leaves the description field blank and saves the training
- **THEN** `descripcion IS NULL` on the restriction row; the UI renders the description field as empty/placeholder

---

### Requirement: Service selector UI in restriction row editor
The system SHALL replace the Plan and Discipline dropdowns in `EntrenamientoRestriccionesSection` with up to 4 Service dropdowns per restriction row. Each slot is labeled "Servicio 1" through "Servicio 4" and is populated from the tenant's active services catalog. An optional `descripcion` text input (max 200 chars, single line) SHALL be rendered above the service slots per row. An inline tooltip or help label SHALL explain: "Cada fila es una alternativa (OR). Dentro de la fila, todos los servicios marcados deben cumplirse (AND)." Each service dropdown MUST carry an `aria-label` identifying its slot and row number.

#### Scenario: Admin sees service dropdowns instead of plan/discipline dropdowns
- **WHEN** an administrator opens the restrictions section of the training creation/edit form
- **THEN** no Plan or Discipline dropdowns are visible; instead each restriction row shows up to 4 service selector dropdowns and a description text field

#### Scenario: Service dropdowns are populated from tenant services catalog
- **WHEN** an administrator opens the service selector in a restriction row
- **THEN** the dropdown lists only services belonging to the current tenant (`servicios.tenant_id = current_tenant_id`)

#### Scenario: AND/OR guide tooltip is visible
- **WHEN** an administrator views the restrictions section
- **THEN** a tooltip or inline label reads "Cada fila es una alternativa (OR). Dentro de la fila, todos los servicios marcados deben cumplirse (AND)."
