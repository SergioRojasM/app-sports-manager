## Why

`tenants.requiere_perfil_completo` (US-0047) is only enforced when a user submits an access request. Members who join through an invitation or an administrator-provisioned account (US-0114) get an `activo` membership with an empty profile and enter the organization unchecked, as do members approved before the flag was enabled. US-0136 (`projectspec/userstory/us0136-enforce-complete-profile-on-entry.md`) moves the requirement to every entry into the organization.

## What Changes

- **Page** — new server route `/portal/completar-perfil/[tenant_id]` (outside `orgs/[tenant_id]`, same pattern as `/portal/activar-cuenta/[tenant_id]`) that guards session, membership, pending activation and "nothing to complete", then renders the completion screen.
- **Layout** — `src/app/portal/orgs/[tenant_id]/layout.tsx` redirects a member with an incomplete profile to the new route, after the existing session / pending-activation / membership checks. Applies to all roles.
- **Component** — new `CompletarPerfilPage` showing only the missing fields through the existing `PerfilPersonalForm` (`visibleFields`). Design: reuse the `ActivarCuentaPage` layout (`GritPageHeader` + centered glass card), confirmed by the user; no new design asset.
- **Component** — `EditTenantForm` toggle label and help text now state that the flag governs entering the organization, not only requesting access. `PortalBreadcrumb` gets a `completar-perfil` label.
- **Hook** — `usePerfil` accepts an optional `requiredFields` option that makes those fields mandatory on `submit()`. Without it the hook behaves as today.
- **Service** — `tenantService.canUserAccessTenant` also reports whether the tenant requires a complete profile and which fields the caller is missing. `allowed` / `role` are unaffected.
- **Service** — Guard 3 of `solicitudesService.createSolicitud` reuses the shared rule (no behaviour change).
- **Lib** — new `src/lib/portal/perfil-completo.ts`, the single definition of "complete profile" (the eight `usuarios` fields from US-0047).
- **Types** — `TenantAccessDecision` gains `profileIncomplete` and `profileMissingFields`.
- No database migration, no new RPC or API route.

## Non-goals

- Database-level enforcement: RLS is unchanged; this is a server-side navigation gate, like `pendiente_activacion`.
- Making the list of required fields configurable per tenant.
- Blocking invitation acceptance or account activation themselves; the data is requested on entry.
- Notifying existing members when an administrator enables the flag.
- Adding `peso_kg` / `altura_cm` to the rule.

## Capabilities

### New Capabilities
- `tenant-profile-completion-gate`: enforcement of the tenant's complete-profile requirement on every entry to the organization, the shared completeness rule, the access-decision contract and the completion screen.

### Modified Capabilities
- `organization-view`: the `requiere_perfil_completo` toggle requirement changes its label and help text to describe entry enforcement.

## Impact

### Files to create

| Area | File |
|------|------|
| Page | `src/app/portal/completar-perfil/[tenant_id]/page.tsx` |
| Component | `src/components/portal/perfil/CompletarPerfilPage.tsx` |
| Lib | `src/lib/portal/perfil-completo.ts` |

### Files to modify

| Area | File | Change |
|------|------|--------|
| Layout | `src/app/portal/orgs/[tenant_id]/layout.tsx` | Redirect when `decision.profileIncomplete` |
| Component | `src/components/portal/perfil/index.ts` | Export `CompletarPerfilPage` |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | Toggle label + help text |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | `completar-perfil` label |
| Hook | `src/hooks/portal/perfil/usePerfil.ts` | Optional `requiredFields` validation |
| Service | `src/services/supabase/portal/tenant.service.ts` | Extend `canUserAccessTenant` |
| Service | `src/services/supabase/portal/solicitudes.service.ts` | Guard 3 uses the shared rule |
| Types | `src/types/portal/tenant.types.ts` | Extend `TenantAccessDecision` |
| Docs | `projectspec/03-project-structure.md` | New route, component, lib, gate |

### Behavioural impact

- Members of tenants with the flag enabled and an incomplete profile lose access to every `/portal/orgs/{tenant_id}/…` route until they complete it, including administrators and coaches.
- Up to two extra single-row reads per tenant-route request, deduplicated by `getCachedTenantAccess`.
- Client consumers of `canUserAccessTenant` (`useTenantAccess`, `usePlanesPublicos`) keep working unchanged.

### Implementation plan

1. Create the working branch.
2. Types: extend `TenantAccessDecision`.
3. Lib: add `perfil-completo.ts`.
4. Service: extend `canUserAccessTenant`; refactor Guard 3 in `solicitudes.service.ts`.
5. Hook: add `requiredFields` to `usePerfil`.
6. Component: build `CompletarPerfilPage`; update `EditTenantForm` copy and the breadcrumb label.
7. Page / layout: add the completion route and the layout redirect.
8. Verify RLS reads (own `usuarios` row; member read of a private tenant's row).
9. Manual test of every onboarding path and role; type-check and lint.
10. Update `projectspec/03-project-structure.md`; write commit message and PR description.
