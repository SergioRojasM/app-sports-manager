## MODIFIED Requirements

### Requirement: Atomic event save RPC
The system SHALL provide `public.guardar_evento_completo(p_tenant_id uuid, p_evento_id uuid, p_es_nuevo boolean, p_borrador boolean, p_evento jsonb, p_entradas jsonb) returns jsonb`. It MUST be declared `security invoker` with `set search_path = public`, executable by `authenticated` only. All of its writes SHALL happen in one transaction: any raised error MUST leave `eventos`, `evento_entradas`, `evento_entrada_cupones` and `evento_formularios` unchanged.

The function SHALL:
1. Raise `FORBIDDEN` (`42501`) unless the tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`. When `p_es_nuevo`, read the tenant's name from `tenants` as `coalesce(nullif(btrim(nombre), ''), 'Organización')`, and raise `TENANT_INVALIDO` (`23503`) when no tenant row is readable (US-0120).
2. Always validate:
   - a non-blank `nombre`
   - a form template, when set, belongs to the tenant (`FORMULARIO_INVALIDO`, `23503`)
   - every bundle id is an event of the same tenant other than `p_evento_id` (`BUNDLE_INVALIDO`, `23503`)
   - the table format constraints
3. When `p_borrador = false`, also validate:
   - a discipline is present (`DISCIPLINA_REQUERIDA`)
   - there is at least one ticket (`ENTRADAS_REQUERIDAS`)
   - every ticket has `nombre` and `valor` (`ENTRADA_INCOMPLETA`)
   - every `multiple` ticket has at least one bundled event (`BUNDLE_REQUERIDO`)
   - every coupon has `nombre`, `cupon` and `descuento` (`CUPON_INCOMPLETO`)
   - no coupon is on a ticket with `valor = 0` (`CUPON_EN_ENTRADA_GRATIS`)
   - at least one payment method exists when any ticket has `valor > 0` (`METODO_PAGO_REQUERIDO`)
   - the form, when set, is `activo` (`FORMULARIO_INACTIVO`)
   - every event bundled by a `multiple` ticket has no form or the same `formulario_id` as this event (`BUNDLE_FORMULARIO_DISTINTO`) (US-0121)
   - when this event has a form, no other **published** event bundles it through a `multiple` ticket while using a different `formulario_id` (`FORMULARIO_EN_PAQUETE_DISTINTO`) (US-0121)

   All of these raise `23514`.
4. Raise `NO_REVERTIR_A_BORRADOR` (`23514`) when `p_borrador = true` and the stored event has `borrador = false`.
5. Write the event:
   - On create: insert with `creado_por = auth.uid()`, `estado = 'confirmado'`, and `nombre_tenant` = the tenant name read in step 1. Any `nombre_tenant` in `p_evento` MUST be ignored.
   - On edit: update, never touching `tenant_id`, `nombre_tenant`, `creado_por`, `estado` or `created_at`, and raise `NOT_FOUND` (`P0002`) when no row matches.
   - In both cases set `borrador = p_borrador`.
6. Sync tickets and then each ticket's coupons: delete the rows missing from the payload, then upsert the present ones, forcing `tenant_id` and `evento_id`. It MUST raise `ENTRADA_INVALIDA` (`42501`) for an id that belongs to another event. Coupon codes MUST be stored as `upper(btrim(cupon))`.
7. Sync the form snapshot in `evento_formularios` (US-0121):
   - When `formulario_id` is null: set `vigente = false` on the event's snapshots.
   - Otherwise: build the snapshot from the template (`nombre`, `perfil_campos_requeridos`, and its **active** `formulario_plantilla_esquema` rows ordered by `orden`) and compute `contenido_hash` (md5 of that content plus the template id). When the `vigente` snapshot has the same hash, leave it. Otherwise set it to `vigente = false` and insert a new `vigente` row.
   - Snapshots are never updated in place or deleted.
8. Rewrite `eventos.precio` from the tickets with non-null `nombre` and `valor`, as `[{nombre, precio: valor, descripcion: null}]` ordered by `orden`.
9. Return `{evento_id, borrador, entradas: [{client_key, id, cupones: [{client_key, id}]}]}`, echoing each row's `client_key` from the payload.

#### Scenario: Non-staff caller rejected
- **WHEN** a `usuario` member, a non-member, or a `pendiente_activacion` member of T calls the RPC for T
- **THEN** it SHALL raise `42501` and write nothing

#### Scenario: Name-only draft created
- **WHEN** an admin calls it with `p_es_nuevo = true`, `p_borrador = true`, only `nombre` set, and `p_entradas = []`
- **THEN** an `eventos` row SHALL exist with `borrador = true`, `disciplina_id = null` and `precio = []`, and the result SHALL contain its id

#### Scenario: Incomplete draft data accepted
- **WHEN** a draft save includes a ticket without `valor` and a coupon without `cupon`
- **THEN** the call SHALL succeed and persist both rows with the missing fields as `null`

#### Scenario: Draft save still rejects format errors
- **WHEN** a draft save includes a ticket with `valor = -1`, a coupon with `descuento = 150`, or a bundle id from another tenant
- **THEN** the call SHALL fail and no row SHALL change

#### Scenario: Final save rejects incomplete data atomically
- **WHEN** an edit with `p_borrador = false` includes a paid ticket and an empty `metodos_pago`
- **THEN** it SHALL raise `METODO_PAGO_REQUERIDO`, and the event, its tickets and its coupons SHALL keep their previous values

#### Scenario: Final save publishes a draft
- **WHEN** a complete payload is saved with `p_borrador = false` for a stored draft
- **THEN** the event SHALL have `borrador = false`

#### Scenario: Published event cannot revert to draft
- **WHEN** a call with `p_borrador = true` targets an event stored with `borrador = false`
- **THEN** it SHALL raise `NO_REVERTIR_A_BORRADOR` and change nothing

#### Scenario: Sync updates, inserts and deletes children
- **WHEN** an event has tickets A and B, and the payload contains A (modified) and a new ticket C
- **THEN** A SHALL be updated in place with the same id, B and its coupons SHALL be deleted, and C SHALL be inserted

#### Scenario: Repeated draft saves do not duplicate rows
- **WHEN** a draft is saved, and then saved again with the ids returned by the first call
- **THEN** the number of tickets and coupons SHALL NOT grow

#### Scenario: Price summary derived
- **WHEN** an event is saved with complete tickets "General" 50000 (orden 0) and "VIP" 120000 (orden 1), plus an incomplete ticket
- **THEN** `eventos.precio` SHALL equal `[{"nombre": "General", "precio": 50000, "descripcion": null}, {"nombre": "VIP", "precio": 120000, "descripcion": null}]`

#### Scenario: Immutable columns preserved on edit
- **WHEN** an edit payload includes a different `tenant_id`, `creado_por` or `estado`
- **THEN** the stored values SHALL remain unchanged

#### Scenario: Tenant name set on create
- **WHEN** an admin of the tenant "Wolfpack Club" creates an event (draft or final), and `p_evento` contains `nombre_tenant = 'Otro'`
- **THEN** the new row SHALL have `nombre_tenant = 'Wolfpack Club'`

#### Scenario: Tenant name kept on edit
- **WHEN** an existing event is edited after the tenant was renamed
- **THEN** its `nombre_tenant` SHALL keep the value stored at creation

#### Scenario: Bundled event with a different form rejected
- **WHEN** a final save of an event with form F1 includes a `multiple` ticket bundling an event whose form is F2
- **THEN** it SHALL raise `BUNDLE_FORMULARIO_DISTINTO` and change nothing

#### Scenario: Bundled event without a form allowed
- **WHEN** the bundled events have no form, or the same form as this event
- **THEN** the save SHALL succeed

#### Scenario: Draft may hold a mismatched bundle
- **WHEN** the same payload is saved with `p_borrador = true`
- **THEN** the save SHALL succeed

#### Scenario: Bundled event cannot switch to another form
- **WHEN** an event bundled by a published event with form F1 is saved (final) with form F2
- **THEN** it SHALL raise `FORMULARIO_EN_PAQUETE_DISTINTO`

#### Scenario: Form snapshot created on save
- **WHEN** an event is saved with a form that has 3 active fields and 1 inactive field
- **THEN** one `vigente` row in `evento_formularios` SHALL exist with those 3 fields in `orden`, the template name and its `perfil_campos_requeridos`

#### Scenario: Unchanged form keeps the snapshot
- **WHEN** the event is saved again without changes to the form or the template
- **THEN** no new snapshot row SHALL be inserted

#### Scenario: Changed form creates a new version
- **WHEN** the admin edits the template's fields and then saves the event, or picks a different form
- **THEN** the previous snapshot SHALL become `vigente = false` and a new `vigente` snapshot SHALL be inserted

#### Scenario: Form removed
- **WHEN** the event is saved with `formulario_id = null`
- **THEN** the event SHALL have no `vigente` snapshot, and older snapshots SHALL be kept
