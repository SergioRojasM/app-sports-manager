## MODIFIED Requirements

### Requirement: Step 3 payment methods and summary
Step 3 SHALL show two sections that the administrator fills in, both empty on a new event:

1. **"Métodos para todas las entradas"**, with the helper text "Estos métodos se muestran a quienes compren cualquier entrada del evento." and the empty state "Aún no has agregado métodos de pago para todas las entradas." Its methods are saved in the event's `metodos_pago`.
2. **"Métodos para una entrada específica"**, with the helper text "Estos métodos solo se muestran a quienes compren la entrada indicada." It SHALL show one block per ticket of the draft, in on-screen order, titled with the ticket name (fallback "Entrada sin nombre") and its price, each with its own list and the empty state "Sin métodos específicos". Each block's methods are saved in that ticket's `metodos_pago`. When the draft has no tickets it SHALL show "Agrega entradas en el paso anterior para asignarles métodos de pago." and no add action.

Section 1 and every ticket block SHALL have an "Agregar método de pago" action offering:
- **"Elegir un método existente"**: the tenant's active payment methods ordered by `orden`, excluding the ones already in the target list and, for a ticket, the ones already in section 1. Choosing one SHALL append its snapshot with `origen: 'tenant'`. When none is left it SHALL show "No hay más métodos de tu organización para agregar."
- **"Crear un método solo para este evento"** (see "Event-only payment methods").

The step SHALL NOT offer "Seleccionar todos" / "Quitar todos" and SHALL NOT pre-select any tenant method.

Each method card SHALL show the name, the tipo label, `valor`, `url`, `comentarios`, and a "Quitar" action. In addition:
- Methods with `tipo = 'efectivo'` SHALL carry the tag "No disponible para compra en línea".
- Methods with `origen = 'evento'` SHALL carry the tag "Solo este evento".
- Methods whose `origen` is not `'evento'` and whose `id` is not among the tenant's active methods SHALL be marked "(inactivo o eliminado)" and SHALL stay until removed.

Consistency rules:
- A method `id` SHALL appear at most once per list.
- Adding a method to section 1 SHALL remove the same `id` from every ticket list.
- Deleting a ticket in step 2 SHALL discard its methods.

Validation and warnings:
- On publish, every ticket with `valor > 0` SHALL have at least one method between section 1 and its own list. When section 1 and every ticket list are empty, the error "Agrega al menos un método de pago para las entradas con costo." SHALL be shown on section 1. Otherwise each uncovered ticket block SHALL show "Esta entrada tiene costo y no tiene métodos de pago.". Either error SHALL mark step 3 as "Revisar". Draft saves SHALL NOT be blocked.
- For each ticket with `valor > 0` whose methods (section 1 plus its own) are all cash, the step SHALL show the warning "Los compradores de «{entrada}» no podrán pagar en línea: el efectivo no se ofrece en la compra de entradas." Publishing SHALL NOT be blocked by it.
- When every ticket is free, the step SHALL show "Todas las entradas son gratuitas: no es obligatorio seleccionar métodos de pago."

The saved event `metodos_pago` SHALL be exactly the snapshots of section 1, and each ticket's `metodos_pago` exactly the snapshots of its block.

A summary panel SHALL show the name, date, ticket count and price range, coupon count, form, and the method count as "{n} para todas las entradas · {m} por entrada" (or "Ninguno" when both are 0).

#### Scenario: New event starts empty
- **WHEN** the admin opens step 3 of a new event of a tenant with 3 active payment methods
- **THEN** both sections SHALL be empty and no method SHALL be selected

#### Scenario: Add an existing method for all tickets
- **WHEN** the admin uses "Agregar método de pago" → "Elegir un método existente" in section 1 and picks "Nequi"
- **THEN** "Nequi" SHALL appear in section 1 and, after saving, in the event's `metodos_pago`

