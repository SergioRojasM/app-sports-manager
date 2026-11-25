# team-events-purchase-notifications Specification

## Purpose
TBD - created by archiving change notifications-module-email-in-app. Update Purpose after archive.
## Requirements
### Requirement: Purchase notification matrix
`_encolar_notificacion(p_compra_id uuid, p_tipo text)` SHALL keep its signature and its 7 call sites and, for each call, SHALL enqueue with `modulo = 'eventos'`, `entidad_tipo = 'evento_compra'` and `entidad_id = p_compra_id`:

| `p_tipo` | Buyer | Tenant administrators |
|---|---|---|
| `compra_recibida` | email + in-app | email + in-app `compra_nueva_admin` |
| `compra_confirmada`, confirmed by staff | email + in-app | none |
| `compra_confirmada`, without staff action | email + in-app | email + in-app `compra_nueva_admin` |
| `compra_rechazada` | email + in-app | none |
| `compra_cancelada` | email + in-app | none |

- A confirmation is "by staff" when the purchase's `validado_at` equals the transaction time (`now()`), which only `validar_compra_evento` sets. `validado_por` SHALL NOT be used, because a rejected purchase keeps it and can later be auto-confirmed on proof re-upload.
- The buyer in-app notification SHALL be created only when `comprador_usuario_id` is not null. Guests receive email only.
- "Tenant administrators" SHALL be the members of the purchase's tenant whose role name is `administrador` and whose `miembros_tenant.estado <> 'pendiente_activacion'`, resolved by `_admins_tenant(p_tenant_id)`. Each SHALL get one email at `usuarios.email` and one in-app notification. Trainers and athletes SHALL get none.
- The outbox payload SHALL contain `compra_id`, `tenant_id`, `evento_id`, `evento_nombre`, `fecha_hora`, `nombre_tenant`, `comprador_nombre`, `entrada_nombre`, `codigos`, `estado`, `total` and `motivo_rechazo`.
- Expiry of the 30-minute hold and door check-in SHALL enqueue nothing.

#### Scenario: Paid purchase awaiting validation
- **WHEN** a paid purchase is finalized with a proof on an event without `omitir_confirmacion_compra`, in a tenant with two active administrators
- **THEN** one `eventos` / `compra_recibida` outbox row for the buyer and two `compra_nueva_admin` outbox rows SHALL exist, plus one in-app notification per administrator

#### Scenario: Staff confirmation
- **WHEN** an administrator validates the purchase
- **THEN** one `compra_confirmada` outbox row for the buyer SHALL be added and no administrator notification SHALL be created

#### Scenario: Free or auto-confirmed purchase
- **WHEN** a free ticket is obtained, or a paid purchase is finalized on an event with `omitir_confirmacion_compra`
- **THEN** a `compra_confirmada` row for the buyer and a `compra_nueva_admin` row and in-app notification per administrator SHALL exist

#### Scenario: Auto-confirmed after a rejection
- **WHEN** a rejected purchase re-uploads its proof on an event with `omitir_confirmacion_compra`
- **THEN** administrators SHALL be notified with `compra_nueva_admin`, although `validado_por` is still set from the rejection

#### Scenario: Rejection and cancellation
- **WHEN** a purchase is rejected, or cancelled by its buyer
- **THEN** only the buyer SHALL be notified

#### Scenario: Guest buyer
- **WHEN** a purchase without `comprador_usuario_id` moves to `en_validacion`
- **THEN** the buyer outbox row SHALL exist and no in-app notification SHALL be created for the buyer

#### Scenario: Members who are not notified
- **WHEN** the tenant has an `entrenador`, a `usuario` and an `administrador` in `pendiente_activacion`
- **THEN** none of them SHALL get an email or an in-app notification

#### Scenario: Tenant without administrators
- **WHEN** a purchase is made in a tenant with no eligible administrator
- **THEN** the buyer notifications SHALL be created and the RPC SHALL succeed

### Requirement: Buyer in-app notifications
Buyer in-app notifications SHALL link to `/portal/mis-entradas` and use these texts:

| `tipo` | `titulo` | `mensaje` |
|---|---|---|
| `compra_recibida` | Recibimos tu compra | Tu compra para {evento_nombre} está en validación. |
| `compra_confirmada` | Compra confirmada | Tu entrada para {evento_nombre} ya está activa. |
| `compra_rechazada` | Compra rechazada | Tu compra para {evento_nombre} fue rechazada: {motivo_rechazo} |
| `compra_cancelada` | Compra cancelada | Cancelaste tu compra para {evento_nombre}. |

