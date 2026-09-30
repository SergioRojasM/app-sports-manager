## ADDED Requirements

### Requirement: Event detail routes
The system SHALL provide two event detail routes:
- `/eventos/[event_id]`: public; the landing shell with `Header` and `Footer`.
- `/portal/eventos/[event_id]`: inside the portal shell.

Each route file SHALL be a server page that awaits `params` and renders its client page inside `<Suspense>`. The event SHALL be loaded with `getEventoPublicado(event_id, { soloPublicos })`: `soloPublicos = true` on the landing route and `false` on the portal route. That is a single request to `public.eventos`.

An event that does not exist, has a malformed id, or does not pass the visibility rules SHALL render the not-found state:
- a draft, inactive, cancelled or past event;
- a private event on the landing route;
- a private event of a tenant the user is not a member of, on the portal route.

#### Scenario: Public event on the landing route
- **WHEN** a visitor without a session opens `/eventos/{id}` of a public, active, published, confirmed future event
- **THEN** the detail page SHALL render with the event name as the only `h1`

#### Scenario: Private event on the landing route
- **WHEN** anyone, including a member with a session, opens `/eventos/{id}` of a `publico = false` event
- **THEN** "Evento no encontrado" SHALL be shown with a link to `/eventos`

#### Scenario: Private event on the portal route
- **WHEN** a member of the event's tenant opens `/portal/eventos/{id}` of a `publico = false` event
- **THEN** the detail page SHALL render with the "Evento privado" tag, and a non-member SHALL see "Evento no encontrado" with a link to `/portal/eventos`

#### Scenario: Draft hidden from its own admin
- **WHEN** the tenant admin opens `/portal/eventos/{id}` of their own draft
- **THEN** "Evento no encontrado" SHALL be shown

#### Scenario: Malformed id
- **WHEN** `/eventos/abc` is opened
- **THEN** "Evento no encontrado" SHALL be shown without an error

#### Scenario: Portal route requires a session
- **WHEN** a visitor without a session opens `/portal/eventos/{id}`
- **THEN** they SHALL be redirected to login and, after logging in, return to that URL

### Requirement: Event detail states and back navigation
While loading, both pages SHALL show a loading state. A failed request SHALL show an error state with "Reintentar", which re-fetches; it SHALL NOT be presented as not found. The back target SHALL come from the `from` search param only when it is a same-origin absolute path (it starts with `/` and not with `//`). Otherwise it SHALL fall back to `/eventos` (landing) or `/portal/eventos` (portal).

The landing page SHALL render a breadcrumb "Eventos › {nombre}". The portal page SHALL render a "Volver a eventos" link, and the portal breadcrumb SHALL show "Eventos › Evento", never a raw uuid.

#### Scenario: Error is retryable
- **WHEN** the detail request fails
- **THEN** an error state with "Reintentar" SHALL be shown, and clicking it SHALL repeat the request

#### Scenario: Safe origin
- **WHEN** the page is opened with `?from=//evil.com`
- **THEN** the back link SHALL point to `/eventos` on the landing route or `/portal/eventos` on the portal route

#### Scenario: Origin honored
- **WHEN** the page is opened from the portal listing with `?from=/portal/eventos`
- **THEN** the "Volver a eventos" link SHALL point to `/portal/eventos`

#### Scenario: Portal breadcrumb has no uuid
- **WHEN** a user is on `/portal/eventos/{uuid}`
- **THEN** the breadcrumb SHALL read "Eventos › Evento"

### Requirement: Event detail body
Both detail pages and the wizard preview SHALL render `EventoDetalleBody`. It SHALL follow the approved event layout (see the `team-events-wizard` "Event page layout" requirement) and SHALL contain, in order:
1. **Hero**, containing:
   - the banner, with a "Ver" enlarge action, or a discipline-gradient placeholder;
   - the discipline chip;
   - the kind tag ("Evento público" or "Evento privado");
   - the organization line (`nombre_tenant`), hidden when empty;
   - the name as `h1`, and the short description;
   - header meta items: the date ("Fecha por definir" when null), the time range from `fecha_hora` and `duracion_minutos`, the place, capacity, "Reserva hasta N h antes" when set, and "Página del evento" with a "Ver página oficial" link when `pagina_evento_url` is http(s). The place item is `punto_encuentro` as a "Ver ubicación" link when it is http(s), titled with the venue name or "Punto de encuentro"; otherwise plain text.
   - `descripcion_larga`, rendered with `react-markdown` (hidden when empty).
