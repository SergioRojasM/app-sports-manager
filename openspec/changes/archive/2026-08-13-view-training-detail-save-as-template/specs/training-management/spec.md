## ADDED Requirements

### Requirement: Detail view trigger in training action context
The system SHALL expose a "Ver detalle" action within the training action context (`EntrenamientoActionModal`), placed first in the action list — above "Ver reservas". This action MUST be visible to all roles (`canManage` true or false) and MUST NOT be disabled, regardless of `isHistoricalTraining`. Triggering it SHALL open `EntrenamientoDetalleModal` for the selected training instance.

#### Scenario: All roles can open the detail view
- **WHEN** any authenticated tenant member selects a training and triggers "Ver detalle"
- **THEN** `EntrenamientoDetalleModal` opens for that training instance

#### Scenario: Detail view is available for historical trainings
- **WHEN** a trainer or admin selects a past training instance for which "Editar" and "Eliminar" are disabled
- **THEN** "Ver detalle" is still enabled and opens `EntrenamientoDetalleModal` for that instance

#### Scenario: "Ver detalle" is listed first
- **WHEN** `EntrenamientoActionModal` is open
- **THEN** "Ver detalle" appears before "Ver reservas" in the action list