#### Scenario: Confirmed purchase of a registered buyer
- **WHEN** a registered buyer's purchase is confirmed
- **THEN** the buyer SHALL have an unread notification titled "Compra confirmada" whose `url` is `/portal/mis-entradas`

### Requirement: Administrator notifications
The administrator in-app notification SHALL have `tipo = 'compra_nueva_admin'`, `url = /portal/orgs/{tenant_id}/gestion-eventos/{evento_id}/compras`, and:
- for a purchase in `en_validacion`: title "Nueva compra por validar";
- for a purchase already `confirmada`: title "Nueva compra confirmada";
- message "{comprador_nombre} compró {entrada_nombre} para {evento_nombre}."

The administrator email SHALL use the same title as subject followed by " — {evento_nombre}", show buyer name, ticket name, total (COP) and purchase state, and include a button linking to `{APP_URL}/portal/orgs/{tenant_id}/gestion-eventos/{evento_id}/compras`. It SHALL have no attachment.

#### Scenario: Pending purchase notification
- **WHEN** a paid purchase awaits validation
- **THEN** each administrator SHALL have an in-app notification titled "Nueva compra por validar" linking to that event's purchases page

#### Scenario: Administrator email link
- **WHEN** the `compra_nueva_admin` email is rendered with `APP_URL = https://www.grit-arena.com`
- **THEN** its button SHALL link to `https://www.grit-arena.com/portal/orgs/{tenant_id}/gestion-eventos/{evento_id}/compras`

### Requirement: Buyer emails
Buyer emails SHALL be written in Spanish, format amounts and dates with `es-CO` in the America/Bogota timezone, and use these subjects:

| `tipo` | Subject | Attachment |
|---|---|---|
| `compra_recibida` | Recibimos tu compra — {evento_nombre} | ticket PDF, pending |
| `compra_confirmada` | Tu entrada para {evento_nombre} | ticket PDF, authorized |
| `compra_rechazada` | Tu compra fue rechazada — {evento_nombre} | none |
| `compra_cancelada` | Compra cancelada — {evento_nombre} | none |

- The body SHALL show the event name, date and time, organization, ticket name, total and ticket codes. `compra_rechazada` SHALL show `motivo_rechazo`.
- The handler SHALL load the purchase, its tickets and their events with the service-role client at send time, and SHALL build the PDF from those current rows, not from the outbox payload.
- A buyer email SHALL contain only that purchase's data.

#### Scenario: Rejection reason shown
- **WHEN** a purchase is rejected with the reason "Comprobante ilegible"
- **THEN** the `compra_rechazada` email SHALL contain "Comprobante ilegible" and no attachment

#### Scenario: Purchase no longer exists
- **WHEN** the purchase of an outbox row was deleted before dispatch
- **THEN** the handler SHALL skip the row and no email SHALL be sent

### Requirement: Ticket PDF attachment
`construirEntradasPdf(tickets)` in `src/lib/portal/eventos-ticket-pdf.ts` SHALL hold the ticket drawing logic and return the jsPDF document, or `null` when there is no non-voided ticket. `descargarEntradasPdf(tickets, fileName)` SHALL keep its signature and produce the same document as before by calling it and then saving.
- The attached PDF SHALL have one page per non-voided ticket and be named `entradas-{codigo of the first ticket}.pdf`.
- A `pendiente` ticket SHALL show "PENDIENTE DE VALIDACIÓN" and no QR code. An `activa` ticket SHALL show a QR code encoding its `codigo`, whether or not it was already used at the door.
- A *Múltiple* purchase SHALL produce one email with one PDF, each page showing its own event's name, date and place.
- When a `compra_recibida` or `compra_confirmada` email has no non-voided ticket to draw, the email SHALL be sent without an attachment.

#### Scenario: Pending ticket PDF
- **WHEN** the `compra_recibida` email of a one-ticket purchase is sent
- **THEN** its attachment SHALL be a one-page PDF marked "PENDIENTE DE VALIDACIÓN" with no QR code

#### Scenario: Authorized ticket PDF
- **WHEN** the `compra_confirmada` email is sent
- **THEN** each page of its attachment SHALL carry a QR code that decodes to the ticket `codigo`

#### Scenario: Múltiple purchase
- **WHEN** a confirmed *Múltiple* purchase covers three events
- **THEN** the buyer SHALL receive one email whose PDF has three pages, one per event

#### Scenario: Browser download unchanged
- **WHEN** the buyer downloads the PDF from the checkout confirmation step or from "Mis entradas"
- **THEN** the document SHALL be the same as before this change

