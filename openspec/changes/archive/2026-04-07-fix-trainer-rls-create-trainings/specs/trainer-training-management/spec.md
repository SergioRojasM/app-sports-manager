## ADDED Requirements

### Requirement: Coach can create training sessions
The system SHALL allow a user with role `entrenador` in a tenant to insert rows into `public.entrenamientos`, `public.entrenamientos_grupo`, and `public.entrenamientos_grupo_reglas` for that tenant. The RLS INSERT policies on these tables MUST use `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Coach creates a unique training
- **WHEN** a user with role `entrenador` submits the training creation form with `tipo = 'unico'`
- **THEN** a row is inserted into `public.entrenamientos` and the new training appears in the calendar

#### Scenario: Coach creates a recurring training series
- **WHEN** a user with role `entrenador` submits the training creation form with `tipo = 'recurrente'`
- **THEN** a row is inserted into `public.entrenamientos_grupo`, the corresponding recurrence rules are inserted into `public.entrenamientos_grupo_reglas`, and the generated instances appear in the calendar

#### Scenario: Athlete cannot create a training
- **WHEN** a user with role `usuario` attempts to insert into `public.entrenamientos` directly
- **THEN** Supabase returns a policy violation error and no row is written

---

### Requirement: Coach can edit training sessions
The system SHALL allow a user with role `entrenador` to update rows in `public.entrenamientos` and `public.entrenamientos_grupo` for their tenant. The RLS UPDATE policies on these tables MUST use `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Coach edits a single training instance
- **WHEN** a user with role `entrenador` submits an edit for a single instance
- **THEN** the row in `public.entrenamientos` is updated and the change is reflected in the calendar

#### Scenario: Coach edits all instances of a series
- **WHEN** a user with role `entrenador` submits an edit with scope `'series'`
- **THEN** the `entrenamientos_grupo` row and all eligible instances in `public.entrenamientos` are updated

---

### Requirement: Coach can delete training sessions
The system SHALL allow a user with role `entrenador` to delete rows from `public.entrenamientos` and `public.entrenamientos_grupo` for their tenant. The RLS DELETE policies on these tables MUST use `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Coach deletes a training instance
- **WHEN** a user with role `entrenador` confirms deletion of a training session
- **THEN** the row is deleted from `public.entrenamientos` and the instance is removed from the calendar

#### Scenario: Athlete cannot delete a training
- **WHEN** a user with role `usuario` attempts to delete a row from `public.entrenamientos` directly
- **THEN** Supabase returns a policy violation error and no row is deleted

---

### Requirement: Coach can manage training booking restrictions
The system SHALL allow a user with role `entrenador` to insert, update, and delete rows in `public.entrenamiento_restricciones` and `public.entrenamiento_grupo_restricciones` for their tenant. The RLS INSERT, UPDATE, and DELETE policies on these tables MUST use `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Coach creates a training with access restrictions
- **WHEN** a user with role `entrenador` creates a training and adds one or more booking restriction rows
- **THEN** the restriction rows are persisted in `public.entrenamiento_restricciones`

#### Scenario: Coach creates a series with group-level restrictions
- **WHEN** a user with role `entrenador` creates a recurring series and adds group-level restrictions
- **THEN** the restriction rows are persisted in `public.entrenamiento_grupo_restricciones`

#### Scenario: Athlete cannot modify booking restrictions
- **WHEN** a user with role `usuario` attempts to insert into `public.entrenamiento_restricciones` directly
- **THEN** Supabase returns a policy violation error and no row is written
