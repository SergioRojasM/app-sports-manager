## MODIFIED Requirements

### Requirement: Get-ticket entry flow
Every "Obtener entrada" button (cards, detail pages) SHALL behave as follows. It SHALL be disabled while the auth session is initializing.
- **Session on a portal page** → open `EventoEntradasModal` in `usuario` mode.
- **Session on a landing page** → navigate to `/portal/eventos/{id}?entradas=1`.
- **No session** → open `ObtenerEntradaModal` ("Obtén tu entrada"), with three actions in this order:
  1. "Crear cuenta gratis" → `/auth/signup?next=` + the URL-encoded `/portal/eventos/{id}?entradas=1`.
  2. "Ya tengo cuenta" → `/auth/login?next=` + the same value.
  3. "Continuar sin registro" → from the landing listing, navigate to `/eventos/{id}?entradas=1`; from the landing detail page, close this modal and open `EventoEntradasModal` in `invitado` mode.

The modal SHALL show the hint "Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo." (no email is sent, US-0121). `LoginForm` and `SignupForm` SHALL NOT be modified.

#### Scenario: Anonymous visitor sees three options
- **WHEN** an anonymous visitor clicks "Obtener entrada" on `/eventos`
- **THEN** a dialog "Obtén tu entrada" SHALL open with "Crear cuenta gratis", "Ya tengo cuenta" and "Continuar sin registro"

#### Scenario: Signup returns to the event
- **WHEN** the visitor clicks "Crear cuenta gratis" for event E and completes signup
- **THEN** they SHALL land on `/portal/eventos/E` with the Entradas modal open in `usuario` mode

#### Scenario: Continue without signup from the listing
- **WHEN** the visitor clicks "Continuar sin registro" on the `/eventos` listing for event E
- **THEN** they SHALL navigate to `/eventos/E?entradas=1`, and the Entradas modal SHALL open in `invitado` mode

#### Scenario: Logged-in user on the landing page
- **WHEN** a user with a session clicks "Obtener entrada" for event E on `/eventos`
- **THEN** they SHALL navigate to `/portal/eventos/E?entradas=1` without seeing the signup modal

#### Scenario: Button disabled while auth initializes
- **WHEN** the session state is still being resolved
- **THEN** "Obtener entrada" SHALL be disabled

#### Scenario: Hint does not promise email
- **WHEN** the "Obtén tu entrada" modal is open
- **THEN** the hint SHALL read "Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo."

### Requirement: Tickets modal and purchase seam
`EventoEntradasModal` SHALL be the event checkout defined by the `team-events-checkout` capability (US-0121). It SHALL show:
- the title "Entradas · {nombre}", and a line with the organization, date and place;
- the checkout stepper, starting at step 1 with the event's **sellable** tickets read from `evento_entradas` (not from `eventos.precio`);
- in `invitado` mode, the guest note "Estás comprando como invitado. Descarga tu entrada al finalizar; para verla después, crea una cuenta con el mismo correo." and a link "¿Prefieres crear una cuenta?" to the signup URL;
- an enabled primary action per step ("Continuar", "Confirmar compra" or "Obtener entrada gratis") and a "Cerrar" button.

The `onContinuar` prop and the notice "La compra de entradas estará disponible próximamente." SHALL NOT exist. With no sellable ticket, the modal SHALL show "La venta de entradas no está disponible para este evento." and SHALL NOT allow continuing. The modal SHALL use `role="dialog"`, `aria-modal` and `aria-labelledby`, move focus into itself on open, close on Escape (except while submitting), and return focus to the trigger.

#### Scenario: Purchase available
- **WHEN** the modal opens for an event with a sellable ticket
- **THEN** the first sellable ticket SHALL be preselected and "Continuar" SHALL be enabled

#### Scenario: Guest mode note
- **WHEN** the modal opens in `invitado` mode
- **THEN** the guest note and the "¿Prefieres crear una cuenta?" link SHALL be shown

#### Scenario: No sellable tickets
- **WHEN** the event has no ticket with non-null `nombre` / `valor` inside its sale window
- **THEN** "La venta de entradas no está disponible para este evento." SHALL be shown and the user SHALL NOT be able to continue

#### Scenario: Guest continues to a working checkout
- **WHEN** an anonymous visitor chooses "Continuar sin registro" and then "Continuar" in the modal
- **THEN** step 2 "Tus datos" of the checkout SHALL be shown
