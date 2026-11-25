# Proposal: Admin Create and Invite Tenant Members

Source: [US-0114](../../../projectspec/userstory/us0114-admin-create-and-invite-tenant-members.md)

## Why

Today a tenant `administrador` can only manage people who have **already** self-registered and submitted an access request through `miembros_tenant_solicitudes`. There is no way to bring a new person into an organization proactively: browser-side code cannot call `auth.admin.*`, and `public.usuarios` is not directly insertable. Onboarding therefore requires the athlete to find the organization, register, and request access before the administrator can act — a three-step round trip the administrator cannot initiate or unblock.

This change gives administrators a direct, auditable way to add a person by email and intended tenant role, while keeping Supabase Auth as the sole identity owner and preserving the identity-vs-membership separation the current model already gets right.

## What Changes

### Two onboarding modes behind one server boundary

- **Email invitation (default)** — the administrator records an invitation; Supabase Auth emails the recipient; the recipient sets their own password and accepts. Membership is created only at activation.
- **Administrator-provisioned temporary password (exception)** — for tenants that verify identity through an external process. The server creates an auto-confirmed Auth account with a server-generated password, creates a `pendiente_activacion` membership, and reveals the password **exactly once** to the creating administrator. Gated by a per-tenant feature flag in the new `admin_tenants` table, defaulting off. Only the platform owner can change it; tenant administrators cannot enable it for themselves.

### New server-only provisioning boundary

- First privileged route handlers in the codebase, under `src/app/api/portal/orgs/[tenant_id]/`. They resolve the caller from the server session, authorize **inside a database RPC** (not only in the route), and use the existing `createServiceClient()` for `auth.admin.*` calls.
- `SUPABASE_SERVICE_ROLE_KEY` becomes a required server-only environment variable. It must never appear in `NEXT_PUBLIC_*`, client components, hooks, logs, error responses, or any client bundle.
- Auth creation and membership insertion cannot share a transaction, so provisioning is modelled as a **saga**: reserve → create Auth identity → insert membership, with compensating deletion of the Auth identity when the membership insert fails, plus persisted retryable failure state.
- Responses are deliberately generic for addresses that may already exist, preventing user enumeration. Rate limits apply per administrator and per tenant (no IP-based limiting in v1).

### New data model

- `public.admin_tenants` — a 1:1 extension of `public.tenants` owned by the platform, holding per-tenant licensing and feature entitlements. This change introduces it with the `aprovisionamiento_administrado_habilitado` flag (default `false`); later licensing fields belong here too. Tenant administrators get read access to their own tenant's row only, so the UI can show or hide the temporary-password mode. They get no write policy, and the platform owner manages rows through privileged access. `tenants` stays the place for settings a tenant administrator may edit, such as `requiere_perfil_completo`.
- `public.invitaciones_tenant` — invitation lifecycle (`pendiente`, `enviada`, `aceptada`, `cancelada`, `expirada`, `fallida`), target role, expiry (7 days), and audit timestamps. A partial unique index on `(tenant_id, lower(email))` over active states makes resend idempotent.
- `public.altas_administradas_tenant` — audit trail for administrator-provisioned accounts. It **never** stores the password or password-derived data.
- `activar_invitacion_tenant(p_invitation_id)` — `security definer` RPC that locks the row, validates state/expiry/verified-email match, and inserts the membership with `ON CONFLICT DO NOTHING`, making repeat callback visits safe.

### **BREAKING** — new membership state enforced across authorization

- `miembros_tenant.estado` gains `pendiente_activacion`, extending the check constraint currently limited to `('activo','mora','suspendido','inactivo')`.
- **Every** RLS policy, database view, and service query that grants tenant capabilities must exclude `pendiente_activacion`. Hiding portal routes is not sufficient, because the application has browser-side Supabase access. `canUserAccessTenant` must treat a `pendiente_activacion` membership as no access.
- Consumers that exhaustively switch on `MiembroEstado` (badges, filters, status modal) must handle the new value.

### Security prerequisite

Before invitation lists are exposed, the existing `miembros_tenant` SELECT policy and the `usuarios` update policy are audited and tightened — an overly broad membership read policy would turn the invitation list into a member-directory leak.

## Capabilities

### New Capabilities

