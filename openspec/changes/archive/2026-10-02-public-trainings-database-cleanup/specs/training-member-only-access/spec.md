## MODIFIED Requirements

### Requirement: Trainings cannot be published
Trainings management SHALL NOT offer any action to publish a training or to manage a publication, and SHALL NOT display a visibility badge, legend or field. Every training created or edited through the application SHALL be private to its tenant. The `entrenamientos` table SHALL NOT have `visibilidad` or `visible_para` columns (US-0124).

#### Scenario: Action modal has no publish option
- **WHEN** an administrator or trainer opens the actions modal of a training
- **THEN** no "Publicar" or "Gestionar publicación" option SHALL be shown

#### Scenario: No visibility indicators
- **WHEN** the trainings list, calendar, detail modal or wizard is rendered
- **THEN** no visibility badge, legend or "Visibilidad" field SHALL be shown

#### Scenario: New training is private
- **WHEN** an administrator or trainer creates a training
- **THEN** the row SHALL be stored with no visibility data and SHALL be readable only under the member and own-booking rules

#### Scenario: Template saved with a visibility value
- **WHEN** a user loads a saved training template saved before US-0124
- **THEN** the wizard SHALL load the template without error; stored template content SHALL NOT contain a `visibilidad` key

### Requirement: Training data is readable only by tenant members
RLS SHALL allow an authenticated user to select a row of `entrenamientos` only when the user is a member of the row's tenant or owns a booking (`reservas.atleta_id = auth.uid()`) on that training. RLS SHALL allow selecting `entrenamiento_categorias` and `entrenamiento_restricciones` only for members of the tenant. No policy, view or function SHALL reference `entrenamientos.visibilidad`, `entrenamientos.visible_para` or `entrenamientos_publicos`. The `servicios` select policy SHALL NOT grant access because a service is required by a published training.

#### Scenario: Non-member reads another tenant's trainings
- **WHEN** an authenticated user who is not a member of tenant A, and has no booking in tenant A, selects trainings, categories or restrictions of tenant A
- **THEN** no rows SHALL be returned

#### Scenario: Member reads own tenant's trainings
- **WHEN** a member of tenant A selects trainings of tenant A
- **THEN** the rows SHALL be returned as before

## REMOVED Requirements

### Requirement: Existing publications are deactivated without data loss
**Reason**: The `entrenamientos_publicos` table and the visibility columns are dropped in US-0124, so there is no publication data left to preserve.
**Migration**: Historical publication data is available only from the database backup taken before the clean-up migration.

### Requirement: Publication data is closed to clients
**Reason**: `entrenamientos_publicos`, `entrenamientos_publicos_view` and `entrenamientos_publicos_servicios_view` no longer exist (US-0124).
**Migration**: None. Covered by the new `public-trainings-schema-removal` capability.
