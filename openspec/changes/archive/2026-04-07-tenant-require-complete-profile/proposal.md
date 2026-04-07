## Why

Tenant administrators have no way to enforce that users fill in their personal profile before requesting team access, resulting in access requests from anonymous or unidentifiable users. Adding per-tenant control over this requirement ensures admins can gate entry based on data quality.

## What Changes

- Add `requiere_perfil_completo boolean not null default false` column to `public.tenants`
- Extend `solicitudesService.createSolicitud` with a Guard 3 that queries the tenant flag and, when `true`, validates that the requesting user's `usuarios` row has all eight profile fields populated (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`)
- Add `'incomplete_profile'` to `SolicitudesServiceError` error code union
- Extend `TenantEditFormValues` and `TenantEditPayload` with `requiere_perfil_completo`
- Update `tenant.service.ts` mapper and select query to include the new column
- Update `useEditTenant.ts` to default, parse, and serialize the boolean toggle
- Add "Requiere perfil completo" toggle to `EditTenantDrawer.tsx` in the access-settings section
- Add `isProfileIncomplete` state to `useSolicitudRequest.ts`; propagate to `SolicitarAccesoButton.tsx` as a disabled button + persistent informational banner linking to `/portal/perfil`

## Capabilities

### New Capabilities

None — this change extends existing capabilities only.

### Modified Capabilities

- `access-request-management`: New Guard 3 in `createSolicitud` validates profile completeness when `requiere_perfil_completo = true` on the target tenant. New `'incomplete_profile'` error code exposed to the UI. `useSolicitudRequest` and `SolicitarAccesoButton` gain a new render state for this condition.
- `organization-view`: Tenant admin edit form (`EditTenantDrawer`) gains a boolean toggle field (`requiere_perfil_completo`) in the access-settings section. `TenantEditFormValues`, `TenantEditPayload`, and the service mapper are updated accordingly.

## Impact

- **Migration**: `supabase/migrations/20260330000100_tenant_requiere_perfil_completo.sql` — one new boolean column, no new tables or RLS policies needed
- **Types**: `src/types/portal/solicitudes.types.ts`, `src/types/portal/tenant.types.ts`
- **Services**: `src/services/supabase/portal/solicitudes.service.ts`, `src/services/supabase/portal/tenant.service.ts`
- **Hooks**: `src/hooks/portal/tenant/useEditTenant.ts`, `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`
- **Components**: `src/components/portal/tenant/EditTenantDrawer.tsx`, `src/components/portal/tenant/SolicitarAccesoButton.tsx`
- **No new routes, no new pages, no breaking changes to existing API contracts**

## Non-goals

- Defining which specific fields constitute a "complete profile" at a platform level — the eight fields are fixed per this story and not configurable per tenant
- Enforcing profile completeness for any flow other than access requests (e.g., booking, subscriptions)
- Retroactively blocking existing team members whose profiles are incomplete
