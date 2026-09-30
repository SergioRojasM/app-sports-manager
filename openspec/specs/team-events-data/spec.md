# team-events-data Specification

## Purpose
Defines `public.eventos`, the standalone team-events table (independent from trainings), its data constraints, the per-actor RLS read/write matrix, and the `eventosService` data-access and error-mapping contract (US-0118).
## Requirements
### Requirement: Eventos table schema
The system SHALL provide a `public.eventos` table independent from `entrenamientos` and `entrenamientos_publicos`. It MUST have the following columns:

- `id uuid` primary key, default `gen_random_uuid()`
- `tenant_id uuid not null`, FK to `tenants(id)` `on delete cascade`
- `nombre_tenant varchar(150) not null`, non-blank: the tenant's name **snapshot**, set by `guardar_evento_completo` when the event is created and never updated afterwards, including when the tenant is renamed (US-0120)
- `nombre varchar(150)`, required non-blank (see constraints)
- `descripcion text`
- `disciplina_id text`: the discipline **name** snapshot. Not an FK. Nullable only while `borrador = true`.
- `escenario_id jsonb`: nullable venue snapshot object `{id, nombre, tipo, ubicacion, direccion, coordenadas, capacidad, image_url}`. Not an FK.
- `entrenador_id jsonb not null`, default `'[]'`: an array of trainer snapshots `{id, nombre, experiencia}`. Not an FK.
- `fecha_hora timestamptz`
- `duracion_minutos integer`
- `cupo_maximo integer`
- `punto_encuentro text`
- `estado varchar(30) not null`, default `'confirmado'`
- `reserva_antelacion_horas integer`
- `cancelacion_antelacion_horas integer`
- `precio jsonb not null`, default `'[]'`. **Derived** from the event's complete tickets by `guardar_evento_completo`; it MUST NOT be edited directly by the UI.
- `banner_url text`
- `activo boolean not null`, default `true`
- `publico boolean not null`, default `true`
- `borrador boolean not null`, default `false`
- `formulario_id uuid`, FK to `formularios_plantillas(id)` `on delete set null`
- `metodos_pago jsonb not null`, default `'[]'`: an array of payment-method snapshots `{id, nombre, tipo, valor, url, comentarios}`
- `creado_por uuid`, FK to `usuarios(id)` `on delete set null`
- `omitir_confirmacion_compra boolean not null`, default `false`
- `cronograma jsonb not null`, default `'[]'`
- `incluye jsonb not null`, default `'[]'`
- `descripcion_larga text`
- `pagina_evento_url text`
- `created_at timestamptz not null` and `updated_at timestamptz not null`, both default `timezone('utc', now())`

The migration MUST convert existing rows:
- `disciplina_id` becomes the referenced discipline's `nombre`.
- `escenario_id` becomes the venue snapshot, or `null`.
- `entrenador_id` becomes a one-element array with `experiencia = ''`, or `[]`.
- A null or blank `nombre` becomes `'Evento sin nombre'`.

The US-0120 migration MUST backfill `nombre_tenant` for existing rows with the tenant's current `nombre` (or `'Organización'` when blank), before setting it `not null`.

#### Scenario: Defaults applied on minimal insert
- **WHEN** a row is inserted with only `tenant_id`, `nombre_tenant`, `nombre` and `disciplina_id`
- **THEN** the row SHALL have `estado = 'confirmado'`, `activo = true`, `publico = true`, `borrador = false`, `omitir_confirmacion_compra = false`, `precio = '[]'`, `cronograma = '[]'`, `incluye = '[]'`, `entrenador_id = '[]'`, `metodos_pago = '[]'`, `formulario_id = null`, and non-null `created_at` / `updated_at`

#### Scenario: Tenant deletion cascades
- **WHEN** a tenant is deleted
- **THEN** all of its `eventos` rows SHALL be deleted

#### Scenario: Snapshots survive source deletion
- **WHEN** a `disciplinas`, `escenarios` or `usuarios` row whose data was captured in an event's snapshot is renamed or deleted
- **THEN** the delete SHALL succeed, and the event's `disciplina_id`, `escenario_id` and `entrenador_id` SHALL keep their stored values

#### Scenario: Deleted form template is nulled
- **WHEN** a `formularios_plantillas` row referenced by an event's `formulario_id` is deleted
- **THEN** the event SHALL remain with `formulario_id = null`

#### Scenario: Phase-1 rows migrated
- **WHEN** the migration runs over an event that referenced discipline "Running", venue "Cancha 1" and trainer "Ana Pérez"
- **THEN** it SHALL have `disciplina_id = 'Running'`, `escenario_id->>'nombre' = 'Cancha 1'`, and `entrenador_id = [{"id": …, "nombre": "Ana Pérez", "experiencia": ""}]`

