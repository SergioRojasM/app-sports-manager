## ADDED Requirements

### Requirement: plan_tipos_servicios table exists with required schema
The database SHALL contain a `public.plan_tipos_servicios` table with columns: `id` (uuid PK, default `gen_random_uuid()`), `plan_tipo_id` (uuid NOT NULL, FK → `plan_tipos(id)` ON DELETE CASCADE), `servicio_id` (uuid NOT NULL, FK → `servicios(id)` ON DELETE RESTRICT), `unidades` (integer NOT NULL default 1), `created_at` (timestamptz NOT NULL), `updated_at` (timestamptz NOT NULL). A unique constraint `plan_tipos_servicios_plan_tipo_servicio_uk` on `(plan_tipo_id, servicio_id)` SHALL be enforced. A check constraint `plan_tipos_servicios_unidades_ck` SHALL require `unidades >= 1`. Indexes SHALL exist on `plan_tipo_id` and `servicio_id`.

#### Scenario: Duplicate service in same plan tipo is rejected
- **WHEN** an INSERT attempts to add a second `plan_tipos_servicios` row with the same `(plan_tipo_id, servicio_id)` combination
- **THEN** the database SHALL reject the operation with a unique constraint violation

#### Scenario: Deleting a plan tipo cascades to its service rows
- **WHEN** a `plan_tipos` row is deleted
- **THEN** all associated `plan_tipos_servicios` rows SHALL be deleted automatically via ON DELETE CASCADE

#### Scenario: Deleting a referenced service is blocked
- **WHEN** a DELETE on `public.servicios` is attempted for a row referenced by at least one `plan_tipos_servicios` row
- **THEN** the database SHALL reject the operation with a foreign key violation (ON DELETE RESTRICT)

#### Scenario: unidades below minimum is rejected
- **WHEN** an INSERT or UPDATE sets `unidades < 1`
- **THEN** the database SHALL reject the operation with the check constraint violation

---

### Requirement: RLS policies restrict plan_tipos_servicios mutations to tenant admins
The database SHALL enable Row Level Security on `plan_tipos_servicios`. SELECT SHALL be open to all authenticated users. INSERT, UPDATE, and DELETE SHALL be restricted to authenticated administrators of the plan's tenant via `get_admin_tenants_for_authenticated_user()`.

#### Scenario: Any authenticated user can read plan tipo service rows
- **WHEN** an authenticated user issues a SELECT on `public.plan_tipos_servicios`
- **THEN** the RLS SHALL allow the query to return all rows

#### Scenario: Tenant administrator can insert and delete plan tipo service rows
- **WHEN** an authenticated administrator inserts or deletes a `plan_tipos_servicios` row for a plan tipo belonging to their tenant
- **THEN** the RLS SHALL permit the operation

#### Scenario: Non-administrator cannot mutate plan tipo service rows
- **WHEN** an authenticated user without the `administrador` role attempts to INSERT or DELETE a `plan_tipos_servicios` row
- **THEN** the RLS SHALL deny the operation

---

### Requirement: PlanTipoServicio TypeScript types are defined
The system SHALL define the following TypeScript types in `src/types/portal/servicios.types.ts`:
- `PlanTipoServicio` interface with columns `id`, `plan_tipo_id`, `servicio_id`, `unidades`, `created_at`, `updated_at`, plus joined `servicio_nombre: string`.
- `PlanTipoServicioRow` with `servicioId: string`, `unidades: number` for form state representation.
- `SyncPlanTipoServiciosInput` with `planTipoId: string`, `rows: PlanTipoServicioRow[]`.

#### Scenario: PlanTipoServicioRow represents a form row
- **WHEN** the plan tipo services form renders rows
- **THEN** each row SHALL correspond to a `PlanTipoServicioRow` with `servicioId` and `unidades`

---

### Requirement: serviciosService exposes getPlanTipoServicios and syncPlanTipoServicios
The system SHALL provide the following functions in `src/services/supabase/portal/servicios.service.ts`:
- `getPlanTipoServicios(planTipoId: string): Promise<PlanTipoServicio[]>` — returns all service rows for the plan tipo, joining `servicios.nombre` as `servicio_nombre`, ordered by `servicio_nombre`.
- `syncPlanTipoServicios(planTipoId: string, rows: PlanTipoServicioRow[]): Promise<void>` — deletes all existing `plan_tipos_servicios` rows for `planTipoId`, then inserts the new set. If `rows` is empty, only the delete is performed (clears all assignments).

