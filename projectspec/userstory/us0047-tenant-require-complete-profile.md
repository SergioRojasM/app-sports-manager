# US-0047 — Tenant-level flag to require complete user profile before access request

## ID
US-0047

## Name
Tenant-level flag to require complete user profile before submitting an access request

## As a
Tenant administrator

## I Want
To configure my organization so that only users with a complete personal profile (full name, phone, birthdate, ID document with expiry date, and blood type) are allowed to submit access requests

## So That
I can ensure I receive access requests only from identifiable, properly registered members, reducing incomplete or anonymous sign-ups

---

## Description

### Current State
The `tenants` table has a `max_solicitudes` column (added in US-0026) to limit the number of rejected requests per user. However, there is no mechanism to require users to complete their profile before submitting an access request. The `usuarios` table has user-editable personal fields (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`) that together constitute a complete profile, but they are all optional and never validated at the point of access-request submission.

The `createSolicitud` function in `solicitudes.service.ts` currently has two guards:
1. Guard 1 — duplicate pending request check
2. Guard 2 — blocked user check (via `miembros_tenant_bloqueados`)

### Proposed Changes

#### 1. Database — New column on `tenants`
Add `requiere_perfil_completo boolean not null default false` to `public.tenants`.

#### 2. Backend — New guard in `createSolicitud`
Add Guard 3 inside `solicitudesService.createSolicitud()`, executed only when `requiere_perfil_completo = true` for the target tenant. Guard queries `public.usuarios` for the requesting user and checks that these fields are all non-null and non-empty:
- `nombre`
- `apellido`
- `telefono`
- `fecha_nacimiento` (date)
- `tipo_identificacion`
- `numero_identificacion`
- `fecha_exp_identificacion` (date)
- `rh`

If any field is missing, throw `SolicitudesServiceError('incomplete_profile', ...)`.

#### 3. Types — Extend `SolicitudesServiceError`
Add `'incomplete_profile'` to the allowed code union in `SolicitudesServiceError`.

#### 4. Tenant edit — `tenant.types.ts`
- Add `requiere_perfil_completo: string` (boolean-as-string for form control) to `TenantEditFormValues`.
- Add `requiere_perfil_completo: boolean` to `TenantEditPayload`.

#### 5. Tenant service — `tenant.service.ts`
- Add `requiere_perfil_completo` to the `TenantRow` local type.
- Include `requiere_perfil_completo` in the `fetchTenantById` select columns string.
- Map it in `mapTenantToEditFormValues` as `String(tenant.requiere_perfil_completo ?? false)`.
- Include it in `toPayload` / `updateTenant` payload (parse string → boolean).

#### 6. Edit hook — `useEditTenant.ts`
- Add `requiere_perfil_completo: 'false'` to `EMPTY_VALUES`.
- Parse it to boolean in `toPayload`: `requiere_perfil_completo: values.requiere_perfil_completo === 'true'`.

#### 7. UI — `EditTenantDrawer.tsx`
Add a toggle/checkbox field for **"Requiere perfil completo"** inside the edit form (access settings section, alongside the existing `max_solicitudes` field). Field delegates to `updateField('requiere_perfil_completo', ...)`.

#### 8. UI — `useSolicitudRequest.ts`
After a `submit()` call that fails with `SolicitudesServiceError` having code `'incomplete_profile'`, set a new local state `isProfileIncomplete: true` in the hook so the button can render a dedicated state. Reset it to `false` on successful submit.

#### 9. UI — `SolicitarAccesoButton.tsx`
When `isProfileIncomplete` is `true`, render a locked state button labeled **"Perfil incompleto"** (disabled) and below it an informational banner: _"Esta organización requiere que completes tu perfil antes de solicitar acceso."_ with a link `→ Completar perfil` pointing to `/portal/perfil`.

---

## Database Changes

### Migration file
`supabase/migrations/20260330000100_tenant_requiere_perfil_completo.sql`

```sql
-- =============================================
-- Migration: Add requiere_perfil_completo to tenants
-- US-0047: Tenant-level complete-profile requirement for access requests
-- =============================================

alter table public.tenants
  add column if not exists requiere_perfil_completo boolean not null default false;
```

No new RLS policies are needed — the existing `tenants` RLS policies already govern reads and admin-only writes.

---

## API / Server Actions

### `solicitudesService.createSolicitud` — `src/services/supabase/portal/solicitudes.service.ts`

**Guard 3 — profile completeness** (inserted between Guard 2 and the final `insert`):

- **Trigger**: only when the tenant row has `requiere_perfil_completo = true`.
- **Query**: `supabase.from('usuarios').select('nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh').eq('id', input.usuario_id).single()`
- **Check**: all eight fields must be truthy (non-null, non-empty string for text fields; non-null date for date fields).
- **On failure**: `throw new SolicitudesServiceError('incomplete_profile', 'Esta organización requiere que completes tu perfil antes de solicitar acceso.')`
- **Auth/RLS**: uses the browser client; the authenticated user can select their own row via the existing `usuarios` SELECT policy.

### `tenantService.updateTenant` — `src/services/supabase/portal/tenant.service.ts`

No new endpoint required. The existing `updateTenant` accepts a `TenantEditPayload` and passes it directly to Supabase `.update()`. Adding `requiere_perfil_completo` to the payload type is sufficient.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260330000100_tenant_requiere_perfil_completo.sql` | Add `requiere_perfil_completo` column to `tenants` |
| Types | `src/types/portal/solicitudes.types.ts` | Add `'incomplete_profile'` to `SolicitudesServiceError` code union |
| Types | `src/types/portal/tenant.types.ts` | Add `requiere_perfil_completo` to `TenantEditFormValues` (string) and `TenantEditPayload` (boolean) |
| Service | `src/services/supabase/portal/solicitudes.service.ts` | Fetch tenant flag + user profile fields for Guard 3 in `createSolicitud` |
| Service | `src/services/supabase/portal/tenant.service.ts` | Add `requiere_perfil_completo` to `TenantRow`, select query, `mapTenantToEditFormValues`, and `toEditFormValues` mapper |
| Hook | `src/hooks/portal/tenant/useEditTenant.ts` | Add `requiere_perfil_completo: 'false'` to `EMPTY_VALUES` and parse to boolean in `toPayload` |
| Hook | `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts` | Add `isProfileIncomplete` state; set to `true` when submit throws `incomplete_profile`, return it in result type |
| Component | `src/components/portal/tenant/EditTenantDrawer.tsx` | Add toggle field "Requiere perfil completo" in access-settings section |
| Component | `src/components/portal/tenant/SolicitarAccesoButton.tsx` | Handle `isProfileIncomplete` state: disabled button + informational banner linking to `/portal/perfil` |

---

## Acceptance Criteria

1. A tenant administrator can toggle the "Requiere perfil completo" setting in the organization edit drawer and save it successfully.
2. After saving, the `requiere_perfil_completo` column in the `tenants` table reflects the new value.
3. When the flag is `false`, any authenticated user (regardless of profile completeness) can submit an access request as before — no regression.
4. When the flag is `true` and the requesting user has a complete profile (all eight required fields filled), the access request is created successfully.
5. When the flag is `true` and the requesting user is missing at least one of the eight required fields (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`), the request is rejected server-side with error code `'incomplete_profile'`.
6. When the `'incomplete_profile'` error is received, `SolicitarAccesoButton` renders a disabled **"Perfil incompleto"** button and an informational banner with a link to `/portal/perfil`.
7. Clicking the profile link navigates the user to `/portal/perfil` so they can complete their data.
8. After the user completes their profile and returns, attempting the access request again succeeds if the profile is now complete.
9. All existing access request guards (duplicate pending, blocked user) continue to work correctly and their behavior is not altered.
10. The tenant edit form does not break for tenants that do not have the flag set (defaults gracefully to `false`).
11. No other tenant without the flag enabled is affected by this change.

---

## Implementation Steps

- [ ] Create migration `supabase/migrations/20260330000100_tenant_requiere_perfil_completo.sql` and apply locally (`npx supabase db reset` or `supabase migration up`)
- [ ] Add `'incomplete_profile'` to `SolicitudesServiceError` code union in `src/types/portal/solicitudes.types.ts`
- [ ] Add `requiere_perfil_completo` to `TenantEditFormValues` (as `string`) and `TenantEditPayload` (as `boolean`) in `src/types/portal/tenant.types.ts`
- [ ] Update `tenant.service.ts`: add field to `TenantRow` type, include in select query, map in `mapTenantToEditFormValues`, and pass through `toPayload`/`updateTenant`
- [ ] Update `useEditTenant.ts`: add `requiere_perfil_completo: 'false'` to `EMPTY_VALUES`; parse to boolean in `toPayload`
- [ ] Update `solicitudes.service.ts` `createSolicitud`: add Guard 3 — fetch tenant `requiere_perfil_completo`, conditionally fetch user fields (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`), throw `incomplete_profile` if any is missing
- [ ] Update `useSolicitudRequest.ts`: add `isProfileIncomplete` boolean state, set to `true` when `SolicitudesServiceError` with code `'incomplete_profile'` is caught in `submit`, reset to `false` on the next successful submit; expose in return value
- [ ] Update `EditTenantDrawer.tsx`: add toggle (checkbox or switch) for "Requiere perfil completo" in the access-settings group alongside `max_solicitudes`
- [ ] Update `SolicitarAccesoButton.tsx`: handle `isProfileIncomplete` render state — disabled button with label "Perfil incompleto" + informational alert with link to `/portal/perfil`
- [ ] Verify RLS policies in Supabase: confirm the `authenticated` role can read `requiere_perfil_completo` from `tenants` (it can via existing `tenants_select_authenticated` policy) and that `usuarios` SELECT policy allows users to read their own row
- [ ] Test manually: happy path (flag off) → request succeeds; flag on + complete profile → request succeeds; flag on + incomplete profile → request blocked with correct UI; admin toggle saves correctly

---

## Non-Functional Requirements

- **Security**: The profile completeness check runs server-side in `solicitudesService.createSolicitud` so it cannot be bypassed by a client. The existing RLS policy `solicitudes_insert_own` already enforces `usuario_id = auth.uid()`, preventing impersonation. The tenant `requiere_perfil_completo` column is readable by all authenticated users (via existing `tenants_select_authenticated` RLS policy) and writable only by admins (via `tenants_update_admin` equivalent policy).
- **Performance**: Guard 3 adds one extra `SELECT` on `tenants` (for the flag) and one on `usuarios` (for profile fields) before the insert. Both queries are single-row lookups on primary keys and will resolve in milliseconds. No new indexes are required.
- **Accessibility**: The "Requiere perfil completo" toggle in the edit drawer must have an associated `<label>`, a descriptive `aria-describedby` explaining the effect, and full keyboard focus support.
- **Error handling**: The `incomplete_profile` error surfaces as a persistent inline banner in `SolicitarAccesoButton` (not a transient toast) so the user can read the message and click the profile link at their own pace. The banner must not disappear until the user navigates away or successfully submits a request.
