## ADDED Requirements

### Requirement: Email outbox table
The system SHALL provide `public.notificaciones_outbox` with columns `id`, `tenant_id` (nullable, `on delete cascade`), `modulo` (≤40), `tipo` (≤60), `destinatario_email` (≤254), `destinatario_usuario_id` (nullable, `on delete set null`), `entidad_tipo` (≤40, nullable), `entidad_id` (nullable), `payload` (jsonb, default `{}`), `estado`, `intentos` (default 0), `ultimo_error`, `proximo_intento_at` (default now), `bloqueada_at`, `proveedor_id`, `created_at` and `enviada_at`.
- `estado` SHALL be one of `pendiente | procesando | enviada | error`, default `pendiente`.
- A partial index on `proximo_intento_at where estado = 'pendiente'` and an index on `(entidad_tipo, entidad_id)` SHALL exist.
- RLS SHALL be enabled with no policies, and every privilege SHALL be revoked from `anon` and `authenticated`.

#### Scenario: Invalid estado rejected
- **WHEN** a row is written with `estado = 'cancelada'`
- **THEN** the write SHALL fail with a check violation

#### Scenario: Outbox never client-readable
- **WHEN** `anon` or any authenticated user selects, inserts, updates or deletes `notificaciones_outbox`
- **THEN** the statement SHALL fail with a permission error

### Requirement: Enqueue helpers
The system SHALL provide two SECURITY DEFINER functions with `search_path = public`, revoked from `public`, `anon` and `authenticated`:
- `_notificar_email(p_tenant_id, p_modulo, p_tipo, p_email, p_usuario_id, p_entidad_tipo, p_entidad_id, p_payload)` SHALL insert one `pendiente` outbox row with the email lowercased and trimmed. It SHALL insert nothing when the email is null or blank.
- `_notificar_in_app(p_usuario_id, p_tenant_id, p_modulo, p_tipo, p_titulo, p_mensaje, p_url, p_entidad_tipo, p_entidad_id)` SHALL insert one unread row into `public.notificaciones`.

A module adds notifications by calling these helpers from its own RPCs and registering a handler for `modulo.tipo`.

#### Scenario: Email normalized
- **WHEN** `_notificar_email` is called with `' Ana@Mail.COM '`
- **THEN** one outbox row SHALL exist with `destinatario_email = 'ana@mail.com'` and `estado = 'pendiente'`

#### Scenario: Blank email skipped
- **WHEN** `_notificar_email` is called with a null or blank email
- **THEN** no row SHALL be inserted and no error SHALL be raised

#### Scenario: Helpers not callable by clients
- **WHEN** an authenticated user calls `_notificar_email` or `_notificar_in_app` through the API
- **THEN** the call SHALL fail with a permission error

### Requirement: Claim and resolve functions
`reclamar_notificaciones_outbox(p_limite int)` SHALL return at most `p_limite` rows that are either `pendiente` with `proximo_intento_at <= now()` or `procesando` with `bloqueada_at` older than 10 minutes, oldest `proximo_intento_at` first, selected `for update skip locked`, and SHALL set them to `procesando` with `bloqueada_at = now()`.

`resolver_notificacion_outbox(p_id, p_ok, p_proveedor_id, p_error)` SHALL:
- on success, set `estado = 'enviada'`, `enviada_at = now()` and `proveedor_id`;
- on failure, increment `intentos`, store `p_error` truncated to 500 characters in `ultimo_error`, and set `estado = 'pendiente'` with `proximo_intento_at` moved forward by 1 minute after the 1st failure, 5 minutes after the 2nd, 30 minutes after the 3rd and 2 hours after the 4th; after the 5th failure it SHALL set `estado = 'error'`.

Both functions SHALL be executable only by the service role.

#### Scenario: Concurrent claims do not overlap
- **WHEN** two sessions call `reclamar_notificaciones_outbox(20)` at the same time
- **THEN** no row SHALL be returned to both

