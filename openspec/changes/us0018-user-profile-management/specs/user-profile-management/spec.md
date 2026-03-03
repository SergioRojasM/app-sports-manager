## ADDED Requirements

### Requirement: User can view their profile
The system SHALL display the authenticated user's personal information and sports profile on a dedicated page at `/portal/perfil`, accessible from the avatar dropdown menu in the portal header.

#### Scenario: Profile page loads with existing data
- **WHEN** an authenticated user navigates to `/portal/perfil`
- **THEN** the system SHALL fetch and display their `usuarios` row (nombre, apellido, email, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, rh) and their `perfil_deportivo` row (peso_kg, altura_cm) if it exists

#### Scenario: Profile page loads when no sports profile exists
- **WHEN** an authenticated user navigates to `/portal/perfil` and no `perfil_deportivo` row exists for that user
- **THEN** the system SHALL display the personal information form with sports profile fields empty (not an error state)

#### Scenario: Profile page shows loading state
- **WHEN** the profile data fetch is in progress
- **THEN** the system SHALL display a loading indicator and SHALL NOT render the form with empty/stale data

#### Scenario: Profile page shows error state
- **WHEN** the profile data fetch fails
- **THEN** the system SHALL display an error message and a retry action

---

### Requirement: User can edit their personal information
The system SHALL provide an editable form for the authenticated user to modify their personal profile fields: nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, and rh.

#### Scenario: Fields are editable on page load
- **WHEN** the profile page finishes loading
- **THEN** all editable fields SHALL be immediately interactive (no separate "edit mode" toggle required)

#### Scenario: Email field is read-only
- **WHEN** the profile form is rendered
- **THEN** the email field SHALL be visually distinct as read-only and SHALL NOT accept user input

#### Scenario: Tipo de Identificación renders as a select
- **WHEN** the user interacts with the tipo_identificacion field
- **THEN** the system SHALL present a dropdown with options: CC, CE, TI, NIT, Pasaporte, Otro

#### Scenario: RH field renders as a select
- **WHEN** the user interacts with the rh field
- **THEN** the system SHALL present a dropdown with options: O+, O−, A+, A−, B+, B−, AB+, AB−

---

### Requirement: User can edit their sports profile
The system SHALL provide editable numeric fields for peso_kg and altura_cm linked to the `perfil_deportivo` table.

#### Scenario: Sports profile fields accept numeric input
- **WHEN** the user enters a value in the peso_kg or altura_cm fields
- **THEN** the field SHALL accept numeric input with decimal precision (step 0.1)

#### Scenario: Sports profile fields have sensible bounds
- **WHEN** the user enters a value in peso_kg or altura_cm
- **THEN** the input SHALL enforce min 0 and max 300

---

### Requirement: Form tracks dirty state
The system SHALL track whether the current form values differ from the last persisted state and SHALL enable or disable action buttons accordingly.

#### Scenario: Save button disabled when form is unchanged
- **WHEN** the profile page loads and no fields have been modified
- **THEN** the "Guardar Cambios" button SHALL be disabled

#### Scenario: Save button enabled when a field is modified
- **WHEN** the user changes any form field value
- **THEN** the "Guardar Cambios" button SHALL become enabled

#### Scenario: Cancel button disabled when form is unchanged
- **WHEN** the profile page loads and no fields have been modified
- **THEN** the "Cancelar" button SHALL be disabled

#### Scenario: Cancel button enabled when a field is modified
- **WHEN** the user changes any form field value
- **THEN** the "Cancelar" button SHALL become enabled

---

### Requirement: User can save profile changes
The system SHALL persist changes to both `public.usuarios` and `public.perfil_deportivo` when the user submits the form.

#### Scenario: Successful save of personal information
- **WHEN** the user modifies editable personal fields and clicks "Guardar Cambios"
- **THEN** the system SHALL UPDATE the corresponding `public.usuarios` row for `auth.uid()`
- **THEN** the system SHALL display a success message
- **THEN** the "Guardar Cambios" button SHALL return to disabled state

