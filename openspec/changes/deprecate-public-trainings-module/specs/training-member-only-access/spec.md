## ADDED Requirements

### Requirement: Public trainings routes are removed
The application SHALL NOT serve `/entrenamientos-publicos`, `/entrenamientos-publicos/{entrenamiento_id}` or `/portal/entrenamientos-publicos`. These paths SHALL return the standard 404 response and SHALL NOT redirect.

#### Scenario: Landing marketplace URL
- **WHEN** a visitor opens `/entrenamientos-publicos` or `/entrenamientos-publicos/{entrenamiento_id}`
- **THEN** the response SHALL be the application's 404 page

#### Scenario: Portal marketplace URL
- **WHEN** an authenticated user opens `/portal/entrenamientos-publicos`
- **THEN** the response SHALL be the application's 404 page

### Requirement: Trainings cannot be published
Trainings management SHALL NOT offer any action to publish a training or to manage a publication, and SHALL NOT display a visibility badge, legend or field. Every training created or edited through the application SHALL be private to its tenant, with `visible_para` equal to the training's `tenant_id`.

#### Scenario: Action modal has no publish option
- **WHEN** an administrator or trainer opens the actions modal of a training
- **THEN** no "Publicar" or "Gestionar publicación" option SHALL be shown

#### Scenario: No visibility indicators
- **WHEN** the trainings list, calendar, detail modal or wizard is rendered
- **THEN** no visibility badge, legend or "Visibilidad" field SHALL be shown

#### Scenario: New training is private
- **WHEN** an administrator or trainer creates a training
- **THEN** the stored row SHALL have `visibilidad = 'privado'` and `visible_para` equal to its `tenant_id`

#### Scenario: Template saved with a visibility value
- **WHEN** a user loads a saved training template whose content contains a `visibilidad` key
- **THEN** the wizard SHALL load the template without error and SHALL ignore that key

### Requirement: Existing publications are deactivated without data loss
The deprecation migration SHALL set `activo = false` on every row of `entrenamientos_publicos`, SHALL set every training to `visibilidad = 'privado'` with `visible_para = tenant_id`, and SHALL NOT delete any row, table or column.

#### Scenario: State after the migration
- **WHEN** the migration has been applied
- **THEN** no row of `entrenamientos_publicos` SHALL have `activo = true`, no row of `entrenamientos` SHALL have `visibilidad = 'publico'`, and the row count of `entrenamientos_publicos` SHALL equal the count before the migration

### Requirement: Publication data is closed to clients
The `authenticated` role SHALL NOT have `insert`, `update` or `delete` on `entrenamientos_publicos`. The `anon` and `authenticated` roles SHALL NOT have any privilege on `entrenamientos_publicos_view` or `entrenamientos_publicos_servicios_view`.

#### Scenario: Anonymous read of the public view
- **WHEN** a request with the `anon` role selects from `entrenamientos_publicos_view`
- **THEN** the request SHALL be denied

#### Scenario: Administrator tries to publish through the API
- **WHEN** a tenant administrator inserts or updates a row in `entrenamientos_publicos`
- **THEN** the request SHALL be denied

### Requirement: Training data is readable only by tenant members
RLS SHALL allow an authenticated user to select a row of `entrenamientos` only when the user is a member of the row's tenant or owns a booking (`reservas.atleta_id = auth.uid()`) on that training. RLS SHALL allow selecting `entrenamiento_categorias` and `entrenamiento_restricciones` only for members of the tenant. No policy SHALL grant access based on `entrenamientos.visibilidad`. The `servicios` select policy SHALL NOT grant access because a service is required by a published training.

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
