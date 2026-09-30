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
Events SHALL be ordered by `fecha_hora` ascending with undated events last, then by `nombre`. The first event SHALL be rendered as the featured card, marked "Próximo". The rest SHALL follow in a grid: one column below `sm`, three columns from `sm`.

The landing page SHALL render the landing `Header`, a "Volver al inicio" link, the `h1` "Eventos disponibles", a subtitle, and the grid without filters. Its document title SHALL be "Eventos disponibles — GRIT Arena".

The portal page SHALL render:
- a sticky header with the single `h1` "Eventos Públicos";
- a count widget ("{N} eventos disponibles", or "1 evento disponible") matching the filtered list;
- a "Filtrar" button;
- while the default date range is active, the note "Se muestran los eventos de los próximos 60 días. Si quieres ver más, filtra por fechas."

#### Scenario: Featured card first
- **WHEN** three events are listed, dated 5, 10 and 20 days from now, plus one undated event
- **THEN** the event 5 days out SHALL be the featured "Próximo" card, and the undated event SHALL be last

#### Scenario: Count widget singular
- **WHEN** the filtered portal list contains exactly one event
- **THEN** the widget SHALL read "1 evento disponible"

### Requirement: Event card content
Each card (`EventoPublicoCard`) SHALL show:
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

The card SHALL have two actions: "Ver detalles" (to the surface's detail route with `from` set to the current listing path) and "Obtener entrada". It SHALL NOT show occupancy, required services, form preview or plan purchase actions.

#### Scenario: Card fields rendered
- **WHEN** an event of "Wolfpack Club" on 2026-10-15 07:00 Bogotá, at venue "Parque Simón Bolívar", with `cupo_maximo = 50`, trainers "Ana" and "Luis", and prices 50000 and 80000 is listed
- **THEN** its card SHALL show "Wolfpack Club", the Bogotá date and "7:00 a. m.", "Parque Simón Bolívar", "Cupo: 50", "Ana, Luis" and "Desde $ 50.000"

#### Scenario: Free and undated event
- **WHEN** an event has `precio = []`, `fecha_hora = null` and no venue or meeting point
- **THEN** its card SHALL show "Gratis", "Fecha por definir" and "Lugar por definir"

#### Scenario: Detail link carries the origin
- **WHEN** the user clicks "Ver detalles" on `/portal/eventos`
- **THEN** they SHALL navigate to `/portal/eventos/{id}?from=%2Fportal%2Feventos`

### Requirement: Portal listing filters
The portal page SHALL offer a filters drawer with the following controls:
- a month calendar range picker, which cannot navigate before the current Bogotá month;
- quick chips *Hoy*, *Mañana*, *Esta semana* and *Fin de semana* (Monday-first week), where clicking the active chip clears the range;
- a search input;
- an **Organización** select ("Todas" plus the distinct organizations of the loaded events, sorted by name);
- a **Disciplina** select ("Todas" plus the distinct discipline names, sorted);
- a "Limpiar filtros" action.

Filters SHALL combine with AND and run client-side:
- Dates compare the Bogotá date key of `fecha_hora`, with both bounds inclusive. Undated events SHALL always pass the date filter.
- Search SHALL be case- and accent-insensitive over the name, description, organization, discipline, venue name, meeting point and trainer names.

The default state SHALL be the date range from today to today + 60 days (Bogotá), an empty search, and all organizations and disciplines.

#### Scenario: Default window keeps undated events
- **WHEN** the portal page loads with one event 30 days out, one 90 days out and one undated
- **THEN** the 30-day and the undated events SHALL be listed, and the 90-day event SHALL NOT

#### Scenario: Filters combine
- **WHEN** the user selects the organization "Wolfpack Club", the discipline "Running", and the search "trail"
- **THEN** only events matching all three SHALL be listed

#### Scenario: Accent-insensitive search
- **WHEN** the user searches "cafe"
- **THEN** an event named "Ruta del Café" SHALL be listed

#### Scenario: Active chip toggles off
- **WHEN** the *Esta semana* chip is active and the user clicks it again
- **THEN** the date range SHALL be cleared and all dated and undated events SHALL pass the date filter

#### Scenario: No match with reset
- **WHEN** the filters match no event
- **THEN** "No hay eventos que coincidan con los filtros" and a "Limpiar filtros" button SHALL be shown, and clicking it SHALL restore the default state

### Requirement: Listing loading, error and empty states
Both listings SHALL show "Cargando eventos…" while loading. On failure they SHALL show "No fue posible cargar los eventos." with a "Reintentar" button that re-fetches, and SHALL log the underlying error with `console.error`. When there are no events at all, they SHALL show "No hay eventos disponibles por ahora."

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

The modal SHALL show the hint "Sin cuenta no podrás ver tus entradas en el portal; te las enviaremos a tu correo." `LoginForm` and `SignupForm` SHALL NOT be modified.

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

### Requirement: Tickets modal and purchase seam
`EventoEntradasModal` SHALL show:
- the title "Entradas · {nombre}", and a line with the organization, date and place;
- the event's `precio` options as a native radio group (name, amount formatted in COP or "Gratis" for 0, and description), with the first option preselected;
- when the selected option has an amount greater than 0 and the event has `metodos_pago`, a "Métodos de pago aceptados" block (compact payment-method cards);
- in `invitado` mode, the note "Estás comprando como invitado. Te pediremos tus datos de contacto para enviarte la entrada." and a link "¿Prefieres crear una cuenta?" to the signup URL;
- a primary "Continuar" button that calls `onContinuar({ eventoId, entrada, modo })`. When no `onContinuar` is provided (this phase), the button SHALL be disabled and described by an info notice "La compra de entradas estará disponible próximamente.";
- a "Cerrar" button.

With an empty `precio` the modal SHALL show "Este evento aún no tiene entradas disponibles." and hide "Continuar". The modal SHALL use `role="dialog"`, `aria-modal`, `aria-labelledby`, move focus into itself on open, close on Escape, and return focus to the trigger.

#### Scenario: Paid ticket shows payment methods
- **WHEN** the modal opens for an event with options "General" 50000 and "Niños" 0, and two payment methods
- **THEN** "General" SHALL be preselected and the payment methods block SHALL be shown; selecting "Niños" SHALL hide it

#### Scenario: Purchase not yet available
- **WHEN** the modal is open in this phase
- **THEN** "Continuar" SHALL be disabled, and "La compra de entradas estará disponible próximamente." SHALL be shown

#### Scenario: Guest mode note
- **WHEN** the modal opens in `invitado` mode
- **THEN** the guest note and the "¿Prefieres crear una cuenta?" link SHALL be shown

#### Scenario: No tickets
- **WHEN** the event has `precio = []`
- **THEN** "Este evento aún no tiene entradas disponibles." SHALL be shown and "Continuar" SHALL NOT be rendered

#### Scenario: Opened from the portal listing without extra requests
- **WHEN** the user opens the modal from a card on `/portal/eventos`
- **THEN** the payment methods SHALL come from the already-loaded listing data, with no additional network request

### Requirement: Discovery navigation entries
- The portal global menu (no tenant selected) SHALL include "Eventos" (icon `celebration`) linking to `/portal/eventos`, placed after "Entrenamientos Públicos".
- The landing header's "Plataforma" group SHALL include "Eventos" linking to `/eventos`, after "Calendario de Entrenamientos".
- The portal breadcrumb SHALL label the `eventos` segment "Eventos".

#### Scenario: Landing header link
- **WHEN** a visitor opens the "Plataforma" menu in the landing header
- **THEN** an "Eventos" link to `/eventos` SHALL be listed after "Calendario de Entrenamientos"

#### Scenario: Portal breadcrumb
- **WHEN** a user is on `/portal/eventos`
- **THEN** the breadcrumb SHALL read "Eventos"

### Requirement: Events slices independent of public trainings
No file in `src/components/portal/eventos/`, `src/components/landing/eventos/`, `src/hooks/portal/eventos/`, `src/hooks/landing/eventos/`, `src/components/portal/gestion-eventos/` or `src/lib/portal/eventos*.ts` SHALL import from `components/*/entrenamientos-publicos`, `hooks/*/entrenamientos-publicos` or `lib/portal/entrenamientos-publicos`. Type-only imports from `types/portal/entrenamientos-publicos.types` are allowed. The public-trainings pages SHALL behave exactly as before.

#### Scenario: Isolation grep
- **WHEN** `grep -rE "(components|hooks)/[a-z]+/entrenamientos-publicos|lib/portal/entrenamientos-publicos"` runs over those folders
- **THEN** it SHALL return no matches

#### Scenario: Public trainings unaffected
- **WHEN** `/entrenamientos-publicos`, its detail page, or `/portal/entrenamientos-publicos` is opened
- **THEN** it SHALL render and behave as before this change

