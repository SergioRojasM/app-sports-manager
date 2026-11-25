# team-events-discovery Specification

## Purpose
Defines the cross-tenant event discovery pages (/eventos and /portal/eventos): visibility per surface, card content, portal filters, the "Obtener entrada" flow (sign up, log in or continue without signing up) and the tickets modal that holds the purchase seam (US-0120).

## Requirements

### Requirement: Event listing routes and access
The system SHALL provide two event listing routes:
- `/eventos`: public; `middleware.ts` MUST NOT require a session.
- `/portal/eventos`: rendered in the portal shell; the existing middleware redirects visitors without a session to login with `next`.

Both pages SHALL load their data with a single request to `public.eventos` (no other table, view, embed or RPC). They SHALL list events of **every** tenant that pass the visibility rules of `listEventosPublicados`. The landing page SHALL call it with `soloPublicos = true`, and the portal page with `soloPublicos = false`.

#### Scenario: Anonymous visitor opens the landing listing
- **WHEN** a visitor without a session opens `/eventos`
- **THEN** the page SHALL render without redirecting and SHALL list public, active, published, confirmed, future-or-undated events of all tenants

#### Scenario: Portal listing requires a session
- **WHEN** a visitor without a session opens `/portal/eventos`
- **THEN** they SHALL be redirected to login, and after logging in SHALL return to `/portal/eventos`

#### Scenario: Only the eventos table is queried
- **WHEN** either listing page loads
- **THEN** every data request SHALL target `rest/v1/eventos`, with no requests to `tenants`, `disciplinas`, `escenarios`, `usuarios`, `evento_entradas`, views or RPCs

#### Scenario: Landing hides private events even with a session
- **WHEN** a member of tenant T with an active session opens `/eventos`
- **THEN** T's `publico = false` events SHALL NOT be listed

#### Scenario: Portal shows the member's private events
- **WHEN** a member of tenant T opens `/portal/eventos`
- **THEN** T's `publico = false` active published events SHALL be listed with a "Solo miembros" chip, and a non-member or `pendiente_activacion` member SHALL NOT see them

#### Scenario: Staff-only rows never listed
- **WHEN** a tenant admin opens either listing and their tenant has a draft, an inactive, a cancelled and a past event
- **THEN** none of those four events SHALL be listed

### Requirement: Event listing layout and ordering
Events SHALL be ordered by `fecha_hora` ascending with undated events last, then by `nombre`.

The landing page SHALL render the first event as the featured card, marked "Próximo", and the rest in a grid: one column below `sm`, three columns from `sm`. It SHALL render the landing `Header`, a "Volver al inicio" link, the `h1` "Eventos disponibles", a subtitle, and the grid without filters. Its document title SHALL be "Eventos disponibles — GRIT Arena".

The portal page SHALL render:
- a header with the single `h1` "Tu próximo reto." ("reto." as the accent), a search field "Buscar evento o ciudad" and a "Filtros" icon button that opens the filters drawer;
- a discipline chip row (see "Portal listing filters");
- a featured row:
  - the first event of the filtered list as the hero card, marked "PRÓXIMO";
  - the second and third events as compact cards in a side column;
  - from 1280px the hero and the column sit side by side; below that, they stack;
- when more events remain, a section titled "Próximos 60 días" while the default date range is active (otherwise "Más eventos"), with a "Ver calendario" action that opens the filters drawer, followed by the remaining events as grid cards: 4 columns from 1280px, 2 from 640px, otherwise 1.

The portal page SHALL NOT render a count widget, a sticky header or the 60-day note.

#### Scenario: Featured card first
- **WHEN** three events are listed, dated 5, 10 and 20 days from now, plus one undated event
- **THEN** the event 5 days out SHALL be the featured "Próximo" card, and the undated event SHALL be last

#### Scenario: Count widget singular
- **WHEN** the filtered portal list contains exactly one event
- **THEN** no count widget SHALL be rendered, and the single event SHALL be the hero card