#### Scenario: Stuck row reclaimed
- **WHEN** a row has been `procesando` for more than 10 minutes
- **THEN** the next claim SHALL return it

#### Scenario: Future retry not claimed
- **WHEN** a `pendiente` row has `proximo_intento_at` in the future
- **THEN** a claim SHALL NOT return it

#### Scenario: Retry schedule
- **WHEN** a row fails for the 1st, 2nd, 3rd and 4th time
- **THEN** it SHALL return to `pendiente` with `intentos` 1, 2, 3 and 4 and `proximo_intento_at` 1 min, 5 min, 30 min and 2 h later, with `ultimo_error` filled

#### Scenario: Fifth failure is final
- **WHEN** a row fails for the 5th time
- **THEN** it SHALL be `error` with `intentos = 5` and SHALL never be claimed again

#### Scenario: Sent row is final
- **WHEN** a row is resolved as sent
- **THEN** it SHALL be `enviada` with `enviada_at` and `proveedor_id` set and SHALL never be claimed again

### Requirement: Database-triggered dispatch
The `pg_net` extension SHALL be enabled. `_disparar_despacho()` SHALL read `notificaciones_dispatch_url` and `notificaciones_dispatch_secret` from `vault.decrypted_secrets` and, only when both exist, call `net.http_post` on the URL with the header `Authorization: Bearer {secret}` and a 55-second timeout. It SHALL catch every exception so that it never raises.
- A statement-level `after insert` trigger on `notificaciones_outbox` SHALL call `_disparar_despacho()`.
- `despachar_notificaciones_pendientes()` SHALL call `_disparar_despacho()` only when at least one `pendiente` row is due.
- A `pg_cron` job `despachar-notificaciones` SHALL run `despachar_notificaciones_pendientes()` every minute, registered with the unschedule-then-schedule pattern.

#### Scenario: No Vault configuration
- **WHEN** outbox rows are inserted and either Vault secret is missing
- **THEN** no HTTP call SHALL be made and no error SHALL be raised

#### Scenario: Dispatch failure does not break the caller
- **WHEN** the dispatcher URL is unreachable or times out
- **THEN** the RPC that inserted the outbox rows SHALL still commit and return its normal result

#### Scenario: Idle cron
- **WHEN** the cron job runs and no `pendiente` row is due
- **THEN** no HTTP call SHALL be made

#### Scenario: One call per statement
- **WHEN** one statement inserts several outbox rows
- **THEN** `_disparar_despacho()` SHALL run once for that statement

### Requirement: Dispatcher endpoint
`POST /api/internal/notificaciones/despachar` SHALL run on the Node runtime with `maxDuration = 60`, take no body and return `200 { procesadas, enviadas, fallidas }` with `Cache-Control: no-store`.
- It SHALL require `Authorization: Bearer {NOTIFICACIONES_DISPATCH_SECRET}`, compared in constant time.
- It SHALL return `503` when `NOTIFICACIONES_DISPATCH_SECRET` is not configured, `401` when the header is missing or wrong, and `405` for any other HTTP verb.
- It SHALL claim nothing and send nothing unless the request is authorized.

#### Scenario: Unauthorized call
- **WHEN** the endpoint is called without a bearer token or with a wrong one
- **THEN** it SHALL return `401` and no outbox row SHALL change

#### Scenario: Secret not configured
- **WHEN** the endpoint is called and `NOTIFICACIONES_DISPATCH_SECRET` is unset
- **THEN** it SHALL return `503`

#### Scenario: Wrong verb
- **WHEN** the endpoint is called with `GET`
- **THEN** it SHALL return `405`

#### Scenario: Authorized call with nothing due
- **WHEN** an authorized call finds no due rows
- **THEN** it SHALL return `200 { procesadas: 0, enviadas: 0, fallidas: 0 }`