- `tenant-member-invitations`: The `invitaciones_tenant` table, its RLS, the invitation lifecycle (create, resend, cancel, expire), the `activar_invitacion_tenant` activation RPC, the recipient acceptance flow, and the administrator "Invitaciones" tab.
- `admin-provisioned-accounts`: The tenant-gated temporary-password mode — auto-confirmed Auth account creation, server-side password generation, one-time reveal, the `altas_administradas_tenant` audit table, the `pendiente_activacion` membership state and its activation path.
- `tenant-platform-entitlements`: The platform-owned `admin_tenants` table as a 1:1 extension of `tenants`, its RLS (tenant admins may only read their own row; no tenant-side writes), default-row provisioning for existing and new tenants, and the `aprovisionamiento_administrado_habilitado` flag that gates the temporary-password mode server-side.
- `server-privileged-provisioning`: The server-only route boundary shared by both modes — session resolution, RPC-side authorization, service-role client handling rules, saga/compensation semantics, enumeration-safe responses, rate limiting, and structured audit telemetry.

### Modified Capabilities

- `tenant-member-status`: `miembros_tenant.estado` check constraint gains `pendiente_activacion`; `v_miembros_equipo` and `EquipoStatusBadge` must represent it; `cambiar_estado_miembro` may transition a member **out of** `pendiente_activacion`. This lets an administrator activate a provisioned member after confirming the password change through an external process, and the transition is recorded in `miembros_tenant_novedades` like any other status change.
- `tenant-membership-model`: Membership rows gain a second legitimate origin (invitation activation) alongside the default-tenant provisioning trigger, and role assignability must be validated server-side against the tenant's catalog.
- `tenant-role-route-guard`: `canUserAccessTenant` must deny access for a `pendiente_activacion` membership, so route-group layouts redirect such users the same way they redirect non-members.
- `training-booking`: The admin athlete picker for booking on behalf of another athlete excludes `pendiente_activacion` members as well as `inactivo`.
- `subscription-management`: The admin athlete picker for creating a subscription for another athlete excludes `pendiente_activacion` members as well as `inactivo`.
- `team-management`: The `gestion-equipo` page gains an "Agregar miembro" action, a mode selector, a one-time password confirmation view, and an "Invitaciones" tab alongside the existing Equipo / Solicitudes / Bloqueados tabs.

## Impact

### Files created

