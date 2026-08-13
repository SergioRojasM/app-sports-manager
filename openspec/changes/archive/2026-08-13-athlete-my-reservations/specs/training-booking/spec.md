## MODIFIED Requirements

### Requirement: RLS enforcement on reservas
The system MUST enforce Row Level Security on `public.reservas` through database-level policies. All browser client calls go through RLS automatically. The `reservas_reporte_view` SHALL include `r.atleta_id AS atleta_id` in its SELECT list to support direct ID-based filtering for athlete-scoped queries.

#### Scenario: Atleta can only read own bookings
- **WHEN** an atleta queries `reservas` for a training
- **THEN** only rows where `atleta_id = auth.uid()` and `tenant_id` matches their membership are returned

#### Scenario: Cross-tenant access is blocked
- **WHEN** an authenticated user attempts to access bookings for a training outside their tenant membership
- **THEN** no rows are returned by the RLS policy

#### Scenario: Atleta cannot update or delete other athletes' bookings
- **WHEN** an atleta attempts to mutate a booking where `atleta_id ≠ auth.uid()`
- **THEN** the operation is rejected by RLS

#### Scenario: reservas_reporte_view exposes atleta_id column
- **WHEN** a query selects from `reservas_reporte_view`
- **THEN** the result set includes an `atleta_id` column containing the `reservas.atleta_id` UUID value

#### Scenario: Existing queries unaffected by view column addition
- **WHEN** `getReservasManagement` or `getReservasReport` queries `reservas_reporte_view` after the migration
- **THEN** existing functionality is unchanged — the additional `atleta_id` column is present but does not affect existing filter logic or result mapping
