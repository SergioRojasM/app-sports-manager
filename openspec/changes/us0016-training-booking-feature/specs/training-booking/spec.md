## ADDED Requirements

### Requirement: Booking panel access from training detail
The system SHALL render a `ReservasPanel` within the `gestion-entrenamientos` page when a training instance is selected, without navigating to a new route. The panel SHALL display a booking list and role-appropriate action controls.

#### Scenario: Atleta opens booking panel
- **WHEN** an authenticated atleta selects a training instance from the calendar or list view
- **THEN** the system renders the booking panel showing only the atleta's own booking (if any) plus a "Reservar" button when no active booking exists

#### Scenario: Entrenador or administrador opens booking panel
- **WHEN** an authenticated entrenador or administrador selects a training instance
- **THEN** the system renders the booking panel showing all bookings for that training, a capacity indicator, and action controls for create, edit, cancel, and delete

### Requirement: Atleta self-booking
The system SHALL allow an atleta to reserve a spot in a training instance. The booking MUST be created with `atleta_id = auth.uid()`, `estado = 'pendiente'`, and `fecha_reserva = now()`.

#### Scenario: Successful self-booking
- **WHEN** an atleta clicks "Reservar" on an available training and confirms the action
- **THEN** a new booking record is created in `pendiente` state and the panel reflects the new booking immediately

#### Scenario: Booking blocked when training is full
- **WHEN** an atleta attempts to book a training whose active booking count equals `cupo_maximo`
- **THEN** the "Reservar" button is disabled and a message indicating the training is full is shown

#### Scenario: Duplicate booking prevented
- **WHEN** an atleta who already has a non-cancelled booking for the same training attempts to book again
- **THEN** the "Reservar" button is replaced with a "Ya reservado" indicator and no new booking is created

#### Scenario: Booking blocked on inactive training
- **WHEN** an atleta attempts to book a training with `estado = 'cancelado'` or `'finalizado'`
- **THEN** the booking action is unavailable and a descriptive message is shown

### Requirement: Atleta self-cancellation
The system SHALL allow an atleta to cancel their own booking while its `estado` is `pendiente` or `confirmada`. Cancellation MUST set `estado = 'cancelada'` and `fecha_cancelacion = now()`.

#### Scenario: Successful self-cancellation
- **WHEN** an atleta cancels their own booking in `pendiente` or `confirmada` state
- **THEN** the booking `estado` is updated to `cancelada`, `fecha_cancelacion` is set, and the panel updates accordingly

#### Scenario: Cancellation blocked for completed bookings
- **WHEN** an atleta attempts to cancel a booking with `estado = 'completada'`
- **THEN** the cancel action is unavailable

### Requirement: Admin and trainer booking management — create on behalf
The system SHALL allow entrenadores and administradores to create a booking on behalf of any tenant atleta by selecting that atleta from a picker filtered to tenant members with `atleta` role.

#### Scenario: Create booking on behalf of athlete
- **WHEN** an entrenador or administrador submits the booking form with a valid `atleta_id` and optional notes
- **THEN** a new booking is created for the selected atleta in `pendiente` state

#### Scenario: Athlete picker only shows tenant atletas
- **WHEN** the booking form is opened by an entrenador or administrador
- **THEN** the athlete selector MUST only list members of the current tenant with the `atleta` role

### Requirement: Admin and trainer booking status management
The system SHALL allow entrenadores and administradores to update the `estado` and `notas` of any booking. Setting `estado = 'cancelada'` MUST also set `fecha_cancelacion = now()`.

#### Scenario: Confirm a pending booking
- **WHEN** an entrenador or administrador updates a booking `estado` from `pendiente` to `confirmada`
- **THEN** the booking is updated and the panel reflects the new status

#### Scenario: Complete a booking
- **WHEN** an entrenador or administrador sets `estado = 'completada'` on a booking for a training whose `fecha_hora` is in the past
- **THEN** the booking is marked as completed

#### Scenario: Status set to completada blocked for future trainings
- **WHEN** an entrenador or administrador attempts to set `estado = 'completada'` for a booking on a training whose `fecha_hora` is in the future or null
- **THEN** the update is rejected with a validation message

### Requirement: Admin and trainer booking deletion
The system SHALL allow entrenadores and administradores to hard-delete a booking only when its `estado` is `pendiente` or `cancelada`. A confirmation dialog MUST be shown before deletion.

#### Scenario: Delete a cancellable booking with confirmation
- **WHEN** an entrenador or administrador confirms deletion of a booking in `pendiente` or `cancelada` state
- **THEN** the booking record is permanently removed and the panel updates

#### Scenario: Delete blocked for confirmed or completed bookings
- **WHEN** an entrenador or administrador attempts to delete a booking in `confirmada` or `completada` state
- **THEN** the delete action is unavailable

### Requirement: Capacity validation in service layer
The system MUST validate available capacity before creating a booking by counting non-cancelled bookings for the training. If `cupo_maximo` is not null and active bookings count ≥ `cupo_maximo`, the service MUST reject the operation with a typed `capacity_exceeded` error.

#### Scenario: Capacity check passes
- **WHEN** a booking is submitted and active bookings count < `cupo_maximo` (or `cupo_maximo` is null)
- **THEN** the booking is created successfully

#### Scenario: Capacity check fails
- **WHEN** a booking is submitted and active bookings count ≥ `cupo_maximo`
- **THEN** the service rejects with `capacity_exceeded` and no booking is inserted

### Requirement: RLS enforcement on reservas
The system MUST enforce Row Level Security on `public.reservas` through database-level policies. All browser client calls go through RLS automatically.

#### Scenario: Atleta can only read own bookings
- **WHEN** an atleta queries `reservas` for a training
- **THEN** only rows where `atleta_id = auth.uid()` and `tenant_id` matches their membership are returned

#### Scenario: Cross-tenant access is blocked
- **WHEN** an authenticated user attempts to access bookings for a training outside their tenant membership
- **THEN** no rows are returned by the RLS policy

#### Scenario: Atleta cannot update or delete other athletes' bookings
- **WHEN** an atleta attempts to mutate a booking where `atleta_id ≠ auth.uid()`
- **THEN** the operation is rejected by RLS

### Requirement: Layered architecture compliance for reservas
The booking feature implementation SHALL follow the project architecture: `components → hooks → service → supabase`. No direct Supabase calls from components or pages are permitted.

#### Scenario: Supabase access is service-layer only
- **WHEN** the reservas feature code is reviewed
- **THEN** all `supabase` calls are in `reservas.service.ts` and consumed via `useReservas` or `useReservaForm`
