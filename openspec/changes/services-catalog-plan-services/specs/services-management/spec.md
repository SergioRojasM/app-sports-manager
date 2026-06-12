## ADDED Requirements

### Requirement: servicios table exists with required schema
The database SHALL contain a `public.servicios` table with columns: `id` (uuid PK, default `gen_random_uuid()`), `tenant_id` (uuid NOT NULL, FK → `tenants(id)` ON DELETE CASCADE), `nombre` (varchar(100), NOT NULL), `descripcion` (text, nullable), `activo` (boolean NOT NULL default true), `created_at` (timestamptz NOT NULL), `updated_at` (timestamptz NOT NULL). A unique constraint `servicios_tenant_nombre_uk` on `(tenant_id, nombre)` SHALL be enforced. A `set_updated_at` trigger SHALL automatically update `updated_at` on every UPDATE.

#### Scenario: Duplicate service name within the same tenant is rejected
- **WHEN** an INSERT or UPDATE attempts to create a second `servicios` row with the same `(tenant_id, nombre)` combination
- **THEN** the database SHALL reject the operation with a unique constraint violation

#### Scenario: Deleting a tenant cascades to its services
- **WHEN** a `tenants` row is deleted
- **THEN** all associated `servicios` rows for that tenant SHALL be deleted automatically via ON DELETE CASCADE

#### Scenario: updated_at is refreshed on update
- **WHEN** a `servicios` row is updated
- **THEN** the `updated_at` column SHALL be set to the current UTC timestamp by the trigger

---

### Requirement: RLS policies restrict servicios mutations to tenant admins
The database SHALL enable Row Level Security on `servicios`. SELECT SHALL be open to all authenticated users. INSERT, UPDATE, and DELETE SHALL be restricted to authenticated users who are administrators of the row's `tenant_id` via `get_admin_tenants_for_authenticated_user()`.

#### Scenario: Any authenticated user can read services
- **WHEN** an authenticated user issues a SELECT on `public.servicios`
- **THEN** the RLS SHALL allow the query to return all rows

#### Scenario: Tenant administrator can insert a service
- **WHEN** an authenticated administrator for a tenant inserts a `servicios` row with a matching `tenant_id`
- **THEN** the RLS SHALL permit the insert

#### Scenario: Non-administrator cannot insert a service
- **WHEN** an authenticated user without the `administrador` role attempts to insert a `servicios` row
- **THEN** the RLS SHALL deny the insert

#### Scenario: Administrator can update and delete services in their tenant
- **WHEN** an authenticated administrator issues UPDATE or DELETE on a `servicios` row in a tenant they administrate
- **THEN** the RLS SHALL permit the operation

#### Scenario: Administrator cannot mutate services in a foreign tenant
- **WHEN** an authenticated administrator issues INSERT, UPDATE, or DELETE on a `servicios` row belonging to a tenant they do not administrate
- **THEN** the RLS SHALL deny the operation

---

### Requirement: Servicio TypeScript types are defined
The system SHALL define the following TypeScript types in `src/types/portal/servicios.types.ts`:
- `Servicio` interface with all `servicios` columns.
- `CreateServicioInput` with fields `tenant_id`, `nombre`, `descripcion?`, `activo?`.
- `UpdateServicioInput` with optional fields `nombre`, `descripcion`, `activo`.
- `ServicioFormValues` with `nombre: string`, `descripcion: string`, `activo: boolean`.
- `ServicioServiceError` discriminated union with codes `duplicate_nombre` and `referenced_by_plan_tipos`.

#### Scenario: ServicioFormValues maps correctly to CreateServicioInput
- **WHEN** a `ServicioFormValues` object is submitted
- **THEN** the hook SHALL map `descripcion: ''` to `null` in the payload, and `activo` SHALL pass through as-is

---

### Requirement: serviciosService exposes CRUD operations for servicios
The system SHALL provide the following functions in `src/services/supabase/portal/servicios.service.ts`:
- `getServiciosByTenant(tenantId: string): Promise<Servicio[]>` — returns all services for the tenant ordered by `nombre`.
- `getServiciosActivosByTenant(tenantId: string): Promise<Servicio[]>` — returns only `activo = true` services ordered by `nombre`.
- `createServicio(input: CreateServicioInput): Promise<Servicio>` — inserts a new service row; unique constraint violation SHALL be caught and re-thrown as `ServicioServiceError` with code `duplicate_nombre`.
- `updateServicio(id: string, input: UpdateServicioInput): Promise<Servicio>` — updates the service row by `id`.
- `deleteServicio(id: string): Promise<void>` — deletes the service row; FK restrict violation (postgres code `23503`) SHALL be caught and re-thrown as `ServicioServiceError` with code `referenced_by_plan_tipos`.

#### Scenario: getServiciosByTenant returns ordered list
- **WHEN** `getServiciosByTenant` is called for a tenant with services
- **THEN** the service SHALL return all rows ordered ascending by `nombre`

#### Scenario: getServiciosActivosByTenant filters inactive services
- **WHEN** `getServiciosActivosByTenant` is called for a tenant with a mix of active and inactive services
- **THEN** the service SHALL return only rows where `activo = true`

#### Scenario: createServicio detects duplicate nombre
- **WHEN** `createServicio` is called with a `nombre` that already exists for the same tenant
- **THEN** the service SHALL throw a `ServicioServiceError` with code `duplicate_nombre`

#### Scenario: deleteServicio detects referenced service
- **WHEN** `deleteServicio` is called for a service referenced by at least one `plan_tipos_servicios` row
- **THEN** the service SHALL throw a `ServicioServiceError` with code `referenced_by_plan_tipos`

---