#### Scenario: Tenant name backfilled
- **WHEN** the US-0120 migration runs over existing events of the tenant "Wolfpack Club"
- **THEN** each of those events SHALL have `nombre_tenant = 'Wolfpack Club'`, and the column SHALL reject `null` and blank values

#### Scenario: Tenant rename does not change events
- **WHEN** a tenant is renamed after its events were created
- **THEN** those events SHALL keep their original `nombre_tenant`

### Requirement: Eventos data constraints
The table MUST reject invalid data through check constraints:
- `estado` in (`confirmado`, `cancelado`)
- `duracion_minutos` null or > 0
- `cupo_maximo` null or > 0
- `reserva_antelacion_horas` and `cancelacion_antelacion_horas` null or >= 0
- `precio`, `cronograma`, `incluye`, `entrenador_id` and `metodos_pago` each a JSON array
- `escenario_id` null, or a JSON object containing `id` and `nombre`
- `nombre` non-blank
- `disciplina_id` null or 1–100 characters after trimming
- `borrador = true` or `disciplina_id is not null`: a published event MUST have a discipline

An `updated_at` trigger (`public.set_updated_at()`) MUST refresh `updated_at` on every update.

#### Scenario: Invalid estado rejected
- **WHEN** a row is inserted or updated with `estado = 'pendiente'`
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Non-positive capacity or duration rejected
- **WHEN** a row is written with `cupo_maximo = 0` or `duracion_minutos = 0`
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Negative lead time rejected
- **WHEN** a row is written with `reserva_antelacion_horas = -1` or `cancelacion_antelacion_horas = -1`
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Non-array JSON rejected
- **WHEN** a row is written with `cronograma`, `incluye`, `precio`, `entrenador_id` or `metodos_pago` set to a JSON object
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Blank name rejected
- **WHEN** a row is written with `nombre = '  '` or `nombre = null`
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Published event requires discipline
- **WHEN** a row is written with `borrador = false` and `disciplina_id = null`
- **THEN** the statement SHALL fail with a check-constraint violation
- **AND WHEN** the same row is written with `borrador = true`
- **THEN** it SHALL succeed

#### Scenario: updated_at refreshed
- **WHEN** any column of an event is updated
- **THEN** `updated_at` SHALL be greater than its previous value

### Requirement: Eventos read access by actor
Row Level Security MUST be enabled on `public.eventos` and SHALL grant SELECT as follows:
- `anon` SHALL read only rows where `publico = true and activo = true and borrador = false`.
- An authenticated user SHALL read rows where `publico = true and activo = true and borrador = false`. They SHALL also read rows where `activo = true and borrador = false` and the tenant is in `get_member_tenants_for_authenticated_user()`, and all rows (including drafts) where the tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Anonymous visitor sees only public active published events
- **WHEN** an `anon` client selects from `eventos`
- **THEN** only rows with `publico = true and activo = true and borrador = false` SHALL be returned

#### Scenario: Non-member sees only public active published events
- **WHEN** an authenticated user with no membership in tenant T selects T's events
- **THEN** only T's rows with `publico = true and activo = true and borrador = false` SHALL be returned

#### Scenario: Member sees private active published events
- **WHEN** an active member with role `usuario` of tenant T selects T's events
- **THEN** all of T's rows with `activo = true and borrador = false` SHALL be returned, including `publico = false`, and rows with `activo = false` or `borrador = true` SHALL NOT be returned

#### Scenario: Admin or trainer sees all tenant events including drafts
- **WHEN** an admin or trainer of tenant T selects T's events
- **THEN** all of T's rows SHALL be returned, including `activo = false` and `borrador = true`

#### Scenario: Public draft stays hidden
- **WHEN** an event has `publico = true`, `activo = true` and `borrador = true`
- **THEN** it SHALL NOT be returned to `anon`, to a non-member, or to a `usuario` member

#### Scenario: Pending membership grants no private access
- **WHEN** a user whose membership in T is `pendiente_activacion` selects T's events
- **THEN** only T's rows with `publico = true and activo = true and borrador = false` SHALL be returned

