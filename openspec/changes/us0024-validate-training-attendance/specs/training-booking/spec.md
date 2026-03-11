## ADDED Requirements

### Requirement: Booking panel displays attendance state per row
The system SHALL display an `AsistenciaStatusBadge` inline in each booking row rendered by `ReservasPanel`. The badge is derived from the `asistenciaMap` (keyed by `reserva_id`) returned by `useAsistencias`. This augments the existing booking row display without altering any booking-related data or actions.

#### Scenario: Entrenador or administrador booking panel shows attendance badges
- **WHEN** an authenticated entrenador or administrador opens the bookings panel for a training instance
- **THEN** the system renders booking rows showing the existing booking status badge AND an attendance status badge per row

#### Scenario: Booking rows show "Sin registrar" when no attendance has been recorded
- **WHEN** the bookings panel is opened for a training and no attendance records exist for any booking
- **THEN** every booking row displays a grey "Sin registrar" attendance badge alongside the booking status badge

### Requirement: Booking panel exposes attendance action control for admin and coach
The system SHALL render an attendance action button (pencil/verify icon) per booking row in `ReservasPanel` for users with `administrador` or `entrenador` role. Clicking the button MUST open `AsistenciaFormModal` for that booking. The button MUST NOT be rendered for users with `atleta` role.

#### Scenario: Admin or coach action button opens attendance modal
- **WHEN** an administrador or entrenador clicks the attendance action button on a booking row
- **THEN** the `AsistenciaFormModal` opens pre-filled with the existing attendance record for that booking (or empty if none exists)

#### Scenario: Attendance action button absent for athletes
- **WHEN** an atleta views the bookings panel showing their own booking
- **THEN** no attendance action button is rendered on the booking row
