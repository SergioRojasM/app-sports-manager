# user-home-dashboard Specification

## Purpose

Personal cross-tenant dashboard at `/portal/inicio`: the signed-in user's subscriptions, upcoming trainings, pending payments and organization memberships in one place.

## Requirements

### Requirement: Dashboard route at /portal/inicio
The system SHALL serve a dashboard page at `/portal/inicio` as a React Server Component. The page SHALL authenticate the user via `supabase.auth.getUser()` and fetch all dashboard data server-side. If the user is not authenticated, the page SHALL redirect to the login route.

#### Scenario: Authenticated user accesses /portal/inicio
- **WHEN** an authenticated user navigates to `/portal/inicio`
- **THEN** the system SHALL render the personal dashboard with all sections populated from the user's cross-tenant data

#### Scenario: Unauthenticated user accesses /portal/inicio
- **WHEN** an unauthenticated user navigates to `/portal/inicio`
- **THEN** the system SHALL redirect to `/auth/login`

### Requirement: Parallel server-side data fetching
The page SHALL fetch all dashboard data in parallel using `Promise.all()` with five service calls: stats, upcoming trainings in the 7-day agenda window, subscriptions, pending payments, and memberships. All queries SHALL filter by the authenticated user's ID (`auth.uid()`) and aggregate across all tenants without tenant-scoping.

#### Scenario: Data loads in parallel
- **WHEN** the dashboard page renders on the server
- **THEN** the system SHALL execute `fetchInicioStats`, `fetchProximosEntrenamientos`, `fetchMisSuscripciones`, `fetchPagosPendientes`, and `fetchMisMembresias` concurrently via `Promise.all()`

#### Scenario: Cross-tenant aggregation
- **WHEN** the user belongs to multiple tenants
- **THEN** all dashboard queries SHALL return data from all tenants the user belongs to, not scoped to a single tenant

#### Scenario: Agenda window passed to the queries
- **WHEN** the page renders
- **THEN** the upcoming-trainings query and the upcoming-trainings count SHALL both be bounded by the same 7-day agenda window

### Requirement: Stats cards row
The dashboard SHALL display a row of four KPI cards below the welcome header. Each card SHALL show a round icon chip, a round shortcut button linking to the related page, the value in a large light display font, a label and a contextual hint. The "Pagos pendientes" card SHALL use the highlight surface. The row SHALL use 1 column below 640px, 2 columns from 640px and 4 columns from 1280px.

#### Scenario: Stats cards display correct counts
- **WHEN** the dashboard renders
- **THEN** the system SHALL display, in order:
  - "Suscripciones activas" (credit card icon): count of subscriptions with `estado = 'activa'`; shortcut "Ver suscripciones activas" → `/portal/mis-suscripciones`
  - "Próximos entrenamientos" (running icon): count of bookings with `estado IN ('pendiente', 'confirmada')` whose training starts inside the agenda window; shortcut "Ver próximos entrenamientos" → `/portal/mis-reservas`
  - "Pagos pendientes" (wallet icon, highlight surface): count of payments with `estado = 'pendiente'`; shortcut "Ver pagos pendientes" → `/portal/mis-suscripciones`
  - "Organizaciones" (building icon): count of tenant memberships; shortcut "Ver organizaciones" → `/portal/orgs`

#### Scenario: Stats cards hover effect
- **WHEN** the user hovers or focuses a KPI shortcut button
- **THEN** the button background SHALL lighten and show a visible focus ring; the card itself SHALL NOT move

#### Scenario: Subscriptions hint
- **WHEN** the user has no active subscriptions
- **THEN** the hint reads "Sin planes activos"; with active subscriptions it reads "Vence el {d mmm}" for the soonest `fecha_fin`, or "Sin vencimiento" when none has an end date

#### Scenario: Trainings hint
- **WHEN** the KPI renders
- **THEN** the hint reads "Esta semana"

#### Scenario: Payments hint
- **WHEN** the user has no pending payments
- **THEN** the hint reads "Estás al día" in the accent colour; with `n` pending payments it reads "{n} por validar" in the warning colour

