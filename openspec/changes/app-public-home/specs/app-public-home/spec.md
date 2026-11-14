# Spec Delta

## Purpose

Public home at the app root (`/`) for visitors and athletes: a video hero, a ribbon of upcoming public events and a showcase of public organizations, with session-aware paths to events, the portal and sign-in.

## ADDED Requirements

### Requirement: Public home at the app root
`/` SHALL render the public home for anonymous and signed-in users without redirecting, with sections in this order: header, hero, upcoming events, organizations, club call-to-action, footer. It SHALL NOT render the former marketing sections (pricing, operation, administration).

#### Scenario: Anonymous visitor
- **WHEN** a visitor without a session opens `/`
- **THEN** the home is rendered with all sections and no redirect occurs

#### Scenario: Signed-in user
- **WHEN** a user with a session opens `/`
- **THEN** the home is rendered (no redirect to `/portal`)

#### Scenario: Marketing sections removed
- **WHEN** `/` is rendered
- **THEN** no pricing, operation-modules or administration-modules section is present

### Requirement: Session-aware primary actions
The header action and the hero secondary call-to-action SHALL read "Iniciar sesión" linking to `/auth/login` without a session, and "Mi portal" linking to `/portal` with a session.

#### Scenario: Without session
- **WHEN** an anonymous visitor views the header and hero
- **THEN** both actions read "Iniciar sesión" and link to `/auth/login`

#### Scenario: With session
- **WHEN** a signed-in user views the header and hero
- **THEN** both actions read "Mi portal" and link to `/portal`

### Requirement: Home header navigation
The header SHALL show the logo (link to `/`), "Eventos" (`/eventos`) and "Organizaciones" (`#organizaciones`). It SHALL switch to a translucent background after the page scrolls more than 24px. Below 1024px the links SHALL be in a menu toggled by a button exposing `aria-expanded` and the label "Abrir menú"/"Cerrar menú".

#### Scenario: Scrolled header
- **WHEN** the page is scrolled more than 24px
- **THEN** the header shows its translucent background

#### Scenario: Mobile menu
- **WHEN** a user below 1024px activates the menu button and then selects a link or presses Escape
- **THEN** the menu opens with `aria-expanded="true"` and closes after the selection or Escape

