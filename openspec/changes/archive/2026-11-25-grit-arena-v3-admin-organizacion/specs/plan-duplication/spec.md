# Spec Delta

## MODIFIED Requirements

### Requirement: Administrator can duplicate an existing plan from the plans table
The system SHALL allow a tenant administrator to duplicate an existing membership plan by activating the "Duplicar" action on any plan card. The duplication SHALL open the plan creation drawer pre-filled with all source plan data so the administrator can review and modify before saving.

#### Scenario: Duplicate button triggers pre-filled modal
- **WHEN** an administrator activates the "Duplicar" action on a plan card
- **THEN** the system SHALL open the plan form drawer in `'duplicate'` mode with all source plan fields pre-loaded

#### Scenario: Duplicate button absent in read-only table
- **WHEN** the plan cards are rendered in read-only mode (roles `usuario` and `entrenador`)
- **THEN** the system SHALL NOT render the "Duplicar" action on any card
