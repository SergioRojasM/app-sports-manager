# User Story: Refactor Tenant Membership Model (`refactor_tenant_membership`)

## ID
US-0008

## Name
Refactor tenant access model to support multi-tenant memberships with role-per-tenant and public tenant defaults

### As a...
As an authenticated platform user

### I want...
I want my access to organizations (tenants) to be managed through a membership model where one user can belong to multiple tenants, each with a specific role

### So that...
The platform can scale organization access correctly, onboard users safely by default, and show a consistent post-login portal experience.

## Description
Refactor the current tenant/role model from direct columns in `public.usuarios` to a membership relation in `public.miembros_tenant` based on `projectspec/diagrams/database-schema.drawio`.

Current system behavior assumes one tenant and one role per user from `usuarios.tenant_id` and `usuarios.rol_id`. This story replaces that with tenant memberships:
- one user can belong to many tenants,
- role is scoped to tenant membership,
- default tenant is `public`,
- default role for new users is `usuario` in `public` tenant.

Also update post-login portal UX:
- after successful login and redirect to `/portal`, keep current welcome content + current portal header,
- navigation menu must show only one option: `Organizaciones Disponibles`.

The implementation must follow project architecture in `projectspec/03-project-structure.md`:
- Delivery: `src/app/**`
- Presentation: `src/components/**`
- Application: `src/hooks/**`
- Infrastructure: `src/services/**`
- Domain contracts: `src/types/**`

## Functional Scope

### 1) Data model refactor
1. Remove direct tenant-role coupling from `public.usuarios` (no role-per-user, no tenant-per-user storage in that table).
2. Store tenant-role assignment in `public.miembros_tenant` with:
   - `tenant_id` (FK tenants)
   - `usuario_id` (FK usuarios)
   - `rol_id` (FK roles)
3. Keep uniqueness for one membership row per (`tenant_id`, `usuario_id`).

### 2) Allowed roles
4. Role catalog for memberships must include exactly:
   - `administrador`
   - `entrenador`
   - `usuario`
5. Any previous default role naming (`atleta`) must be replaced by `usuario` for this flow.

### 3) Default public tenant
6. Ensure tenant `public` exists by default in initialization/seed path.
7. `public` tenant must be reusable as fallback for user onboarding.

### 4) Default membership on signup
8. Every newly created auth user must be ensured as `public.usuarios` record.
9. Every newly created auth user must also receive membership in `public.miembros_tenant`:
   - tenant: `public`
   - role: `usuario`
10. Membership creation should be idempotent and conflict-safe.

### 5) Post-login portal behavior
11. Successful login flow still lands in `/portal` (existing bootstrap/cookie flow can remain).
12. `/portal` keeps current welcome page text and current header component.
13. Portal navigation menu must display only one item:
   - Label: `Organizaciones Disponibles`
14. No extra menu options are rendered for this story.

## Data / Fields to Update

### `public.usuarios`
- Keep user identity/profile fields.
- Remove tenant/role ownership fields from this table model.

### `public.miembros_tenant`
- Add/ensure `rol_id` foreign key.
- Keep relation metadata and uniqueness by (`tenant_id`, `usuario_id`).

### `public.roles`
- Ensure role catalog values include `administrador`, `entrenador`, `usuario`.

### `public.tenants`
- Ensure default row `nombre = 'public'` exists.

## Endpoints and URLs

### App routes
- `GET /portal` → existing welcome page with restricted menu.
- `GET /portal/bootstrap?next=...` → resolves user profile for portal cookie bootstrap (must support membership-based role resolution).

### Persistence / data access (Supabase SDK)
No new HTTP endpoint required. Update service queries to resolve role and tenant from membership relation:
1. Resolve active membership from `miembros_tenant` by `usuario_id`.
2. Join membership with `roles` and `tenants` to map role + tenant context.
3. Keep display profile resolved from `usuarios`.

## Files to Modify (expected)

