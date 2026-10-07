# subscription-expiry-alerts Specification

## Purpose
TBD - created by archiving change tenant-expiry-notification-rules. Update Purpose after archive.
## Requirements
### Requirement: Expiry alert log
The system SHALL provide `public.suscripcion_avisos_vencimiento` with columns `suscripcion_id` (`on delete cascade`), `tipo`, `dias`, `fecha_fin` and `created_at`, and the primary key `(suscripcion_id, tipo, dias, fecha_fin)`. RLS SHALL be enabled with no policies, and every privilege SHALL be revoked from `anon` and `authenticated`.

#### Scenario: Not client-readable
- **WHEN** `anon` or an authenticated user selects `suscripcion_avisos_vencimiento`
- **THEN** the statement SHALL fail with a permission error

### Requirement: Daily expiry alert job
`public.notificar_vencimientos_suscripciones() returns integer` SHALL be SECURITY DEFINER with `search_path = public`, revoked from `public`, `anon` and `authenticated`. With "today" as the current date in `America/Bogota`, for every active rule it SHALL select the subscriptions of the rule's tenant that match:

| Rule | Subscription matches when |
|---|---|
| `vencimiento_pre`, `dias = N` | `estado = 'activa'` and `fecha_fin = today + N` |
| `vencimiento_pos`, `dias = N` | `estado = 'vencida'` and `fecha_fin = today - N` |

- A subscription SHALL be skipped when its athlete has another subscription in the same tenant with `estado in ('activa', 'pendiente')` whose `fecha_fin` is null or later.
- For each match it SHALL insert a log row and continue only when the row was new (`on conflict do nothing`).
- It SHALL return the number of log rows inserted.
- A cron job `notificar-vencimientos-suscripciones` SHALL run it at `0 13 * * *`, registered with the unschedule-then-schedule pattern.
- A partial index on `suscripciones (fecha_fin) where estado = 'vencida'` SHALL exist.

#### Scenario: Alert before expiry
- **WHEN** a tenant has an active `vencimiento_pre` rule of 3 days and an `activa` subscription whose `fecha_fin` is 3 days after today
- **THEN** the job SHALL create one alert for that subscription

#### Scenario: Alert after expiry
- **WHEN** a tenant has an active `vencimiento_pos` rule of 2 days and a `vencida` subscription whose `fecha_fin` was 2 days ago
- **THEN** the job SHALL create one alert for that subscription

#### Scenario: Exact day only
- **WHEN** the distance between today and `fecha_fin` differs from the rule's days, or `fecha_fin` is null
- **THEN** no alert SHALL be created

#### Scenario: Rule created after the day passed
- **WHEN** a `vencimiento_pos` rule of 3 days is created and a subscription expired 10 days ago
- **THEN** no alert SHALL be created for it

#### Scenario: No duplicates
- **WHEN** the job runs twice on the same day
- **THEN** the second run SHALL create no notification and return 0 for those subscriptions

#### Scenario: Inactive rule
- **WHEN** the matching rule has `activo = false`
- **THEN** no alert SHALL be created

#### Scenario: Athlete already renewed
- **WHEN** the athlete has another `activa` or `pendiente` subscription in the same tenant ending later or without end date
- **THEN** no alert SHALL be created for the expiring one

#### Scenario: Changed end date
- **WHEN** a subscription that was already alerted gets a new `fecha_fin` that matches a rule on a later day
- **THEN** a new alert SHALL be created for the new date

#### Scenario: Tenant isolation
- **WHEN** tenant A has a rule and tenant B has none
- **THEN** only subscriptions of tenant A SHALL be alerted

#### Scenario: Not callable by clients
- **WHEN** an authenticated user calls the job through the API
- **THEN** the call SHALL fail with a permission error

### Requirement: Alert recipients and channels
For each new alert the job SHALL notify according to the rule:
- `destinatarios in ('atletas', 'todos')`: the subscription's athlete, with `tipo` equal to the rule's `tipo` and the url `/portal/mis-suscripciones`;
- `destinatarios in ('administradores', 'todos')`: every row of `_admins_tenant(tenant_id)`, with `tipo` equal to the rule's `tipo` followed by `_admin` and the url `/portal/orgs/{tenant_id}/gestion-suscripciones`;
- `canal_in_app` → `_notificar_in_app`; `canal_email` → `_notificar_email`. Both use `modulo = 'suscripciones'`, `entidad_tipo = 'suscripcion'` and `entidad_id` = the subscription id.

The email payload SHALL be `{ suscripcion_id, tenant_id, plan, tenant_nombre, atleta_nombre, dias, fecha_fin }`. Trainers SHALL never be notified. Changing a rule's `destinatarios` after an alert was logged SHALL NOT send that alert again.

#### Scenario: Athletes only
- **WHEN** the rule is for `atletas` with both channels
- **THEN** the athlete SHALL get one in-app notification and one outbox row, and no administrator SHALL be notified

