## ADDED Requirements

### Requirement: Eventos table schema
The system SHALL provide a `public.eventos` table independent from `entrenamientos` and `entrenamientos_publicos`. It MUST have the following columns:

- `id uuid` primary key, default `gen_random_uuid()`
- `tenant_id uuid not null`, FK to `tenants(id)` `on delete cascade`
- `nombre varchar(150)`
- `descripcion text`
- `disciplina_id uuid not null`, FK to `disciplinas(id)` `on delete restrict`
- `escenario_id uuid`, FK to `escenarios(id)` `on delete set null`
- `entrenador_id uuid`, FK to `usuarios(id)` `on delete set null`
- `fecha_hora timestamptz`
- `duracion_minutos integer`
- `cupo_maximo integer`
- `punto_encuentro text`
- `estado varchar(30) not null`, default `'confirmado'`
- `reserva_antelacion_horas integer`
- `cancelacion_antelacion_horas integer`
- `precio jsonb not null`, default `'[]'`
- `banner_url text`
- `activo boolean not null`, default `true`
- `publico boolean not null`, default `true`
- `creado_por uuid`, FK to `usuarios(id)` `on delete set null`
- `omitir_confirmacion_compra boolean not null`, default `false`
- `cronograma jsonb not null`, default `'[]'`
- `incluye jsonb not null`, default `'[]'`
- `descripcion_larga text`
- `pagina_evento_url text`
- `created_at timestamptz not null` and `updated_at timestamptz not null`, both default `timezone('utc', now())`

#### Scenario: Defaults applied on minimal insert
- **WHEN** a row is inserted with only `tenant_id` and `disciplina_id`
- **THEN** the row SHALL have `estado = 'confirmado'`, `activo = true`, `publico = true`, `omitir_confirmacion_compra = false`, `precio = '[]'`, `cronograma = '[]'`, `incluye = '[]'`, and non-null `created_at`/`updated_at`

#### Scenario: Tenant deletion cascades
- **WHEN** a tenant is deleted
- **THEN** all of its `eventos` rows SHALL be deleted

#### Scenario: Referenced discipline cannot be deleted
- **WHEN** a `disciplinas` row referenced by an event is deleted
- **THEN** the delete SHALL fail with a foreign-key violation

#### Scenario: Removed venue or trainer is nulled
- **WHEN** an `escenarios` row or `usuarios` row referenced by an event as `escenario_id` or `entrenador_id` is deleted
- **THEN** the event SHALL remain, with that column set to `null`

### Requirement: Eventos data constraints
The table MUST reject invalid data through check constraints:
- `estado` in (`confirmado`, `cancelado`)
- `duracion_minutos` null or > 0
- `cupo_maximo` null or > 0
- `reserva_antelacion_horas` and `cancelacion_antelacion_horas` null or >= 0
- `precio`, `cronograma` and `incluye` each a JSON array

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
- **WHEN** a row is written with `cronograma`, `incluye`, or `precio` set to a JSON object
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: updated_at refreshed
- **WHEN** any column of an event is updated
- **THEN** `updated_at` SHALL be greater than its previous value

### Requirement: Eventos read access by actor
Row Level Security MUST be enabled on `public.eventos` and SHALL grant SELECT as follows:
- `anon` SHALL read only rows where `publico = true and activo = true`.
- An authenticated user SHALL read rows where `publico = true and activo = true`. They SHALL also read rows where `activo = true` and the tenant is in `get_member_tenants_for_authenticated_user()`, and all rows where the tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`.

#### Scenario: Anonymous visitor sees only public active events
- **WHEN** an `anon` client selects from `eventos`
- **THEN** only rows with `publico = true and activo = true` SHALL be returned

#### Scenario: Non-member sees only public active events
- **WHEN** an authenticated user with no membership in tenant T selects T's events
- **THEN** only T's rows with `publico = true and activo = true` SHALL be returned

#### Scenario: Member sees private active events
- **WHEN** an active member with role `usuario` of tenant T selects T's events
- **THEN** all of T's rows with `activo = true` SHALL be returned, including `publico = false`, and rows with `activo = false` SHALL NOT be returned

#### Scenario: Admin or trainer sees all tenant events
- **WHEN** an admin or trainer of tenant T selects T's events
- **THEN** all of T's rows SHALL be returned, including `activo = false`

#### Scenario: Pending membership grants no private access
- **WHEN** a user whose membership in T is `pendiente_activacion` selects T's events
- **THEN** only T's rows with `publico = true and activo = true` SHALL be returned

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
The system SHALL expose `eventosService` in `src/services/supabase/portal/eventos.service.ts`, using the browser Supabase client with the user's session. Every query MUST be scoped with `.eq('tenant_id', tenantId)`. The service SHALL provide:

- `listEventos(tenantId, filters?)`: rows embedding the discipline name, venue name and trainer full name. Ordered by `fecha_hora` ascending, nulls last. `filters.desde` and `filters.hasta` apply `fecha_hora >= desde` and `fecha_hora < hasta`.
- `getEventoById(tenantId, eventoId)`: returns `null` when not found.
- `createEvento(tenantId, input)`: sets `creado_por` from the current auth user.
- `updateEvento(tenantId, eventoId, input)`: MUST NOT send `tenant_id`, `creado_por`, `created_at` or `updated_at`.
- `updateEstadoEvento(tenantId, eventoId, estado)`
- `deleteEvento(tenantId, eventoId)`

#### Scenario: List returns display names
- **WHEN** `listEventos` is called for a tenant with events linked to a discipline, venue, and trainer
- **THEN** each returned item SHALL include `disciplinaNombre`, `escenarioNombre`, and `entrenadorNombre` (trimmed `nombre apellido`, or `null`)

#### Scenario: Month range filter
- **WHEN** `listEventos` is called with `desde` and `hasta`
- **THEN** only events with `fecha_hora` in `[desde, hasta)` SHALL be returned, and undated events SHALL be excluded

#### Scenario: creado_por set from session
- **WHEN** `createEvento` is called by an authenticated admin
- **THEN** the inserted row's `creado_por` SHALL equal the caller's user id, regardless of the input

#### Scenario: Invalid estado blocked client-side
- **WHEN** `updateEstadoEvento` is called with a value outside `confirmado`/`cancelado`
- **THEN** it SHALL throw an `EventoServiceError` with code `invalid_data` without calling Supabase

### Requirement: Eventos service error mapping
The service MUST throw `EventoServiceError` with a `code` and a Spanish `message`:

| Condition | `code` | `message` |
|---|---|---|
| RLS violation (`42501`), or an update/delete returning zero rows | `forbidden` | "No tienes permisos para gestionar este evento." |
| `23503` | `invalid_reference` | "La disciplina, escenario o entrenador seleccionado no existe." |
| `23514` | `invalid_data` | "Los datos del evento no son válidos." |
| Any other error | `unknown` | "No se pudo completar la operación. Intenta de nuevo." |

#### Scenario: RLS-filtered delete reported as forbidden
- **WHEN** `deleteEvento` is called by a user without write permission and zero rows are deleted
- **THEN** the service SHALL throw `EventoServiceError` with code `forbidden`

#### Scenario: RLS-filtered update reported as forbidden
- **WHEN** `updateEstadoEvento` affects zero rows
- **THEN** the service SHALL throw `EventoServiceError` with code `forbidden`

#### Scenario: Unknown error mapped
- **WHEN** Supabase returns an unrecognized error code
- **THEN** the service SHALL throw `EventoServiceError` with code `unknown`
