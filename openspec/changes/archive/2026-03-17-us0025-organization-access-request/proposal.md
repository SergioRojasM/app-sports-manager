## Why

Users who want to join an organization have no way to proactively request access — they see a non-functional "Suscribirse" placeholder. Administrators have no structured workflow to onboard new members. This change replaces the placeholder with a real access-request flow backed by a dedicated database table and a review panel in the team management section.

## What Changes

- **New table** `miembros_tenant_solicitudes` stores access requests with `estado` (`pendiente | aceptada | rechazada`), a unique constraint on `(tenant_id, usuario_id)`, and full RLS policies.
- **New "Solicitar acceso" CTA** on organization cards (`/portal/orgs`): non-members can submit a request; the button becomes "Solicitud enviada" (disabled) once submitted.
- **New "Solicitudes" tab** inside `/portal/orgs/[tenant_id]/gestion-equipo` (admin only): shows a table of pending requests; admin can accept (selects a role → creates `miembros_tenant` record) or reject.
- **Replace** the current non-functional `Suscribirse` placeholder in `TenantDirectoryList` with the functional `SolicitarAccesoButton` component.
- New hexagonal feature slice `gestion-solicitudes` (types → service → hooks → components) nested inside the `gestion-equipo` slice.

## Capabilities

### New Capabilities

- `access-request-management`: End-to-end flow for users to request access to an organization and for admins to accept or reject those requests, including the `miembros_tenant_solicitudes` table, RLS policies, service layer, hooks, and all UI components (request button + admin review tab).

### Modified Capabilities

- `portal-orgs-scaffolding`: The requirement that the `Suscribirse` action is non-persistent (placeholder only) changes — non-members now see "Solicitar acceso" which writes a real record. The `Subscribe action is visible and non-persistent` requirement is superseded by the new request flow.
- `team-management`: The `gestion-equipo` page gains a second tab ("Solicitudes") with a pending-requests table and accept/reject actions. The current requirement scope (member list only) is extended.

## Impact

- **Database**: New migration adding `miembros_tenant_solicitudes` table with indexes on `(tenant_id, estado)` and `(usuario_id, tenant_id)` and RLS policies.
- **New files**: `src/types/portal/solicitudes.types.ts`, `src/services/supabase/portal/solicitudes.service.ts`, `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts`, `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`, `src/components/portal/gestion-equipo/gestion-solicitudes/{SolicitudesTab,SolicitudesTable,AceptarSolicitudModal,SolicitudEstadoBadge}.tsx`, `src/components/portal/tenant/SolicitarAccesoButton.tsx`.
- **Modified files**: `src/components/portal/gestion-equipo/EquipoPage.tsx` (tab bar), `src/components/portal/tenant/TenantDirectoryList.tsx` (replace placeholder CTA), `projectspec/03-project-structure.md` (add new slice).
- **No new HTTP routes**: all data access via Supabase JS SDK from service layer.
- **Membership creation side-effect**: accepting a request inserts into `miembros_tenant`, same table used by all tenant-access guards — no additional gate changes needed.
