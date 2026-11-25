## MODIFIED Requirements

### Requirement: Start purchase RPC
`iniciar_compra_evento(p_evento_id, p_entrada_id, p_cupon, p_metodo_pago_id, p_comprador, p_datos_perfil, p_formulario_respuesta) → jsonb` SHALL be granted to `anon, authenticated` and run in one transaction. It SHALL:
1. Resolve the buyer.
   - Authenticated: the email comes from the session and `comprador_usuario_id = auth.uid()`; the payload email is ignored.
   - Anonymous: the payload email, trimmed and lowercased.
   - Validate the name (1–150), the email (≤254, valid) and the birth date (`> 1900-01-01` and `< current_date`), else raise `DATOS_INVALIDOS`.
2. Lock the event and require `_evento_visible_para_compra`, else `EVENTO_NO_DISPONIBLE`.
   - Require `now() <= fecha_hora - reserva_antelacion_horas` when both are set, else `VENTA_CERRADA`.
   - Require the ticket to belong to the event, with non-null `nombre` / `valor` (else `ENTRADA_INVALIDA`) and inside its sale window (else `VENTA_CERRADA`).
3. Apply the optional coupon under the `validar_cupon_evento` rules, else `CUPON_INVALIDO`.
4. When `total > 0`, require a `p_metodo_pago_id` present in `eventos.metodos_pago` or in the purchased ticket's `evento_entradas.metodos_pago` (US-0130), with `tipo <> 'efectivo'`, else `METODO_PAGO_INVALIDO`, and store its snapshot. Methods of other tickets of the event SHALL NOT be accepted. When `total = 0`, store `metodo_pago = null`.
5. Read the event's `vigente` row in `evento_formularios` (never the templates). When it exists, require a non-empty value for every `campo_obligatorio` non-`imagen` field in `campos` and every `perfil_campos_requeridos` key, else `FORMULARIO_INCOMPLETO`. Values for fields not in the snapshot SHALL be dropped.
6. Resolve the target events: `[p_evento_id]`, plus `eventos_id_bundle` for `multiple`. Every bundle event must be of the same tenant and visible for purchase, else `BUNDLE_NO_DISPONIBLE`. Lock them all in id order.
7. Expire stale `pendiente_pago` purchases of the targets.
8. For each target, raise `ENTRADA_DUPLICADA:{evento}` if a live ticket exists for the email, and `CUPO_AGOTADO:{evento}` if `cupo_maximo` is set and the live tickets are `>= cupo_maximo`.
9. Insert the purchase (`pendiente_pago`) and one `pendiente` ticket per target, each with a server-generated code `EV-` + 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. When a snapshot exists, insert the `evento_formulario_respuestas` row referencing it, with `datos_perfil` and `respuestas`.
10. If `total = 0` and the snapshot has no `imagen` fields, confirm immediately (see the state machine).
11. Return `{ compra_id, tenant_id, estado, requiere_archivos, tickets[{id, evento_id, evento_nombre, fecha_hora, lugar, nombre_tenant, codigo, estado}], cancelacion_antelacion_horas, total, entrada_nombre, comprador_nombre, comprador_email }`.

A `23505` on `uq_evento_tickets_evento_email` SHALL be re-raised as `ENTRADA_DUPLICADA`. Any failure SHALL write nothing.

#### Scenario: Cash method rejected
- **WHEN** it is called for a paid ticket with the id of a method whose `tipo = 'efectivo'`
- **THEN** it SHALL raise `METODO_PAGO_INVALIDO`

#### Scenario: Registered email forced from session
- **WHEN** a logged-in user whose account email is `a@x.com` sends `p_comprador.email = 'b@x.com'`
- **THEN** the purchase and ticket SHALL be stored with `a@x.com`

#### Scenario: Multiple ticket issues one ticket per event
- **WHEN** a *Múltiple* ticket bundling one other event is bought
- **THEN** one purchase and two tickets (one per event, distinct codes) SHALL be created

#### Scenario: Bundle event full rolls everything back
- **WHEN** the bundled event has reached `cupo_maximo`
- **THEN** it SHALL raise `CUPO_AGOTADO:{nombre}` and no purchase or ticket SHALL be written

#### Scenario: Last seat race
- **WHEN** two buyers concurrently purchase the last seat of an event with `cupo_maximo = 1`
- **THEN** exactly one SHALL succeed, and the other SHALL get `CUPO_AGOTADO`

#### Scenario: Free purchase in one call
- **WHEN** a free ticket is bought for an event whose form has no `imagen` fields
- **THEN** the result SHALL have `estado = 'confirmada'`, `requiere_archivos = false` and `activa` tickets, plus one `compra_confirmada` outbox row

#### Scenario: Sale closed by lead time
- **WHEN** `reserva_antelacion_horas = 24` and the event starts in 10 h
- **THEN** it SHALL raise `VENTA_CERRADA`

#### Scenario: Ticket-specific method accepted
- **WHEN** it is called for a paid ticket with the id of a non-cash method stored only in that ticket's `metodos_pago`
- **THEN** the purchase SHALL be created and `evento_compras.metodo_pago` SHALL hold that snapshot

#### Scenario: Method of another ticket rejected
- **WHEN** it is called for paid ticket A with the id of a method stored only in ticket B's `metodos_pago`
- **THEN** it SHALL raise `METODO_PAGO_INVALIDO` and write nothing

#### Scenario: Guest pays with a ticket-specific method
- **WHEN** an anonymous buyer calls it with a ticket-specific non-cash method of the purchased ticket
- **THEN** the purchase SHALL be created
