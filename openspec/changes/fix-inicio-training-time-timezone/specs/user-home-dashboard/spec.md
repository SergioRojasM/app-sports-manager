## MODIFIED Requirements

### Requirement: Featured next training card
The dashboard SHALL display a hero-style card for the user's soonest upcoming training session. The card SHALL use a horizontal layout with an image area (left 1/3) and a content area (right 2/3). The training's date and time SHALL be formatted using the `America/Bogota` timezone regardless of the server runtime's local timezone.

#### Scenario: Featured training with data
- **WHEN** the user has at least one upcoming training via reservas
- **THEN** the system SHALL display the soonest training in a hero card with:
  - Left 1/3: gradient overlay area (CSS gradient fallback when no image available)
  - Right 2/3: "Próximo Entrenamiento" badge, training name, time and duration, venue and meeting point, organization name, and a "Ver Detalles" CTA button with `gradient-brand` styling

#### Scenario: Featured training empty state
- **WHEN** the user has no upcoming trainings
- **THEN** the system SHALL display an empty state card with a motivational message and appropriate icon

#### Scenario: Featured training CTA navigation
- **WHEN** the user clicks the "Ver Detalles" button
- **THEN** the system SHALL navigate to the training detail page within the corresponding tenant context

#### Scenario: Featured training time reflects Bogotá timezone
- **WHEN** the featured training's `fecha_hora` corresponds to 8:00 p.m. in `America/Bogota` (stored as a `timestamptz` UTC instant)
- **THEN** the card SHALL display `8:00 p. m.` as the time, regardless of the server process's local timezone

### Requirement: Upcoming trainings list
The dashboard SHALL display a list of up to 5 upcoming training sessions ordered by `fecha_hora ASC` in activity-row cards within a glass card. Each row SHALL show the discipline icon, training name, formatted date/time, venue, meeting point, organization name, and booking status badge. The date/time SHALL be formatted using the `America/Bogota` timezone regardless of the server runtime's local timezone.

#### Scenario: Trainings list with data
- **WHEN** the user has upcoming trainings via reservas
- **THEN** the system SHALL display up to 5 sessions ordered by `fecha_hora ASC`, each showing:
  - Discipline icon (Material icon or fallback `exercise`)
  - Training name in bold secondary colour
  - Date/time formatted as a localized string in `America/Bogota` (e.g., "Mar, 4 mar · 6:00 PM")
  - Venue name with `location_on` icon
  - Meeting point (`punto_encuentro`)
  - Organization name
  - Booking status badge (emerald for `confirmada`, amber for `pendiente`)

#### Scenario: Trainings list empty state
- **WHEN** the user has no upcoming trainings
- **THEN** the system SHALL display an empty state message: "No tienes entrenamientos próximos"

#### Scenario: Training row links to tenant-scoped page
- **WHEN** the user clicks a training row
- **THEN** the system SHALL navigate to the training page within the corresponding tenant context

#### Scenario: List time matches trainings management panel
- **WHEN** a training displayed in the upcoming trainings list is also visible in the trainings management panel (`EntrenamientosPage.tsx`/`EntrenamientosCalendar.tsx`)
- **THEN** the displayed time SHALL be identical in both places, since both are computed in `America/Bogota` from the same `fecha_hora` value
