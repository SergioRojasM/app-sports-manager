# training-member-only-access Specification

## Purpose
TBD - created by archiving change deprecate-public-trainings-module. Update Purpose after archive.
## Requirements
### Requirement: Public trainings routes are removed
The application SHALL NOT serve `/entrenamientos-publicos`, `/entrenamientos-publicos/{entrenamiento_id}` or `/portal/entrenamientos-publicos`. These paths SHALL return the standard 404 response and SHALL NOT redirect.

#### Scenario: Landing marketplace URL
- **WHEN** a visitor opens `/entrenamientos-publicos` or `/entrenamientos-publicos/{entrenamiento_id}`
- **THEN** the response SHALL be the application's 404 page

#### Scenario: Portal marketplace URL
- **WHEN** an authenticated user opens `/portal/entrenamientos-publicos`
- **THEN** the response SHALL be the application's 404 page

### Requirement: Trainings cannot be published
Trainings management SHALL NOT offer any action to publish a training or to manage a publication, and SHALL NOT display a visibility badge, legend or field. Every training created or edited through the application SHALL be private to its tenant. The `entrenamientos` table SHALL NOT have `visibilidad` or `visible_para` columns (US-0124).

#### Scenario: Action modal has no publish option
- **WHEN** an administrator or trainer opens the actions modal of a training
- **THEN** no "Publicar" or "Gestionar publicación" option SHALL be shown

#### Scenario: No visibility indicators
- **WHEN** the trainings list, calendar, detail modal or wizard is rendered
- **THEN** no visibility badge, legend or "Visibilidad" field SHALL be shown

#### Scenario: New training is private
- **WHEN** an administrator or trainer creates a training
- **THEN** the row SHALL be stored with no visibility data and SHALL be readable only under the member and own-booking rules

#### Scenario: Template saved with a visibility value
- **WHEN** a user loads a saved training template saved before US-0124
- **THEN** the wizard SHALL load the template without error; stored template content SHALL NOT contain a `visibilidad` key

### Requirement: Training data is readable only by tenant members
RLS SHALL allow an authenticated user to select a row of `entrenamientos` only when the user is a member of the row's tenant or owns a booking (`reservas.atleta_id = auth.uid()`) on that training. RLS SHALL allow selecting `entrenamiento_categorias` and `entrenamiento_restricciones` only for members of the tenant. No policy, view or function SHALL reference `entrenamientos.visibilidad`, `entrenamientos.visible_para` or `entrenamientos_publicos`. The `servicios` select policy SHALL NOT grant access because a service is required by a published training.

#### Scenario: Non-member reads another tenant's trainings
- **WHEN** an authenticated user who is not a member of tenant A, and has no booking in tenant A, selects trainings, categories or restrictions of tenant A
- **THEN** no rows SHALL be returned

#### Scenario: Member reads own tenant's trainings
- **WHEN** a member of tenant A selects trainings of tenant A
- **THEN** the rows SHALL be returned as before

### Requirement: Only tenant members can book trainings
RLS SHALL allow inserting into `reservas` only when the user is a member of the booking's tenant and either books for themself or is a trainer or administrator of that tenant.

#### Scenario: Non-member booking attempt
- **WHEN** an authenticated user who is not a member of tenant A inserts a booking for a training of tenant A
- **THEN** the insert SHALL be rejected by RLS and no reservation row SHALL be created

#### Scenario: Member booking
- **WHEN** a member of tenant A books a training of tenant A and satisfies its restrictions
- **THEN** the booking SHALL be created as before

### Requirement: Non-members keep access to their own historical bookings
A user who is not a member of a tenant SHALL still be able to select their own rows in `reservas` for that tenant, the `entrenamientos` rows those bookings reference, and the form-response files they uploaded under their own storage path. They SHALL NOT be able to read other users' bookings or upload new form-response files for that tenant.

#### Scenario: Mis Reservas for a non-member
- **WHEN** a non-member who booked a formerly public training opens "Mis Reservas" or "Inicio"
- **THEN** the booking SHALL be listed with its training details

#### Scenario: Other users' bookings stay hidden
- **WHEN** that non-member selects bookings of the same training that belong to other athletes
- **THEN** no rows SHALL be returned

#### Scenario: Previously uploaded form file
- **WHEN** that non-member opens a file they uploaded in that booking's form
- **THEN** the file SHALL be readable

### Requirement: Authentication has no guided booking flow
The login and signup pages SHALL NOT render a guided booking stepper and SHALL NOT interpret `guiado`, `entrenamiento`, `tenant`, `disciplina` or `nombre` parameters inside `next`. The `next` parameter SHALL keep redirecting to the requested path after authentication.

#### Scenario: Login with next
- **WHEN** a user logs in from `/auth/login?next=/portal/eventos`
- **THEN** no stepper SHALL be shown and the user SHALL land on `/portal/eventos`

### Requirement: Events do not depend on public trainings code
No source file SHALL import from a path containing `entrenamientos-publicos`. `CronogramaItem`, `IncluyeItem` and `PrecioItem` SHALL be exported from `src/types/portal/eventos.types.ts`.

#### Scenario: No remaining references
- **WHEN** `git grep -i -E "entrenamientos-publicos|PublicTraining|usePublicar|guidedBooking|GuidedBookingStepper|PUBLIC_TENANT_ID" -- src` runs
- **THEN** it SHALL return no matches

#### Scenario: Events unchanged
- **WHEN** an event listing, an event detail page or the event wizard is rendered
- **THEN** schedule, "includes" and ticket price data SHALL render exactly as before this change