#### Scenario: Organizations hint
- **WHEN** the user belongs to 0, 1 or 3 organizations (first "Grit Arena")
- **THEN** the hint reads "Sin organizaciones", "Grit Arena" or "Grit Arena y 2 más" respectively

### Requirement: My subscriptions card with filter chips
The dashboard SHALL display a "Mis suscripciones" card in the right column with a segmented control (Todas / Activas / Pendientes) in its header. The component SHALL be a client component that receives the full subscription list as props and filters locally. Each subscription SHALL be a list row with plan name, organization, date range, a status pill, a payment pill when a payment exists, and remaining service units.

#### Scenario: Subscriptions display with all data
- **WHEN** the user has active or pending subscriptions
- **THEN** each row SHALL show the plan name, organization, date range ("1 nov 2026 — 30 nov 2026"), a status pill with dot ("Activa" accent, "Pendiente" warning), a payment pill when present ("Pago pendiente" warning, "Pago aprobado" accent, "Pago rechazado" danger) and each service's remaining units ("Clases: 3/10", "∞" when unlimited)

#### Scenario: Filter chips toggle subscription visibility
- **WHEN** the user selects "Activas"
- **THEN** only subscriptions with `estado = 'activa'` are listed and the "Activas" option has `aria-pressed="true"`

#### Scenario: Default filter shows all subscriptions
- **WHEN** the subscriptions card first renders
- **THEN** "Todas" SHALL be selected and all subscriptions SHALL be visible

#### Scenario: Subscriptions empty state
- **WHEN** the user has no subscriptions at all
- **THEN** the card SHALL show an icon ring, "No tienes suscripciones activas" and "Únete a un plan de tu club para empezar."

#### Scenario: Filter with no matches
- **WHEN** the user has subscriptions but none match the selected filter
- **THEN** the card SHALL show "No tienes suscripciones activas" for "Activas" or "No tienes suscripciones pendientes" for "Pendientes"

### Requirement: My organizations card
The dashboard SHALL display a "Mis organizaciones" card in the right column, below subscriptions, with a "Ver todas" pill linking to `/portal/orgs`. Each membership SHALL be a row linking to `/portal/orgs/[tenant_id]` with a 42px logo tile, the organization name and a role pill.

#### Scenario: Organizations card with data
- **WHEN** the user belongs to one or more tenants
- **THEN** each row SHALL show the organization logo (or, when missing or failing to load, the first letter of its name on the deep surface with an accent border), the name, and a role pill reading "Administrador", "Entrenador" or "Atleta" (other role names shown capitalized)

#### Scenario: Organizations card header links
- **WHEN** the organizations card renders
- **THEN** the header SHALL display "Mis organizaciones" with a "Ver todas" pill navigating to `/portal/orgs`

#### Scenario: Organizations empty state
- **WHEN** the user has no tenant memberships
- **THEN** the card SHALL show "No perteneces a ninguna organización" with an "Explorar organizaciones" action to `/portal/orgs`

### Requirement: Responsive grid layout
The dashboard SHALL stack welcome, KPI row and panels vertically. From 1280px the panels SHALL split into the agenda (flexible width) and a 400px right column with subscriptions above organizations; below 1280px all panels SHALL stack in a single column with the agenda first. The page SHALL NOT scroll horizontally at 375px.

#### Scenario: Mobile layout
- **WHEN** the viewport is 375px wide
- **THEN** all sections stack in one column, the week strip fits without horizontal page scroll and the KPI cards are full width

#### Scenario: Desktop layout
- **WHEN** the viewport is 1440px wide
- **THEN** the agenda sits on the left and the right column holds "Mis suscripciones" above "Mis organizaciones", as in frame `lhbhK`

### Requirement: Dashboard service layer
The system SHALL provide an `inicio.service.ts` module exporting five functions, each accepting a Supabase server client and user ID as parameters. The functions SHALL use cross-tenant queries with JOINs to fetch all required data without N+1 patterns.

#### Scenario: fetchInicioStats returns aggregated counts
- **WHEN** `fetchInicioStats(supabase, userId, window)` is called
- **THEN** it SHALL return an `InicioStats` object with counts for active subscriptions, bookings in the agenda window, pending payments, and organization memberships, all fetched in parallel

