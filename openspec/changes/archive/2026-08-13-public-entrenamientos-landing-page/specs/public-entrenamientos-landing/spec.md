## ADDED Requirements

### Requirement: Anonymous access to the public trainings list
The system SHALL allow an unauthenticated visitor to view the list of active, upcoming, published cross-tenant trainings at `/entrenamientos-publicos` without being redirected to `/auth/login`.

#### Scenario: Logged-out visitor opens the page
- **WHEN** an unauthenticated visitor navigates to `/entrenamientos-publicos`
- **THEN** the page renders directly, with no redirect to `/auth/login`, and lists every currently published training (`entrenamientos_publicos.activo = true`) whose `fecha_hora` is in the future, ordered by `fecha_hora` ascending

#### Scenario: Authenticated marketplace is unaffected
- **WHEN** a logged-in user navigates to `/portal/entrenamientos-publicos`
- **THEN** the existing authenticated marketplace behavior (filters, real booking flow, `listPublicTrainings`/`listPublicTenantOptions`) is unchanged by this feature

### Requirement: Public read path exposes only safe, filtered data
The system SHALL expose public training data to anonymous sessions through a dedicated read path (`entrenamientos_publicos_view`) that never grants anonymous access to the underlying `entrenamientos_publicos`, `reservas`, `disciplinas`, `escenarios`, or `tenants` tables, and never includes inactive or past trainings.

#### Scenario: Inactive publication is hidden
- **WHEN** a training's publication has `activo = false`
- **THEN** it does not appear in the response returned to `/entrenamientos-publicos`, even though it may still exist in `entrenamientos_publicos`

#### Scenario: Past training is hidden
- **WHEN** a published training's `fecha_hora` is earlier than the current time
- **THEN** it does not appear in the response returned to `/entrenamientos-publicos`

#### Scenario: Anonymous session cannot query base tables directly
- **WHEN** a request using the anonymous (no-session) Supabase client queries `entrenamientos_publicos`, `reservas`, `disciplinas`, `escenarios`, or `tenants` directly
- **THEN** row-level security continues to reject or restrict that query exactly as it does today (unchanged by this feature); only the dedicated view is anonymously queryable

#### Scenario: Occupancy data is available without extra authenticated calls
- **WHEN** the public list is loaded
- **THEN** each item includes a `reservasActivas` count (active, non-cancelled bookings) obtained from the same read path, without any additional per-row call to an authenticated-only endpoint

### Requirement: "Regístrate para reservar" call to action replaces booking for anonymous visitors
The system SHALL present a sign-up/login call to action instead of the real booking flow whenever a visitor without a session attempts to reserve a training from the public page.

#### Scenario: Visitor clicks "Reservar" on the public page
- **WHEN** an unauthenticated visitor clicks "Reservar" on any training card at `/entrenamientos-publicos`
- **THEN** a "Regístrate para reservar" dialog opens, and the real booking flow (`ReservaFormModal`/`FormularioRespuestaModal` or any RPC that books/deducts a reservation) is never invoked

#### Scenario: Visitor chooses to create an account
- **WHEN** the visitor clicks "Crear cuenta gratis" inside the dialog
- **THEN** they are navigated to `/auth/signup`

#### Scenario: Visitor chooses to log in
- **WHEN** the visitor clicks "Ya tengo cuenta" inside the dialog
- **THEN** they are navigated to `/auth/login?next=/portal/entrenamientos-publicos`, and a successful login lands them on the authenticated marketplace

### Requirement: Public trainings page is discoverable from the landing
The system SHALL provide a visible link from the marketing landing page (`/`) to `/entrenamientos-publicos`.

#### Scenario: Visitor browses the landing page
- **WHEN** a visitor loads `/`
- **THEN** the page header contains a link that navigates to `/entrenamientos-publicos`

### Requirement: Empty and error states
The system SHALL present a non-error empty state when there are zero active published trainings, and a user-facing error message (not a silent failure) if the list fails to load.

#### Scenario: No trainings are currently published
- **WHEN** `/entrenamientos-publicos` loads and no active, upcoming publications exist
- **THEN** the page shows an empty-state message instead of an error or a blank grid

#### Scenario: The list fails to load
- **WHEN** the request to load the public trainings list fails
- **THEN** the page shows an inline error message to the visitor instead of throwing an unhandled error
