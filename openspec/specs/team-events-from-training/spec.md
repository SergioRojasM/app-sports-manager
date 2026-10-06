# team-events-from-training Specification

## Purpose
Publishing one future team training as a new event (US-0132): the admin-only, future-only "Publicar en eventos" entry point, the `?desdeEntrenamiento=` create route, what the unsaved draft carries and leaves out, the explicit "capacity is not shared" messaging, and the not-found, past-training and error states.

## Requirements
### Requirement: Publicar en eventos action on future trainings
The training options modal SHALL show a "Publicar en eventos" option between "Ver reservas" and "Editar", and only when the tenant role is `administrador`.
- The option SHALL be enabled only when the selected training occurrence has a `fecha_hora` later than the current time, regardless of its `estado` or of whether it belongs to a series.
- Otherwise it SHALL be disabled and SHALL display `Solo los entrenamientos futuros se pueden publicar como evento.`
- Choosing the enabled option SHALL close the modal and navigate to `/portal/orgs/{tenantId}/gestion-eventos/nuevo?desdeEntrenamiento={entrenamientoId}`, where the id is the `entrenamientos` row of that occurrence.
- Choosing it SHALL NOT write to the database.

#### Scenario: Administrator sees an enabled option on a future training
- **WHEN** an administrador opens the options of a training dated tomorrow
- **THEN** "Publicar en eventos" is shown between "Ver reservas" and "Editar" and is enabled

#### Scenario: Option hidden for other roles
- **WHEN** an entrenador or an athlete opens the options of a future training
- **THEN** "Publicar en eventos" is not shown

#### Scenario: Option disabled for past trainings
- **WHEN** an administrador opens the options of a training whose date is in the past, or that has no date
- **THEN** "Publicar en eventos" is disabled and reads `Solo los entrenamientos futuros se pueden publicar como evento.`

#### Scenario: Series occurrence
- **WHEN** an administrador chooses "Publicar en eventos" on one future occurrence of a recurring series
- **THEN** the browser navigates to `gestion-eventos/nuevo?desdeEntrenamiento={occurrenceId}` and the wizard uses that occurrence's date, not the series start

#### Scenario: Nothing is created by navigating
- **WHEN** the administrador chooses the option and then leaves the wizard without saving
- **THEN** the events list contains the same events as before

### Requirement: Create route accepts a source training
The create-event route SHALL accept a `desdeEntrenamiento` query param. If the param is an array, the route SHALL use its first value. The route SHALL use the value only when it is a UUID; otherwise the wizard SHALL open empty.
- When both `duplicar` and `desdeEntrenamiento` are valid, the duplicate mode SHALL take precedence and `desdeEntrenamiento` SHALL be ignored.
- The route stays under the `(administrador)` layout guard.

#### Scenario: Invalid value ignored
- **WHEN** the wizard is opened with `?desdeEntrenamiento=abc`
- **THEN** the empty create wizard opens with no error

#### Scenario: Duplicate takes precedence
- **WHEN** the wizard is opened with valid `duplicar` and `desdeEntrenamiento` values
- **THEN** the wizard opens as a copy of the `duplicar` event

### Requirement: Wizard pre-filled from the training
With a valid `desdeEntrenamiento`, the wizard SHALL load that training of the same tenant and SHALL re-check that it is future. If it is, the wizard SHALL open in create mode, titled "Nuevo evento", with an unsaved draft built from it:
- name: trimmed, at most 150 characters;
- description: when it is longer than 300 characters, the full text goes to "Descripción larga" and "Descripción" stays empty;
- date and time (Bogotá);
- duration, capacity, and booking and cancellation lead times;
- discipline name;
- scenario snapshot;
- meeting point;
- the training's trainer as the only trainer, with empty experience;
- the internal form, when there is one.

Tickets, payment methods, banner, official URL, cronograma and incluye SHALL start empty. `publico` and `activo` SHALL be true. External form links, `formulario_obligatorio`, level categories, booking restrictions, series rules and reservations SHALL NOT be carried.

The draft SHALL be dirty from the start, so "Guardar borrador" is enabled and the unsaved-changes guard is armed. Saving and validation SHALL follow the existing create flow. The training SHALL NOT be modified.

#### Scenario: Fields copied
- **WHEN** the wizard opens from a future training with a trainer, an internal form, a scenario, a capacity of 20 and lead times
- **THEN** step 1 shows those values, step 2 has the form selected and no tickets, and step 3 has no payment methods

#### Scenario: Long description
- **WHEN** the training's description has 450 characters
- **THEN** "Descripción larga" contains all 450 characters and "Descripción" is empty

#### Scenario: Short description
- **WHEN** the training's description has 300 characters or fewer
- **THEN** it is placed in "Descripción" and "Descripción larga" is empty