#### Scenario: Portal featured row
- **WHEN** the filtered portal list holds six events
- **THEN** event 1 SHALL be the hero card, events 2 and 3 compact cards, and events 4–6 grid cards under "Próximos 60 días"

#### Scenario: Short portal list
- **WHEN** the filtered portal list holds a single event
- **THEN** only the hero card SHALL be rendered, with no compact column and no grid section

#### Scenario: Section title follows filters
- **WHEN** the user narrows the date range in the drawer
- **THEN** the grid section title SHALL read "Más eventos"

### Requirement: Event card content
On the landing listing, each card (`EventoPublicoCard`) SHALL show:
- the banner, or a discipline-gradient placeholder with the discipline icon (the placeholder is also used when the image fails to load);
- the discipline chip, and a "Solo miembros" chip when `publico = false`;
- the organization name (`nombre_tenant`);
- the event name as `h3`, and the description clamped to 2 lines;
- date and time in `America/Bogota`, or "Fecha por definir";
- the place: venue name and location, otherwise `punto_encuentro`, otherwise "Lugar por definir";
- capacity: "Cupo: N" or "Cupo ilimitado";
- trainer names, when present;
- "Reserva con al menos Nh de anticipación", when `reserva_antelacion_horas` is set;
- the price summary from `precio`: "Gratis" when empty, the price when there is one option, "Desde $X" (the cheapest) when there are several.