#### Scenario: Successful upsert of sports profile
- **WHEN** the user modifies peso_kg or altura_cm and clicks "Guardar Cambios"
- **THEN** the system SHALL UPSERT the `public.perfil_deportivo` row for the current user (insert if missing, update if present)
- **THEN** the system SHALL display a success message

#### Scenario: Nombre is required
- **WHEN** the user clears the nombre field and clicks "Guardar Cambios"
- **THEN** the system SHALL display an inline validation error on the nombre field and SHALL NOT submit

#### Scenario: Apellido is required
- **WHEN** the user clears the apellido field and clicks "Guardar Cambios"
- **THEN** the system SHALL display an inline validation error on the apellido field and SHALL NOT submit

#### Scenario: Save failure shows error feedback
- **WHEN** the Supabase update/upsert call fails
- **THEN** the system SHALL display an error message and SHALL NOT reset the form values

---

### Requirement: User can cancel unsaved changes
The system SHALL allow the user to discard unsaved form changes and revert to the last persisted state.

#### Scenario: Cancel reverts all form fields
- **WHEN** the user has modified one or more fields and clicks "Cancelar"
- **THEN** all form fields SHALL revert to the values loaded from the last successful fetch or save
- **THEN** the "Guardar Cambios" and "Cancelar" buttons SHALL return to disabled state

#### Scenario: Cancel clears validation errors
- **WHEN** the user has triggered validation errors and then clicks "Cancelar"
- **THEN** all inline validation error messages SHALL be cleared

---

### Requirement: Avatar is displayed with fallback
The system SHALL display the user's profile photo if `foto_url` is set, or render their initials as a fallback.

#### Scenario: Avatar displays photo when foto_url is set
- **WHEN** the user's `foto_url` is a non-null, non-empty string
- **THEN** the system SHALL render an `<img>` element using that URL within a rounded avatar frame

#### Scenario: Avatar displays initials when foto_url is null
- **WHEN** the user's `foto_url` is null or empty
- **THEN** the system SHALL render the user's initials (first letter of nombre + first letter of apellido) in a styled rounded frame as the avatar

---

### Requirement: Avatar upload is a non-functional placeholder
The system SHALL render an avatar upload button that is visually present but non-functional, indicating future availability.

#### Scenario: Upload button is visible but disabled
- **WHEN** the profile page is rendered
- **THEN** the system SHALL display an edit/camera icon button overlaid on the avatar
- **THEN** the button SHALL be rendered as `disabled`
- **THEN** hovering over the button SHALL display the tooltip text "Próximamente"

---

### Requirement: Profile page is accessible outside tenant context
The system SHALL serve the profile page at `/portal/perfil` independently of any tenant/organization scope.

#### Scenario: Profile accessible without a tenant_id in the URL
- **WHEN** an authenticated user navigates directly to `/portal/perfil`
- **THEN** the page SHALL render without requiring a `tenant_id` URL segment

#### Scenario: Profile accessible via avatar menu from any portal page
- **WHEN** the user is on any page under `/portal/` and clicks "Perfil" in the avatar dropdown
- **THEN** the browser SHALL navigate to `/portal/perfil` and the profile page SHALL load

#### Scenario: Unauthenticated access is rejected
- **WHEN** an unauthenticated user navigates to `/portal/perfil`
- **THEN** the system SHALL redirect the user to the login page (handled by the portal middleware/layout guard)

---

### Requirement: RLS policies protect profile data
The system SHALL enforce row-level security so that users can only read and write their own profile records.

#### Scenario: User can only update their own usuarios row
- **WHEN** a database UPDATE is issued on `public.usuarios`
- **THEN** Supabase RLS SHALL only permit the update if `id = auth.uid()`

#### Scenario: User can only select, insert, and update their own perfil_deportivo row
- **WHEN** a database SELECT, INSERT, or UPDATE is issued on `public.perfil_deportivo`
- **THEN** Supabase RLS SHALL only permit the operation if `user_id = auth.uid()`
