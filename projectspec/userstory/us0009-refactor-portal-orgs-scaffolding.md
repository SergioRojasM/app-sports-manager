# User Story: Restructure Portal Organizations Scaffolding (`restructure_portal_orgs_scaffolding`)

## ID
US-0009

## Name
Restructure portal routes under organizations and add tenant listing with gated access + subscribe action

### As a...
As an authenticated platform user with possible memberships in multiple organizations (tenants)

### I want...
I want the portal route scaffolding to be organized by tenant under `/portal/orgs`, and I want all authenticated users to see available organizations while tenant entry enforces role-based access

### So that...
Navigation is scalable for multi-tenant access, role pages are tenant-scoped, and users can discover organizations regardless of membership while enforcing authorization when entering a tenant.

## Description
Implement a route and UX restructuring for the portal bounded context so all role areas become tenant-scoped under `src/app/portal/orgs/[tenant_id]`.

Target route structure:

```text
src/app/portal
│	orgs
│	├── [tenant_id]
│	│	└── (administrador)
│	│	│   ├── gestion-escenarios
│	│	│   │   └── page.tsx
│	│	│   └── gestion-organizacion
│	│	│       └── page.tsx
│	│	├── (atleta)
│	│	│   └── entrenamientos-disponibles
│	│	│       └── page.tsx
│	│	├── (entrenador)
│	│	│   └── atletas
│	│	│       └── page.tsx
│	│	├── (shared)
│	│	    ├── gestion-entrenamientos
│	│	    │   └── page.tsx
│	│	    └── perfil
│	│	        └── page.tsx
│	└── page.tsx
├── bootstrap
│   └── route.ts
├── layout.tsx
├── loading.tsx
└── page.tsx
```

Additionally:
1. `GET /portal/orgs` must list all current tenants except the `public` tenant.
2. The list must reuse `OrganizationIdentityCard.tsx` for each tenant card.
3. Any authenticated user can view `/portal/orgs`, independent of profile or tenant membership.
4. User can enter a tenant only if they have a membership + role in that tenant.
5. Once the user enters a tenant, role must be validated and portal menu must adapt to that resolved role.
6. Add a `Suscribirse` (Subscribe) button in each card for future access request flow; for this story only UI action is required (no request persistence yet).

The implementation must respect `projectspec/03-project-structure.md` (Delivery → Presentation → Application → Infrastructure → Domain) and avoid direct Supabase calls in pages/components.

## Functional Scope

### 1) Tenant-scoped portal scaffolding
1. Move/create role route groups under `src/app/portal/orgs/[tenant_id]/`:
   - `(administrador)/gestion-escenarios/page.tsx`
   - `(administrador)/gestion-organizacion/page.tsx`
   - `(atleta)/entrenamientos-disponibles/page.tsx`
   - `(entrenador)/atletas/page.tsx`
   - `(shared)/gestion-entrenamientos/page.tsx`
   - `(shared)/perfil/page.tsx`
2. Keep `src/app/portal/layout.tsx`, `src/app/portal/loading.tsx`, `src/app/portal/page.tsx`, and `src/app/portal/bootstrap/route.ts` as top-level portal shell/bootstrap artifacts.
3. Add `src/app/portal/orgs/page.tsx` as organizations index route.

### 2) Organizations index behavior (`/portal/orgs`)
4. Query and render all tenants except `public`.
5. Render one `OrganizationIdentityCard` per tenant; no duplicated custom card implementation.
6. Access to `/portal/orgs` is allowed for all authenticated users, without requiring membership in a listed tenant.
7. Each card must expose:
   - Organization identity information (as already supported by card props)
   - Access CTA when user is member with role
   - `Suscribirse` button for future membership request

### 3) Access gating by membership+role
7. Allow navigation into `/portal/orgs/[tenant_id]/...` only if current user has membership row in `miembros_tenant` for that `tenant_id` and a valid role assignment.
8. For non-member users, deny tenant entry with safe UX behavior (redirect to `/portal/orgs` and optional message state) without exposing tenant-scoped data.
9. On tenant entry, resolve role from membership context and adjust portal menu/routes according to that role.

