## MODIFIED Requirements

### Requirement: Training instance visibility assignment
Each training instance SHALL carry a `visibilidad` field with values `'privado'` or `'publico'`. The default value MUST be `'privado'`. The form MUST expose a radio group selector labelled "Visibilidad" with options `Privado` and `Público`, placed after the `descripcion` field, including a reactive helper text paragraph that describes the implication of the current selection. Both `administrador` and `entrenador` roles SHALL be able to set this field when creating or editing a training.

#### Scenario: Default visibility on new training form
- **WHEN** an administrator or coach opens the training form modal to create a new training
- **THEN** the visibility selector defaults to `Privado` and the helper text reads "Este entrenamiento solo será visible para los miembros de tu organización."

#### Scenario: Helper text updates on visibility change
- **WHEN** an administrator or coach selects `Público` in the visibility selector
- **THEN** the helper text immediately changes to "Este entrenamiento será visible públicamente y podrá ser descubierto por atletas fuera de tu organización."

#### Scenario: Visibility value is persisted on create
- **WHEN** an administrator or coach submits the form with `visibilidad = 'publico'`
- **THEN** the created training instance has `visibilidad = 'publico'` in the database

#### Scenario: Visibility is loaded correctly on edit
- **WHEN** an administrator or coach opens the form modal to edit an existing training with `visibilidad = 'publico'`
- **THEN** the radio selector is pre-selected to `Público` and the correct helper text is shown

---

### Requirement: Training write access roles
The system SHALL allow users with roles `administrador` OR `entrenador` in a tenant to create, edit, and delete training sessions (including their recurrence rules and booking restrictions) for that tenant. The RLS INSERT, UPDATE, and DELETE policies on `public.entrenamientos`, `public.entrenamientos_grupo`, `public.entrenamientos_grupo_reglas`, `public.entrenamiento_restricciones`, and `public.entrenamiento_grupo_restricciones` MUST reference `get_trainer_or_admin_tenants_for_authenticated_user()`. Users with role `usuario` SHALL have no write access to training data.

#### Scenario: Administrator can write training data
- **WHEN** a user with role `administrador` performs any INSERT, UPDATE, or DELETE on a training-related table for their tenant
- **THEN** the operation succeeds and is reflected in the database

#### Scenario: Coach can write training data
- **WHEN** a user with role `entrenador` performs any INSERT, UPDATE, or DELETE on a training-related table for their tenant
- **THEN** the operation succeeds and is reflected in the database

#### Scenario: Athlete is denied write access to training data
- **WHEN** a user with role `usuario` attempts any INSERT, UPDATE, or DELETE on a training-related table
- **THEN** Supabase returns a policy violation error and the operation is rejected
