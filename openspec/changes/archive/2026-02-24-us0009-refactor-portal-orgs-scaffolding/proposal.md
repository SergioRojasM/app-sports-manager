## Why

The current portal route scaffold is not tenant-scoped, which makes multi-organization navigation and authorization harder to scale and reason about. We need to reorganize `/portal` around `/portal/orgs/[tenant_id]` now to support tenant-first access control, role-aware navigation, and organization discovery for all authenticated users.

## What Changes

- Restructure portal routes so role/shared areas live under `src/app/portal/orgs/[tenant_id]/...` while keeping the top-level portal shell and bootstrap flow.
- Add `/portal/orgs` as an authenticated organizations index that lists all tenants except the `public` tenant.
- Reuse `OrganizationIdentityCard` for each organization card and add a placeholder `Suscribirse` UI action for non-members.
- Enforce tenant entry gating by membership + role, redirecting non-members back to `/portal/orgs`.
- Resolve tenant role on entry and adapt portal menu/navigation for the resolved role context.
- Preserve architecture boundaries from `projectspec/03-project-structure.md` (page → component → hook → service → types; no direct Supabase in pages/components).

## Capabilities

### New Capabilities
- `portal-orgs-scaffolding`: Tenant-scoped portal organization routing and `/portal/orgs` listing experience with membership-gated tenant entry and placeholder subscribe action.

### Modified Capabilities
- `organization-view`: Expand requirements from single-organization view to organization listing and card CTA states (`Ingresar`/`Suscribirse`) with membership-aware behavior.
- `portal-role-navigation`: Update role-navigation requirements to support tenant-scoped role resolution under `/portal/orgs/[tenant_id]` and menu adaptation per tenant role.

## Impact

- **Affected code areas**:
  - Delivery: `src/app/portal/orgs/page.tsx`, `src/app/portal/orgs/[tenant_id]/**`, `src/app/portal/bootstrap/route.ts`, `src/app/portal/page.tsx`.
  - Presentation: `src/components/portal/organization-view/OrganizationIdentityCard.tsx` (+ optional listing composition component).
  - Application: `src/hooks/portal/organization-view/useOrganizationView.ts` (+ optional tenant-access hook).
  - Infrastructure: `src/services/supabase/portal/organization-view.service.ts` and related portal service exports.
  - Domain: `src/types/portal/organization-view.types.ts` and shared portal role/navigation contracts.
- **APIs/systems**: Supabase read paths for tenants, memberships, and roles are reused/extended; no new external API endpoint.
- **Dependencies**: No new runtime dependency expected; relies on existing Supabase and Next.js App Router patterns.
- **Docs impacted**: `README.md` and `projectspec/03-project-structure.md` route map updates after implementation.

## Non-goals

- Implementing persistent subscription requests (`Suscribirse`) in database/API.
- Creating new DB tables, migrations, or backend endpoints for access requests.
- Redesigning the portal visual system beyond required scaffolding/listing/gating UX.

## Files to Create or Modify

- `src/app/portal/orgs/page.tsx` (new)
- `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx` (new)
- `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` (move/create)
- `src/app/portal/orgs/[tenant_id]/(atleta)/entrenamientos-disponibles/page.tsx` (new)
- `src/app/portal/orgs/[tenant_id]/(entrenador)/atletas/page.tsx` (new)
- `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` (new)
- `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx` (new)
- `src/app/portal/bootstrap/route.ts` (adjust next handling if needed)
- `src/app/portal/page.tsx` (optional link/entry update)
- `src/components/portal/organization-view/OrganizationIdentityCard.tsx` (reuse/CTA extension)
- `src/hooks/portal/organization-view/useOrganizationView.ts` (listing + access state)
- `src/services/supabase/portal/organization-view.service.ts` (tenant list + access checks)
- `src/types/portal/organization-view.types.ts` (list item/access decision contracts)
- `src/types/portal.types.ts` (if shared role/navigation types change)
- `README.md`, `projectspec/03-project-structure.md` (post-implementation docs)

## Step-by-step Implementation Plan

1. Confirm and align UI references/design inputs for `/portal/orgs` and tenant-scoped role pages.
2. **Page**: Create tenant-scoped route scaffolding under `src/app/portal/orgs/[tenant_id]/...` and add `/portal/orgs` index page.
3. **Component**: Reuse/extend `OrganizationIdentityCard` to support access and subscribe CTA states.
4. **Hook**: Extend organization-view hook(s) to map tenant list + membership/access decision into UI state.
5. **Service**: Implement Supabase service queries for visible tenants (excluding `public`) and membership+role gating.
6. **Types**: Update feature/shared portal contracts for tenant card items, access decisions, and role-scoped navigation.
7. Wire tenant-entry guard and role-resolved menu behavior for `/portal/orgs/[tenant_id]/*`.
8. Validate behavior (auth access, redirects, CTA states) and update docs.
