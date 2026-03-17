## ADDED Requirements

### Requirement: Admin and coach attendance record creation
The system SHALL allow users with the `administrador` or `entrenador` role to create an attendance record for any booking within their tenant. The record MUST store `asistio` (boolean), optional `observaciones`, `validado_por = auth.uid()`, and `fecha_asistencia = now()`. Only one attendance record per booking is allowed (`reserva_id` unique constraint); creation MUST use an upsert operation to handle conflicts gracefully.

#### Scenario: Admin creates attendance record marking athlete as attended
- **WHEN** an administrador opens the `AsistenciaFormModal` for a booking with no existing attendance record, selects "Asistió", and submits
- **THEN** a new `asistencias` row is inserted with `asistio = true`, `validado_por = auth.uid()`, `fecha_asistencia = now()`, and the panel's attendance badge updates to "Asistió"

#### Scenario: Coach creates attendance record marking athlete as not attended
- **WHEN** an entrenador opens the `AsistenciaFormModal` for a booking with no existing attendance record, selects "No asistió", optionally fills observations, and submits
- **THEN** a new `asistencias` row is inserted with `asistio = false` and the panel's attendance badge updates to "No asistió"

#### Scenario: Upsert resolves conflict on re-submission
- **WHEN** an adminstrador submits the attendance form for a booking that already has an `asistencias` row
- **THEN** the existing row is updated (not duplicated), with the new values for `asistio`, `observaciones`, `validado_por`, and `fecha_asistencia`

### Requirement: Admin and coach attendance record update
The system SHALL allow users with the `administrador` or `entrenador` role to edit an existing attendance record. The `AsistenciaFormModal` MUST pre-fill `asistio` and `observaciones` from the existing record when opened in edit mode. Saving submits an upsert on the `reserva_id` conflict target.

#### Scenario: Admin edits attendance outcome from attended to not attended
- **WHEN** an administrador opens the modal for a booking whose `asistencias` row has `asistio = true`, changes the toggle to "No asistió", and saves
- **THEN** the `asistencias` row is updated with `asistio = false` and the badge in the panel changes to "No asistió"

#### Scenario: Coach edits attendance observations
- **WHEN** an entrenador opens the modal for a booking with an existing attendance record and updates the `observaciones` textarea
- **THEN** the `asistencias` row is updated with the new observations and the modal closes successfully

### Requirement: Admin and coach attendance record deletion
The system SHALL allow users with the `administrador` or `entrenador` role to delete an existing attendance record. The `AsistenciaFormModal` MUST show a "Eliminar registro" button only when `existing !== null`. A confirmation step MUST be shown before the deletion is executed.

#### Scenario: Admin deletes attendance after confirmation
- **WHEN** an administrador clicks "Eliminar registro" in the modal, confirms the action, and the delete resolves successfully
- **THEN** the `asistencias` row is permanently removed and the booking's badge reverts to "Sin registrar"

#### Scenario: Delete button is absent when no record exists
- **WHEN** an administrador opens the modal for a booking with no existing attendance record
- **THEN** the "Eliminar registro" button is NOT rendered in the modal footer

#### Scenario: Delete is cancelled before execution
- **WHEN** an administrador clicks "Eliminar registro" but cancels at the confirmation step
- **THEN** no deletion occurs and the modal remains open with data unchanged

### Requirement: Attendance state display in booking rows
The system SHALL display an `AsistenciaStatusBadge` inline on each booking row within `ReservasPanel`. The badge MUST reflect one of three states derived from the `asistenciaMap` keyed by `reserva_id`:
- No matching entry → grey badge: "Sin registrar"
- `asistio = true` → green badge: "Asistió"
- `asistio = false` → red badge: "No asistió"

The badge renders for all non-athlete roles viewing the panel. Athletes cannot view attendance data (RLS prevents the fetch).