#### Scenario: getPlanTipoServicios returns rows with servicio_nombre
- **WHEN** `getPlanTipoServicios` is called for a plan tipo that has two service assignments
- **THEN** the service SHALL return two `PlanTipoServicio` objects each with a non-null `servicio_nombre`

#### Scenario: syncPlanTipoServicios replaces all rows
- **WHEN** `syncPlanTipoServicios` is called with a new set of rows
- **THEN** any previously existing rows for that `planTipoId` SHALL be deleted and the new rows SHALL be inserted

#### Scenario: syncPlanTipoServicios with empty rows clears assignments
- **WHEN** `syncPlanTipoServicios` is called with an empty `rows` array
- **THEN** all existing `plan_tipos_servicios` rows for that `planTipoId` SHALL be deleted and no new rows are inserted

---

### Requirement: usePlanTipoServicios hook manages service rows for plan tipo sub-form
The system SHALL provide a `usePlanTipoServicios(tenantId: string)` hook at `src/hooks/portal/planes/usePlanTipoServicios.ts` that:
- Fetches active services for the tenant via `getServiciosActivosByTenant` for the service dropdown.
- Manages an array of `PlanTipoServicioRow` rows in local state (`serviceRows`).
- Exposes `loadForPlanTipo(planTipoId)` to fetch existing assignments via `getPlanTipoServicios` and populate `serviceRows`.
- Exposes `addServiceRow()` to append a new blank row `{ servicioId: '', unidades: 1 }`.
- Exposes `updateServiceRow(index, partial)` to update a row at a given index.
- Exposes `removeServiceRow(index)` to remove a row.
- Exposes `syncToDb(planTipoId)` to call `syncPlanTipoServicios` with the current `serviceRows`, filtering out rows with empty `servicioId`.
- Prevents adding a duplicate `servicioId` (client-side guard: `addServiceRow` is disabled if the service is already present).

#### Scenario: loadForPlanTipo populates rows from existing assignments
- **WHEN** `loadForPlanTipo(planTipoId)` is called for a plan tipo with two service assignments
- **THEN** `serviceRows` SHALL contain two rows matching the stored assignments

#### Scenario: addServiceRow appends blank row
- **WHEN** `addServiceRow()` is called
- **THEN** a new row with `servicioId: ''` and `unidades: 1` SHALL be appended to `serviceRows`

#### Scenario: removeServiceRow removes the correct row
- **WHEN** `removeServiceRow(0)` is called with two rows present
- **THEN** `serviceRows` SHALL contain only the second row

#### Scenario: syncToDb skips rows with empty servicioId
- **WHEN** `syncToDb(planTipoId)` is called and one row has `servicioId: ''`
- **THEN** that row SHALL be filtered out before calling `syncPlanTipoServicios`

---

### Requirement: PlanTipoServiciosSection renders service assignment rows in plan tipo sub-form
The system SHALL provide a `PlanTipoServiciosSection` component at `src/components/portal/planes/PlanTipoServiciosSection.tsx` that:
- Renders one row per `PlanTipoServicioRow` with: a service `<select>` dropdown populated from active tenant services, a `unidades` number input (min 1), and a remove button.
- Renders an "Agregar servicio" link/button below the rows.
- Disables the "Agregar servicio" control when all available services are already selected.
- Shows an informational note (e.g., "Los servicios coexisten con el campo 'Clases incluidas' hasta la próxima migración.") until `clases_incluidas` is removed in a subsequent US.

#### Scenario: Service already selected is excluded from other rows' dropdowns
- **WHEN** a service has been selected in row 0
- **THEN** that service SHALL NOT appear as an available option in row 1's dropdown

#### Scenario: Add button disabled when all services are selected
- **WHEN** all available tenant services are already assigned to the plan tipo
- **THEN** the "Agregar servicio" button SHALL be disabled

#### Scenario: Unidades input enforces minimum of 1
- **WHEN** the admin sets `unidades` to 0 or a negative number
- **THEN** the input SHALL reset to 1 or show a validation error