2. **Incluye** and **Cronograma**, side by side from `lg`, each hidden when empty.
3. **Entrenadores**: one card per trainer snapshot, with the name and `experiencia` (the latter hidden when empty); the section is hidden when there are no trainers.
4. **Entradas**: the `precio` options (name, COP amount or "Gratis", description) with an "Obtener entrada" button.
5. **Closing banner**, titled "Reserva tu cupo", with an "Obtener entrada" button.

The body SHALL NOT render a separate Ubicación card, an occupancy indicator, a "Reserva tu cupo" card, or the event's payment methods (see "Payment methods kept out of the event page"). Every section without data SHALL be hidden rather than rendered empty. The "Obtener entrada" buttons SHALL follow the get-ticket entry flow (`team-events-discovery`). A detail page opened with `?entradas=1` SHALL open the Entradas modal once and then remove the param with `router.replace` (no scroll):
- on the portal route, in `usuario` mode;
- on the landing route without a session, in `invitado` mode;
- on the landing route with a session, by navigating to `/portal/eventos/{id}?entradas=1` instead.

#### Scenario: Full event rendered
- **WHEN** an event has an organization, a banner, a Markdown description, 3 incluye items, 4 cronograma items, 2 trainers with experience, 2 ticket options and 2 payment methods
- **THEN** the hero with the organization line, the Incluye, Cronograma, Entrenadores and Entradas sections, and the closing banner SHALL all be rendered, and no payment method SHALL be shown

#### Scenario: Sparse event
- **WHEN** an event has no description, cronograma, incluye, trainers or payment methods, and `precio = []`
- **THEN** only the hero, the Entradas section with "Este evento aún no tiene entradas disponibles.", and the closing banner SHALL be rendered, with no empty sections

#### Scenario: Location link
- **WHEN** `punto_encuentro` is `https://maps.app.goo.gl/abc` and the venue is "Parque Simón Bolívar"
- **THEN** the hero SHALL show "Parque Simón Bolívar" with a "Ver ubicación" link to that URL opening in a new tab with `rel="noopener noreferrer"`

#### Scenario: Auto-open tickets once
- **WHEN** an anonymous visitor opens `/eventos/{id}?entradas=1`
- **THEN** the Entradas modal SHALL open in `invitado` mode, the URL SHALL become `/eventos/{id}`, and reloading SHALL NOT reopen it

#### Scenario: Guest continue on the detail page
- **WHEN** an anonymous visitor on `/eventos/{id}` clicks "Obtener entrada" and then "Continuar sin registro"
- **THEN** the signup modal SHALL close, and the Entradas modal SHALL open in `invitado` mode on the same page

### Requirement: Payment methods kept out of the event page
The event page (both detail routes and the wizard preview) SHALL NOT show the event's `metodos_pago`. Payment methods belong to the ticket-purchase flow: in this phase they are shown only inside `EventoEntradasModal`, for a selected ticket with an amount greater than 0 (see `team-events-discovery`), and the purchase phase will present them as part of checkout.

#### Scenario: Paid event page without payment methods
- **WHEN** an event with 2 payment methods and a paid ticket is rendered on `/eventos/{id}` or `/portal/eventos/{id}`
- **THEN** no "Métodos de pago" section and no payment method name, value or link SHALL appear on the page

#### Scenario: Methods still available when getting a ticket
- **WHEN** the user opens the Entradas modal from that page and a paid ticket is selected
- **THEN** the "Métodos de pago aceptados" block SHALL list the event's payment methods

### Requirement: Event detail accessibility
Each detail page SHALL have exactly one `h1`, and sections SHALL use `h2`. Icon-only buttons SHALL have an `aria-label`. Tags SHALL carry text, not only an icon or color. External links SHALL open in a new tab with `rel="noopener noreferrer"`.

#### Scenario: Single heading
- **WHEN** a detail page is rendered
- **THEN** it SHALL contain exactly one `h1`, which is the event name