#### Scenario: Booking row shows "Sin registrar" when no attendance record exists
- **WHEN** an administrador or entrenador opens the bookings panel for a training and a booking has no corresponding `asistencias` row
- **THEN** the booking row shows a grey "Sin registrar" badge

#### Scenario: Booking row shows "Asistió" after attendance is confirmed
- **WHEN** an attendance record with `asistio = true` is saved and the panel refreshes
- **THEN** the corresponding booking row shows a green "Asistió" badge

#### Scenario: Booking row shows "No asistió" after attendance is denied
- **WHEN** an attendance record with `asistio = false` is saved and the panel refreshes
- **THEN** the corresponding booking row shows a red "No asistió" badge

### Requirement: Attendance action button visibility in booking rows
The system SHALL render a pencil/verify icon button per booking row in `ReservasPanel` exclusively for users with `administrador` or `entrenador` role. Clicking the button MUST open `AsistenciaFormModal` pre-filled with the existing attendance record (or empty if none). Athletes MUST NOT see this button.

#### Scenario: Admin sees attendance action button per booking row
- **WHEN** an administrador or entrenador views the bookings panel
- **THEN** each booking row displays an action button to open the attendance modal

#### Scenario: Athlete does not see the attendance action button
- **WHEN** an atleta views the bookings panel (their own booking)
- **THEN** no attendance action button is rendered on any booking row

### Requirement: Attendance data fetch scoped to training instance
The system SHALL fetch all `asistencias` rows for a given training in a single query by joining through `reservas`. The result MUST be returned as a `Record<string, Asistencia>` map keyed by `reserva_id` to support O(1) lookup per booking row. The fetch MUST be skipped entirely when the caller's role is `atleta`.

#### Scenario: Attendance map is populated on panel open for admin
- **WHEN** an administrador or entrenador opens the bookings panel for a training
- **THEN** `useAsistencias` fetches all attendance records for that training and returns them as a keyed map

#### Scenario: Attendance fetch is skipped for athlete role
- **WHEN** an atleta opens the bookings panel
- **THEN** `useAsistencias` does not issue a query and returns an empty map with no-op mutation handlers

#### Scenario: Attendance map refreshes after mutation
- **WHEN** an attendance record is created, updated, or deleted
- **THEN** the panel calls `asistenciasHook.refresh()` and the `asistenciaMap` reflects the new state

### Requirement: RLS enforcement on asistencias
The system MUST enforce Row Level Security on `public.asistencias` through database-level policies. All browser client calls go through RLS automatically. The `atleta` role MUST be completely excluded from SELECT, INSERT, UPDATE, and DELETE.

#### Scenario: Admin can read attendance records for their tenant
- **WHEN** a user with `administrador` or `entrenador` role queries `asistencias` for a training in their tenant
- **THEN** rows matching the tenant are returned

#### Scenario: Athlete cannot read attendance records
- **WHEN** an atleta queries `asistencias` directly (e.g., Supabase browser client)
- **THEN** zero rows are returned (RLS excludes the `atleta` role from SELECT)

#### Scenario: Admin can insert attendance only with validado_por = auth.uid()
- **WHEN** an administrador attempts to insert an `asistencias` row with `validado_por` set to a different user ID
- **THEN** the INSERT is rejected by RLS

#### Scenario: Cross-tenant access is blocked
- **WHEN** an authenticated user attempts to access attendance records for a training outside their tenant membership
- **THEN** no rows are returned by the RLS policy

### Requirement: Layered architecture compliance for asistencias
The attendance feature implementation SHALL follow the project architecture: `components → hooks → service → supabase`. No direct Supabase calls from components or pages are permitted. All Supabase access MUST be in `asistencias.service.ts` and consumed via `useAsistencias`.

#### Scenario: Supabase access is service-layer only
- **WHEN** the attendance feature code is reviewed
- **THEN** all `supabase` calls are in `asistencias.service.ts` and consumed only via `useAsistencias`