### Requirement: Dispatch processing
`despacharNotificaciones(limite = 20)` SHALL claim at most 20 rows with the service-role client, process them one by one and resolve each individually, so one failing row never prevents the others.
- For each row it SHALL resolve the handler registered for `{modulo}.{tipo}`. A missing handler SHALL resolve the row as failed with `handler_not_found`.
- The handler SHALL return `{ asunto, html, texto, adjuntos }`, or `null` to skip. A skipped row SHALL be resolved as failed with `skipped`.
- An exception thrown by a handler or by the provider SHALL resolve the row as failed with the error code or message, never containing an email address.
- It SHALL log one audit event per row (`notificacion_enviada` or `notificacion_fallida`, with the outbox id and the error code) and SHALL never log email addresses, payload contents or secrets.

#### Scenario: Unknown handler
- **WHEN** a row with `modulo = 'x'` and `tipo = 'y'` is dispatched and no handler is registered
- **THEN** it SHALL be resolved as failed with `ultimo_error = 'handler_not_found'`

#### Scenario: One failure does not stop the batch
- **WHEN** a batch of three rows is dispatched and the second throws
- **THEN** the first and third SHALL be `enviada` and the second SHALL be back in `pendiente` with `intentos = 1`

#### Scenario: Result counts
- **WHEN** a batch sends two rows and fails one
- **THEN** the result SHALL be `{ procesadas: 3, enviadas: 2, fallidas: 1 }`

### Requirement: Email sending through Resend
`enviarEmail({ para, asunto, html, texto, adjuntos, idempotencyKey })` SHALL send through the Resend HTTP API with the sender from `EMAIL_FROM` and SHALL return the provider message id. The dispatcher SHALL pass the outbox row id as the idempotency key.
- When `RESEND_API_KEY` is not set, no request SHALL be made; the row SHALL be resolved as failed with `resend_not_configured` and the subject and outbox id SHALL be logged.
- `RESEND_API_KEY`, `EMAIL_FROM` and `NOTIFICACIONES_DISPATCH_SECRET` SHALL be read only in `server-only` modules.
- Every value interpolated into an email SHALL be HTML-escaped, and every link SHALL be built from `APP_URL`, never from request headers.
- All emails SHALL share one HTML layout and include a plain-text alternative.

#### Scenario: Successful send
- **WHEN** Resend accepts an email
- **THEN** the row SHALL be `enviada` with `proveedor_id` equal to the Resend message id

#### Scenario: Provider error
- **WHEN** Resend answers `429` or `5xx`
- **THEN** the row SHALL be resolved as failed and retried by the retry schedule

#### Scenario: Local development without a key
- **WHEN** a row is dispatched and `RESEND_API_KEY` is unset
- **THEN** no HTTP request SHALL be sent to Resend and the row SHALL be failed with `resend_not_configured`

#### Scenario: Markup in user data is escaped
- **WHEN** a buyer name contains `<script>`
- **THEN** the email HTML SHALL contain it as escaped text

#### Scenario: Retry after a lost response does not duplicate
- **WHEN** a row is sent twice because the first response was lost
- **THEN** both requests SHALL carry the same idempotency key

### Requirement: Local email catcher for development
When `NODE_ENV` is not `production` and `EMAIL_DEV_MAILPIT_URL` is set, `enviarEmail` SHALL deliver the email to that Mailpit instance through its HTTP API (`POST {url}/api/v1/send`), with the same sender, subject, HTML, text and attachments, and SHALL NOT call Resend. The row SHALL be resolved as sent with `proveedor_id` prefixed `mailpit:`. In production the variable SHALL be ignored.

#### Scenario: Local delivery to Mailpit
- **WHEN** a row is dispatched in development with `EMAIL_DEV_MAILPIT_URL` set
- **THEN** the email SHALL appear in the Mailpit inbox with its attachment and no request SHALL be sent to Resend

#### Scenario: Mailpit not running
- **WHEN** the Mailpit URL is unreachable
- **THEN** the row SHALL be resolved as failed with `mailpit_unreachable` and retried by the retry schedule

#### Scenario: Ignored in production
- **WHEN** `NODE_ENV` is `production` and `EMAIL_DEV_MAILPIT_URL` is set
- **THEN** the email SHALL be sent through Resend
