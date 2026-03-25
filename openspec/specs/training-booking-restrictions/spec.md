# Capability: training-booking-restrictions

## Purpose
Allows tenant administrators to configure access restrictions on training sessions or recurring groups, controlling which athletes may book based on timing windows, subscription plans, disciplines, and discipline levels. Enforces these restrictions at booking and cancellation time.

## Requirements

### Requirement: Training booking restriction configuration
The system SHALL allow tenant administrators to configure access restrictions on a training session or recurring group. Restrictions consist of two layers: (1) scalar timing fields (`reserva_antelacion_horas`, `cancelacion_antelacion_horas`) stored directly on the training/group record, and (2) access condition rows stored in `entrenamiento_restricciones` / `entrenamiento_grupo_restricciones`. Each restriction row carries up to four condition columns (`usuario_estado`, `plan_id`, `disciplina_id`, `validar_nivel_disciplina`). All non-null columns in a single row MUST be satisfied simultaneously (AND). An athlete MUST satisfy at least one row (OR). If no rows exist, booking is unrestricted.

#### Scenario: Admin creates training with no restrictions
- **WHEN** an administrator saves a training with the restrictions section left empty (zero rows, no timing values)
- **THEN** the training is persisted with `reserva_antelacion_horas = null`, `cancelacion_antelacion_horas = null`, and zero rows in `entrenamiento_restricciones`

#### Scenario: Admin configures advance-notice timing restriction
- **WHEN** an administrator sets `reserva_antelacion_horas = 24` and saves the training
- **THEN** the training record has `reserva_antelacion_horas = 24` and the restriction will block bookings placed less than 24 hours before `fecha_hora`

#### Scenario: Admin adds a plan-required restriction row
- **WHEN** an administrator adds one restriction row with `plan_id` set to a specific plan and saves
- **THEN** one row exists in `entrenamiento_restricciones` with the given `plan_id` and all other condition columns as null

#### Scenario: Admin adds two OR rows (plan A or plan B)
- **WHEN** an administrator saves a training with two restriction rows — row 1 requires plan A, row 2 requires plan B
- **THEN** two rows exist in `entrenamiento_restricciones`, each with a different `plan_id`; an athlete with either plan satisfies the restriction

#### Scenario: Admin adds a compound AND restriction row
- **WHEN** an administrator saves a single restriction row with both `plan_id` and `disciplina_id` set
- **THEN** one row exists in `entrenamiento_restricciones` with both FKs populated; an athlete must hold an active subscription to that plan AND that discipline simultaneously to pass

#### Scenario: Admin enables level validation in a restriction row
- **WHEN** an administrator sets `validar_nivel_disciplina = true` in a row (with a `disciplina_id` also set) and saves
- **THEN** the row is persisted with `validar_nivel_disciplina = true`; at booking time the athlete's level in that discipline MUST be greater than or equal to the training's assigned level

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

---

### Requirement: Restriction enforcement at cancellation time
Before cancelling a booking, the service layer MUST check `cancelacion_antelacion_horas` on the related training. This check applies ONLY to atleta self-cancellation. Admin and coach cancellations bypass it. If `cancelacion_antelacion_horas` is non-null and less than that many hours remain before `fecha_hora`, the cancellation MUST be rejected.

#### Scenario: Self-cancellation blocked by timing restriction
- **WHEN** an atleta attempts to self-cancel a booking and less than `cancelacion_antelacion_horas` hours remain before `fecha_hora`
- **THEN** the cancellation is rejected with code `TIMING_CANCELACION` and no state change occurs on the booking

#### Scenario: Self-cancellation allowed when timing window is respected
- **WHEN** an atleta attempts to self-cancel with more than `cancelacion_antelacion_horas` hours remaining before `fecha_hora`
- **THEN** the cancellation timing check passes and the cancellation proceeds

#### Scenario: Admin/coach cancellation bypasses timing restriction
- **WHEN** an administrador or entrenador cancels a booking on behalf of an atleta, regardless of remaining time before `fecha_hora`
- **THEN** the `cancelacion_antelacion_horas` check is not evaluated and the cancellation proceeds

---

### Requirement: Group-to-session restriction propagation
When training sessions are generated from a recurring group (`entrenamientos_grupo`), the system SHALL copy the group's restriction rows (`entrenamiento_grupo_restricciones`) into `entrenamiento_restricciones` for each generated session, and copy `reserva_antelacion_horas` / `cancelacion_antelacion_horas` values from the group to the session. Subsequent changes to group restrictions MUST NOT retroactively update already-generated sessions.

#### Scenario: Generated session inherits group restrictions
- **WHEN** sessions are generated from a group that has two restriction rows and `reserva_antelacion_horas = 12`
- **THEN** each generated session has `reserva_antelacion_horas = 12` and two corresponding rows in `entrenamiento_restricciones` copied from the group

#### Scenario: Group restriction update does not affect existing sessions
- **WHEN** an administrator modifies the restriction rows of a group after sessions have already been generated
- **THEN** the existing generated sessions retain the restriction rows they received at generation time

---

### Requirement: RLS on restriction tables
Row Level Security MUST be enabled on `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones`. Authenticated members of the tenant SHALL SELECT their own tenant's rows. Only administrators MAY INSERT, UPDATE, or DELETE restriction rows.

#### Scenario: Member can read their tenant's restriction rows
- **WHEN** an authenticated tenant member queries `entrenamiento_restricciones`
- **THEN** only rows where `tenant_id` matches their membership are returned

#### Scenario: Non-admin cannot insert restriction rows
- **WHEN** an authenticated atleta or entrenador attempts to insert a row into `entrenamiento_restricciones`
- **THEN** the insert is rejected by RLS

#### Scenario: Cross-tenant restriction rows are invisible
- **WHEN** an authenticated user queries `entrenamiento_restricciones`
- **THEN** rows belonging to tenants they are not a member of are not returned
