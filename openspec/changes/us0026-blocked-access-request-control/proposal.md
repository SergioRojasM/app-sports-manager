## Why

The access request blocking logic introduced in US0025 is hardcoded (`rejectionCount >= 3`) and ephemeral — blocked status is computed client-side from request history, not stored persistently. This means a user who clears their history can bypass it, admins cannot manually block a user, and there is no way to review or lift a block. Different organizations may also need different thresholds.

## What Changes

- Add `max_solicitudes` column to `tenants` (smallint, default 2, range 1–10) so each organization configures its own rejection threshold.
- Introduce `miembros_tenant_bloqueados` table as the authoritative, persistent store for blocked users per tenant.
- Auto-insert a block record when a rejection brings the user's count to `max_solicitudes`; insertion is idempotent (`on conflict do nothing`).
- Add a **Bloquear** action in the Solicitudes tab so admins can block any user regardless of rejection count.
- Add a **"Bloqueados"** tab in `gestion-equipo` listing all blocked users with an unblock action per row (deletes the block record).
- Replace the hardcoded `rejectionCount >= 3` check in `useSolicitudRequest` with a server-side lookup against `miembros_tenant_bloqueados`.
- Expose `max_solicitudes` in the organization edit form (`gestion-organizacion`).

## Capabilities

### New Capabilities

- `blocked-access-request-control`: Persistent per-tenant user blocking for access requests — configurable threshold, manual block/unblock by admin, and blocked-users management panel inside `gestion-equipo`.

### Modified Capabilities

- `team-management`: Adds a third tab ("Bloqueados") to `EquipoPage` and a new "Bloquear" action column in `SolicitudesTable`. Existing accept/reject flows are unaffected except that `rechazarSolicitud` now triggers auto-block when threshold is reached.
- `organization-view`: The organization edit form gains a `max_solicitudes` numeric field (admin-only).

## Impact

**Database**
- `public.tenants` — new column `max_solicitudes`.
- New table `public.miembros_tenant_bloqueados` with RLS policies (`SELECT` for own user and for admins, `INSERT`/`DELETE` for admins only).

**Services**
- `solicitudes.service.ts` — 4 new methods: `getUserBloqueadoForTenant`, `getBloqueadosByTenant`, `bloquearUsuario`, `desbloquearUsuario`.
- `solicitudes.service.ts` — modify `rechazarSolicitud` to trigger auto-block.
- `tenant.service.ts` — add `getTenantMaxSolicitudes`; extend `updateTenant` to include `max_solicitudes`.

**Hooks**
- `useSolicitudRequest.ts` — replace derived `isBlocked` with server lookup; add `isBanned` to return type.
- `useSolicitudesAdmin.ts` — add `bloquear` action.
- New `useBloqueados.ts` hook.

**Components**
- `SolicitudesTable.tsx` — add `onBloquear` prop and inline confirm UI.
- `SolicitudesTab.tsx` — forward `bloquear` handler.
- New `BloqueadosTable.tsx` and `BloqueadosTab.tsx` components.
- `EquipoPage.tsx` — add `'bloqueados'` tab, wire `useBloqueados`.
- Organization edit form — add `max_solicitudes` field.

**Types**
- `solicitudes.types.ts` — add `BloqueadoRow` and `BloquearUsuarioInput`.

**No breaking changes to existing public API surface.** Existing accept/reject flows, membership creation, and RLS policies for `miembros_tenant_solicitudes` remain unchanged.
