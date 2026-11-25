## ADDED Requirements

### Requirement: Memberships SHALL be created by administrator onboarding only through authorized RPCs
Besides the default-tenant provisioning trigger and access-request acceptance, a `miembros_tenant` row created by administrator onboarding SHALL originate only from `activar_invitacion_tenant` (estado `activo`) or `completar_alta_administrada` (estado `pendiente_activacion`). Both SHALL use conflict-safe inserts on `(tenant_id, usuario_id)` and MUST NOT modify an existing membership's `rol_id`.

#### Scenario: Invitation acceptance creates one membership
- **WHEN** a user accepts an invitation to tenant T
- **THEN** exactly one `miembros_tenant` row SHALL exist for (T, user)

#### Scenario: Onboarding does not change an existing role
- **WHEN** onboarding targets a user who is already a member of tenant T
- **THEN** the existing membership's `rol_id` SHALL remain unchanged

#### Scenario: Default public membership still provisioned for new identities
- **WHEN** an Auth user is created by invitation or administrator provisioning
- **THEN** the existing provisioning logic SHALL still ensure the `usuarios` row and the default `public` tenant membership with role `usuario`

---

### Requirement: Onboarding RPCs SHALL validate role assignability server-side
`crear_invitacion_tenant` and `reservar_alta_administrada` SHALL accept `p_rol_id` only when it maps to a role whose `nombre` is `administrador`, `entrenador`, or `usuario`, and SHALL raise `SQLSTATE 22023` otherwise. Validation SHALL occur inside the RPC and MUST NOT rely on client-side role lists.

#### Scenario: Catalog role is accepted
- **WHEN** an administrator onboards a person with the `entrenador` role id
- **THEN** the RPC SHALL proceed

#### Scenario: Non-catalog role id is rejected
- **WHEN** an administrator submits a random uuid as `p_rol_id`
- **THEN** the RPC SHALL raise `22023` and create no record

---

### Requirement: Tenant capability helpers SHALL exclude pendiente_activacion memberships
`get_admin_tenants_for_authenticated_user()`, `get_member_tenants_for_authenticated_user()`, and `get_trainer_or_admin_tenants_for_authenticated_user()` SHALL add the predicate `mt.estado <> 'pendiente_activacion'`. Every RLS policy, view, or function that joins `miembros_tenant` directly to grant a tenant capability to `auth.uid()` SHALL apply the same predicate. A migration-time catalog audit of `pg_policies`, `pg_views`, and `pg_proc` definitions referencing `miembros_tenant` SHALL confirm coverage.

#### Scenario: Pending admin gets no admin tenants
- **WHEN** a user whose only membership in tenant T is `administrador` with estado `pendiente_activacion` calls `get_admin_tenants_for_authenticated_user()`
- **THEN** tenant T SHALL NOT be returned

#### Scenario: Pending member cannot read tenant-scoped data
- **WHEN** a `pendiente_activacion` member of tenant T queries a tenant-scoped table such as `planes`, `entrenamientos`, `reservas`, or `v_miembros_equipo` for tenant T
- **THEN** the query SHALL return no rows that are visible only to members of T

#### Scenario: Other memberships are unaffected
- **WHEN** a user is `activo` in tenant A and `pendiente_activacion` in tenant B
- **THEN** `get_member_tenants_for_authenticated_user()` SHALL return A and SHALL NOT return B
