# US-0136 — Enforce complete profile on organization entry

## ID
US-0136

## Name
Enforce the tenant's "complete profile" requirement every time a member enters the organization, regardless of how the membership was created

## As a
Tenant administrator

## I Want
Every member of my organization to be forced to complete their personal profile before they can enter it, whenever the organization has "Requiere perfil completo" enabled — including members who joined through an invitation or an administrator-provisioned account

## So That
The identification data my organization depends on (full name, phone, birthdate, ID document, blood type) is always present for every member, instead of being silently skipped by the invitation onboarding paths

---

## Description

### Current State

`tenants.requiere_perfil_completo` (US-0047) is enforced in exactly one place: Guard 3 of `solicitudesService.createSolicitud()` in `src/services/supabase/portal/solicitudes.service.ts`, which blocks an **access request** when any of the eight profile fields is empty.

Every other way of becoming a member bypasses that guard:

| Onboarding path | How membership is created | Profile check today |
|---|---|---|
| Access request (US-0026 / US-0047) | `createSolicitud` → admin approval | Checked at request time only |
| Email / in-app invitation (US-0114) | RPC `activar_invitacion_tenant` inserts `miembros_tenant` as `activo` | **None** |
| Administrator-provisioned account (US-0114) | RPC `completar_alta_administrada` → `activar_alta_administrada` | **None** |

`activar_invitacion_tenant` only inserts `usuarios (id, email)`, so an invited user who has just signed up has an entirely empty profile and still lands inside the organization: `AceptarInvitacionPage` pushes to `/portal/orgs/{tenant_id}` and `src/app/portal/orgs/[tenant_id]/layout.tsx` only checks membership, role and `pendingActivation`.

Two further gaps follow from the check living only at request time:

- A member who was approved while the flag was `false` is never asked for their data after the administrator turns it on.
- A member who later clears a profile field in `/portal/perfil` keeps full access.

### Proposed Changes

The requirement moves from "checked once when requesting access" to "checked on every entry to the organization". The existing access-request guard stays as is (it gives earlier feedback) but both checks share a single definition of "complete profile".

#### 1. Shared rule — `src/lib/portal/perfil-completo.ts` (new)

A client-safe, dependency-free module that becomes the single source of truth for the rule:

- `PERFIL_COMPLETO_SELECT` — the `usuarios` column list:
  `'nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh'`.
- `type PerfilCompletoRow` — those eight columns, each `string | null`.
- `getPerfilCamposFaltantes(row: PerfilCompletoRow | null): FormularioPerfilCampo[]` — returns the missing fields using the keys of the existing `FORMULARIO_PERFIL_CAMPOS` catalog (`src/types/portal/formularios.types.ts`), in catalog order. Text columns are missing when `null` or blank after `trim()`; date columns when `null`/empty. Because the catalog key `tipo_identificacion` represents both the type and number inputs, it is reported as missing when **either** `tipo_identificacion` or `numero_identificacion` is empty. A `null` row returns all seven keys.
- `isPerfilCompleto(row)` — `getPerfilCamposFaltantes(row).length === 0`.

`peso_kg` / `altura_cm` (`perfil_deportivo`) are **not** part of the rule, matching US-0047.

#### 2. Access decision — `tenantService.canUserAccessTenant`

`TenantAccessDecision` (`src/types/portal/tenant.types.ts`) gains:

```ts
/** True when the tenant has requiere_perfil_completo and the caller's profile is missing a required field (US-0136). */
profileIncomplete: boolean;
/** Missing profile fields, empty unless profileIncomplete (US-0136). */
profileMissingFields: FormularioPerfilCampo[];
```

`canUserAccessTenant` behaviour:

- No membership, query error, or `pendiente_activacion` → unchanged, with `profileIncomplete: false`, `profileMissingFields: []`.
- Active membership → read `tenants.requiere_perfil_completo` for `tenantId`. If `true`, read the caller's `usuarios` row with `PERFIL_COMPLETO_SELECT` and compute the missing fields.
- `allowed` and `role` are **not** changed by the profile result. The client consumers `useTenantAccess` and `usePlanesPublicos` read only `allowed`/`role` and must keep treating the user as a member; the redirect is the layout's job.
- If either extra read fails, log with `console.error` and return `profileIncomplete: false` (fail open). This is a data-completeness gate, not an authorization boundary, and a transient read failure must not lock every member out.

The two extra reads only run for tenants with the flag enabled (the `usuarios` read) and are deduplicated per request by the existing `getCachedTenantAccess` wrapper.

#### 3. Entry gate — `src/app/portal/orgs/[tenant_id]/layout.tsx`

Evaluation order becomes:

