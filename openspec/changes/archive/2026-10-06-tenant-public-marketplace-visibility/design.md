## Context

`/portal/orgs` renders `PortalTenantsPage` → `useTenantView({ mode: 'directory' })` → `tenantService.listVisibleTenantsForPortal` + `listUserTenantMemberships` (in parallel) → `mapPortalTenants` → `TenantDirectoryList` → `TenantIdentityCard`. The tenant query has no visibility filter beyond excluding the system tenant named `public`.

Access requests go through `SolicitarAccesoButton` → `useSolicitudRequest` → `solicitudesService.createSolicitud`, which runs three client-side guards and inserts into `miembros_tenant_solicitudes`. The insert policy `solicitudes_insert_own` only checks `usuario_id = auth.uid()`.

`tenants` is readable by every authenticated user (`tenants_select_authenticated using (true)`) and updatable only by tenant administrators (`tenants_update_admin_only`). Many features join `tenants` for name/logo on behalf of non-members.

`TenantIdentityCard` is shared by the directory and by `gestion-organizacion` (`TenantInfoCards`).

Requirements come from US-0133 (`projectspec/userstory/us0133-tenant-public-marketplace-visibility.md`).

## Goals / Non-Goals

**Goals:**
- A per-tenant `publico` flag controlled by the tenant administrator.
- Private organizations are hidden from non-members in the directory and cannot receive new access requests, with database-level enforcement of the latter.
- Members always see their own organizations, flagged with a "Miembro" badge.
- A directory card consistent with the events card.
- Zero behavior change for existing tenants until the flag is turned off.

**Non-Goals:**
- Making the `tenants` row unreadable for non-members.
- Touching events, public plans, invitations or managed provisioning.
- Redesigning the `gestion-organizacion` card.
- Mutating existing requests or blocks when visibility changes.

## Decisions

### Flow (page → component → hook → service → types)

```
/portal/orgs (page)
  └─ PortalTenantsPage ── empty state
       └─ TenantDirectoryList
            └─ TenantDirectoryCard (new) ── chips: Miembro / Privada
                 ├─ useTenantBrandingImages (new, shared with TenantIdentityCard)
                 ├─ primaryAction:  "Ingresar" link | SolicitarAccesoButton
                 └─ secondaryAction: VerPlanesButton
       useTenantView(directory)
         1. tenantService.listUserTenantMemberships(user)
         2. tenantService.listVisibleTenantsForPortal(memberTenantIds)
              tenants WHERE nombre <> 'public' AND (publico OR id IN memberTenantIds)
         3. tenantService.mapPortalTenants → PortalTenantListItem { …, isPublic }

gestion-organizacion → EditTenantDrawer → EditTenantForm (checkbox "publico")
  └─ useEditTenant → tenantService.updateTenant → tenants (RLS: tenants_update_admin_only)

SolicitarAccesoButton → useSolicitudRequest → solicitudesService.createSolicitud
  ├─ guard: tenant.publico = false → SolicitudesServiceError('private_org')
  └─ insert → RLS solicitudes_insert_own (usuario_id = auth.uid() AND tenant is public)
```

### 1. A boolean column on `tenants`, default `true`
`publico boolean not null default true`. Alternative considered: an enum (`publico` / `privado` / `oculto`) for future states — rejected, there is one behavior to switch and the codebase already uses `publico` booleans (`eventos.publico`). Default `true` keeps every existing and new tenant listed, so the migration is behavior-neutral.

### 2. Listing is filtered in the query; `tenants` SELECT RLS is not changed
The directory query adds `publico = true OR id IN (member tenant ids)`. Alternative considered: restrict `tenants_select_authenticated` to public tenants and members. Rejected because non-members legitimately read tenant name/logo through public events, "Mis Suscripciones" (public-plan buyers), "Mis Entradas", pending invitations and form headers; narrowing the policy would break those joins or force a security-definer view for each. The requirement is "not listed and not requestable", which does not need row-level secrecy. This is documented as a known limitation below.