#### Scenario: External form not carried
- **WHEN** the training uses an external form link
- **THEN** the event draft has no form selected

#### Scenario: Stale references keep the existing behavior
- **WHEN** the training's discipline, scenario or internal form template is inactive
- **THEN** the wizard shows the same stale labels or warnings it shows in edit mode, and an inactive form blocks publishing but not saving the draft

#### Scenario: First draft save
- **WHEN** the administrador presses "Guardar borrador" right after the draft loads
- **THEN** a new draft event is created, the URL becomes `/gestion-eventos/{newId}/editar?paso={step}` without `desdeEntrenamiento`, and the training is unchanged

#### Scenario: Publishing
- **WHEN** the administrador adds a complete ticket and its payment method and presses "Publicar evento"
- **THEN** the event is published and the list shows "Evento creado correctamente."

#### Scenario: Leaving before saving
- **WHEN** the administrador clicks "Volver a eventos", closes or reloads the tab before the first save
- **THEN** the existing unsaved-changes guard is triggered

### Requirement: Capacity is not shared and is stated while creating
The event created from a training SHALL have its own capacity. The training's reservations and the event's tickets SHALL be counted separately and SHALL NOT reduce each other.

While the draft comes from a training (until the first successful save), the wizard SHALL state this in two places:
- A line in the source notice: `La capacidad no es compartida: el evento tiene su propio cupo, independiente del entrenamiento. Las reservas del entrenamiento y las entradas del evento se cuentan por separado; ajusta ambos cupos si juntos no deben superar la capacidad real.`
- A non-dismissible hint on "Cupo máximo", linked through the field's `aria-describedby`: `Cupo propio del evento, no compartido con el entrenamiento "{nombre}" (cupo {n}). Vacío = cupo ilimitado.` When the training has no capacity, the hint omits ` (cupo {n})`.

#### Scenario: Hint survives dismissing the notice
- **WHEN** the administrador closes the source notice
- **THEN** the capacity hint on "Cupo máximo" is still visible

#### Scenario: Hint gone after saving
- **WHEN** the first "Guardar borrador" succeeds
- **THEN** the notice and the capacity hint are no longer shown, and the field shows its standard hint again

#### Scenario: Capacities are independent
- **WHEN** a published event created from a training with a capacity of 10 sells 4 tickets
- **THEN** the training still has 10 spots available for reservations, and booking the training does not change the event's sold count

### Requirement: Source notice
While the draft comes from a training, the wizard SHALL show a dismissible notice between the header and the stepper. The notice SHALL use `role="status"`, and its close button SHALL have `aria-label="Cerrar mensaje"`. It SHALL contain these lines:
- Always: `Estás publicando como evento el entrenamiento "{nombre}". No se guarda nada hasta que pulses "Guardar borrador" o "Publicar evento".`
- Always: the capacity line.
- Always: `Define las entradas (paso 2) y los métodos de pago (paso 3): un entrenamiento no tiene precios.`
- When the description was moved: `La descripción del entrenamiento supera 300 caracteres: la movimos a "Descripción larga". Escribe una descripción corta.`
- When an external form link was dropped: `El entrenamiento usa un enlace de formulario externo, que los eventos no admiten. Elige un formulario interno si lo necesitas.`

#### Scenario: Conditional lines
- **WHEN** the training has a short description and no external form
- **THEN** the notice shows only the source, capacity and tickets lines

#### Scenario: Dismiss
- **WHEN** the administrador presses the close button
- **THEN** the notice is hidden for the rest of the session on that page

### Requirement: Source training errors
The wizard SHALL handle a source training that cannot be used with explicit states:
- When the training does not exist or belongs to another tenant, it SHALL show "Entrenamiento no encontrado" with `El entrenamiento no existe o pertenece a otra organización.` and "Volver a eventos".
- When the training's date is not later than the current time at load, it SHALL show "Este entrenamiento ya pasó" with `Solo los entrenamientos futuros se pueden publicar como evento.` and "Volver a eventos", without building a draft.
- When loading fails, it SHALL show the existing error state with "Reintentar", and retrying SHALL load the draft.

#### Scenario: Foreign or missing training
- **WHEN** the wizard is opened with `?desdeEntrenamiento={id}` of another tenant's training
- **THEN** "Entrenamiento no encontrado" is shown

#### Scenario: Past training via URL
- **WHEN** the wizard is opened with `?desdeEntrenamiento={id}` of a training that already took place
- **THEN** "Este entrenamiento ya pasó" is shown and no draft is created

#### Scenario: Load error and retry
- **WHEN** reading the training fails and the administrador presses "Reintentar" after connectivity returns
- **THEN** the pre-filled draft is shown
