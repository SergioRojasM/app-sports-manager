## ADDED Requirements

### Requirement: Direct "Reservar" action on training cards
The system SHALL render a "Reservar" button on each training card of the "Lista de entrenamientos" in `gestion-entrenamientos` for users who cannot manage trainings (role `usuario`), when the training is not historical. Activating it SHALL open the `ReservasPanel` for that training in auto-book mode, so the booking dialog opens without further clicks. When the training is full (`cupo_maximo` is not null and `reservas_activas` ≥ `cupo_maximo`) the button MUST be disabled and read "Cupo lleno". The existing "Ver" button MUST remain available. Administradores and entrenadores MUST NOT see the card "Reservar" button. The button MUST have an accessible name that includes the training name.

#### Scenario: Athlete sees the card button
- **WHEN** an atleta views "Lista de entrenamientos" with an upcoming training
- **THEN** the training card shows a "Reservar" button next to the "Ver" button

#### Scenario: Card button starts the booking
- **WHEN** the atleta activates the card's "Reservar" button
- **THEN** the reservations drawer opens for that training and the booking dialog opens automatically for the current user

#### Scenario: Successful booking from the card updates the card
- **WHEN** the atleta confirms the booking started from the card and it succeeds
- **THEN** the reservation is created as in the regular flow and the card's capacity indicator reflects the new count

#### Scenario: Full training
- **WHEN** a training's active bookings equal or exceed `cupo_maximo`
- **THEN** the card button is disabled and reads "Cupo lleno"

#### Scenario: Historical training
- **WHEN** a training's date is in the past
- **THEN** its card shows no "Reservar" button

#### Scenario: Managers do not get the card button
- **WHEN** an administrador or entrenador views "Lista de entrenamientos"
- **THEN** no "Reservar" button is shown on the cards and the "Opciones" flow is unchanged

#### Scenario: Rejected booking started from the card
- **WHEN** a booking started from the card is rejected (for example, the atleta has no plan)
- **THEN** the booking rejection modal is shown above the booking dialog