### 4) Subscribe button (future-ready)
10. Add a visible `Suscribirse` action on tenant cards for users who are not members.
11. For this story, action can be non-persistent (placeholder):
   - Keep UX deterministic (button visible and clickable)
   - Provide clear “not available yet” feedback (e.g., toast/message)
12. Do not create DB tables or backend endpoint for subscription requests in this story.

## Data / Fields to Update

### Existing data sources (read-only in this story)
- `public.tenants`
  - `id`
  - `nombre`
  - `slug` (if available)
  - `descripcion` / display metadata used by cards
- `public.miembros_tenant`
  - `tenant_id`
  - `usuario_id`
  - `rol_id`
- `public.roles`
  - role identifier/name used to map route group visibility

### Exclusion rule
- Exclude tenant where `nombre = 'public'` (or equivalent canonical public identifier currently used by seed/domain contract).

## Endpoints and URLs

### App routes
- `GET /portal`
  - Existing portal landing behavior remains.
- `GET /portal/orgs`
  - New organization listing page visible to all authenticated users.
- `GET /portal/orgs/[tenant_id]/*`
  - Tenant-scoped role/shared pages under route groups listed above; requires membership + role validation.
- `GET /portal/bootstrap?next=<path>`
  - Must remain compatible with tenant-scoped destination paths.

### Service/query contracts (Supabase SDK)
No new external HTTP endpoint required. Implement/update service layer methods:
1. `listVisibleTenantsForPortal()`
   - Returns all tenants except public tenant.
2. `listUserTenantMemberships(usuario_id)`
   - Returns user memberships with resolved role for gating.
3. `canUserAccessTenant(usuario_id, tenant_id)`
   - Returns boolean + role context.

## Authorization Rules

| Route | Authentication Required | Membership Required | Role Validation | Expected Behavior |
|-------|--------------------------|---------------------|-----------------|------------------|
| `/portal` | Yes | No | No | Show portal landing/welcome page. |
| `/portal/orgs` | Yes | No | No | Show all tenants except `public`. |
| `/portal/orgs/[tenant_id]/*` | Yes | Yes (for `tenant_id`) | Yes (resolve role from membership) | Allow access only when membership + role exist; otherwise redirect to `/portal/orgs`. |
| Tenant-scoped menu (inside `/portal/orgs/[tenant_id]/*`) | Yes | Yes | Yes | Build visible menu entries from resolved tenant role (`administrador`, `entrenador`, `usuario`). |
| `Suscribirse` action from `/portal/orgs` | Yes | No | No | Always available for non-members as placeholder UI; no persistence/backend request in this story. |

## Files to Modify (expected)

### User story artifact
1. `projectspec/userstory/us0009-restructure-portal-orgs-scaffolding.md`

### Delivery (`src/app`)
2. `src/app/portal/orgs/page.tsx` (new)
3. `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx` (new)
4. `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` (move/create)
5. `src/app/portal/orgs/[tenant_id]/(atleta)/entrenamientos-disponibles/page.tsx` (new)
6. `src/app/portal/orgs/[tenant_id]/(entrenador)/atletas/page.tsx` (new)
7. `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` (new)
8. `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx` (new)
9. `src/app/portal/bootstrap/route.ts` (adjust `next` handling for `/portal/orgs/...` if required)
10. `src/app/portal/page.tsx` (optional link update toward `/portal/orgs`)

### Presentation (`src/components`)
11. `src/components/portal/organization-view/OrganizationIdentityCard.tsx` (reuse + add subscribe/access CTA slots/props if needed)
12. Optional container/list component in `src/components/portal/organization-view/` for organizations index composition.

### Application (`src/hooks`)
13. `src/hooks/portal/organization-view/useOrganizationView.ts` (extend to support tenant list + membership-gated actions)
14. Optional new hook: `src/hooks/portal/organization-view/useTenantAccess.ts` (if separation improves clarity without overengineering)

### Infrastructure (`src/services`)
15. `src/services/supabase/portal/organization-view.service.ts` (tenant listing excluding public + membership gating queries)
16. `src/services/supabase/portal/index.ts` and/or `src/services/supabase/portal.ts` (if shared portal profile contracts need alignment)

### Domain (`src/types`)
17. `src/types/portal/organization-view.types.ts` (tenant card/list + access state + subscribe action types)
18. `src/types/portal.types.ts` (if global portal navigation types need update)