The landing card SHALL have two actions: "Ver detalles" (to the surface's detail route with `from` set to the current listing path) and "Obtener entrada". It SHALL NOT show occupancy, required services, form preview or plan purchase actions.

On the portal listing, every card SHALL show the banner or the discipline placeholder, a date tile (day and month in Bogotá, or "Por definir" for undated events), the event name, and a "Solo miembros" pill when `publico = false`. In addition:
- **hero card**:
  - a "PRÓXIMO" pill and the discipline pill;
  - the organization's initials mark and name;
  - pills with the Bogotá time, the place and the capacity ("N cupos" or "Cupo ilimitado");
  - a price pill with the price summary;
  - "Obtener entrada";
  - the name links to the detail page;
- **compact card**: the discipline pill and a round arrow link to the detail page;
- **grid card**: a price pill, the discipline icon and the place; the whole card links to the detail page.

Portal detail links SHALL carry `from` set to the listing path.

#### Scenario: Card fields rendered
- **WHEN** an event of "Wolfpack Club" on 2026-10-15 07:00 Bogotá, at venue "Parque Simón Bolívar", with `cupo_maximo = 50`, trainers "Ana" and "Luis", and prices 50000 and 80000 is listed on `/eventos`
- **THEN** its card SHALL show "Wolfpack Club", the Bogotá date and "7:00 a. m.", "Parque Simón Bolívar", "Cupo: 50", "Ana, Luis" and "Desde $ 50.000"

#### Scenario: Free and undated event
- **WHEN** an event has `precio = []`, `fecha_hora = null` and no venue or meeting point
- **THEN** its landing card SHALL show "Gratis", "Fecha por definir" and "Lugar por definir"

#### Scenario: Detail link carries the origin
- **WHEN** the user clicks "Ver detalles" on `/eventos`, or a grid card on `/portal/eventos`
- **THEN** they SHALL navigate to the surface's detail route with `from` set to the listing path, e.g. `/portal/eventos/{id}?from=%2Fportal%2Feventos`

#### Scenario: Portal hero content
- **WHEN** the first portal event is "GRIT 10K" of "Grit Arena" on 21 nov 16:20 Bogotá in "Bogotá" with 100 places and no price
- **THEN** the hero SHALL show "PRÓXIMO", "21" / "NOV", "Grit Arena", "GRIT 10K", "4:20 pm", "Bogotá", "100 cupos", "Gratis" and "Obtener entrada"

#### Scenario: Private event on the portal
- **WHEN** a member sees a `publico = false` event on `/portal/eventos`
- **THEN** its card SHALL show a "Solo miembros" pill

### Requirement: Portal listing filters
The portal page SHALL offer:
- in the header, a search input bound to the listing search;
- under the header, a discipline chip row: "Todos" plus the distinct discipline names of the loaded events, sorted, each with its discipline icon; exactly one chip is pressed, and pressing a chip selects that discipline ("Todos" clears it);
- a filters drawer with:
  - a month calendar range picker, which cannot navigate before the current Bogotá month;
  - quick chips *Hoy*, *Mañana*, *Esta semana* and *Fin de semana* (Monday-first week), where clicking the active chip clears the range;
  - an **Organización** select ("Todas" plus the distinct organizations of the loaded events, sorted by name);
  - a "Limpiar filtros" action.

Filters SHALL combine with AND and run client-side:
- Dates compare the Bogotá date key of `fecha_hora`, with both bounds inclusive. Undated events SHALL always pass the date filter.
- Search SHALL be case- and accent-insensitive over the name, description, organization, discipline, venue name, meeting point and trainer names.

The default state SHALL be the date range from today to today + 60 days (Bogotá), an empty search, and all organizations and disciplines. The "Filtros" button SHALL show an indicator when a drawer filter differs from the default.

#### Scenario: Default window keeps undated events
- **WHEN** the portal page loads with one event 30 days out, one 90 days out and one undated
- **THEN** the 30-day and the undated events SHALL be listed, and the 90-day event SHALL NOT

#### Scenario: Filters combine
- **WHEN** the user selects the organization "Wolfpack Club" in the drawer, presses the "Running" chip, and types "trail" in the header search
- **THEN** only events matching all three SHALL be listed

#### Scenario: Accent-insensitive search
- **WHEN** the user searches "cafe"
- **THEN** an event named "Ruta del Café" SHALL be listed

#### Scenario: Active chip toggles off
- **WHEN** the *Esta semana* chip is active and the user clicks it again
- **THEN** the date range SHALL be cleared and all dated and undated events SHALL pass the date filter

#### Scenario: Discipline chip
- **WHEN** the user presses the "Natación" chip and then "Todos"
- **THEN** only swimming events SHALL be listed after the first press, and every discipline after the second, with the pressed chip exposing `aria-pressed="true"`

#### Scenario: No match with reset
- **WHEN** the filters match no event
- **THEN** "No hay eventos que coincidan con los filtros" and a "Limpiar filtros" button SHALL be shown, and clicking it SHALL restore the default state

### Requirement: Listing loading, error and empty states
Both listings SHALL show "Cargando eventos…" while loading. On failure they SHALL show "No fue posible cargar los eventos." with a "Reintentar" button that re-fetches, and SHALL log the underlying error with `console.error`. When there are no events at all, they SHALL show "No hay eventos disponibles por ahora." On the portal, these states SHALL use the kit empty-state component in place of the featured row and grid, and the header, search and chips SHALL stay visible.

#### Scenario: Retry after failure
- **WHEN** the listing request fails and the user clicks "Reintentar"
- **THEN** the request SHALL be repeated, and on success the grid SHALL render

#### Scenario: Empty listing
- **WHEN** no event passes the visibility rules
- **THEN** "No hay eventos disponibles por ahora." SHALL be shown

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

### Requirement: Discovery navigation entries
- The portal global menu (no tenant selected) SHALL include "Eventos" (icon `celebration`) linking to `/portal/eventos`. The menu SHALL NOT include "Entrenamientos Públicos".
- The landing header's "Plataforma" group SHALL include "Eventos" linking to `/eventos`, and SHALL NOT include "Calendario de Entrenamientos".
- The portal breadcrumb SHALL label the `eventos` segment "Eventos".

#### Scenario: Landing header link
- **WHEN** a visitor opens the "Plataforma" menu in the landing header
- **THEN** an "Eventos" link to `/eventos` SHALL be listed and no "Calendario de Entrenamientos" link SHALL be shown

#### Scenario: Portal breadcrumb
- **WHEN** a user is on `/portal/eventos`
- **THEN** the breadcrumb SHALL read "Eventos"
