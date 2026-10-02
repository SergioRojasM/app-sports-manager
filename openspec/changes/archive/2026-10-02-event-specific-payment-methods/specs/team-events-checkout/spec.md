## MODIFIED Requirements

### Requirement: Step 3 payment
When the total is greater than 0, step 3 SHALL show:
- the order summary (event, ticket, coupon, total);
- radio cards, using `EventoMetodoPagoCard`, of one single list made of `eventos.metodos_pago` followed by the selected ticket's `evento_entradas.metodos_pago`, **excluding `tipo = 'efectivo'`** and de-duplicated by `id` (the first occurrence wins). Nothing SHALL indicate whether a method applies to all tickets or only to the selected one, nor whether it is an event-only method;
- a required proof file input accepting JPEG, PNG, WebP or PDF up to 5 MB, showing the file name and size and a "Quitar" action.

When the buyer changes the selected ticket and the chosen method is not in the new list, the selection SHALL be cleared.

When no non-cash method exists in that list, it SHALL show "Este evento no tiene métodos de pago en línea disponibles. Contacta al organizador." and disable "Confirmar compra".

#### Scenario: Cash hidden
- **WHEN** the event has one transfer method and one cash method
- **THEN** only the transfer method SHALL be offered

#### Scenario: Cash-only event
- **WHEN** a paid event's only methods (event and selected ticket) are cash
- **THEN** the no-online-methods message SHALL be shown and "Confirmar compra" SHALL be disabled

#### Scenario: Oversized proof
- **WHEN** a 6 MB file, or a `.docx`, is chosen as the proof
- **THEN** it SHALL be rejected inline and not kept

#### Scenario: Event and ticket methods shown together
- **WHEN** the event has the method "Nequi" for all tickets and the selected ticket "VIP" has the method "Cuenta VIP"
- **THEN** the buyer SHALL see "Nequi" and "Cuenta VIP" in one list with no distinction between them

#### Scenario: Methods of other tickets hidden
- **WHEN** the buyer selects ticket "General" and "Cuenta VIP" belongs only to ticket "VIP"
- **THEN** "Cuenta VIP" SHALL NOT be offered

#### Scenario: Ticket change clears an unavailable method
- **WHEN** the buyer chose "Cuenta VIP", goes back and selects ticket "General"
- **THEN** no method SHALL be selected in step 3

#### Scenario: Ticket covered only by its own method
- **WHEN** the event has no methods for all tickets and the selected ticket has one transfer method
- **THEN** that method SHALL be offered and "Confirmar compra" SHALL be available once it and the proof are set

#### Scenario: Guest sees ticket methods
- **WHEN** a guest (not logged in) reaches step 3 for a ticket with its own non-cash method
- **THEN** that method SHALL be offered
