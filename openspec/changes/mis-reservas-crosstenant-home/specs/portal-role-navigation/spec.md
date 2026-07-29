## ADDED Requirements

### Requirement: Cross-tenant Mis Reservas navigation entry
`resolvePortalMenu` SHALL include a "Mis Reservas" entry (icon `event_available`, href `/portal/mis-reservas`) in the tenant-less portal-home menu, positioned after the "Mis Suscripciones" entry, visible to every authenticated user regardless of any per-tenant role. The tenant-scoped `usuario` role menu SHALL NOT include a `mis-reservas` entry.

#### Scenario: Portal-home menu includes Mis Reservas for every authenticated user
- **WHEN** `resolvePortalMenu` is resolved without a `tenantId` (portal-home context)
- **THEN** the returned menu SHALL include a "Mis Reservas" entry linking to `/portal/mis-reservas`, after the "Mis Suscripciones" entry

#### Scenario: Mis Reservas entry appears regardless of the user's per-tenant role
- **WHEN** an authenticated user holds an `administrador` or `entrenador` role in every tenant they belong to (or no tenant membership at all)
- **THEN** the portal-home menu SHALL still include the "Mis Reservas" entry

#### Scenario: Tenant-scoped usuario menu no longer includes Mis Reservas
- **WHEN** `resolvePortalMenu` is resolved with a `tenantId` and role `usuario`
- **THEN** the returned tenant-scoped menu SHALL NOT include a `mis-reservas` entry
