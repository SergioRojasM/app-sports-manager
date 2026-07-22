## MODIFIED Requirements

### Requirement: Booking panel trigger in training action context
The system SHALL expose a "Ver reservas" action within the training action context (accessible from the training list row actions) that opens the `ReservasPanel` for that instance. This action MUST be visible to all roles. Calendar dot indicators SHALL be non-interactive decorative elements — clicking a dot SHALL NOT trigger any action or modal. The sole calendar interaction SHALL be clicking a day cell to filter the training list to that day.

#### Scenario: All roles can open the booking panel from the list
- **WHEN** any authenticated tenant member clicks the action trigger on a training row in `EntrenamientosList`
- **THEN** the `ReservasPanel` renders for that training instance with role-appropriate content

#### Scenario: Clicking a calendar dot does not open any modal
- **WHEN** a user clicks or taps a training dot indicator in `EntrenamientosCalendar`
- **THEN** no modal opens; the click event propagates to the parent day cell and selects that day

#### Scenario: Clicking a day cell filters the training list
- **WHEN** a user clicks or taps a day cell in `EntrenamientosCalendar`
- **THEN** the training list below the calendar is filtered to show only trainings for that day, and the cell is highlighted as selected