### Requirement: useServicios hook manages services list state
The system SHALL provide a `useServicios(tenantId: string)` hook at `src/hooks/portal/servicios/useServicios.ts` that:
- Fetches all tenant services on mount via `getServiciosByTenant`.
- Exposes `servicios`, `isLoading`, `error` state.
- Exposes `createServicio`, `updateServicio`, `deleteServicio` async actions that call the service layer and refresh the list on success.
- Exposes `openCreateModal`, `openEditModal(servicio)`, `closeModal`, `editingServicio`, `isModalOpen` state for modal coordination.

#### Scenario: Services load on mount
- **WHEN** a component mounts with a valid `tenantId`
- **THEN** `useServicios` SHALL fetch services and populate the `servicios` array

#### Scenario: Create action refreshes list
- **WHEN** `createServicio` is called and succeeds
- **THEN** the `servicios` list SHALL be refreshed to include the new service

#### Scenario: Delete action with referenced service shows error
- **WHEN** `deleteServicio` is called and the service throws `referenced_by_plan_tipos`
- **THEN** the hook SHALL surface the error (e.g., via toast) and NOT remove the service from the list

---

### Requirement: useServicioForm hook manages create/edit form state
The system SHALL provide a `useServicioForm` hook at `src/hooks/portal/servicios/useServicioForm.ts` that:
- Manages `ServicioFormValues` controlled state with `nombre`, `descripcion`, `activo`.
- Accepts an optional `initialValues` for edit mode pre-fill.
- Exposes `values`, `setField`, `reset`, `isSubmitting`, `fieldError` state.
- Validates that `nombre` is non-empty before submit.

#### Scenario: Edit mode pre-fills form values
- **WHEN** `useServicioForm` is initialized with a `Servicio` as `initialValues`
- **THEN** the form values SHALL be pre-filled with the service's `nombre`, `descripcion`, and `activo` fields

#### Scenario: Submission blocked without nombre
- **WHEN** the admin submits the form with an empty `nombre`
- **THEN** the hook SHALL set a field error on `nombre` and SHALL NOT invoke the service

---

### Requirement: ServiciosPage provides full CRUD for tenant services
The system SHALL provide a `ServiciosPage` component at `src/components/portal/servicios/ServiciosPage.tsx` that:
- Displays a page header with title "Servicios" and a "Nuevo servicio" primary button.
- Renders `ServiciosTable` with the list of services.
- Shows loading, empty, and error states.
- Opens `ServicioFormModal` in create mode when "Nuevo servicio" is clicked.
- Opens `ServicioFormModal` in edit mode when the edit action is triggered on a row.
- Triggers delete confirmation and calls `deleteServicio` on confirmation.

#### Scenario: Empty state displayed for tenant with no services
- **WHEN** a tenant has no services and `ServiciosPage` is rendered
- **THEN** the system SHALL display an empty state message prompting the admin to create the first service

#### Scenario: Delete blocked service shows error toast
- **WHEN** the admin confirms deletion of a service referenced by a plan tipo
- **THEN** the system SHALL display a toast with message "Este servicio está asociado a uno o más tipos de plan y no puede eliminarse." and the service SHALL remain in the list

---

### Requirement: ServiciosTable renders services with edit and delete actions
The system SHALL provide a `ServiciosTable` component at `src/components/portal/servicios/ServiciosTable.tsx` that renders a table with columns: `Nombre`, `Descripción`, `Estado` (activo badge: "Activo" / "Inactivo"), and `Acciones` (edit and delete buttons per row).

#### Scenario: Active service renders activo badge
- **WHEN** a service has `activo = true`
- **THEN** the Estado column SHALL render a green "Activo" badge

#### Scenario: Inactive service renders inactivo badge
- **WHEN** a service has `activo = false`
- **THEN** the Estado column SHALL render a muted "Inactivo" badge

---

### Requirement: ServicioFormModal provides create and edit service form
The system SHALL provide a `ServicioFormModal` component at `src/components/portal/servicios/ServicioFormModal.tsx` as a right-side slide modal with:
- Fields: `Nombre` (text input, required), `Descripción` (textarea, optional), `Activo` (checkbox or toggle, default checked).
- Title: "Nuevo servicio" for create mode; "Editar servicio" for edit mode.
- Submit button: "Crear servicio" for create; "Guardar cambios" for edit.
- Closes on backdrop click, close button, or Esc key when not submitting.
- Focus trapped within the modal while open.
- Inline field error displayed under `Nombre` on validation failure.

#### Scenario: Create mode opens with blank fields
- **WHEN** `ServicioFormModal` is opened in create mode
- **THEN** `Nombre` and `Descripción` SHALL be empty and `Activo` SHALL be checked

#### Scenario: Edit mode opens with pre-filled values
- **WHEN** `ServicioFormModal` is opened in edit mode with an existing service
- **THEN** all fields SHALL be pre-filled with the service's current values

#### Scenario: Submit disabled during pending request
- **WHEN** the admin submits the form and the request is pending
- **THEN** the submit button SHALL be disabled and show a loading indicator

---

### Requirement: gestion-servicios page wires ServiciosPage for administrador role
The system SHALL replace the empty placeholder at `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-servicios/page.tsx` with a server component that extracts `tenant_id` from route params and renders `<ServiciosPage tenantId={tenantId} />`. The page SHALL be accessible only to users with the `administrador` role, enforced by the existing `(administrador)` layout guard.

#### Scenario: Administrator accesses services page
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-servicios`
- **THEN** the system SHALL render `ServiciosPage` with the correct `tenantId`

#### Scenario: Non-administrator is redirected
- **WHEN** a user without the `administrador` role attempts to access `/portal/orgs/[tenant_id]/gestion-servicios`
- **THEN** the existing `(administrador)` layout guard SHALL redirect them away before the page renders
