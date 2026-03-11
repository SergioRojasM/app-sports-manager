## ADDED Requirements

### Requirement: Dashboard route at /portal/inicio
The system SHALL serve a dashboard page at `/portal/inicio` as a React Server Component. The page SHALL authenticate the user via `supabase.auth.getUser()` and fetch all dashboard data server-side. If the user is not authenticated, the page SHALL redirect to the login route.

#### Scenario: Authenticated user accesses /portal/inicio
- **WHEN** an authenticated user navigates to `/portal/inicio`
- **THEN** the system SHALL render the personal dashboard with all sections populated from the user's cross-tenant data

#### Scenario: Unauthenticated user accesses /portal/inicio
- **WHEN** an unauthenticated user navigates to `/portal/inicio`
- **THEN** the system SHALL redirect to `/auth/login`

### Requirement: Parallel server-side data fetching
The page SHALL fetch all dashboard data in parallel using `Promise.all()` with five service calls: stats, upcoming trainings, subscriptions, pending payments, and memberships. All queries SHALL filter by the authenticated user's ID (`auth.uid()`) and aggregate across all tenants without tenant-scoping.

#### Scenario: Data loads in parallel
- **WHEN** the dashboard page renders on the server
- **THEN** the system SHALL execute `fetchInicioStats`, `fetchProximosEntrenamientos`, `fetchMisSuscripciones`, `fetchPagosPendientes`, and `fetchMisMembresias` concurrently via `Promise.all()`

#### Scenario: Cross-tenant aggregation
- **WHEN** the user belongs to multiple tenants
- **THEN** all dashboard queries SHALL return data from all tenants the user belongs to, not scoped to a single tenant

### Requirement: Stats cards row
The dashboard SHALL display a row of four stat cards in a `grid-cols-1 md:grid-cols-4` layout at the top of the page. Each card SHALL use the glassmorphism `glass-card stat-card` pattern and contain a coloured icon container, an uppercase label, and a bold number.

#### Scenario: Stats cards display correct counts
- **WHEN** the dashboard renders
- **THEN** the system SHALL display four stat cards:
  - "Suscripciones Activas" with `card_membership` icon showing count of subscriptions where `estado = 'activa'`
  - "Próximos Entrenamientos" with `directions_run` icon showing count of upcoming reservas where `fecha_hora >= now()` and `estado IN ('pendiente', 'confirmada')`
  - "Pagos Pendientes" with `payments` icon (amber variant) showing count of pagos where `estado = 'pendiente'`
  - "Organizaciones" with `corporate_fare` icon showing count of tenant memberships

#### Scenario: Stats cards hover effect
- **WHEN** the user hovers over a stat card
- **THEN** the card SHALL translate upward by 2px with a 300ms transition

### Requirement: Featured next training card
The dashboard SHALL display a hero-style card for the user's soonest upcoming training session. The card SHALL use a horizontal layout with an image area (left 1/3) and a content area (right 2/3).

#### Scenario: Featured training with data
- **WHEN** the user has at least one upcoming training via reservas
- **THEN** the system SHALL display the soonest training in a hero card with:
  - Left 1/3: gradient overlay area (CSS gradient fallback when no image available)
  - Right 2/3: "Próximo Entrenamiento" badge, training name, time and duration, venue and meeting point, organization name, and a "Ver Detalles" CTA button with `gradient-brand` styling

#### Scenario: Featured training empty state
- **WHEN** the user has no upcoming trainings
- **THEN** the system SHALL display an empty state card with a motivational message and appropriate icon

#### Scenario: Featured training CTA navigation
- **WHEN** the user clicks the "Ver Detalles" button
- **THEN** the system SHALL navigate to the training detail page within the corresponding tenant context

### Requirement: Upcoming trainings list
The dashboard SHALL display a list of up to 5 upcoming training sessions ordered by `fecha_hora ASC` in activity-row cards within a glass card. Each row SHALL show the discipline icon, training name, formatted date/time, venue, meeting point, organization name, and booking status badge.

#### Scenario: Trainings list with data
- **WHEN** the user has upcoming trainings via reservas
- **THEN** the system SHALL display up to 5 sessions ordered by `fecha_hora ASC`, each showing:
  - Discipline icon (Material icon or fallback `exercise`)
  - Training name in bold secondary colour
  - Date/time formatted as localized string (e.g., "Mar, 4 mar · 6:00 PM · 90min")
  - Venue name with `location_on` icon
  - Meeting point (`punto_encuentro`)
  - Organization name
  - Booking status badge (emerald for `confirmada`, amber for `pendiente`)

#### Scenario: Trainings list empty state
- **WHEN** the user has no upcoming trainings
- **THEN** the system SHALL display an empty state message: "No tienes entrenamientos próximos"

#### Scenario: Training row links to tenant-scoped page
- **WHEN** the user clicks a training row
- **THEN** the system SHALL navigate to the training page within the corresponding tenant context

### Requirement: My subscriptions card with filter chips
The dashboard SHALL display a subscriptions card in the left column with interactive status filter chips (Todas / Activas / Pendientes). The component SHALL be a client component (`"use client"`) that receives the full subscription list as props and filters locally using `useState`.

#### Scenario: Subscriptions display with all data
- **WHEN** the user has active or pending subscriptions
- **THEN** the system SHALL display each subscription showing: plan name, organization, status badge (emerald=activa, amber=pendiente, slate=vencida, rose=cancelada), date range, classes remaining with progress indicator, and payment status badge

