## MODIFIED Requirements

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
  - It selects an explicit column list that includes `nombre_tenant`, `metodos_pago` and `cancelacion_antelacion_horas` (US-0121, used by the checkout), and never `formulario_id`, `creado_por` or `omitir_confirmacion_compra`.
  - Rows are mapped to `EventoPublicoListItem` (snapshots flattened; trainer names joined with ", ").
- `getEventoPublicado(eventoId, { soloPublicos })` (US-0120): the same filters, projection and exclusions, plus `descripcion_larga`, `cronograma` and `incluye`.
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

#### Scenario: Listing carries the cancellation policy
- **WHEN** `listEventosPublicados` returns an event with `cancelacion_antelacion_horas = 48`
- **THEN** the `EventoPublicoListItem` SHALL have `cancelacionAntelacionHoras = 48`

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
| `23503` from `deleteEvento` (the event has purchases or tickets) | `has_purchases` | "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar." |
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

#### Scenario: Delete with purchases mapped
- **WHEN** `deleteEvento` fails with `23503` because the event has purchases
- **THEN** the service SHALL throw `EventoServiceError` with code `has_purchases` and the message "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar."
