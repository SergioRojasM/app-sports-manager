## Why

Every organization is listed in "Organizaciones disponibles" (`/portal/orgs`) and any authenticated user can request access to any of them; a tenant administrator has no way to keep the organization out of the marketplace and admit members only by invitation. The directory card also looks unlike the rest of the discovery UI (the events card) and does not tell a user at a glance which organizations they already belong to.

Source: `projectspec/userstory/us0133-tenant-public-marketplace-visibility.md` (US-0133).

## What Changes

- New column `tenants.publico boolean not null default true`. Existing tenants stay public, so nothing changes until an administrator turns it off.
- The organization edit form gains an "Organización pública" checkbox (with helper text and a notice while unchecked), saved with the rest of the form.
- "Organizaciones disponibles" lists public organizations plus the organizations where the user has a membership. Private organizations are hidden from non-members. A new empty state covers the case where nothing is listed.
- Access requests to a private organization are rejected: in `solicitudesService.createSolicitud` (new error code `private_org`) and in the database (`solicitudes_insert_own` RLS policy requires a public tenant).
- New directory card `TenantDirectoryCard`, modeled on `EventoPublicoCard`: banner on top with overlay chips, italic title, clamped description, Spanish founding date, actions pinned to the bottom.
- Membership badge: the card of every organization the user belongs to shows a "Miembro" chip and a highlighted border; members of a private organization also see a "Privada" chip.
- The logo/banner signed-URL fallback is extracted from `TenantIdentityCard` into a shared hook so both cards use it.

No breaking changes: defaults preserve today's behavior.

## Non-goals

- Restricting read access to the `tenants` row. `tenants_select_authenticated` stays `using (true)`: the organization name and logo are joined by public events, "Mis Suscripciones", "Mis Entradas", pending invitations and form headers. Private means "not listed and not requestable", not confidential.
- Changing public events (`eventos.publico`) or public plans (`planes.es_publico`) of a private organization.
- Changing invitations or managed provisioning (US-0114); they remain the way to add members to a private organization.
- Altering existing requests, blocks or rejection counters when an organization becomes private.
- Redesigning `TenantIdentityCard` on `gestion-organizacion`, or adding a visibility badge there.
- Showing the member's role on the badge.

## Capabilities

### New Capabilities
- `tenant-marketplace-visibility`: the `tenants.publico` flag, the administrator control to change it, how it filters the organizations directory, how it blocks access requests at service level, and the directory card with its "Miembro" / "Privada" badges.

### Modified Capabilities
- `portal-orgs-scaffolding`: the organizations index no longer lists all tenants; it lists public tenants plus the user's own, still excluding the system `public` tenant.
- `access-request-management`: the INSERT RLS policy on `miembros_tenant_solicitudes` additionally requires the target tenant to be public.

## Impact

Design reference for the new component: `src/components/portal/eventos/EventoPublicoCard.tsx` (the user asked for the card to resemble the events card); layout and classes are specified in US-0133.

### Files to create or modify (page → component → hook → service → types)

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/page.tsx` | No code change (renders `PortalTenantsPage`) |
| Component | `src/components/portal/PortalTenantsPage.tsx` | Empty state when no organization is listed |
| Component | `src/components/portal/tenant/TenantDirectoryCard.tsx` | **New** directory card with "Miembro" / "Privada" chips |
| Component | `src/components/portal/tenant/TenantDirectoryList.tsx` | Render `TenantDirectoryCard`; pass `isMember`, `isPublic` and actions |
| Component | `src/components/portal/tenant/TenantIdentityCard.tsx` | Use `useTenantBrandingImages`; no visual change |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | "Organización pública" checkbox, helper text, private-state notice |
| Hook | `src/hooks/portal/tenant/useTenantBrandingImages.ts` | **New**: logo/banner signed-URL fallback |
| Hook | `src/hooks/portal/tenant/useTenantView.ts` | Directory mode: memberships first, then filtered tenant list |
| Hook | `src/hooks/portal/tenant/useEditTenant.ts` | `publico` in `EMPTY_VALUES` and `toPayload` |
| Service | `src/services/supabase/portal/tenant.service.ts` | `TenantRow.publico`, selects, form mapper, `listVisibleTenantsForPortal(supabase, memberTenantIds)`, `isPublic` in `mapPortalTenants` |
| Service | `src/services/supabase/portal/solicitudes.service.ts` | Private-organization guard in `createSolicitud` |
| Types | `src/types/portal/tenant.types.ts` | `publico` in edit types; `isPublic` in `PortalTenantListItem` |
| Types | `src/types/portal/solicitudes.types.ts` | Error code `private_org` |
| Migration | `supabase/migrations/20261010120000_tenants_publico.sql` | **New**: column + `solicitudes_insert_own` policy |
| Docs | `projectspec/03-project-structure.md` | Document the new card, hook and US-0133 notes |

### Systems
- Database: one additive column and one recreated RLS policy; local Supabase only.
- No new dependencies, routes, RPCs or environment variables.

### Implementation plan
1. Create the working branch and confirm it is not `main`, `master` or `develop`.
2. Write and apply the migration locally.
3. Types: `tenant.types.ts`, `solicitudes.types.ts`.
4. Services: `tenant.service.ts`, `solicitudes.service.ts`.
5. Hooks: `useTenantBrandingImages` (new), `useTenantView`, `useEditTenant`.
6. Components: `TenantIdentityCard` (hook swap), `TenantDirectoryCard` (new), `TenantDirectoryList`, `EditTenantForm`, `PortalTenantsPage`.
7. Verify RLS and run the manual scenarios of US-0133.
8. Update `projectspec/03-project-structure.md`.
9. Type-check and lint, then prepare the commit message and pull request description.
