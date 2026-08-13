## MODIFIED Requirements

### Requirement: Training instance visibility assignment
Each training instance SHALL carry a `visibilidad` field with values `'privado'` or `'publico'`. The default value MUST be `'privado'`. The training form MUST NOT expose an editable `Privado`/`Público` selector. Instead, the form SHALL show a read-only info row displaying the current value (always `Privado` for a new training) plus static helper text explaining that trainings are always created private and can be published afterward from the training's options menu. Neither `administrador` nor `entrenador` roles SHALL be able to change this field's value through the training form; new trainings created via the form MUST always persist `visibilidad = 'privado'`.

#### Scenario: Default visibility on new training form
- **WHEN** an administrator or coach opens the training form modal to create a new training
- **THEN** the read-only info row shows `Privado` and the helper text explains that publishing happens later via the training's options menu

#### Scenario: New training always persists as private
- **WHEN** an administrator or coach submits the training form to create a new training
- **THEN** the created training instance has `visibilidad = 'privado'` in the database, regardless of any prior value

#### Scenario: Editing a legacy public training shows its value read-only
- **WHEN** an administrator or coach opens the form modal to edit an existing training whose stored `visibilidad` is `'publico'` (set before this change)
- **THEN** the read-only info row displays `Público` and saving the form MUST NOT silently overwrite it back to `'privado'`

---