1. No session → `/auth/login?next=/portal/orgs` (unchanged)
2. `decision.pendingActivation` → `/portal/activar-cuenta/{tenantId}` (unchanged)
3. `!decision.allowed || !decision.role` → `/portal/orgs` (unchanged)
4. **New** — `decision.profileIncomplete` → `redirect('/portal/completar-perfil/{tenantId}')`

Since every tenant route (`(administrador)`, `(atleta)`, `(entrenador)`, `(shared)` and the root `page.tsx`) renders under this layout, the gate covers direct deep links as well as the redirects issued after accepting an invitation or activating a provisioned account. No change is needed in `AceptarInvitacionPage`, `ActivarCuentaPage` or their hooks: both already navigate to `/portal/orgs/{tenant_id}`, which now lands on the gate.

The gate applies to **all roles**, including `administrador` and `entrenador`. An administrator who enables the flag while their own profile is incomplete is redirected on their next navigation and regains access as soon as they save their data.

#### 4. Completion screen — `/portal/completar-perfil/[tenant_id]` (new)

The route lives outside `orgs/[tenant_id]` (same pattern as `/portal/activar-cuenta/[tenant_id]`) so it is not caught by the gate.

`src/app/portal/completar-perfil/[tenant_id]/page.tsx` (server component):

- No session → `/auth/login?next=/portal/orgs`
- `getCachedTenantAccess(...)`:
  - `pendingActivation` → `/portal/activar-cuenta/{tenantId}`
  - `!allowed` → `/portal/orgs`
  - `!profileIncomplete` → `/portal/orgs/{tenantId}` (nothing to complete; also prevents the page being used for tenants that do not require it)
- Reads the tenant's `nombre` and renders `<CompletarPerfilPage tenantId tenantNombre missingFields={decision.profileMissingFields} />`.

`src/components/portal/perfil/CompletarPerfilPage.tsx` (client):

- `GritPageHeader` — title **"Completa tu perfil"**, subtitle **"{tenantNombre} requiere que completes tu perfil para ingresar a la organización."**
- A glass card (same classes as `ActivarCuentaPage`) containing `PerfilPersonalForm` with `visibleFields={missingFields}`, driven by `usePerfil({ requiredFields: missingFields })`. `missingFields` comes from the server and is fixed for the lifetime of the page, so fields do not disappear while the user types.
- Primary button **"Guardar y continuar"** (`"Guardando…"` while submitting, disabled while `loading`/`isSubmitting`).
- Secondary link **"Volver a organizaciones"** → `/portal/orgs`.
- On a successful save: `router.replace('/portal/orgs/{tenantId}')` followed by `router.refresh()`. The layout re-evaluates and lets the user in.
- Load failure of the profile: the existing error + **"Reintentar"** pattern from `PerfilPage`.
- Save failure: inline `role="alert"` banner with the `usePerfil` error message; the form keeps the typed values.

#### 5. Validation — `src/hooks/portal/perfil/usePerfil.ts`

`usePerfil` accepts an optional argument `options?: { requiredFields?: FormularioPerfilCampo[] }`. When provided, `submit()` adds a field error for every listed field that is empty, on top of the existing unconditional `nombre`/`apellido` rule, and does not call the service while any error exists:

| Field key | Error message |
|---|---|
| `telefono` | `El teléfono es obligatorio.` |
| `fecha_nacimiento` | `La fecha de nacimiento es obligatoria.` |
| `tipo_identificacion` | `El tipo de identificación es obligatorio.` (on `tipo_identificacion`) and `El número de identificación es obligatorio.` (on `numero_identificacion`) |
| `fecha_exp_identificacion` | `La fecha de expedición es obligatoria.` |
| `rh` | `El grupo sanguíneo es obligatorio.` |

Called without arguments (`PerfilPage`, `InlineProfileCompletionStep`) the hook behaves exactly as today.

#### 6. Access-request guard — `solicitudes.service.ts`

Guard 3 keeps its behaviour and error (`incomplete_profile`) but replaces its inline column list and boolean chain with `PERFIL_COMPLETO_SELECT` + `isPerfilCompleto()`.

#### 7. Copy — `EditTenantForm.tsx`

The toggle no longer governs only access requests:

- Label: **"Requerir perfil completo para ingresar a la organización"**
- Help text (`#requiere-perfil-desc`): **"Cuando está activo, todos los miembros —incluidos los invitados y los que ya pertenecen a la organización— deberán completar su perfil (nombre, apellido, teléfono, fecha de nacimiento, tipo y número de identificación, fecha de expedición y grupo sanguíneo) para solicitar acceso e ingresar."**

#### 8. Breadcrumb — `PortalBreadcrumb.tsx`

