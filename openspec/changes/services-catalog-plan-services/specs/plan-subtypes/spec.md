## ADDED Requirements

### Requirement: PlanTipo TypeScript interface includes optional servicios field
The system SHALL add an optional `servicios?: PlanTipoServicioRow[]` field to the `PlanTipo` interface in `src/types/portal/planes.types.ts`. All other fields on `PlanTipo`, `CreatePlanTipoInput`, `UpdatePlanTipoInput`, and `PlanTipoFormValues` — including `clases_incluidas` — SHALL remain unchanged.

#### Scenario: PlanTipo without servicios is still valid
- **WHEN** a `PlanTipo` object is returned from `getPlanTiposByPlan` without a `servicios` field
- **THEN** the TypeScript type SHALL accept the object as valid (field is optional)

#### Scenario: PlanTipo with servicios includes service rows
- **WHEN** a `PlanTipo` object is returned with service assignments loaded
- **THEN** the `servicios` field SHALL contain an array of `PlanTipoServicioRow` objects

---

### Requirement: planesService loads service assignments when fetching plan tipos
The system SHALL update `getPlanTiposByPlan` in `src/services/supabase/portal/planes.service.ts` to optionally include service assignments by calling `getPlanTipoServicios` for each returned `PlanTipo` and populating the `servicios` field. The `clases_incluidas` field SHALL remain present and unchanged on all returned objects.

#### Scenario: getPlanTiposByPlan returns plan tipos with servicios populated
- **WHEN** `getPlanTiposByPlan` is called for a plan that has plan tipos with service assignments
- **THEN** each returned `PlanTipo` SHALL include a populated `servicios` array

#### Scenario: getPlanTiposByPlan returns plan tipos without service assignments as empty array
- **WHEN** `getPlanTiposByPlan` is called for a plan tipo with no service assignments
- **THEN** the `servicios` field SHALL be an empty array `[]`

---

### Requirement: createPlanTipo and updatePlanTipo sync service assignments
The system SHALL update `createPlanTipo` and `updatePlanTipo` in `src/services/supabase/portal/planes.service.ts` to accept an optional `servicios?: PlanTipoServicioRow[]` array and call `syncPlanTipoServicios` after a successful insert or update. If `servicios` is undefined or empty, the sync is still called to clear any existing assignments (delete-only). `clases_incluidas` input and behavior SHALL remain unchanged.

#### Scenario: createPlanTipo with service rows persists assignments
- **WHEN** `createPlanTipo` is called with a non-empty `servicios` array
- **THEN** the new `plan_tipos` row SHALL be inserted and `syncPlanTipoServicios` SHALL be called with the new `plan_tipo_id` and the provided rows

#### Scenario: updatePlanTipo with changed service rows re-syncs
- **WHEN** `updatePlanTipo` is called with a different `servicios` array than what was previously stored
- **THEN** the `plan_tipos` row SHALL be updated and `syncPlanTipoServicios` SHALL replace all previous service assignments with the new set