#### Scenario: Add a method to one ticket
- **WHEN** the admin adds "Daviplata" to the block of ticket "VIP" and saves
- **THEN** only the "VIP" row of `evento_entradas` SHALL contain "Daviplata" in `metodos_pago`, and the event's `metodos_pago` SHALL NOT contain it

#### Scenario: Picker excludes methods already added
- **WHEN** "Nequi" is in section 1 and the admin opens "Elegir un método existente" for a ticket
- **THEN** "Nequi" SHALL NOT be offered

#### Scenario: Promoting a method to all tickets
- **WHEN** ticket "VIP" has "Daviplata" and the admin adds "Daviplata" to section 1
- **THEN** "Daviplata" SHALL be removed from the "VIP" block

#### Scenario: No tickets yet
- **WHEN** the draft has no tickets
- **THEN** section 2 SHALL show "Agrega entradas en el paso anterior para asignarles métodos de pago." and no add action

#### Scenario: Paid event without any method
- **WHEN** the admin publishes with a paid ticket and no method in either section
- **THEN** the error "Agrega al menos un método de pago para las entradas con costo." SHALL be shown and the event SHALL NOT be published

#### Scenario: One paid ticket uncovered
- **WHEN** section 1 is empty, paid ticket "VIP" has a method and paid ticket "General" has none, and the admin publishes
- **THEN** the "General" block SHALL show "Esta entrada tiene costo y no tiene métodos de pago." and the event SHALL NOT be published

#### Scenario: Paid ticket covered only by its own method
- **WHEN** section 1 is empty and the only paid ticket has one method of its own
- **THEN** the publish SHALL succeed

#### Scenario: Draft is not blocked
- **WHEN** the admin saves a draft with a paid ticket and no methods
- **THEN** the draft SHALL be saved

#### Scenario: Free event without methods
- **WHEN** every ticket is free and no method was added
- **THEN** the publish SHALL succeed with `metodos_pago = []` on the event and on every ticket

#### Scenario: Cash method tagged
- **WHEN** a cash method is in any list
- **THEN** its card SHALL show "No disponible para compra en línea"

#### Scenario: Cash-only warning per ticket
- **WHEN** paid ticket "General" has only cash methods between section 1 and its own list
- **THEN** the warning naming "General" SHALL be shown, and publishing SHALL still be allowed

#### Scenario: Existing event keeps its methods
- **WHEN** an event saved before this change with 2 methods in `metodos_pago` is opened for edit
- **THEN** both SHALL be listed in section 1 and every ticket block SHALL be empty

#### Scenario: Deleted ticket drops its methods
- **WHEN** the admin deletes in step 2 a ticket that had its own methods and saves
- **THEN** the ticket row and its methods SHALL no longer exist

### Requirement: Payment method snapshot includes the QR image
`EventoMetodoPagoSnapshot` SHALL have an optional `qr_url?: string | null`. When the administrator adds an existing tenant payment method in step 3 (to all tickets or to one ticket), the stored snapshot SHALL copy the method's current `qr_url` (or `null`). An event-only method SHALL store the signed URL of the image uploaded in its form (or `null`). Every method card in step 3, and every method offered by "Elegir un método existente", that has `qr_url` SHALL show the "QR" indicator. Snapshots saved before US-0128 SHALL remain valid without the key.

#### Scenario: Adding a method with a QR image
- **WHEN** the administrator adds a tenant payment method with `qr_url` and saves the event
- **THEN** the stored snapshot for that method SHALL contain the same `qr_url`

#### Scenario: Adding a method without a QR image
- **WHEN** the administrator adds a tenant payment method without `qr_url` and saves the event
- **THEN** the snapshot element SHALL have `qr_url` null and the save SHALL succeed

#### Scenario: Existing event is not backfilled
- **WHEN** a QR image is added to a tenant payment method already present in a saved event
- **THEN** the saved event's snapshot SHALL remain unchanged until the administrator removes and adds that method again and saves