#### Scenario: Administrators only
- **WHEN** the rule is for `administradores` in a tenant with two active administrators
- **THEN** each administrator SHALL get one notification per matching subscription and the athlete SHALL get nothing

#### Scenario: Both audiences
- **WHEN** the rule is for `todos`
- **THEN** the athlete and every administrator SHALL be notified, each with their own text and link

#### Scenario: Email only
- **WHEN** the rule has `canal_email` true and `canal_in_app` false
- **THEN** outbox rows SHALL be created and no in-app notification SHALL be created

#### Scenario: In-app only
- **WHEN** the rule has `canal_in_app` true and `canal_email` false
- **THEN** in-app notifications SHALL be created and no outbox row SHALL be created

#### Scenario: Excluded members
- **WHEN** the tenant has trainers and an administrator in `pendiente_activacion`
- **THEN** they SHALL receive nothing

#### Scenario: Audience changed later
- **WHEN** a rule's `destinatarios` changes from `atletas` to `todos` after its alert for a subscription was sent
- **THEN** administrators SHALL NOT receive that alert

### Requirement: Alert texts
In-app notifications SHALL use these texts. `{plan}` is `planes.nombre`, followed by ` — {plan_tipos.nombre}` when the subscription has a subtype; `{tenant}` is `tenants.nombre`; `{atleta}` is the athlete's first and last name; `{fecha_fin}` is `DD/MM/YYYY`; `{N} días` reads "1 día" when `N = 1`.

| `tipo` | `titulo` | `mensaje` |
|---|---|---|
| `vencimiento_pre` | Tu suscripción está por vencer | Tu suscripción a {plan} en {tenant} vence en {N} días, el {fecha_fin}. |
| `vencimiento_pos` | Tu suscripción venció | Tu suscripción a {plan} en {tenant} venció hace {N} días, el {fecha_fin}. |
| `vencimiento_pre_admin` | Suscripción por vencer | La suscripción de {atleta} a {plan} vence en {N} días, el {fecha_fin}. |
| `vencimiento_pos_admin` | Suscripción vencida | La suscripción de {atleta} a {plan} venció hace {N} días, el {fecha_fin}. |

#### Scenario: Singular day
- **WHEN** a `vencimiento_pre` rule of 1 day matches a subscription ending on 2026-12-31
- **THEN** the athlete message SHALL read "vence en 1 día, el 31/12/2026."

#### Scenario: Administrator text
- **WHEN** a `vencimiento_pos` rule of 5 days for administrators matches the subscription of "Ana Pérez" to "Mensual"
- **THEN** the message SHALL read "La suscripción de Ana Pérez a Mensual venció hace 5 días, el {fecha_fin}."

### Requirement: Expiry alert emails
`src/lib/notificaciones/modulos/suscripciones-vencimiento.ts` SHALL export `suscripcionesVencimientoHandlers` with the keys `suscripciones.vencimiento_pre`, `suscripciones.vencimiento_pos`, `suscripciones.vencimiento_pre_admin` and `suscripciones.vencimiento_pos_admin`, registered in `src/lib/notificaciones/registro.ts`.
- Handlers SHALL read the subscription with its plan, subtype, tenant and athlete with the service-role client at send time.
- A handler SHALL return `null` when the subscription no longer exists, when it is no longer `activa` (pre) or `vencida` (pos), or when its `fecha_fin` differs from the `fecha_fin` in the payload.
- Athlete emails: subject = title followed by ` — {plan}`; rows Organización, Plan, Fecha de vencimiento; paragraph "Renueva tu plan para no perder el acceso." (pre) or "Renueva tu plan para volver a reservar." (pos); button "Ver mis suscripciones" → `{APP_URL}/portal/mis-suscripciones`.
- Administrator emails: subject = title followed by ` — {atleta}`; rows Atleta, Correo del atleta, Plan, Fecha de vencimiento; button "Ver suscripciones" → `{APP_URL}/portal/orgs/{tenant_id}/gestion-suscripciones`.
- Copy SHALL be Spanish, on the shared layout, without attachments.

#### Scenario: Athlete email
- **WHEN** the `vencimiento_pre` email is rendered for plan "Mensual"
- **THEN** its subject SHALL be "Tu suscripción está por vencer — Mensual" and it SHALL have the "Ver mis suscripciones" button

#### Scenario: Administrator email
- **WHEN** the `vencimiento_pos_admin` email is rendered for athlete "Ana Pérez"
- **THEN** its subject SHALL be "Suscripción vencida — Ana Pérez" and it SHALL show the athlete's email and the "Ver suscripciones" button

#### Scenario: State changed before dispatch
- **WHEN** the subscription was cancelled, deleted, or had its end date changed between the job and the dispatch
- **THEN** the handler SHALL return `null`, the row SHALL be failed as `skipped` and no email SHALL be sent