Add `'completar-perfil': 'Completar perfil'` to the segment label map, next to `'activar-cuenta'`.

### Out of Scope

- Database-level enforcement. RLS policies are unchanged; the gate is a server-side navigation gate, consistent with how `pendiente_activacion` is handled.
- Making the list of required fields configurable per tenant.
- Blocking invitation acceptance itself. The user becomes a member on acceptance and is asked for the data on entry, so an invitation cannot expire while they fill in the form.
- Notifying existing members when the administrator enables the flag.

---

## Database Changes

None. No migration is required.

- `tenants.requiere_perfil_completo` already exists (`20260330000100_tenant_requiere_perfil_completo.sql`).
- The gate relies on policies that already exist and must be verified, not created:
  - `usuarios` — the authenticated user can `select` and `update` their own row (used today by `perfil.service.ts`).
  - `tenants` — an active member can `select` their tenant row, including tenants with `publico = false` (US-0133). Confirm this explicitly for a private tenant, because a blocked read makes the gate fail open.

---

## API / Server Actions

### `tenantService.canUserAccessTenant` — `src/services/supabase/portal/tenant.service.ts` (modified)

- **Input**: `(supabase: SupabaseClient, userId: string, tenantId: string)` — unchanged.
- **Return**: `TenantAccessDecision` extended with `profileIncomplete: boolean` and `profileMissingFields: FormularioPerfilCampo[]`.
- **Queries added** (active membership only):
  - `from('tenants').select('requiere_perfil_completo').eq('id', tenantId).maybeSingle()`
  - when the flag is `true`: `from('usuarios').select(PERFIL_COMPLETO_SELECT).eq('id', userId).maybeSingle()`
- **Auth / RLS**: runs with the caller's session (server client in layouts, browser client in hooks). No service-role access.

### `getPerfilCamposFaltantes` / `isPerfilCompleto` — `src/lib/portal/perfil-completo.ts` (new)

- Pure functions, no I/O. Input `PerfilCompletoRow | null`; return `FormularioPerfilCampo[]` / `boolean`.

### `solicitudesService.createSolicitud` — `src/services/supabase/portal/solicitudes.service.ts` (refactor)

- Same signature, same `SolicitudesServiceError('incomplete_profile', …)`; internals use the shared helper.

### `usePerfil` — `src/hooks/portal/perfil/usePerfil.ts` (modified)

- **Input**: `options?: { requiredFields?: FormularioPerfilCampo[] }`.
- **Return**: `UsePerfilResult` — unchanged.
- Persists through the existing `updatePerfil` / `upsertPerfilDeportivo`; no new service function.

No new API route or RPC.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Lib | `src/lib/portal/perfil-completo.ts` | **New** — `PERFIL_COMPLETO_SELECT`, `PerfilCompletoRow`, `getPerfilCamposFaltantes`, `isPerfilCompleto` |
| Types | `src/types/portal/tenant.types.ts` | Add `profileIncomplete` and `profileMissingFields` to `TenantAccessDecision` |
| Service | `src/services/supabase/portal/tenant.service.ts` | `canUserAccessTenant`: read the tenant flag and the caller's profile for active members; populate the two new fields on every return branch |
| Service | `src/services/supabase/portal/solicitudes.service.ts` | Guard 3 uses `PERFIL_COMPLETO_SELECT` + `isPerfilCompleto` |
| Hook | `src/hooks/portal/perfil/usePerfil.ts` | Optional `requiredFields` option; extra validation in `submit()` |
| Component | `src/components/portal/perfil/CompletarPerfilPage.tsx` | **New** — gated profile-completion screen |
| Component | `src/components/portal/perfil/index.ts` | Export `CompletarPerfilPage` |
| Component | `src/components/portal/tenant/EditTenantForm.tsx` | New label and help text for the `requiere_perfil_completo` toggle |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | Add `'completar-perfil'` label |
| Page | `src/app/portal/completar-perfil/[tenant_id]/page.tsx` | **New** — server guards + render `CompletarPerfilPage` |
| Layout | `src/app/portal/orgs/[tenant_id]/layout.tsx` | Redirect to `/portal/completar-perfil/{tenantId}` when `decision.profileIncomplete` |
| Docs | `projectspec/03-project-structure.md` | Document the new route, component, lib module and the extended layout gate / `TenantAccessDecision` |

---

## Acceptance Criteria

