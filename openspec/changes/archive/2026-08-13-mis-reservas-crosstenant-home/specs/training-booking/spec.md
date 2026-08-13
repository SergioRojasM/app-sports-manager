## MODIFIED Requirements

### Requirement: RLS enforcement on reservas
The system MUST enforce Row Level Security on `public.reservas` through database-level policies. All browser client calls go through RLS automatically. An athlete's own bookings SHALL be readable regardless of tenant membership when the training is public (`entrenamientos.visibilidad = 'publico'`); another athlete's booking on that same public training SHALL remain invisible to a caller who is not a member of the hosting tenant.

#### Scenario: Atleta reads own bookings across every tenant membership
- **WHEN** an atleta queries `reservas` without restricting to a single tenant
- **THEN** rows where `atleta_id = auth.uid()` are returned for every `tenant_id` where the caller holds a `miembros_tenant` row, across all such tenants in one query

#### Scenario: Athlete reads their own booking on a public training without tenant membership
- **WHEN** an atleta queries `reservas` for their own booking (`atleta_id = auth.uid()`) on a training with `visibilidad = 'publico'`, hosted by a tenant where the caller holds no membership
- **THEN** that row is returned

#### Scenario: Non-member cannot read another athlete's booking on a public training
- **WHEN** an authenticated user who is not a member of the hosting tenant queries `reservas` for a training with `visibilidad = 'publico'`
- **THEN** only rows where `atleta_id = auth.uid()` are returned; other athletes' bookings on that same public training are not returned

#### Scenario: Cross-tenant access to private trainings remains blocked
- **WHEN** an authenticated user attempts to access bookings for a non-public training in a tenant where they hold no membership
- **THEN** no rows are returned by the RLS policy

#### Scenario: Atleta cannot update or delete other athletes' bookings
- **WHEN** an atleta attempts to mutate a booking where `atleta_id ≠ auth.uid()`
- **THEN** the operation is rejected by RLS
