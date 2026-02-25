## Context

US0009 restructures the portal from role-first top-level groups to tenant-scoped navigation under `/portal/orgs/[tenant_id]`. The current structure mixes role routes at the root portal level, which complicates multi-tenant isolation and creates ambiguity between organization discovery and organization access.

The target behavior introduces:
- an authenticated organizations index at `/portal/orgs` visible to all authenticated users,
- strict tenant-entry gating based on membership + role,
- role-adapted menu behavior once tenant context is resolved,
- a non-persistent `Suscribirse` action for non-members.

The solution must follow the project structure constraints (`page -> component -> hook -> service -> types`) and avoid direct Supabase calls from pages/components.

## Goals / Non-Goals

**Goals:**
- Introduce tenant-scoped route scaffolding under `src/app/portal/orgs/[tenant_id]/(administrador|atleta|entrenador|shared)/...`.
- Provide `/portal/orgs` listing for all authenticated users excluding the public tenant.
- Reuse `OrganizationIdentityCard` with deterministic CTA states (`Ingresar` for members with role, `Suscribirse` for non-members).
- Enforce tenant access control with safe redirect behavior to `/portal/orgs` on unauthorized access.
- Resolve tenant role at entry and drive role-based portal navigation from that resolved context.
- Keep implementation aligned with the existing hexagonal feature-slice pattern.

**Non-Goals:**
- Implement backend persistence/approval flow for subscriptions.
- Add new DB schema objects (tables/migrations/functions) for membership requests.
- Redesign portal shell or introduce new design system primitives.
- Replace all legacy portal routes in one step if compatibility shims are needed during migration.

## Decisions

### 1) Tenant-first route topology in Delivery layer

**Decision:** Place role groups under `src/app/portal/orgs/[tenant_id]/` and keep `src/app/portal/layout.tsx`, `loading.tsx`, `page.tsx`, and `bootstrap/route.ts` as portal-shell artifacts.

**Rationale:**
- Makes tenant context explicit in URL and route resolution.
- Enables server-side guard checks at tenant boundary.
- Preserves shared shell behavior while relocating role pages safely.

**Alternatives considered:**
- Keep role groups at `/portal/(role)` and pass `tenant_id` by query/state. Rejected: weaker URL semantics, harder deep-linking and guard guarantees.
- Create a second shell under `/portal/orgs`. Rejected: duplicate shell concerns and higher maintenance.

### 2) Membership + role gating at route entry (server-first)

**Decision:** Enforce access checks for `/portal/orgs/[tenant_id]/*` using service-layer methods consumed by route-level server logic (page/layout/guard utilities), redirecting unauthorized users to `/portal/orgs`.

**Rationale:**
- Server-side checks prevent accidental data leakage from client-only gating.
- Consolidates authorization logic for reuse across tenant-scoped pages.

**Alternatives considered:**
- Client-only check in hooks. Rejected: security and flicker risks.
- Middleware-only universal gate. Rejected: less granular control and potential coupling to path parsing complexity.

### 3) Keep organizations index open to authenticated users

**Decision:** `/portal/orgs` requires authentication only, not membership.

**Rationale:**
- Matches requirement for organization discovery regardless of current memberships.
- Supports future subscription/access request flows.

**Alternatives considered:**
- Restrict list to user memberships only. Rejected: conflicts with requirement and blocks discovery.

### 4) Reuse `OrganizationIdentityCard` with CTA state modeling

**Decision:** Keep card component as the canonical organization card and extend its props/contracts to represent access state (`canAccess`, `role`, `showSubscribe`).

**Rationale:**
- Avoids duplicate card implementations.
- Centralizes display and CTA behavior for list consistency.

**Alternatives considered:**
- Build a separate list-specific card. Rejected: UI duplication and drift risk.

### 5) Service contract split for list and access decisions

**Decision:** Implement/extend service methods:
- `listVisibleTenantsForPortal()`
- `listUserTenantMemberships(userId)`
- `canUserAccessTenant(userId, tenantId)`

and map them through `useOrganizationView` (and optional focused access hook only if needed).

**Rationale:**
- Isolates infrastructure concerns from UI and delivery.
- Makes testing easier at service and hook boundaries.

**Alternatives considered:**
- Single monolithic method returning everything. Rejected: over-coupled API and weaker reuse.

### 6) Role navigation derives from tenant-scoped resolved role

**Decision:** Resolve role in tenant context and pass it to portal navigation/menu composition so shown entries reflect tenant membership role.

**Rationale:**
- Aligns menu visibility with actual authorized tenant context.
- Avoids global profile role assumptions that may differ per tenant.

**Alternatives considered:**
- Continue using global role at session/profile level. Rejected: incorrect for multi-tenant scenarios.

## Risks / Trade-offs

- **[Risk] Route migration may break existing deep links under `/portal/(role)`** → **Mitigation:** keep bootstrap/link compatibility and add redirects while updating internal links.
- **[Risk] Authorization logic duplicated across tenant pages** → **Mitigation:** centralize guard utility/service call path and reuse it in tenant-scoped entry points.
- **[Risk] N+1 queries for membership resolution on org list** → **Mitigation:** fetch memberships once per user and map in memory against tenant list.
- **[Risk] Inconsistent CTA behavior for partially-loaded states** → **Mitigation:** define explicit view-model states in types and render deterministic fallback labels/actions.
- **[Risk] Ambiguity in “public tenant” exclusion identifier** → **Mitigation:** codify exclusion with existing canonical tenant rule used in seed/domain contract.

## Migration Plan

1. Create tenant-scoped route scaffolding under `src/app/portal/orgs/[tenant_id]/...` and add `/portal/orgs` page.
2. Extend service and type contracts for visible tenant list + access decisions.
3. Update `useOrganizationView` to consume new contracts and provide CTA-ready view models.
4. Extend `OrganizationIdentityCard` props for access/subscribe states without breaking existing usages.
5. Wire tenant entry guard and role-resolved menu composition in tenant-scoped routes.
6. Update bootstrap and internal portal links to point to `/portal/orgs` and tenant-scoped destinations.
7. Validate member/non-member navigation scenarios and unauthorized redirects.
8. Rollback strategy: if regressions appear, temporarily route users to existing portal root while keeping new scaffolding behind safe entry paths.

## Open Questions

- Should unauthorized tenant redirects include a query/message token (e.g., `?reason=unauthorized`) for UX feedback, or remain silent?
- Is the canonical “public tenant” exclusion based on `nombre`, `slug`, or fixed `id` in current data contracts?
- Should legacy `/portal/(role)` paths be kept as explicit redirects for one release cycle, or removed immediately after migration?
- For `Suscribirse`, should placeholder feedback be toast-only or inline alert for accessibility consistency?