### 3. Memberships are loaded before tenants
The filter needs the user's tenant ids, so `useTenantView` runs the two queries sequentially instead of `Promise.all`. Alternatives: (a) keep parallel and filter in `mapPortalTenants` — sends private organizations to every client; (b) a security-definer RPC returning the list — more database surface for a query the client can already express. One extra round-trip on a small table is acceptable. With no memberships the filter is `.eq('publico', true)`; otherwise `.or('publico.eq.true,id.in.(…)')`. The ids are UUIDs read from the user's own `miembros_tenant` rows, not user input.

### 4. Request blocking is enforced by RLS, mirrored in the service
`solicitudes_insert_own` gets `and exists (select 1 from public.tenants t where t.id = tenant_id and t.publico)`. The subquery runs under the caller's rights and `tenants` is readable to `authenticated`, so no helper function is needed. The service adds a guard (reusing the existing tenant read, selecting `requiere_perfil_completo, publico`) only to return a specific message (`private_org`) instead of the generic insert failure; it runs before the profile-completeness check so a user is not told to complete a profile for an organization that will not accept the request. Alternative: a `BEFORE INSERT` trigger raising a custom error — rejected, policy is simpler and consistent with the rest of the table.

### 5. Going private does not touch existing data
Pending requests stay pending; only the INSERT policy changes, so admin SELECT/UPDATE on requests keep working and an accepted user becomes a member (and sees the card again). Alternative: auto-reject pending requests — rejected, it would increment rejection counters and could trigger blocks the administrator did not intend.

### 6. New `TenantDirectoryCard` instead of restyling `TenantIdentityCard`
`TenantIdentityCard` also renders on `gestion-organizacion`, which is out of scope. A separate directory card copies the structure and classes of `EventoPublicoCard` (it does not import it, following the US-0120 precedent of copying rather than coupling feature slices). The card takes `primaryAction` / `secondaryAction` nodes so `TenantDirectoryList` keeps owning the membership logic.

Actions stay stacked and full width, unlike the events card's single-row footer: `SolicitarAccesoButton` expands inline for its confirmation and history states and is reused unchanged.

### 7. Shared image fallback hook
The signed-URL retry on logo/banner load errors moves from `TenantIdentityCard` to `useTenantBrandingImages(identity)` and both cards consume it. Alternative: duplicate the ~45 lines in the new card — rejected, the two would drift.

### 8. Badges
"Miembro" (cyan chip, `verified` icon) for any membership row regardless of role; "Privada" (neutral chip, `lock` icon) when `isPublic` is false, which only members can see. Membership is also signalled by the border, but the text chip is the accessible signal. `isPublic` is added to `PortalTenantListItem` rather than to `TenantIdentityPayload`, which is shared with the tenant view.

## Risks / Trade-offs

- [A non-member can still read a private tenant's row by id through the API, or see its name on a public event] → Accepted and documented; the flag governs listing and requests. Tightening would be a separate change with a security-definer read path.
- [Stale directory page: the card was rendered before the organization went private] → The service guard returns a clear inline message and RLS rejects the insert.
- [`.or()` filter string with many memberships grows the URL] → Memberships per user are few; no mitigation needed now.
- [Extracting the image hook could regress `gestion-organizacion`] → Logic is moved verbatim; the card is checked visually in the manual pass.
- [Sequential queries add one round-trip to the directory] → Both queries are small; no index needed.
- [Recreating `solicitudes_insert_own` leaves a moment without the policy] → Drop and create run in one transaction.

## Migration Plan

1. Add `supabase/migrations/20261010120000_tenants_publico.sql` (column, comment, recreated policy, single transaction).
2. Apply to the **local** Supabase instance only; never push the migration to the remote server from this change.
3. Deploy application code after the column exists (the new selects reference `publico`).
4. Rollback: revert the code, then restore the previous `solicitudes_insert_own` (`with check (usuario_id = auth.uid())`) and `alter table public.tenants drop column publico`. No data backfill is involved in either direction.

## Open Questions

None blocking. The "Privada" chip was added by analogy with the events card's "Solo miembros"; it can be dropped without affecting anything else if not wanted.
