## Context

The `solicitudesService.createSolicitud` function currently has two guards before inserting an access request: a duplicate-pending check and a blocked-user check. There is no per-tenant configuration that can gate access requests based on profile data quality. The `tenants` table already carries configuration flags (`max_solicitudes`); adding `requiere_perfil_completo` follows the same pattern.

The change is cross-cutting: it touches the database schema, a service function, two TypeScript type files, a hook, and two UI components.

## Goals / Non-Goals

**Goals:**
- Allow each tenant to independently opt-in to profile-completeness gating for access requests
- Enforce the check server-side (in `solicitudesService.createSolicitud`) so it cannot be bypassed by a client
- Surface the `incomplete_profile` rejection as a persistent, actionable UI state in `SolicitarAccesoButton` with a link to the profile page
- Keep the admin edit drawer as the single point of configuration for tenant access settings

**Non-Goals:**
- Making the set of required fields configurable per tenant
- Enforcing profile completeness for other flows (booking, subscriptions, etc.)
- Retroactively affecting existing team members

## Decisions

### Decision: Add Guard 3 in `createSolicitud`, not as a separate service method

**Why**: Guards 1 and 2 already live in `createSolicitud`; adding Guard 3 there keeps all pre-insert validation co-located. A separate validation function would require callers to coordinate two calls atomically, which is unnecessary complexity.

**Alternative considered**: A Supabase function trigger on `miembros_tenant_solicitudes`. Rejected because RLS + triggers are harder to test locally and the profile fields are in a different table, making trigger logic more brittle.

### Decision: Fetch tenant flag and user profile in two sequential queries (not a join)

**Why**: The tenant flag query determines whether the user profile query is even needed. Running them in parallel would always incur the cost of the profile query regardless of the flag value. Sequential execution keeps Guard 3 a no-op when `requiere_perfil_completo = false`.

**Alternative considered**: Single join query always fetching both. Rejected because it changes the query path for all tenants even when the feature is off.

### Decision: Use `requiere_perfil_completo: string` (not `boolean`) in `TenantEditFormValues`

**Why**: Consistent with the existing `max_solicitudes: string` pattern in `TenantEditFormValues` — all form fields are strings to avoid controlled-input issues with React. The hook's `toPayload` converts back to the correct type before submitting.

### Decision: Expose `isProfileIncomplete` from `useSolicitudRequest` rather than a generic error string

**Why**: The `SolicitarAccesoButton` needs to render a distinct UI state (not just an error toast) with a navigation link. A typed boolean state is more precise than a string and avoids prop-drilling error messages.

## Risks / Trade-offs

- **Race condition**: a user could complete their profile between the Guard 3 check and the actual insert. The result is a false-positive approval — the user gets in. This is acceptable; tighter consistency would require a database-level computed column or trigger, which is over-engineered for this use case.
- **Guard 3 adds two extra DB round-trips** per access-request submission when the flag is enabled. Both are single-row primary-key lookups and will be sub-millisecond in practice.

## Migration Plan

1. Apply migration `20260330000100_tenant_requiere_perfil_completo.sql` — adds `requiere_perfil_completo boolean NOT NULL DEFAULT false`. All existing tenants default to `false` (no behaviour change on deploy).
2. Deploy application code. The new column is optional on the frontend until the edit drawer change ships; the service reads and writes it transparently.
3. No rollback complexity — the column default ensures zero impact if the migration is applied without the UI code, and the column can be dropped trivially if needed.