1. With `requiere_perfil_completo = true`, a newly registered user who accepts an invitation at `/portal/invitaciones/{id}` is taken to `/portal/completar-perfil/{tenant_id}` and not to any organization screen.
2. With the flag `true`, a provisioned member who finishes `/portal/activar-cuenta/{tenant_id}` with an incomplete profile is taken to `/portal/completar-perfil/{tenant_id}`.
3. With the flag `true`, a member with an incomplete profile who opens any URL under `/portal/orgs/{tenant_id}/…` directly (including the root) is redirected to `/portal/completar-perfil/{tenant_id}` and no organization content is rendered.
4. The rule in criteria 1–3 applies to the `usuario`, `entrenador` and `administrador` roles.
5. The completion screen shows the organization name and only the fields that are missing; fields already filled are not shown. When either the ID type or the ID number is missing, both inputs are shown.
6. Submitting with any shown field empty saves nothing and shows the field-level message from the validation table under each empty field.
7. After a successful save the user lands in the organization (role landing page) without logging in again, and subsequent navigation inside the organization is not interrupted.
8. A member whose profile is already complete enters the organization with no extra step.
9. With the flag `false`, members with an incomplete profile enter the organization as before, through every onboarding path.
10. When an administrator turns the flag on, existing members with incomplete profiles are redirected to the completion screen on their next navigation into the organization; when it is turned off again they enter normally.
11. A member who clears a required field in `/portal/perfil` is redirected to the completion screen the next time they enter an organization that requires it.
12. A user with memberships in two organizations, only one of which requires a complete profile, is gated only for that one.
13. Opening `/portal/completar-perfil/{tenant_id}` redirects to `/portal/orgs` for a non-member, to `/portal/activar-cuenta/{tenant_id}` for a `pendiente_activacion` member, to `/portal/orgs/{tenant_id}` when the profile is complete or the tenant does not require it, and to the login page when there is no session.
14. A member with a `pendiente_activacion` membership and an incomplete profile is sent to activation first and to profile completion afterwards.
15. "Volver a organizaciones" returns to `/portal/orgs` without saving and the organization remains inaccessible until the profile is complete.
16. When the save fails, an inline error is shown, the typed values are kept and the user stays on the completion screen.
17. The access-request flow is unchanged: an incomplete profile is still rejected with `incomplete_profile` and `SolicitarAccesoButton` still shows "Perfil incompleto" with the link to `/portal/perfil`.
18. `/portal/perfil` and the booking-modal `InlineProfileCompletionStep` validate and save exactly as before (only `nombre` and `apellido` mandatory).
19. `/portal/orgs`, the organization directory and the public plan catalog still list a gated organization as one the user belongs to.
20. The organization edit form shows the new label and help text for the toggle.

---

## Implementation Steps

- [ ] Create `src/lib/portal/perfil-completo.ts` with the select constant, row type and the two pure functions
- [ ] Refactor Guard 3 in `solicitudes.service.ts` to use the helper; confirm the access-request flow still behaves the same
- [ ] Extend `TenantAccessDecision` and update every return branch of `canUserAccessTenant`
- [ ] Add the `profileIncomplete` redirect to `src/app/portal/orgs/[tenant_id]/layout.tsx`, after the existing checks
- [ ] Add the `requiredFields` option to `usePerfil` and the extra validation in `submit()`
- [ ] Build `CompletarPerfilPage` and export it from `src/components/portal/perfil/index.ts`
- [ ] Create `src/app/portal/completar-perfil/[tenant_id]/page.tsx` with its four guards
- [ ] Update the toggle label and help text in `EditTenantForm.tsx`; add the breadcrumb label
- [ ] Verify the `usuarios` own-row policies and that a member of a private tenant can read `tenants.requiere_perfil_completo`
- [ ] Test manually: invitation with a new account, invitation with an existing account, provisioned account, existing member after enabling the flag, each of the three roles, flag off, two organizations with different settings, direct deep link, save failure
- [ ] Run `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: The redirect is decided in server components (`TenantLayout` and the completion page), so it cannot be skipped from the browser by navigating. It is not an authorization boundary: RLS is unchanged and a member's direct Supabase calls are not blocked. The completion page never accepts a user id from the URL — it only ever reads and writes the session user's own `usuarios` row through existing RLS. No service-role client is used.
- **Performance**: At most two additional single-row primary-key reads per request to a tenant route (`tenants` always, `usuarios` only when the flag is on), deduplicated across nested layouts by `getCachedTenantAccess`. No new index is needed.
- **Accessibility**: Every input on the completion screen has an associated `<label>`; field errors are linked with `aria-describedby` and announced; the save error banner uses `role="alert"`; the submit button reflects the pending state with `disabled` and the "Guardando…" text; the screen is fully operable by keyboard.
- **Error handling**: Missing fields surface as inline field errors. A failed save surfaces as an inline alert on the same screen. A failed profile load shows the error card with "Reintentar". A failed read of the tenant flag or profile inside `canUserAccessTenant` is logged and treated as "not incomplete" so members are not locked out by a transient error.
