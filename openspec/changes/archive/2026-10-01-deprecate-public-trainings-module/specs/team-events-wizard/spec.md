## MODIFIED Requirements

### Requirement: Event page layout
The event page (the `/eventos/[event_id]` and `/portal/eventos/[event_id]` detail pages, and the wizard preview) SHALL be rendered by `EventoDetalleBody` in `src/components/portal/eventos/detalle/`. It SHALL NOT use `PublicTrainingDetalleBody`. Public-training pages keep `PublicTrainingDetalleBody` with the default `entrenamiento` variant, and their behavior is unchanged. The event page SHALL follow these rules:
- The kind tag SHALL read "Evento público" or "Evento privado".
- The hero SHALL show the organization name (`nombre_tenant`) when it is not empty.
- The "Ubicación" and "Reserva tu cupo" cards SHALL NOT be rendered.
- The header's location item SHALL render `punto_encuentro` as a "Ver ubicación" link, opening in a new tab, when it is an http(s) URL. Its title SHALL be the venue name, or "Punto de encuentro" when there is no venue. A non-URL value SHALL render as plain text.
- The header SHALL show "Reserva hasta N h antes" when `reserva_antelacion_horas` is set.
- The header SHALL show "Página del evento" with a "Ver página oficial" link, opening in a new tab, when `pagina_evento_url` is an http(s) URL.
- The body SHALL include Entrenadores (name + `experiencia`) and Entradas (the `precio` options) sections, each hidden when empty. It SHALL NOT show the event's payment methods; they are part of the ticket-purchase flow.
- Call-to-action buttons SHALL read "Obtener entrada".
- The closing banner SHALL show only the title "Reserva tu cupo", with no subtitle.

#### Scenario: Location as a link
- **WHEN** `punto_encuentro` is `https://maps.app.goo.gl/KAuYCWHmrx1udyUdA?g_st=ic`
- **THEN** the header SHALL show a "Ver ubicación" link with that href and `target="_blank"`, and no "Ubicación" card SHALL be rendered

#### Scenario: Lead time and official page in the header
- **WHEN** `reserva_antelacion_horas = 24` and `pagina_evento_url = 'https://wolfpack.com/trail-21k'`
- **THEN** the header SHALL show "Reserva hasta 24 h antes" and a "Ver página oficial" link to that URL, and no "Reserva tu cupo" card SHALL be rendered

#### Scenario: Closing banner
- **WHEN** the event page is rendered
- **THEN** the closing banner title SHALL be "Reserva tu cupo", with no subtitle, and its button SHALL read "Obtener entrada"

#### Scenario: Organization shown on the event page
- **WHEN** an event with `nombre_tenant = 'Wolfpack Club'` is rendered on a detail page
- **THEN** the hero SHALL show "Wolfpack Club"
