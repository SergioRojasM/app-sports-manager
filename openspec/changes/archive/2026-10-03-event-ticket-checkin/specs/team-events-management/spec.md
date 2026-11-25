## ADDED Requirements

### Requirement: Control de ingreso action
The actions menu of every published event (`borrador = false`) with `estado = 'confirmado'`, in the cards, list and calendar views, SHALL offer **"Control de ingreso"** (icon `qr_code_scanner`) right after "Ver compras". It SHALL navigate to `/portal/orgs/{tenantId}/control-ingreso/{eventoId}`. Drafts and cancelled events SHALL NOT offer it.

#### Scenario: Confirmed event
- **WHEN** the admin chooses "Control de ingreso" on a confirmed published event
- **THEN** they SHALL navigate to that event's check-in page

#### Scenario: Draft event
- **WHEN** the admin opens the actions menu of a draft
- **THEN** "Control de ingreso" SHALL NOT be offered
