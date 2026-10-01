## ADDED Requirements

### Requirement: Cancellation policy helper
Step 1 SHALL show the helper text "Déjalo vacío si las entradas no admiten cancelación ni reembolso." under the `cancelacion_antelacion_horas` field.

#### Scenario: Helper shown
- **WHEN** the admin opens step 1
- **THEN** the helper text SHALL be shown under the cancellation field

### Requirement: Múltiple bundle limited to one form
A *Múltiple* purchase only asks for the form of the event the ticket belongs to. The bundle selector SHALL therefore:
- show the notice "Al comprar esta entrada solo se pide el formulario de este evento. Por eso solo puedes incluir eventos sin formulario o con el mismo formulario.";
- disable (not selectable) every candidate event whose `formulario_id` is set and differs from the event's current form, tagging it "Formulario distinto";
- keep an already selected conflicting event checked so it can be removed, and show the inline error "Quita «{nombre}»: usa un formulario distinto al de este evento.".

The server errors SHALL be mapped to:
- `BUNDLE_FORMULARIO_DISTINTO` → "Una entrada múltiple incluye un evento con un formulario distinto. Solo puedes incluir eventos sin formulario o con el mismo formulario de este evento."
- `FORMULARIO_EN_PAQUETE_DISTINTO` → "Este evento está incluido en la entrada múltiple de otro evento que usa un formulario distinto. Usa el mismo formulario o quítalo de ese paquete."

#### Scenario: Event with another form cannot be picked
- **WHEN** the event uses form F1 and the tenant has another event with form F2
- **THEN** that event SHALL be listed disabled with the tag "Formulario distinto"

#### Scenario: Event without a form can be picked
- **WHEN** a candidate event has no form
- **THEN** it SHALL be selectable

#### Scenario: Form changed after choosing the bundle
- **WHEN** the admin selects an event with form F1 and then changes this event's form to F2
- **THEN** the selector SHALL show the inline error naming that event, and publishing SHALL fail with the mapped `BUNDLE_FORMULARIO_DISTINTO` message

## MODIFIED Requirements

### Requirement: Step 3 payment methods and summary
Step 3 SHALL show the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." and SHALL list the tenant's active payment methods, ordered by `orden`, as checkbox cards, with "Seleccionar todos" / "Quitar todos".
- Methods with `tipo = 'efectivo'` SHALL carry the tag "No disponible para compra en línea".
- When any ticket has `valor > 0` and every checked method is cash, the step SHALL show the warning "Los compradores no podrán pagar en línea". Publishing SHALL NOT be blocked by it.
- On publish, at least one method SHALL be required when any ticket has `valor > 0`.
- The saved `metodos_pago` SHALL be the snapshots of exactly the checked methods.
- A summary panel SHALL show the name, date, ticket count and price range, coupon count, form, and method count.

#### Scenario: Paid event without a method
- **WHEN** the admin publishes with a paid ticket and no method checked
- **THEN** the error "Selecciona al menos un método de pago para las entradas con costo" SHALL be shown

#### Scenario: Free event without methods
- **WHEN** every ticket is free and no method is checked
- **THEN** the publish SHALL succeed with `metodos_pago = []`

#### Scenario: Public visibility disclosed
- **WHEN** the admin opens step 3
- **THEN** the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." SHALL be shown

#### Scenario: Cash method tagged
- **WHEN** the tenant has a cash method
- **THEN** its card SHALL show "No disponible para compra en línea"

#### Scenario: Cash-only warning
- **WHEN** a paid event has only a cash method checked
- **THEN** "Los compradores no podrán pagar en línea" SHALL be shown, and publishing SHALL still be allowed