#### Scenario: fetchProximosEntrenamientos returns upcoming sessions
- **WHEN** `fetchProximosEntrenamientos(supabase, userId, window)` is called
- **THEN** it SHALL return every `InicioEntrenamiento` from `reservas JOIN entrenamientos` where `fecha_hora` is between the later of now and the window start and the window end, and `reserva.estado IN ('pendiente', 'confirmada')`, ordered by `fecha_hora ASC`

#### Scenario: fetchMisSuscripciones returns user subscriptions
- **WHEN** `fetchMisSuscripciones(supabase, userId)` is called
- **THEN** it SHALL return `InicioSuscripcion[]` with plan name, org name, estado, dates, classes remaining, and latest payment status, for subscriptions where `estado IN ('activa', 'pendiente')`

#### Scenario: fetchPagosPendientes returns pending payments
- **WHEN** `fetchPagosPendientes(supabase, userId)` is called
- **THEN** it SHALL return `InicioPagoPendiente[]` with monto, plan name, and org name for payments where `estado = 'pendiente'`

#### Scenario: fetchMisMembresias returns tenant memberships
- **WHEN** `fetchMisMembresias(supabase, userId)` is called
- **THEN** it SHALL return `InicioMembresia[]` with tenant_id, org name, org logo, and role name for all tenants the user belongs to

### Requirement: Dashboard view model types
The system SHALL define view model interfaces in `inicio.types.ts`: `InicioStats`, `InicioEntrenamiento`, `InicioSuscripcion`, `InicioPagoPendiente`, `InicioMembresia`, and `InicioDashboardData` (composite type aggregating all sections).

#### Scenario: Types are defined and exported
- **WHEN** any module imports from `inicio.types.ts`
- **THEN** all six interfaces SHALL be available and correctly typed with fields matching the database query results

### Requirement: Empty state handling
Each dashboard section SHALL display a graceful empty state when no data is available. Empty states SHALL include an appropriate Material Symbols icon and a descriptive message in Spanish.

#### Scenario: All sections empty
- **WHEN** the user has no subscriptions, no upcoming trainings, no pending payments, and no tenant memberships
- **THEN** each section SHALL display its own empty state message without errors or broken layouts

### Requirement: Welcome header
The dashboard SHALL open with the page's only `h1`, reading "Bienvenido," followed by the user's first name in the accent colour, and the subtitle "Tus suscripciones, organizaciones y próximos entrenamientos en un solo lugar." The first name SHALL come from the signed-in user's profile without an extra database query. When the profile has no first name, the heading SHALL read "Bienvenido" without a name.

#### Scenario: Name available
- **WHEN** the signed-in user's profile has `nombre = "Sergio Andrés"`
- **THEN** the heading reads "Bienvenido, Sergio" with "Sergio" in the accent colour

#### Scenario: Name missing
- **WHEN** the profile `nombre` is empty
- **THEN** the heading reads "Bienvenido" and no accent text is rendered

#### Scenario: Single h1
- **WHEN** the dashboard renders
- **THEN** the welcome heading is the only `h1` on the page

### Requirement: Seven-day agenda window
The dashboard SHALL define its agenda window as 7 consecutive days starting today in the America/Bogota time zone (00:00 of today through 23:59:59 of the sixth day after). The upcoming-trainings KPI and the weekly agenda SHALL both count only bookings whose training starts inside this window and not before the current time.

#### Scenario: Window bounds
- **WHEN** the dashboard loads on 2026-11-15 at 09:00 Bogotá time
- **THEN** the window covers 2026-11-15 to 2026-11-21 and a session at 2026-11-15 07:00 is excluded because it already started

#### Scenario: Session after the window
- **WHEN** the user has a booking for 2026-11-22 06:00
- **THEN** it appears neither in the KPI count nor in the agenda

### Requirement: Weekly agenda header and week strip
The agenda panel SHALL show the title "Próximos entrenamientos", the subtitle "Tus sesiones reservadas", a range label for the window ("15 – 21 nov", or "28 nov – 4 dic" across months) and a shortcut to `/portal/mis-reservas` named "Ver mis reservas". Below it, a strip of 7 day buttons SHALL show the weekday abbreviation (DOM, LUN, MAR, MIÉ, JUE, VIE, SÁB) and day number; today SHALL be selected on load.

