## MODIFIED Requirements

### Requirement: Restriction enforcement at booking time
Before inserting a booking into `reservas`, the service layer MUST evaluate the timing restriction and all access restriction rows for the target training. If `reserva_antelacion_horas` is non-null, booking MUST be blocked if `now() > entrenamiento.fecha_hora - reserva_antelacion_horas * interval '1 hour'`. If access restriction rows exist, at least one row's conditions MUST all pass. If both checks pass (or no restrictions exist), the booking proceeds.

For the `usuario_estado` condition: the service layer MUST query `miembros_tenant.estado` scoped to the training's `tenant_id` and the athlete's `usuario_id`. The athlete's tenant-scoped status MUST equal the `usuario_estado` value on the restriction row for the condition to pass. If no `miembros_tenant` row exists for the athlete in the tenant, the booking MUST be rejected with a membership-not-found message.

#### Scenario: Booking blocked by advance-notice timing
- **WHEN** an atleta attempts to book a training with `reserva_antelacion_horas = 24` when less than 24 hours remain before `fecha_hora`
- **THEN** the booking is rejected with code `TIMING_RESERVA` and no reservation row is inserted

#### Scenario: Booking allowed when timing window is respected
- **WHEN** an atleta attempts to book a training with `reserva_antelacion_horas = 24` when more than 24 hours remain before `fecha_hora`
- **THEN** the timing check passes and remaining validations proceed

#### Scenario: Booking blocked when no access row is satisfied
- **WHEN** all existing restriction rows fail for the attempting atleta
- **THEN** the booking is rejected with the code and message of the first unmet condition in the first evaluated row, and no reservation row is inserted

#### Scenario: Booking allowed when at least one access row is satisfied
- **WHEN** the atleta satisfies the conditions of at least one restriction row
- **THEN** the access check passes and the booking proceeds (subject to capacity and other existing validations)

#### Scenario: Booking allowed when no access restriction rows exist
- **WHEN** `entrenamiento_restricciones` has zero rows for the target training
- **THEN** no access check is performed and the booking proceeds normally

#### Scenario: plan_id restriction fails for athlete without required subscription
- **WHEN** a restriction row requires `plan_id = X` and the atleta has no active subscription (`estado = 'activa'`) to plan X
- **THEN** the booking is rejected with code `PLAN_REQUERIDO` and a message naming the required plan

#### Scenario: disciplina_id restriction fails for athlete without disciplina in any active plan
- **WHEN** a restriction row requires `disciplina_id = D` and the atleta has no active subscription to a plan that includes discipline D
- **THEN** the booking is rejected with code `DISCIPLINA_REQUERIDA` and a message naming the required discipline

#### Scenario: validar_nivel_disciplina fails for athlete below minimum level
- **WHEN** a restriction row has `validar_nivel_disciplina = true` and the atleta's `orden` in the relevant discipline is less than the training's assigned level `orden`
- **THEN** the booking is rejected with code `NIVEL_INSUFICIENTE` and a message naming the discipline and minimum required level

#### Scenario: validar_nivel_disciplina passes when no category level is assigned
- **WHEN** a restriction row has `validar_nivel_disciplina = true` but the training has no `entrenamiento_categorias` row with a `nivel_id`
- **THEN** the level condition is silently skipped and does not block the booking

#### Scenario: usuario_estado restriction passes when tenant member status matches
- **WHEN** a restriction row has `usuario_estado = 'activo'` and the atleta's `miembros_tenant.estado` for the training's tenant equals `'activo'`
- **THEN** the `usuario_estado` condition passes and evaluation continues to the next condition in the row

#### Scenario: usuario_estado restriction fails when tenant member status does not match
- **WHEN** a restriction row has `usuario_estado = 'activo'` and the atleta's `miembros_tenant.estado` for the training's tenant is `'suspendido'`, `'mora'`, or `'inactivo'`
- **THEN** the booking is rejected with code `USUARIO_INACTIVO` and a message stating the required status, the athlete's actual status, and an instruction to contact the administrator

#### Scenario: usuario_estado restriction uses tenant-scoped status, not global account flag
- **WHEN** a restriction row has `usuario_estado = 'activo'`, the atleta's `usuarios.activo` is `false`, but their `miembros_tenant.estado` for the training's tenant is `'activo'`
- **THEN** the `usuario_estado` condition passes and the booking is not rejected for this condition

#### Scenario: usuario_estado restriction correctly rejects across tenants
- **WHEN** a restriction row has `usuario_estado = 'activo'`, the atleta's `miembros_tenant.estado` is `'activo'` in tenant A but `'suspendido'` in tenant B, and the training belongs to tenant B
- **THEN** the booking in tenant B is rejected with code `USUARIO_INACTIVO`; a booking in tenant A with the same restriction would pass

#### Scenario: usuario_estado restriction fails when athlete has no membership row in the tenant
- **WHEN** a restriction row has `usuario_estado = 'activo'` and no `miembros_tenant` row exists for the atleta in the training's tenant
- **THEN** the booking is rejected with a message indicating that the athlete's membership in the organization could not be found