### User story artifact
1. `projectspec/userstory/us0008-refactor-tenant-membership-model.md`

### Database / Supabase
2. `supabase/migrations/20260221000100_migracion_inicial_bd.sql`
3. `supabase/migrations/20260223000100_seed_inicial.sql`

### Domain contracts
4. `src/types/portal.types.ts`

### Infrastructure services
5. `src/services/supabase/portal.ts`
6. `src/services/supabase/portal/index.ts` (if still used as parallel entrypoint)
7. `src/services/supabase/portal/organization-view.service.ts`

### Delivery and portal behavior
8. `src/app/portal/bootstrap/route.ts` (if role/tenant resolution logic requires update)
9. `src/components/portal/PortalNavMenu.tsx` or shared role menu source

### Optional docs
10. `README.md` (brief note about new tenant membership behavior and default tenant onboarding)

## Suggested Contracts
- `UserRole = 'administrador' | 'entrenador' | 'usuario'`
- `UserMembership` type for selected portal tenant context
- `UserProfile` should expose resolved `tenant_id` and `role` from membership, not direct `usuarios` columns.

## Implementation Steps
1. Update migration schema to align with draw.io relation (`usuarios` decoupled from tenant/role, `miembros_tenant` linked to `roles`).
2. Update seed/trigger logic to guarantee:
   - default tenant `public`,
   - default roles,
   - auto membership creation (`public`, `usuario`) for each new auth user.
3. Refactor portal profile query to resolve role/tenant through `miembros_tenant` (+ `roles`) and pick deterministic membership (e.g., oldest `created_at`, then `id`).
4. Update organization view tenant resolver to read tenant from membership relation, not `usuarios.tenant_id`.
5. Restrict portal menu config to only `Organizaciones Disponibles` while preserving header and welcome page.
6. Validate login/signup flows and migration SQL consistency.

## Definition of Done
1. Initial migration reflects tenant-role membership model from draw.io.
2. New users are automatically provisioned in `usuarios` and in `miembros_tenant` for `public` tenant with role `usuario`.
3. Roles used by membership include `administrador`, `entrenador`, `usuario`.
4. Login still redirects to `/portal` and shows current welcome page + header.
5. Portal menu displays only `Organizaciones Disponibles`.
6. No direct Supabase calls from portal page/components outside existing service/hook architecture.
7. TypeScript and lint checks pass for touched files.

## Testing and Validation

### Manual QA checklist
- Signup a new account; verify `usuarios` row exists.
- Verify new membership row in `miembros_tenant` for tenant `public` + role `usuario`.
- Login with valid account; verify redirect to `/portal`.
- Verify portal header renders as before.
- Verify only one nav item exists: `Organizaciones Disponibles`.
- Verify no runtime errors when loading portal bootstrap/profile.

### Unit/Integration guidance
If harness exists, add tests for:
1. Membership-based role resolver query.
2. New-user trigger default membership insertion.
3. Menu configuration returns single item for all roles.

If no harness exists, document tests as pending without expanding scope.

## Non-Functional Requirements

### Security
- Keep Supabase RLS enabled for touched tables.
- Ensure trigger functions are idempotent and do not expose sensitive data.
- Avoid implicit privilege escalation in membership creation.

### Performance
- Resolve role/tenant with minimal joins and deterministic `single()`/`limit(1)` strategy.
- Avoid duplicate inserts by using conflict constraints.

### Maintainability
- Centralize role/tenant resolution in service layer (`services/supabase/portal*`).
- Keep UI menu behavior controlled by shared portal contracts/config.

### Accessibility
- No regressions in keyboard and screen-reader behavior for portal menu.

## Expected Results
- Tenant access becomes multi-tenant capable through `miembros_tenant`.
- Every new user is safely onboarded into `public` tenant with `usuario` role.
- Portal landing experience remains familiar while menu is intentionally simplified to `Organizaciones Disponibles`.