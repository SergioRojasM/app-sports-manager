## ADDED Requirements

### Requirement: Tenant route groups enforce role-based access
The system SHALL prevent authenticated tenant members from accessing pages in a route group whose required role does not match their actual role as stored in `miembros_tenant`. Each route group (`(administrador)`, `(atleta)`, `(entrenador)`, `(shared)`) MUST have a server-side `layout.tsx` that verifies the user's role before rendering children. If the role does not match, the system SHALL redirect to `/portal/orgs/[tenant_id]`. The role MUST be retrieved from the database via `canUserAccessTenant` — it MUST NOT be read from cookies or any client-controlled source.

#### Scenario: Usuario is redirected from administrador routes
- **WHEN** a user with role `usuario` navigates directly to `/portal/orgs/[tenant_id]/gestion-organizacion`
- **THEN** the system SHALL redirect to `/portal/orgs/[tenant_id]` without rendering the page

#### Scenario: Usuario is redirected from entrenador routes
- **WHEN** a user with role `usuario` navigates directly to `/portal/orgs/[tenant_id]/atletas`
- **THEN** the system SHALL redirect to `/portal/orgs/[tenant_id]` without rendering the page

#### Scenario: Entrenador is redirected from administrador routes
- **WHEN** a user with role `entrenador` navigates directly to `/portal/orgs/[tenant_id]/gestion-disciplinas`
- **THEN** the system SHALL redirect to `/portal/orgs/[tenant_id]` without rendering the page

#### Scenario: Administrador is redirected from atleta routes
- **WHEN** a user with role `administrador` navigates directly to `/portal/orgs/[tenant_id]/mis-suscripciones-y-pagos`
- **THEN** the system SHALL redirect to `/portal/orgs/[tenant_id]` without rendering the page

#### Scenario: Entrenador is redirected from atleta routes
- **WHEN** a user with role `entrenador` navigates directly to `/portal/orgs/[tenant_id]/mis-suscripciones-y-pagos`
- **THEN** the system SHALL redirect to `/portal/orgs/[tenant_id]` without rendering the page

#### Scenario: Administrador can access administrador routes
- **WHEN** a user with role `administrador` navigates to any page under `(administrador)/`
- **THEN** the system SHALL render the page normally

#### Scenario: Usuario can access atleta routes
- **WHEN** a user with role `usuario` navigates to any page under `(atleta)/`
- **THEN** the system SHALL render the page normally

#### Scenario: Entrenador can access entrenador routes
- **WHEN** a user with role `entrenador` navigates to any page under `(entrenador)/`
- **THEN** the system SHALL render the page normally

#### Scenario: All roles can access shared routes
- **WHEN** a user with any valid role (`administrador`, `usuario`, or `entrenador`) navigates to any page under `(shared)/`
- **THEN** the system SHALL render the page normally

#### Scenario: User with no tenant membership is rejected before group check
- **WHEN** a user with no membership in the tenant navigates to any tenant route
- **THEN** `TenantLayout` SHALL redirect to `/portal/orgs` before any route group layout is evaluated

### Requirement: Role lookup is deduplicated per request
The system SHALL ensure that the database query for `canUserAccessTenant` executes at most once per server request, regardless of how many nested layouts call it. A React `cache()`-wrapped helper at `src/lib/portal/tenant-access.cache.ts` SHALL be the single entry point used by all tenant layouts for the membership/role lookup.

#### Scenario: Single DB call when navigating to a group route
- **WHEN** a user navigates to a page inside any tenant route group
- **THEN** the `miembros_tenant` table SHALL be queried exactly once for the membership/role check across the full layout chain (TenantLayout + group layout)