### Documentation
19. `README.md` (brief update for new portal route map and membership-gated org access)
20. `projectspec/03-project-structure.md` (update route tree section if outdated after implementation)

## Suggested Contracts
- `PortalOrganizationListItem`
  - `tenantId: string`
  - `name: string`
  - `description?: string`
  - `isPublic: boolean`
  - `userMembershipRole?: 'administrador' | 'entrenador' | 'usuario'`
  - `canAccess: boolean`
- `TenantAccessDecision`
  - `tenantId: string`
  - `allowed: boolean`
  - `role?: 'administrador' | 'entrenador' | 'usuario'`

## Implementation Steps
1. Create/move portal role route files into `orgs/[tenant_id]` scaffolding exactly as requested.
2. Add `GET /portal/orgs` page and load tenant list through hook/service.
3. Reuse `OrganizationIdentityCard` for each organization card and wire CTA variants (`Ingresar` vs `Suscribirse`).
4. Implement membership + role resolver in service layer and expose it through hooks.
5. Add tenant-entry guard for tenant-scoped pages/routes.
6. Keep subscribe behavior as UI placeholder only; do not persist requests.
7. Verify bootstrap and internal links route correctly to tenant-scoped URLs.
8. Update docs (README + project structure) to reflect new scaffold.

## Definition of Done
1. Route structure under `src/app/portal/orgs/[tenant_id]` matches requested scaffolding.
2. `/portal/orgs` exists, is accessible to all authenticated users, and shows all tenants except `public`.
3. `OrganizationIdentityCard` is reused for every organization listed.
4. User can enter tenant pages only when membership + role exists.
5. Non-member users cannot access tenant-scoped routes and are safely redirected.
6. On tenant entry, role is validated and portal menu is adjusted according to role.
7. `Suscribirse` button exists in UI for future flow, with clear non-persistent feedback.
8. No direct Supabase calls from pages/components; architecture layers are respected.
9. TypeScript, lint, and relevant route smoke checks pass for touched files.

## Testing and Validation

### Manual QA checklist
- Login and open `/portal/orgs`.
- Confirm tenant list excludes `public`.
- Confirm every tenant is rendered using `OrganizationIdentityCard` visual structure.
- As member user: click `Ingresar` and verify access to `/portal/orgs/[tenant_id]/...`.
- As non-member user: attempt direct URL to a tenant route and verify redirect/deny behavior.
- Click `Suscribirse` and verify placeholder feedback is shown.

### Unit/Integration guidance
If test harness exists, add tests for:
1. Service filter excludes public tenant.
2. Membership access decision for member vs non-member.
3. Hook mapping for card CTA state.
4. Route guard behavior on unauthorized tenant access.

If no harness exists, document these tests as pending and keep scope limited.

## Non-Functional Requirements

### Security
- Enforce membership checks server-side in route resolution path (do not rely only on client state).
- Preserve RLS assumptions in Supabase queries; no data leakage for unauthorized tenant access.
- Validate `tenant_id` param inputs and avoid exposing detailed authorization internals in error messages.

### Performance
- Minimize queries by batching tenant + membership fetches where possible.
- Avoid N+1 per-card role lookup in `/portal/orgs`.
- Keep organizations page interactive latency acceptable for moderate tenant counts.

### Maintainability
- Keep tenant access logic centralized in service/hook layer.
- Reuse existing organization components and contracts rather than duplicating UI.
- Keep route naming and feature slices aligned with `projectspec/03-project-structure.md`.

### Accessibility
- Ensure card CTAs (`Ingresar`, `Suscribirse`) are keyboard reachable and have clear labels.
- Preserve semantic headings and list structure on `/portal/orgs` page.

## Expected Results
- Portal is reorganized into tenant-scoped route scaffolding under `/portal/orgs/[tenant_id]`.
- All authenticated users can discover organizations in `/portal/orgs` regardless of membership.
- Tenant entry validates membership role and adjusts menu visibility according to the resolved role.
- Non-member users see a future-ready `Suscribirse` action without backend request processing yet.
- Existing portal shell/bootstrap remains functional and compatible with new route paths.