#### Scenario: Default selection
- **WHEN** the dashboard loads
- **THEN** today's day button is selected (accent fill, `aria-pressed="true"`) and the agenda lists today's sessions

#### Scenario: Selecting another day
- **WHEN** the user activates the "JUE 19" button
- **THEN** it becomes the only pressed button and the agenda lists the sessions of that day

#### Scenario: Days with sessions are marked
- **WHEN** a day in the window has at least one session
- **THEN** its button shows a dot marker and its accessible name includes the session count (for example "Jueves 19, 2 sesiones")

#### Scenario: Range across months
- **WHEN** the window runs from 2026-11-28 to 2026-12-04
- **THEN** the range label reads "28 nov – 4 dic"

### Requirement: Weekly agenda rows
For the selected day, the agenda SHALL list the user's sessions in ascending start time. Each row SHALL show the start time (h:mm, Bogotá), a bar in the discipline colour, the training name, the venue and meeting point when present, the organization name and a status pill ("Confirmada" or "Pendiente" with a dot). Each row SHALL link to the organization's available-trainings page.

#### Scenario: Row content
- **WHEN** the selected day has a confirmed "Natación técnica" session at 05:30 at "Piscina Innova Schools" for organization "Grit Arena"
- **THEN** its row shows "5:30", "Natación técnica", "Piscina Innova Schools", "Grit Arena" and a "Confirmada" pill with a dot

#### Scenario: Row navigation
- **WHEN** the user activates a row for tenant `T`
- **THEN** the browser navigates to `/portal/orgs/T/entrenamientos-disponibles`

#### Scenario: Status is not colour only
- **WHEN** a session is pending
- **THEN** the pill reads "Pendiente" in addition to its warning colour

### Requirement: Weekly agenda empty states
When the selected day has no sessions, the agenda SHALL show decorative hour lines (hidden from assistive technology) under an empty-state card with a "Reservar sesión" action. If the whole window is empty, the card SHALL read "No tienes entrenamientos próximos" / "¡Reserva tu próxima sesión de entrenamiento!"; otherwise "Sin entrenamientos este día" / "Elige otro día de la semana para ver tus sesiones."

#### Scenario: Empty window
- **WHEN** the user has no sessions in the window
- **THEN** the card reads "No tienes entrenamientos próximos" and shows "Reservar sesión"

#### Scenario: Empty day in a busy week
- **WHEN** today has no sessions but Thursday has one
- **THEN** the card reads "Sin entrenamientos este día" and Thursday's button shows the session marker

#### Scenario: Reservar sesión destination
- **WHEN** the user activates "Reservar sesión" and belongs to exactly one organization `T`
- **THEN** they navigate to `/portal/orgs/T/entrenamientos-disponibles`; with zero or several organizations they navigate to `/portal/orgs`

### Requirement: v3 dashboard visual language
The dashboard SHALL follow the v3 design frame `lhbhK`: every panel uses the v3 card surface (the pending-payments KPI uses the highlight surface), controls are pill-shaped kit controls with visible focus rings, status and role labels are pills with text, and no deprecated v2 classes (glass cards, emerald/amber/rose/slate badges, `rounded-md` buttons) remain in the dashboard code.

#### Scenario: Deprecated classes removed
- **WHEN** the v3 and global greps from `DESIGN.md` §11 run on the dashboard component folder
- **THEN** both return no matches

#### Scenario: Frame parity
- **WHEN** the dashboard is viewed at 1440px next to frame `lhbhK`
- **THEN** the welcome, KPI row, agenda and right column match the frame's order, proportions, type scale and surfaces

### Requirement: Dashboard loading skeleton
While `/portal/inicio` is loading, the route SHALL show a skeleton with the same layout as the dashboard (welcome lines, 4 KPI cards, agenda panel, subscriptions and organizations panels) using v3 surfaces, and SHALL respect reduced-motion preferences by not pulsing.

#### Scenario: Navigation to the dashboard
- **WHEN** the user navigates to `/portal/inicio` and the data is still loading
- **THEN** the skeleton is shown with v3 card surfaces in the final layout

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** the skeleton does not animate