#### Scenario: QR indicator in the step
- **WHEN** step 3 shows a method with `qr_url`
- **THEN** its card SHALL show the "QR" indicator

## ADDED Requirements

### Requirement: Event-only payment methods
"Crear un método solo para este evento" SHALL open the tenant payment method form (`MetodoPagoFormModal`) in an event variant: title "Nuevo método de pago del evento", helper text "Este método solo existe en este evento. No se guarda en los métodos de pago de tu organización.", no "Activo" toggle, and the same fields and validations as the tenant form (`nombre` required, `tipo` required, `valor`, `url` http/https only, `comentarios`, optional "Imagen QR" JPEG/PNG/WebP up to 2 MB).

On submit the wizard SHALL generate a UUID `id` in the client, upload the QR image (when chosen) to `orgs/{tenant_id}/metodos-pago/{id}/qr-{ts}.{ext}` and append the snapshot `{id, nombre, tipo, valor, url, comentarios, qr_url, origen: 'evento'}` to the target list. It SHALL NOT insert, update or delete any row of `tenant_metodos_pago`. When the upload fails, the form SHALL stay open with the error and nothing SHALL be added.

Event-only method cards SHALL also offer "Editar", which reopens the form pre-filled (title "Editar método de pago del evento") and replaces the snapshot in place keeping its `id`. Methods with another `origen` SHALL NOT be editable in the wizard.

`EventoMetodoPagoSnapshot` SHALL have an optional `origen?: 'tenant' | 'evento'`; a snapshot without it SHALL be treated as `'tenant'`.

#### Scenario: Event-only method is not stored in the tenant
- **WHEN** the admin creates the event-only method "Cuenta del torneo" in section 1 and saves the event
- **THEN** the event's `metodos_pago` SHALL contain it with `origen = 'evento'`, and `tenant_metodos_pago` SHALL have no new row

#### Scenario: Event-only method for one ticket
- **WHEN** the admin creates an event-only method in the block of ticket "VIP" and saves
- **THEN** it SHALL be stored only in that ticket's `metodos_pago`

#### Scenario: Same validations as the tenant form
- **WHEN** the admin submits the form without `nombre`, without `tipo`, with `url = "ftp://x"`, or with a 3 MB QR image
- **THEN** the corresponding inline error SHALL be shown and nothing SHALL be added

#### Scenario: Event-only method with a QR image
- **WHEN** the admin creates an event-only method with a valid QR image
- **THEN** its card SHALL show the "Solo este evento" and "QR" tags and its snapshot SHALL have a `qr_url`

#### Scenario: QR upload fails
- **WHEN** the QR upload fails while creating an event-only method
- **THEN** the form SHALL stay open showing the error and no method SHALL be added

#### Scenario: Editing an event-only method
- **WHEN** the admin edits the `valor` of an event-only method and saves the event
- **THEN** the stored snapshot SHALL keep its `id` and have the new `valor`

#### Scenario: Tenant method is not editable
- **WHEN** a method added from the tenant is shown in step 3
- **THEN** its card SHALL offer "Quitar" and SHALL NOT offer "Editar"

### Requirement: Ticket payment methods restored and duplicated
Edit mode SHALL restore each ticket's `metodos_pago` into its block. Duplicating an event (`?duplicar=`) SHALL copy the event-level methods and each ticket's methods unchanged to the copy's tickets.

#### Scenario: Edit restores both sections
- **WHEN** an event saved with 1 method for all tickets and 2 methods on ticket "VIP" is opened for edit
- **THEN** section 1 SHALL list the 1 method and the "VIP" block the 2 methods, including event-only ones

#### Scenario: Duplicate keeps ticket methods
- **WHEN** an event whose ticket "VIP" has an event-only method is duplicated and the copy is saved
- **THEN** the copy's "VIP" ticket SHALL have the same method in `metodos_pago`