### Requirement: Hero content
The hero SHALL center an eyebrow "EVENTOS · CLUBES · ENTRENAMIENTOS", the heading "La plataforma donde el deporte evoluciona" (the page's only `h1`), the subtitle "Descubre eventos, entrena con tu club y gestiona tus entradas en un solo lugar." and a primary action "Ver eventos" linking to `/eventos`.

#### Scenario: Hero rendered
- **WHEN** `/` loads
- **THEN** the eyebrow, heading, subtitle and the "Ver eventos" action are centered over the background, and "Ver eventos" navigates to `/eventos`

### Requirement: Hero background motion
The hero background SHALL be a muted, looping, inline video (WebM with MP4 fallback) with a poster image, hidden from assistive technology. When the user prefers reduced motion, no video SHALL be rendered and the poster image SHALL be shown instead. Text over the background SHALL keep a contrast ratio of at least 4.5:1.

#### Scenario: Default motion
- **WHEN** the visitor does not prefer reduced motion
- **THEN** a muted looping video plays behind the hero and the poster is shown until it loads

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** no `<video>` element is rendered and the static poster image is displayed

### Requirement: Upcoming events data
The events ribbon SHALL list at most 12 upcoming public events, using the same visibility rules as `/eventos` (active, non-draft, confirmed, upcoming or undated, public), ordered by date ascending with undated events last.

#### Scenario: More than 12 events
- **WHEN** 20 public upcoming events exist
- **THEN** the ribbon shows the 12 soonest

#### Scenario: Private or past events
- **WHEN** an event is private, a draft, cancelled or in the past
- **THEN** it does not appear in the ribbon

### Requirement: Event ribbon card
Each ribbon card SHALL link to `/eventos/{id}?from=/` and show: cover image (discipline placeholder when missing or failing), a date badge with day and abbreviated month in Bogotá time ("POR DEFINIR" when undated), a discipline chip with its color, the name (max 2 lines), the organization, the location when available, and the price ("Gratis" when there is no price or the cheapest ticket is free). The first event SHALL be the featured card with a "PRÓXIMO" ribbon and highlighted cyan border.

#### Scenario: Card content
- **WHEN** an event dated 2026-11-23 10:00 Bogotá with prices 80.000 and 120.000 is shown
- **THEN** the badge reads "23" / "NOV" and the price reads "Desde $ 80.000"

#### Scenario: Cheapest ticket free
- **WHEN** an event has a free ticket and a paid ticket
- **THEN** the price reads "Gratis"

#### Scenario: Undated event without banner
- **WHEN** an event has no `fecha_hora` and no banner
- **THEN** the badge reads "POR DEFINIR" and the cover shows the discipline placeholder

#### Scenario: Featured card
- **WHEN** the ribbon renders its items
- **THEN** only the first (soonest) card shows the "PRÓXIMO" ribbon and the highlighted border

#### Scenario: Navigation
- **WHEN** a user activates a ribbon card
- **THEN** the browser navigates to `/eventos/{id}?from=/`

### Requirement: Event ribbon motion
At 768px and wider with at least 4 events, the ribbon SHALL scroll continuously and seamlessly, pausing on hover and while a card has keyboard focus; the duplicated items used for the loop SHALL be `aria-hidden` and excluded from the Tab order. With fewer than 4 events, or when reduced motion is preferred, it SHALL NOT animate and SHALL be horizontally scrollable. Below 768px it SHALL be a swipeable snap carousel without auto-scroll.

#### Scenario: Pause on hover and focus
- **WHEN** the pointer hovers the ribbon or a card receives keyboard focus
- **THEN** the animation pauses

#### Scenario: Duplicates not focusable
- **WHEN** a keyboard user tabs through the ribbon
- **THEN** each event is reached once

#### Scenario: Few events
- **WHEN** 3 events are available on desktop
- **THEN** they are shown without animation

#### Scenario: Mobile
- **WHEN** the viewport is below 768px
- **THEN** the ribbon does not auto-scroll and can be swiped card by card

### Requirement: Event ribbon states
While loading, the ribbon SHALL show 3 skeleton cards. With no events or on a loading error it SHALL show "Pronto habrá nuevos eventos", the text "Los clubes están preparando su próxima fecha. Mientras tanto, explora el calendario completo." and a "Ver eventos" action to `/eventos`; errors SHALL be logged and SHALL NOT show an error banner. A "Ver todos los eventos" action SHALL link to `/eventos`.

#### Scenario: Loading
- **WHEN** the events request is in flight
- **THEN** 3 skeleton cards are shown

#### Scenario: Empty or error
- **WHEN** the request returns no events or fails
- **THEN** the empty block with its "Ver eventos" action is shown and, on failure, the error is logged

### Requirement: Organizations showcase content
The organizations section (`id="organizaciones"`) SHALL show at most 6 public organizations with banner, **logo**, name, description (default "Organización deportiva en GRIT Arena." when empty, max 2 lines), up to 2 discipline chips and the active athlete count ("1 atleta", "{n} atletas", hidden when 0). When the logo is missing or fails to load, the organization initials SHALL be shown instead. The logo SHALL have the alternative text "Logo de {nombre}".

#### Scenario: Organization with logo
- **WHEN** an organization has a valid logo URL
- **THEN** its card shows the logo image overlapping the banner with alt "Logo de {nombre}"

#### Scenario: Organization without logo
- **WHEN** an organization has no logo or the image fails to load
- **THEN** the card shows its initials on the brand gradient

#### Scenario: Athlete count
- **WHEN** an organization has 1 active athlete
- **THEN** the card reads "1 atleta"

### Requirement: Organizations showcase actions and states
The section SHALL offer "Ver todas las organizaciones": without a session it SHALL link to `/auth/login?next=/portal/orgs` and show the hint "Inicia sesión para ver todas las organizaciones y unirte a la tuya."; with a session it SHALL link to `/portal/orgs` without the hint. While loading it SHALL show skeleton cards. With no organizations or on error the whole section SHALL be hidden and the error logged.

#### Scenario: Anonymous action
- **WHEN** an anonymous visitor activates "Ver todas las organizaciones" and signs in
- **THEN** they are taken to `/auth/login?next=/portal/orgs` and land on `/portal/orgs` after login

#### Scenario: Signed-in action
- **WHEN** a signed-in user activates "Ver todas las organizaciones"
- **THEN** they navigate to `/portal/orgs` and no login hint is shown

#### Scenario: No organizations
- **WHEN** the organizations request returns no rows or fails
- **THEN** the section is not rendered and the rest of the page works

### Requirement: Club call-to-action and footer
The home SHALL show a band "¿Tienes un club o equipo deportivo?" with a "Conoce GRIT Arena" action opening the marketing landing URL (configurable, default `https://grit-arena.com`) in a new tab with `rel="noopener noreferrer"`, and a footer with links to `/eventos`, `/auth/login`, contact email and WhatsApp, and the current-year copyright.

#### Scenario: Marketing landing link
- **WHEN** a user activates "Conoce GRIT Arena"
- **THEN** the configured landing URL opens in a new tab with `rel="noopener noreferrer"`

### Requirement: Responsive layout
The home SHALL follow the desktop (1440px) and mobile (390px) designs and SHALL NOT produce horizontal page scroll at 375px width.

#### Scenario: Small viewport
- **WHEN** the home is viewed at 375px width
- **THEN** there is no horizontal page scroll and CTAs are full width
