## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/us0025-organization-access-request` from `develop`
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260311000200_miembros_tenant_solicitudes.sql`
- [x] 2.2 Add `miembros_tenant_solicitudes` table DDL with columns: `id`, `tenant_id`, `usuario_id`, `estado` (check constraint: `pendiente|aceptada|rechazada`, default `pendiente`), `mensaje`, `nota_revision`, `rol_solicitado_id`, `revisado_por`, `revisado_at`, `created_at`, `updated_at`; FK constraints to `tenants`, `usuarios` (×2 for `usuario_id` and `revisado_por`); no table-level unique constraint
- [x] 2.3 Add partial unique index `miembros_tenant_solicitudes_pendiente_uk` on `(tenant_id, usuario_id) WHERE estado = 'pendiente'`
- [x] 2.4 Add composite indexes on `(tenant_id, estado)`, `(usuario_id, tenant_id)`, and `(usuario_id, tenant_id, created_at DESC)`
- [x] 2.5 Enable RLS on `miembros_tenant_solicitudes`
- [x] 2.6 Add RLS policy: INSERT — authenticated user may only insert where `usuario_id = auth.uid()`
- [x] 2.7 Add RLS policy: SELECT (own) — user may read rows where `usuario_id = auth.uid()`
- [x] 2.8 Add RLS policy: SELECT (admin) — user with `administrador` membership in that `tenant_id` may read all rows for that tenant
- [x] 2.9 Add RLS policy: UPDATE (admin) — user with `administrador` membership in that `tenant_id` may update `estado`, `revisado_por`, `revisado_at`, `nota_revision`
- [x] 2.10 Run `npx supabase db reset` locally and verify migration applies cleanly

## 3. Domain Types

- [x] 3.1 Create `src/types/portal/solicitudes.types.ts`
- [x] 3.2 Define `SolicitudEstado` type: `'pendiente' | 'aceptada' | 'rechazada'`
- [x] 3.3 Define `SolicitudRow` view-model (id, tenant_id, usuario_id, estado, mensaje, nota_revision, revisado_por, revisado_at, created_at, nombre, apellido, email, foto_url from joined `usuarios`)
- [x] 3.4 Define `CreateSolicitudInput`: `{ tenant_id: string; usuario_id: string; mensaje?: string }`
- [x] 3.5 Define `AceptarSolicitudInput`: `{ solicitud_id: string; tenant_id: string; usuario_id: string; rol_id: string; revisado_por: string }`
- [x] 3.6 Define `RechazarSolicitudInput`: `{ solicitud_id: string; revisado_por: string; nota_revision?: string }`
- [x] 3.7 Define `SolicitudesServiceError` class with typed codes: `'forbidden' | 'duplicate' | 'max_rejections' | 'already_member' | 'unknown'`

## 4. Service Layer

- [x] 4.1 Create `src/services/supabase/portal/solicitudes.service.ts`
- [x] 4.2 Implement `createSolicitud(input: CreateSolicitudInput): Promise<void>` — check for existing `pendiente` row (→ `'duplicate'`); count `rechazada` rows and block at ≥ 3 (→ `'max_rejections'`); otherwise insert new `pendiente` row
- [x] 4.3 Implement `getSolicitudesByTenant(supabase, tenantId, estado?: SolicitudEstado): Promise<SolicitudRow[]>` — query with `usuarios` join, filter by `tenant_id` and optional `estado`, order by `created_at ASC`
- [x] 4.4 Implement `getUserSolicitudesForTenant(supabase, tenantId, userId): Promise<SolicitudRow[]>` — returns last 3 rows for a specific user/tenant ordered by `created_at DESC`, `LIMIT 3`
- [x] 4.5 Implement `aceptarSolicitud(input: AceptarSolicitudInput): Promise<void>` — update solicitud `estado='aceptada'`, `revisado_por`, `revisado_at`; then insert into `miembros_tenant`; catch unique constraint violation on `miembros_tenant` and throw `'already_member'`
- [x] 4.6 Implement `rechazarSolicitud(input: RechazarSolicitudInput): Promise<void>` — update solicitud `estado='rechazada'`, `revisado_por`, `revisado_at`, `nota_revision`

## 5. Application Hooks

- [x] 5.1 Create `src/hooks/portal/gestion-solicitudes/useSolicitudesAdmin.ts`
- [x] 5.2 Implement `useSolicitudesAdmin({ tenantId })` — loads `pendiente` requests via `getSolicitudesByTenant`; exposes `solicitudes`, `loading`, `error`, `pendingCount`, `aceptar(solicitud, rolId)`, `rechazar(solicitud, notaRevision?)`, `refresh()`
- [x] 5.3 Create `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts`
- [x] 5.4 Implement `useSolicitudRequest({ tenantId })` — loads current user's last 3 solicitudes via `getUserSolicitudesForTenant`; exposes `solicitudes`, `loading`, `hasPending`, `rejectionCount`, `isBlocked` (rejectionCount ≥ 3), `submit(mensaje?)`, `submitting`

## 6. Admin Components

- [x] 6.1 Create `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudEstadoBadge.tsx` — renders colour-coded `<span>`: amber for `pendiente`, emerald for `aceptada`, rose for `rechazada`; includes `aria-label`
- [x] 6.2 Create `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTable.tsx` — table with columns: avatar, full name, email, request date, `SolicitudEstadoBadge`, Aceptar / Rechazar action buttons; inline rejection confirmation with optional `nota_revision` text input; reuse pagination pattern from `EquipoTable`
- [x] 6.3 Create `src/components/portal/gestion-equipo/gestion-solicitudes/AceptarSolicitudModal.tsx` — modal that fetches `roles` table via Supabase SDK; renders role `<select>` (required); calls `onConfirm(solicitud, selectedRolId)` on submit; calls `onClose` on cancel
- [x] 6.4 Create `src/components/portal/gestion-equipo/gestion-solicitudes/SolicitudesTab.tsx` — shell that receives `solicitudes`, `loading`, `error`, `aceptar`, `rechazar` as props from `EquipoPage`; renders loading/error/empty states; renders `SolicitudesTable` and conditionally `AceptarSolicitudModal`

## 7. User-Facing Component

- [x] 7.1 Create `src/components/portal/tenant/SolicitarAccesoButton.tsx`
- [x] 7.2 Implement 4 button states using `useSolicitudRequest`: no requests → "Solicitar acceso" (active); pending → "Solicitud en revisión" (disabled); rejected < 3 → "Volver a solicitar" (active); ≥ 3 rejections → "Acceso bloqueado" (disabled)
- [x] 7.3 Implement inline confirmation step before calling `submit()` (e.g., show "¿Confirmar solicitud?" with Confirmar / Cancelar)
- [x] 7.4 Implement collapsible history panel below the CTA — visible when `solicitudes.length > 0`; each row shows `SolicitudEstadoBadge`, `created_at` formatted date, and `nota_revision` when present
- [x] 7.5 Show spinner on the button while `submitting === true`

## 8. Page Integration

- [x] 8.1 Modify `src/components/portal/gestion-equipo/EquipoPage.tsx` — add `useSolicitudesAdmin` import; add local `activeTab: 'equipo' | 'solicitudes'` state (default `'equipo'`); render tab bar with "Equipo" and "Solicitudes" labels; render numeric badge on "Solicitudes" tab when `pendingCount > 0`; conditionally render existing member list (Equipo tab) or `SolicitudesTab` (Solicitudes tab)
- [x] 8.2 Modify `src/components/portal/tenant/TenantDirectoryList.tsx` — replace the non-functional `Suscribirse` `onActionClick` handler with `<SolicitarAccesoButton tenantId={...} />` rendered for cards where `canAccess === false`; remove the `feedback` state and amber toast that belonged to the placeholder

## 9. Documentation Update

- [x] 9.1 Update `projectspec/03-project-structure.md` — add `gestion-solicitudes/` sub-slice under `gestion-equipo` in the components, hooks, and services directory trees; add `solicitudes.types.ts` to the types directory listing

## 10. Commit and Pull Request

- [x] 10.1 Stage all changes and create a commit with message: `feat(us0025): organization access request flow — solicitudes table, service, hooks, admin tab, SolicitarAccesoButton`
- [x] 10.2 Push branch `feat/us0025-organization-access-request` to origin
- [x] 10.3 Open a Pull Request to `develop` with description:
  - **Summary**: Implements the organization access request flow (US0025). Users can request access to an organization from the orgs discovery page. Admins can accept (with role assignment) or reject requests from a new "Solicitudes" tab in Gestión Equipo.
  - **DB**: New `miembros_tenant_solicitudes` table with partial unique index and RLS.
  - **New files**: types, service, 2 hooks, 5 components (SolicitarAccesoButton + 4 admin components).
  - **Modified files**: `EquipoPage.tsx` (tab bar), `TenantDirectoryList.tsx` (replace placeholder CTA), `projectspec/03-project-structure.md`.
  - **Testing**: Verify end-to-end — submit request → admin accepts/rejects → membership created or blocked CTA shown.
