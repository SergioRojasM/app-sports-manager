## ADDED Requirements

### Requirement: Admin subscription creation picker SHALL exclude inactive and pending-activation members
When an administrator creates a subscription for another athlete (`CrearSuscripcionModal` via `useCrearSuscripcion`), the athlete picker SHALL list only members of the current tenant with role `usuario` whose `estado` is neither `inactivo` nor `pendiente_activacion`. The filter SHALL be applied in the query against `v_miembros_equipo`.

#### Scenario: Pending-activation member is not selectable
- **WHEN** an administrator opens the create-subscription modal and the tenant has a `usuario` member with `estado = 'pendiente_activacion'`
- **THEN** the athlete picker SHALL NOT list that member

#### Scenario: Inactive member is not selectable
- **WHEN** an administrator opens the create-subscription modal and the tenant has a `usuario` member with `estado = 'inactivo'`
- **THEN** the athlete picker SHALL NOT list that member

#### Scenario: Mora and suspended members remain selectable
- **WHEN** the tenant has `usuario` members with `estado` `mora` and `suspendido`
- **THEN** the athlete picker SHALL list both members

#### Scenario: Activated member becomes selectable
- **WHEN** an administrator activates a `pendiente_activacion` member and reopens the create-subscription modal
- **THEN** the athlete picker SHALL list that member
