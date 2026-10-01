## ADDED Requirements

### Requirement: Ver compras action
The actions menu of every published event (`borrador = false`), in the cards, list and calendar views, SHALL offer **"Ver compras"** (icon `receipt_long`). It SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/compras`. Draft events SHALL NOT offer it.

#### Scenario: Published event
- **WHEN** the admin opens the actions menu of a published event and chooses "Ver compras"
- **THEN** they SHALL navigate to that event's Compras page

#### Scenario: Draft event
- **WHEN** the admin opens the actions menu of a draft
- **THEN** "Ver compras" SHALL NOT be offered

## MODIFIED Requirements

### Requirement: Delete event
The actions menu SHALL offer "Eliminar", which opens `EliminarEventoModal` showing the event name and date and a warning that the action cannot be undone. Confirming SHALL call `deleteEvento`.
- On success, the event SHALL disappear from all views and stats.
- On failure, the modal SHALL stay open and show the mapped error inline.
- An event with purchases or tickets SHALL NOT be deletable: `deleteEvento` throws `has_purchases`, and the modal shows "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar."
- Cancelling SHALL make no change.
- Submit state and `Escape` handling SHALL match the status-change modal.

#### Scenario: Delete confirmed
- **WHEN** the admin chooses "Eliminar" and confirms
- **THEN** the row SHALL be deleted and the event SHALL no longer appear in any view or count

#### Scenario: Delete cancelled by user
- **WHEN** the admin opens the delete modal and clicks "Cancelar" or presses Escape
- **THEN** the modal SHALL close and the event SHALL remain

#### Scenario: Delete failure
- **WHEN** `deleteEvento` throws `EventoServiceError` with code `forbidden`
- **THEN** the modal SHALL show "No tienes permisos para gestionar este evento." and the event SHALL remain

#### Scenario: Delete event with sales
- **WHEN** the admin confirms deleting an event that has at least one purchase
- **THEN** the modal SHALL stay open showing "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar." and the event SHALL remain