Following the feature-slice convention (`page → component → hook → service → types`). The full per-layer map, with the reason for each file, is in [design.md § D12](./design.md#d12-feature-slice-file-map-page--component--hook--service--types).

| Layer | Path |
|---|---|
| Migration | `supabase/migrations/<ts>_admin_tenants_entitlements.sql` |
| Migration | `supabase/migrations/<ts>_miembros_pendiente_activacion.sql` |
| Migration | `supabase/migrations/<ts>_invitaciones_y_altas_administradas.sql` |
| Delivery (API) | `src/app/api/portal/orgs/[tenant_id]/invitaciones/route.ts` |
| Delivery (API) | `src/app/api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar/route.ts` |
| Delivery (API) | `src/app/api/portal/orgs/[tenant_id]/miembros/aprovisionar/route.ts` |
| Delivery (page) | `src/app/portal/invitaciones/[invitacion_id]/page.tsx` (recipient acceptance) |
| Delivery (page) | `src/app/portal/activar-cuenta/[tenant_id]/page.tsx` (forced password change) |
| Presentation | `src/components/portal/gestion-equipo/gestion-invitaciones/{AgregarMiembroModal,ContrasenaTemporalModal,InvitacionesTab,InvitacionesTable,InvitacionEstadoBadge}.tsx` |
| Presentation | `src/components/portal/invitaciones/{AceptarInvitacionPage,ActivarCuentaPage,InvitacionesPendientesSection}.tsx` |
| Application | `src/hooks/portal/gestion-invitaciones/{useInvitacionesAdmin,useAgregarMiembro,useTenantEntitlements}.ts` |
| Application | `src/hooks/portal/invitaciones/{useMisInvitaciones,useAceptarInvitacion,useActivarCuenta}.ts` |
| Infrastructure | `src/services/supabase/portal/invitaciones.service.ts` |
| Domain | `src/types/portal/invitaciones.types.ts` |
| Support | `src/lib/portal/password-generator.ts`, `src/lib/portal/audit-log.ts` (both server-only) |

Only operations that need `auth.admin.*` get an API route. Cancel, accept, and activate are `SECURITY DEFINER` RPCs called from the service layer, following the existing `cambiar_estado_miembro` pattern.

### Files modified

- `src/services/supabase/server.ts` — harden `createServiceClient()` (fail fast on a missing key, add `import 'server-only'`, disable session persistence).
- `src/components/portal/gestion-equipo/EquipoPage.tsx` — add the `invitaciones` tab and the "Agregar miembro" action.
- `src/components/portal/gestion-equipo/EquipoStatusBadge.tsx` — render `pendiente_activacion`.
- `src/components/portal/gestion-equipo/EquipoHeaderFilters.tsx` — include the new estado in filters.
- `src/components/portal/gestion-equipo/CambiarEstadoModal.tsx` — restrict options for pending members and add the "Activación de cuenta" tipo.
- `src/components/portal/PortalTenantsPage.tsx` — add the "Invitaciones pendientes" section for recipients.
- `src/app/auth/update-password/page.tsx` — honor a validated `next` parameter.
- `src/app/portal/orgs/[tenant_id]/layout.tsx` — redirect pending members to `/portal/activar-cuenta/[tenant_id]`.
- `src/types/portal/equipo.types.ts` — extend `MiembroEstado` and `MiembroNovedadTipo`.
- `src/types/portal/tenant.types.ts` — add `AdminTenantEntitlements` and `TenantAccessDecision.pendingActivation`.
- `src/services/supabase/portal/tenant.service.ts` — deny `pendiente_activacion` in `canUserAccessTenant`; add `getTenantEntitlements`.
- `src/services/supabase/portal/equipo.service.ts` — map the new estado and tipo.
- `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — exclude `pendiente_activacion` from the athlete picker.
- `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts` — exclude `pendiente_activacion` from the athlete picker.
- `.env.example` — document `SUPABASE_SERVICE_ROLE_KEY` and `APP_URL` as server-only.
- `projectspec/03-project-structure.md` — register the new RPCs, the expiry cron job, and the first `app/api` delivery slice.

### Systems and dependencies

- **Supabase Auth**: `inviteUserByEmail` sends through the SMTP provider already configured (Resend). Both `localhost:3000` and `www.grit-arena.com` must be on the redirect allow-list.
- **pg_cron**: a scheduled job marks expired active invitations. Runtime authorization still checks `expires_at`, so correctness does not depend on the job.
- **RLS surface**: the widest blast radius in this change. Any policy or view granting tenant capability must be re-verified against `pendiente_activacion` before the managed mode is enabled.
- **Unchanged**: the self-service `miembros_tenant_solicitudes` request/approval flow keeps working. Invitations and requests are displayed separately and never transition one another's state.

## Non-goals

- **Bulk/CSV onboarding.** Deferred. When added later it must enqueue rows through this same single-provisioning command, not a separate authorization path.
- **Cryptographic proof that a temporary password was changed.** `pendiente_activacion` is a business-access gate, not a password-history policy. Stronger assurance requires a server-owned identity workflow and is out of scope.
- **Replacing or deprecating the access-request flow.** It serves the inverse case (a user asks to join) and is untouched.
- **Editing global `usuarios` profile fields from the invitation flow.** Invitations create memberships only; cross-tenant profile mutation stays prohibited.
- **A "view password again" action.** By design there is no later retrieval path.
- **Custom transactional email templates or an email provider migration.** Supabase Auth's invitation email is used as-is.
- **A platform-owner UI or platform-owner role.** This change only creates `admin_tenants` and its flag. The platform owner manages entitlements through privileged database access until a platform console is built.
- **Other licensing fields** (plan tier, seat limits, expiry). `admin_tenants` is designed to hold them, but this change adds only the provisioning flag.
- **Visual unification with `entrenamientos-publicos`.** New screens follow the current `gestion-equipo` patterns; aligning the two design languages is a later change.
- **Per-invitation custom permissions.** Only roles from the existing `administrador` / `entrenador` / `usuario` catalog are assignable.

## Implementation plan

1. **Security foundation** — audit and tighten existing `miembros_tenant` SELECT RLS and `usuarios` UPDATE RLS. Add regression tests proving a tenant admin cannot read memberships or mutate profiles outside their tenants. *No new feature code lands before this step passes.*
2. **Entitlements** — migration creating `admin_tenants` (PK/FK `tenant_id` → `tenants`, `aprovisionamiento_administrado_habilitado boolean default false`, timestamps), backfilling one row per existing tenant, ensuring a row is created for every new tenant, and adding RLS (tenant admins SELECT own row only; no tenant-side INSERT/UPDATE/DELETE).
3. **Schema** — one migration adding `invitaciones_tenant`, `altas_administradas_tenant`, the `pendiente_activacion` estado value, indexes, check constraints, RLS policies, and the `activar_invitacion_tenant` RPC.
4. **Authorization enforcement** — update every tenant-access RLS policy, `v_miembros_equipo`, and `canUserAccessTenant` to deny `pendiente_activacion`. Add the denial regression suite *before* any provisioning endpoint is reachable.
5. **Types and service layer** — `invitaciones.types.ts`, then `invitaciones.service.ts` (client-side read/list via RLS; writes go through the API routes).
6. **Server orchestration** — the route handlers for invite, resend, and provision, plus the cancel/accept/activate RPCs (the provision route re-checks the `admin_tenants` flag inside the authorizing RPC and never trusts the UI); the server-only password generator; saga reservation and compensation; enumeration-safe responses; rate limits; audit events.
7. **Hooks** — `useInvitacionesAdmin`, `useAgregarMiembro`, `useTenantEntitlements`, `useMisInvitaciones`, `useAceptarInvitacion`, `useActivarCuenta`.
8. **Administrator UI** — `AgregarMiembroModal` (mode selector shown only when the tenant's entitlement is on, role selector, duplicate-email warning), `ContrasenaTemporalModal` (one-time reveal with an explicit acknowledgement), `InvitacionesTab` + `InvitacionesTable` + `InvitacionEstadoBadge`, and the `pendiente_activacion` badge on the Equipo tab, plus the `pendiente_activacion` → `activo` option in `CambiarEstadoModal`.
9. **Recipient flow** — the acceptance page, post-auth activation, forced password change for provisioned accounts, and success routing into the tenant.
10. **Hardening and rollout** — expiry cron job, audit telemetry and alerting, integration tests for the full matrix (authorization, duplicate/resend, expiration, email mismatch, cancellation, concurrent activation, pending-access denial, saga compensation, entitlement-off rejection). Ship with `aprovisionamiento_administrado_habilitado = false` for every tenant, then the platform owner enables it for vetted tenants.

## Decisions

- **The managed-provisioning switch lives in a new `admin_tenants` table**, a 1:1 extension of `tenants`, so the platform owner controls licensing and feature entitlements per tenant. It is not a column on `tenants`, because tenant administrators must not be able to enable the mode themselves.
- **`cambiar_estado_miembro` can move a member out of `pendiente_activacion`.** An administrator may activate a provisioned member after external confirmation, and the change is logged in `miembros_tenant_novedades`. Allowed targets are `activo` and `inactivo` only, and there is no path back into the pending state ([design.md § D6](./design.md#d6-leaving-pendiente_activacion)).
- **UI follows the current `gestion-equipo` patterns** (tab bar, `AceptarSolicitudModal`-style modals, `SolicitudesTable`-style tables, estado badges). No separate design asset is needed; component-by-component mapping is in [design.md § D8](./design.md#d8-ui-design--current-gestion-equipo-patterns).
- **The platform owner writes `admin_tenants` through privileged database access** (service role or SQL console). No authenticated write policy and no platform-owner role are added.
- **The table keeps the name `admin_tenants`.** New SQL always writes `public.admin_tenants` with a distinct alias, to avoid confusion with the existing `admin_tenants` subquery alias.

- **`APP_URL` is `https://www.grit-arena.com` in production** and `http://localhost:3000` locally. It is a server-only env var used to build the invitation email's return link.

- **No IP-based rate limiting in v1.** Per-admin and per-tenant limits in the database are enough while tenants are created only by the platform owner.

- **Pending accounts never expire.** They stay `pendiente_activacion` until the member activates or an admin moves them to `activo` or `inactivo`.
- **Admins cannot select `pendiente_activacion` members** when booking or creating a subscription for another athlete. They activate the member first ([design.md § D11](./design.md#d11-admin-athlete-pickers-exclude-pending-members)).
- **No separate mode for athletes who never sign in.** The admin provisions with a temporary password, does not deliver it, and activates the member from `gestion-equipo`. The admin then knows a valid password for that account; this is accepted.

Remaining open question (preview deployments) are tracked in [design.md § Open Questions](./design.md#open-questions).
