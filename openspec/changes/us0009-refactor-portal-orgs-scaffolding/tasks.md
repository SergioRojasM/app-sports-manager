## 1. Branch and workspace safety

- [x] 1.1 Create and switch to branch `feat/portal-orgs-scaffolding` for US0009 implementation
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop` before code changes

## 2. Delivery routes and guards (page)

- [x] 2.1 Create tenant-scoped route scaffolding under `src/app/portal/orgs/[tenant_id]/(administrador|atleta|entrenador|shared)/...` with required page entrypoints
- [x] 2.2 Create `src/app/portal/orgs/page.tsx` as authenticated organization discovery route
- [x] 2.3 Implement tenant entry guard for `/portal/orgs/[tenant_id]/*` to redirect unauthorized users to `/portal/orgs`
- [x] 2.4 Update `src/app/portal/bootstrap/route.ts` and portal entry links to support `/portal/orgs` and tenant-scoped destinations

## 3. Presentation updates (component)

- [x] 3.1 Extend `OrganizationIdentityCard` props/state for membership-aware CTA variants (`Ingresar` vs `Suscribirse`)
- [x] 3.2 Ensure `/portal/orgs` renders one `OrganizationIdentityCard` per tenant without duplicating card implementations
- [x] 3.3 Implement deterministic placeholder feedback for `Suscribirse` without persistence

## 4. Application orchestration (hook)

- [x] 4.1 Extend `useOrganizationView` to map visible tenants + user memberships into card view models
- [x] 4.2 Add/adjust tenant access resolver hook logic (or dedicated hook) for route guard and entry decisions
- [x] 4.3 Propagate resolved tenant role context to portal navigation/menu state

## 5. Infrastructure data access (service)

- [x] 5.1 Implement `listVisibleTenantsForPortal()` to return all tenants except canonical public tenant
- [x] 5.2 Implement `listUserTenantMemberships(userId)` with role context from membership relations
- [x] 5.3 Implement `canUserAccessTenant(userId, tenantId)` returning access decision + resolved role context
- [x] 5.4 Ensure service methods are reused by pages/hooks and avoid direct Supabase calls in delivery/presentation layers

## 6. Domain contracts (types)

- [x] 6.1 Add/adjust organization discovery types in `src/types/portal/organization-view.types.ts` for list items, CTA state, and access decisions
- [x] 6.2 Update shared portal role/navigation contracts in `src/types/portal.types.ts` for tenant-scoped role behavior

## 7. Verification and documentation

- [x] 7.1 Validate manual scenarios: org list excludes public, member access works, non-member redirect works, subscribe placeholder feedback works
- [x] 7.2 Run lint/type checks for touched files and resolve implementation issues within scope
- [x] 7.3 Update `README.md` and `projectspec/03-project-structure.md` with new portal route map and tenant-gated access behavior
