## MODIFIED Requirements

### Requirement: My subscriptions card with filter chips
The dashboard SHALL display a subscriptions card in the left column with interactive status filter chips (Todas / Activas / Pendientes). The component SHALL be a client component (`"use client"`) that receives the full subscription list as props and filters locally using `useState`.

#### Scenario: Subscriptions display with all data
- **WHEN** the user has active or pending subscriptions
- **THEN** the system SHALL display each subscription showing: plan name, organization, status badge (emerald=activa, amber=pendiente, slate=vencida, rose=cancelada), date range, per-service unit row (when services exist), and payment status badge

#### Scenario: Filter chips toggle subscription visibility
- **WHEN** the user clicks the "Activas" filter chip
- **THEN** the system SHALL display only subscriptions with `estado = 'activa'`

#### Scenario: Default filter shows all subscriptions
- **WHEN** the subscriptions card first renders
- **THEN** the "Todas" filter chip SHALL be selected and all subscriptions SHALL be visible

#### Scenario: Subscriptions empty state
- **WHEN** the user has no subscriptions matching the active filter
- **THEN** the system SHALL display an empty state message: "No tienes suscripciones activas"

---

### Requirement: Dashboard service layer
The system SHALL provide an `inicio.service.ts` module exporting five functions, each accepting a Supabase server client and user ID as parameters. The functions SHALL use cross-tenant queries with JOINs to fetch all required data without N+1 patterns.

#### Scenario: fetchInicioStats returns aggregated counts
- **WHEN** `fetchInicioStats(supabase, userId)` is called
- **THEN** it SHALL return an `InicioStats` object with counts for active subscriptions, upcoming trainings, pending payments, and organization memberships, all fetched in parallel

#### Scenario: fetchProximosEntrenamientos returns upcoming sessions
- **WHEN** `fetchProximosEntrenamientos(supabase, userId, 5)` is called
- **THEN** it SHALL return up to 5 `InicioEntrenamiento` records from `reservas JOIN entrenamientos` where `fecha_hora >= now()` and `reserva.estado IN ('pendiente', 'confirmada')`, ordered by `fecha_hora ASC`

#### Scenario: fetchMisSuscripciones returns user subscriptions with service units
- **WHEN** `fetchMisSuscripciones(supabase, userId)` is called
- **THEN** it SHALL return `InicioSuscripcion[]` with plan name, org name, estado, dates, per-service unit data (`servicios: SuscripcionServicioDisplay[]`), and latest payment status, for subscriptions where `estado IN ('activa', 'pendiente')`

#### Scenario: fetchPagosPendientes returns pending payments
- **WHEN** `fetchPagosPendientes(supabase, userId)` is called
- **THEN** it SHALL return `InicioPagoPendiente[]` with monto, plan name, and org name for payments where `estado = 'pendiente'`

#### Scenario: fetchMisMembresias returns tenant memberships
- **WHEN** `fetchMisMembresias(supabase, userId)` is called
- **THEN** it SHALL return `InicioMembresia[]` with tenant_id, org name, org logo, and role name for all tenants the user belongs to

---

### Requirement: Dashboard view model types
The system SHALL define view model interfaces in `inicio.types.ts`: `InicioStats`, `InicioEntrenamiento`, `InicioSuscripcion`, `InicioPagoPendiente`, `InicioMembresia`, and `InicioDashboardData` (composite type aggregating all sections). `InicioSuscripcion` SHALL include a `servicios: SuscripcionServicioDisplay[]` field (imported from `suscripciones.types.ts`).

#### Scenario: Types are defined and exported
- **WHEN** any module imports from `inicio.types.ts`
- **THEN** all six interfaces SHALL be available and correctly typed, with `InicioSuscripcion.servicios` typed as `SuscripcionServicioDisplay[]`