#### Scenario: Filter chips toggle subscription visibility
- **WHEN** the user clicks the "Activas" filter chip
- **THEN** the system SHALL display only subscriptions with `estado = 'activa'`

#### Scenario: Default filter shows all subscriptions
- **WHEN** the subscriptions card first renders
- **THEN** the "Todas" filter chip SHALL be selected and all subscriptions SHALL be visible

#### Scenario: Subscriptions empty state
- **WHEN** the user has no subscriptions matching the active filter
- **THEN** the system SHALL display an empty state message: "No tienes suscripciones activas"

### Requirement: My organizations card
The dashboard SHALL display a compact organizations card in the left column showing each tenant membership with organization logo, name, and role badge. Each row SHALL link to `/portal/orgs/[tenant_id]`.

#### Scenario: Organizations card with data
- **WHEN** the user belongs to one or more tenants
- **THEN** the system SHALL display each membership as a compact row with:
  - Organization logo (`size-10 rounded-md` image, fallback if null)
  - Organization name in bold secondary colour
  - Role badge with `roles.nombre`
  - Row links to `/portal/orgs/[tenant_id]`

#### Scenario: Organizations card header links
- **WHEN** the organizations card renders
- **THEN** the header SHALL display "Mis Organizaciones" with a "Ver todas" link navigating to `/portal/orgs`

#### Scenario: Organizations empty state
- **WHEN** the user has no tenant memberships
- **THEN** the system SHALL display an empty state message

### Requirement: Quick actions grid
The dashboard SHALL display a 2×2 grid of navigation shortcut buttons in a glass card. Each button SHALL contain an icon and label with hover effects.

#### Scenario: Quick actions render four buttons
- **WHEN** the dashboard renders
- **THEN** the system SHALL display a 2×2 grid with:
  - "Ver Entrenamientos" with `fitness_center` icon
  - "Ver Planes" with `card_membership` icon
  - "Mi Perfil" with `person` icon → `/portal/perfil`
  - "Mis Organizaciones" with `corporate_fare` icon → `/portal/orgs`

#### Scenario: Quick action hover effect
- **WHEN** the user hovers over a quick action button
- **THEN** the button border SHALL change to `primary/50` or `secondary/50` with a background tint transition

### Requirement: Pending payments alert
The dashboard SHALL conditionally display an amber-themed alert card when the user has pending payments. The alert SHALL be hidden entirely when no pending payments exist.

#### Scenario: Pending payments exist
- **WHEN** the user has one or more pending payments
- **THEN** the system SHALL display an amber glass card (`bg-yellow-500/20 border-yellow-500/30`) with:
  - `payments` icon in amber
  - Count of pending payments and total amount
  - "Revisar Pagos" CTA button

#### Scenario: No pending payments
- **WHEN** the user has zero pending payments
- **THEN** the pending payments alert card SHALL NOT be rendered

### Requirement: Responsive grid layout
The dashboard SHALL use a responsive grid layout: single column on mobile, full 3-column grid (`lg:grid-cols-3`) on desktop. The stats row SHALL use `grid-cols-1 md:grid-cols-4`. The main content below stats SHALL split into left column (1/3) and right column (2/3) on desktop.

#### Scenario: Mobile layout
- **WHEN** the viewport is below the `lg` breakpoint
- **THEN** all dashboard sections SHALL stack in a single column

#### Scenario: Desktop layout
- **WHEN** the viewport is at or above the `lg` breakpoint
- **THEN** the dashboard SHALL display a 3-column grid with the left column (1/3) containing organizations, quick actions, and subscriptions, and the right column (2/3) containing featured training, upcoming trainings list, and pending payments alert

### Requirement: Glassmorphism design pattern
All dashboard cards SHALL use the glassmorphism `glass-card` pattern: `background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.05)`. CTA buttons SHALL use `gradient-brand` styling. Badge colours SHALL follow the convention: emerald for active/confirmed, amber for pending, slate for expired, rose for cancelled.

#### Scenario: Glass card styling applied
- **WHEN** any dashboard card renders
- **THEN** the card SHALL have glassmorphism background, blur effect, and subtle border consistent with the design reference

#### Scenario: Badge colour convention
- **WHEN** a status badge renders for any entity (subscription, booking, payment)
- **THEN** the badge colour SHALL be emerald for active/confirmed states, amber for pending states, slate for expired states, and rose for cancelled states

### Requirement: Dashboard service layer
The system SHALL provide an `inicio.service.ts` module exporting five functions, each accepting a Supabase server client and user ID as parameters. The functions SHALL use cross-tenant queries with JOINs to fetch all required data without N+1 patterns.

#### Scenario: fetchInicioStats returns aggregated counts
- **WHEN** `fetchInicioStats(supabase, userId)` is called
- **THEN** it SHALL return an `InicioStats` object with counts for active subscriptions, upcoming trainings, pending payments, and organization memberships, all fetched in parallel

#### Scenario: fetchProximosEntrenamientos returns upcoming sessions
- **WHEN** `fetchProximosEntrenamientos(supabase, userId, 5)` is called
- **THEN** it SHALL return up to 5 `InicioEntrenamiento` records from `reservas JOIN entrenamientos` where `fecha_hora >= now()` and `reserva.estado IN ('pendiente', 'confirmada')`, ordered by `fecha_hora ASC`

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