### Requirement: Eventos write access restricted to admins and trainers
INSERT, UPDATE and DELETE on `public.eventos` SHALL be allowed only to authenticated users whose tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`. UPDATE MUST enforce the same predicate in `with check`, so a row cannot be moved to another tenant. `anon` MUST have no write privileges.

#### Scenario: Admin or trainer writes succeed
- **WHEN** an admin or trainer of tenant T inserts, updates, or deletes an event of T
- **THEN** the operation SHALL succeed

#### Scenario: Member with role usuario cannot write
- **WHEN** a member with role `usuario` of T attempts to insert an event for T
- **THEN** the insert SHALL be rejected by RLS
- **AND WHEN** that member attempts to update or delete an event of T
- **THEN** zero rows SHALL be affected

#### Scenario: Anonymous and non-member writes rejected
- **WHEN** an `anon` client or an authenticated non-member attempts to write an event of T
- **THEN** the operation SHALL be rejected or affect zero rows

#### Scenario: Cannot move event to another tenant
- **WHEN** an admin of tenant T updates an event of T setting `tenant_id` to tenant U
- **THEN** the update SHALL be rejected, regardless of the caller's role in U

### Requirement: Eventos data-access service
The system SHALL expose `eventosService` in `src/services/supabase/portal/eventos.service.ts`, using the browser Supabase client with the user's session. Every tenant-scoped function MUST scope its query with `.eq('tenant_id', tenantId)`. The only exceptions are the two cross-tenant read functions `listEventosPublicados` and `getEventoPublicado` (US-0120). The service SHALL provide:

- `listEventos(tenantId, filters?)`: rows mapped to `EventoListItem` **without joins**:
  - `disciplinaNombre` from `disciplina_id`
  - `escenarioNombre` from `escenario_id.nombre`
  - `entrenadorNombre` from the trainer snapshot names joined with ", ", or `null`
  - `borrador`
  - Ordered by `fecha_hora` ascending, nulls last. `filters.desde` and `filters.hasta` apply `fecha_hora >= desde` and `fecha_hora < hasta`.
- `getEventoById(tenantId, eventoId)`: returns `null` when not found.
- `getEventoCompleto(tenantId, eventoId)`: the event with its `evento_entradas` (sorted by `orden`) and each ticket's `evento_entrada_cupones`, or `null` when not found.
- `guardarEventoCompleto(tenantId, eventoId, payload, { esNuevo, borrador })`: calls the `guardar_evento_completo` RPC and returns `{ eventoId, borrador, entradas: [{ clientKey, id, cupones: [{ clientKey, id }] }] }`.
- `updateEstadoEvento(tenantId, eventoId, estado)`
- `deleteEvento(tenantId, eventoId)`
- `listEventosPublicados({ soloPublicos })` (US-0120): cross-tenant discovery listing.
  - It ALWAYS applies `activo = true`, `borrador = false`, `estado = 'confirmado'`, and `fecha_hora >= now() OR fecha_hora IS NULL`, regardless of what RLS would allow.
  - It adds `publico = true` when `soloPublicos` is `true`.
  - Ordered by `fecha_hora` ascending, nulls last, with `limit(500)`.
  - It selects an explicit column list that includes `nombre_tenant` and `metodos_pago`, and never `formulario_id`, `creado_por` or `omitir_confirmacion_compra`.
  - Rows are mapped to `EventoPublicoListItem` (snapshots flattened; trainer names joined with ", ").
- `getEventoPublicado(eventoId, { soloPublicos })` (US-0120): the same filters, projection and exclusions, plus `descripcion_larga`, `cronograma`, `incluye` and `cancelacion_antelacion_horas`.
  - Returns an `EventoPublicoDetalle`.
  - Returns `null` when no row matches or the id is malformed (`22P02`).

`createEvento` and `updateEvento` SHALL NOT exist; every event write other than status or delete goes through `guardarEventoCompleto`.

#### Scenario: List maps snapshots
- **WHEN** `listEventos` is called for a tenant with an event whose `disciplina_id = 'Running'`, whose venue snapshot is named "Cancha 1", and whose trainers are "Ana" and "Luis"
- **THEN** the item SHALL have `disciplinaNombre = 'Running'`, `escenarioNombre = 'Cancha 1'`, and `entrenadorNombre = 'Ana, Luis'`

#### Scenario: Month range filter
- **WHEN** `listEventos` is called with `desde` and `hasta`
- **THEN** only events with `fecha_hora` in `[desde, hasta)` SHALL be returned, and undated events SHALL be excluded

#### Scenario: Full event loaded for edit
- **WHEN** `getEventoCompleto` is called for an event with 2 tickets and 3 coupons
- **THEN** it SHALL return the event with `entradas` ordered by `orden`, each including its `cupones`

#### Scenario: Unknown event for edit
- **WHEN** `getEventoCompleto` is called with an id that does not exist or belongs to another tenant
- **THEN** it SHALL return `null`

#### Scenario: Invalid estado blocked client-side
- **WHEN** `updateEstadoEvento` is called with a value outside `confirmado` / `cancelado`
- **THEN** it SHALL throw an `EventoServiceError` with code `invalid_data` without calling Supabase

#### Scenario: Discovery listing excludes staff-only rows
- **WHEN** a tenant admin calls `listEventosPublicados({ soloPublicos: false })` and their tenant has a draft, an inactive, a cancelled and a past event
- **THEN** none of those events SHALL be returned, even though RLS allows the admin to read them

#### Scenario: Landing listing is public-only
- **WHEN** a member of tenant T calls `listEventosPublicados({ soloPublicos: true })`
- **THEN** T's `publico = false` events SHALL NOT be returned

#### Scenario: Undated published events included
- **WHEN** a public, active, published, confirmed event has `fecha_hora = null`
- **THEN** `listEventosPublicados` SHALL return it after the dated events

#### Scenario: Internal columns not requested
- **WHEN** `listEventosPublicados` or `getEventoPublicado` runs
- **THEN** the request's `select` SHALL NOT include `formulario_id`, `creado_por` or `omitir_confirmacion_compra`

#### Scenario: Unknown or hidden event detail
- **WHEN** `getEventoPublicado` is called with a malformed id, an unknown id, or the id of a draft
- **THEN** it SHALL return `null`

### Requirement: Eventos service error mapping
The service MUST throw `EventoServiceError` with a `code` and a Spanish `message`:

| Condition | `code` | `message` |
|---|---|---|
| RLS violation (`42501`), `FORBIDDEN` / `ENTRADA_INVALIDA`, or an update/delete returning zero rows | `forbidden` | "No tienes permisos para gestionar este evento." |
| `P0002` / `NOT_FOUND` | `not_found` | "El evento ya no existe." |
| `23505` on `uq_evento_entradas_nombre` | `duplicate_entrada` | "Ya existe una entrada con ese nombre en el evento." |
| `23505` on `uq_evento_entrada_cupones_codigo` | `duplicate_cupon` | "El código de cupón ya está en uso en este evento." |
| `FORMULARIO_INVALIDO` | `invalid_reference` | "El formulario seleccionado no existe o está inactivo." |
| `BUNDLE_INVALIDO` | `invalid_reference` | "Uno de los eventos del paquete ya no existe." |
| `TENANT_INVALIDO` | `invalid_reference` | "La organización del evento no existe." |
| Other `23503` | `invalid_reference` | "Una referencia del evento no es válida." |
| `NO_REVERTIR_A_BORRADOR` | `invalid_data` | "Un evento publicado no puede volver a borrador." |
| A `23514` with a known completeness code (`DISCIPLINA_REQUERIDA`, `ENTRADAS_REQUERIDAS`, `ENTRADA_INCOMPLETA`, `BUNDLE_REQUERIDO`, `CUPON_INCOMPLETO`, `CUPON_EN_ENTRADA_GRATIS`, `METODO_PAGO_REQUERIDO`, `FORMULARIO_INACTIVO`) | `invalid_data` | A specific message per code |
| Other `23514` | `invalid_data` | "Los datos del evento no son válidos." |
| Any other error | `unknown` | "No se pudo completar la operación. Intenta de nuevo." |

#### Scenario: RLS-filtered delete reported as forbidden
- **WHEN** `deleteEvento` is called by a user without write permission and zero rows are deleted
- **THEN** the service SHALL throw `EventoServiceError` with code `forbidden`

#### Scenario: RLS-filtered update reported as forbidden
- **WHEN** `updateEstadoEvento` affects zero rows
- **THEN** the service SHALL throw `EventoServiceError` with code `forbidden`

#### Scenario: Duplicate coupon code mapped
- **WHEN** `guardarEventoCompleto` fails with a `23505` on `uq_evento_entrada_cupones_codigo`
- **THEN** the service SHALL throw `EventoServiceError` with code `duplicate_cupon`

#### Scenario: Missing payment method mapped
- **WHEN** the RPC raises `METODO_PAGO_REQUERIDO`
- **THEN** the service SHALL throw `EventoServiceError` with code `invalid_data` and the message "Selecciona al menos un método de pago para las entradas con costo."

#### Scenario: Unknown error mapped
- **WHEN** Supabase returns an unrecognized error code
- **THEN** the service SHALL throw `EventoServiceError` with code `unknown`

#### Scenario: Missing tenant mapped
- **WHEN** the RPC raises `TENANT_INVALIDO`
- **THEN** the service SHALL throw `EventoServiceError` with code `invalid_reference` and the message "La organización del evento no existe."

