## MODIFIED Requirements

### Requirement: Training booking restriction configuration
The system SHALL allow tenant administrators to configure access restrictions on a training session or recurring group. Restrictions consist of two layers: (1) scalar timing fields (`reserva_antelacion_horas`, `cancelacion_antelacion_horas`) stored directly on the training/group record, and (2) access condition rows stored in `entrenamiento_restricciones` / `entrenamiento_grupo_restricciones`. Each restriction row carries an optional `descripcion` text label and up to four service condition slots (`servicio_1_id`…`servicio_4_id`) plus the `usuario_estado` and `validar_nivel_disciplina` conditions. All non-null conditions in a single row MUST be satisfied simultaneously (AND). An athlete MUST satisfy at least one row (OR). If no rows exist, booking is unrestricted. The legacy `plan_id` and `disciplina_id` columns remain in the schema but are no longer evaluated.

#### Scenario: Admin creates training with no restrictions
- **WHEN** an administrator saves a training with the restrictions section left empty (zero rows, no timing values)
- **THEN** the training is persisted with `reserva_antelacion_horas = null`, `cancelacion_antelacion_horas = null`, and zero rows in `entrenamiento_restricciones`

#### Scenario: Admin configures advance-notice timing restriction
- **WHEN** an administrator sets `reserva_antelacion_horas = 24` and saves the training
- **THEN** the training record has `reserva_antelacion_horas = 24` and the restriction will block bookings placed less than 24 hours before `fecha_hora`

#### Scenario: Admin adds a single-service restriction row
- **WHEN** an administrator adds one restriction row with `servicio_1_id` set to a specific service and saves
- **THEN** one row exists in `entrenamiento_restricciones` with the given `servicio_1_id` and `servicio_2_id`…`servicio_4_id` as NULL

#### Scenario: Admin adds two OR rows (service A or service B)
- **WHEN** an administrator saves a training with two restriction rows — row 1 requires service A in slot 1, row 2 requires service B in slot 1
- **THEN** two rows exist in `entrenamiento_restricciones`, each with a different `servicio_1_id`; an athlete with either service satisfies the restriction

#### Scenario: Admin adds a compound AND restriction row (two services)
- **WHEN** an administrator saves a single restriction row with `servicio_1_id` and `servicio_2_id` set
- **THEN** one row exists in `entrenamiento_restricciones` with both service slots populated; an athlete must hold active subscriptions to both services simultaneously to pass

#### Scenario: Admin adds up to four services in one AND row
- **WHEN** an administrator fills all four service slots (`servicio_1_id`…`servicio_4_id`) in a single restriction row and saves
- **THEN** one row exists in `entrenamiento_restricciones` with all four service FKs populated; an athlete must satisfy all four services to pass this row

#### Scenario: Admin adds a description to a restriction rule
- **WHEN** an administrator enters text in the description field of a restriction row and saves
- **THEN** the `descripcion` column on the corresponding row stores the entered text

#### Scenario: Admin enables level validation in a restriction row
- **WHEN** an administrator sets `validar_nivel_disciplina = true` in a row and saves
- **THEN** the row is persisted with `validar_nivel_disciplina = true`; at booking time the athlete's level in the training's discipline MUST be greater than or equal to the training's assigned level

#### Scenario: Admin duplicates a restriction row
- **WHEN** an administrator clicks the duplicate action on an existing restriction row in the form
- **THEN** a new row is appended below the duplicated row with identical column values, which the admin can then edit independently

#### Scenario: Admin deletes a restriction row
- **WHEN** an administrator deletes a restriction row from the form and saves
- **THEN** that row is removed from `entrenamiento_restricciones` and no longer evaluated at booking time

---

### Requirement: Restriction enforcement at booking time
Before inserting a booking into `reservas`, the service layer MUST evaluate the timing restriction and all access restriction rows for the target training. If `reserva_antelacion_horas` is non-null, booking MUST be blocked if `now() > entrenamiento.fecha_hora - reserva_antelacion_horas * interval '1 hour'`. If access restriction rows exist, at least one row's conditions MUST all pass. If both checks pass (or no restrictions exist), the booking proceeds.

For the `usuario_estado` condition: the service layer MUST query `miembros_tenant.estado` scoped to the training's `tenant_id` and the athlete's `usuario_id`. The athlete's tenant-scoped status MUST equal the `usuario_estado` value on the restriction row for the condition to pass. If no `miembros_tenant` row exists for the athlete in the tenant, the booking MUST be rejected with a membership-not-found message.

For service conditions: the service layer MUST pre-fetch the athlete's active service entitlements from `suscripcion_servicios` joined with `suscripciones` (state = `'activa'`, `tenant_id` matches), collecting a set of `servicio_id`s that have `unidades_restantes > 0 OR unidades_restantes IS NULL`. Each non-null service slot in the restriction row MUST be present in this set. `validateBookingRestrictions` SHALL return both the `BookingResult` and the matched restriction row (or `null` if unrestricted) so the caller can extract service IDs for deduction.

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

#### Scenario: Service restriction fails for athlete without required service entitlement
- **WHEN** a restriction row requires `servicio_1_id = S` and the atleta has no active subscription with an available unit for service S (`unidades_restantes = 0` or no row)
- **THEN** the booking is rejected with code `SERVICIO_REQUERIDO` and a message naming the required service

#### Scenario: Service restriction passes for athlete with available service unit
- **WHEN** a restriction row requires `servicio_1_id = S` and the atleta's active subscription for service S has `unidades_restantes > 0` or `unidades_restantes IS NULL`
- **THEN** the service condition passes and evaluation continues

#### Scenario: Multi-service AND row fails when one service is missing
- **WHEN** a restriction row requires `servicio_1_id = A` and `servicio_2_id = B`, and the atleta has service A but not service B
- **THEN** the row fails and the booking is rejected with `SERVICIO_REQUERIDO` naming service B (if no other OR row passes)

#### Scenario: validateBookingRestrictions returns matched row
- **WHEN** `validateBookingRestrictions` is called and an OR row passes all conditions
- **THEN** the function returns `{ result: { ok: true }, matchedRow: <the passing restriction row> }` so the caller can extract service IDs for deduction

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

## REMOVED Requirements

### Requirement: plan_id and disciplina_id restriction evaluation
**Reason**: Replaced by service-based restriction evaluation (`servicio_1_id`…`servicio_4_id`). The `plan_id` and `disciplina_id` columns remain in the DB schema but are no longer read by `validateBookingRestrictions`.
**Migration**: Existing restriction rows that previously used `plan_id`/`disciplina_id` will be treated as having no service conditions (unrestricted) until an admin reconfigures them using the new service selectors. A future clean-up US will drop the legacy columns.
