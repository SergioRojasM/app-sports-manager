## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/admin-invite-tenant-members` from `develop`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Security Foundation (before any feature code)

- [x] 2.1 Audit the current `miembros_tenant` SELECT policies and `usuarios` UPDATE policies (latest definitions across `supabase/migrations/`) and record findings in this task: any policy that lets an admin read memberships or update profiles outside tenants they administer
  - Findings: `miembros_tenant_select_authenticated` was `USING (true)` (any authenticated user read every membership of every tenant) — **over-broad**. `v_miembros_equipo` was not `security_invoker`, so it bypassed RLS and exposed all tenants' members — **over-broad**. `usuarios_update_admin` is already scoped to members of the admin's tenants (OK). Noted, not changed: `usuarios_select_authenticated` is `USING (true)` (global profile directory) and `miembros_tenant_insert_admin` lets an admin insert any existing user into their tenant (used by `aceptarSolicitud`); both are outside this change's scope.
- [x] 2.2 If 2.1 finds over-broad policies, add migration `supabase/migrations/<ts>_tighten_miembros_usuarios_rls.sql` scoping them to `get_admin_tenants_for_authenticated_user()` / the caller's own rows; skip with a note if none are found
  - Added `20260916120000_tighten_miembros_tenant_select_rls.sql`: SELECT limited to own rows or tenants from `get_trainer_or_admin_tenants_for_authenticated_user()` (every app read site is own-row or trainer/admin in-tenant; all DB functions reading the table are `SECURITY DEFINER`); `v_miembros_equipo` set to `security_invoker = true`.
- [x] 2.3 Apply migrations to the **local** Supabase stack only (`supabase migration up` or `supabase db reset`); never `supabase db push`
- [x] 2.4 Verify locally with SQL (as two different admin users of two tenants) that an admin of tenant A cannot select memberships of tenant B nor update a `usuarios` row that has no membership in A

## 3. Database — Entitlements (`tenant-platform-entitlements`)

- [x] 3.1 Create migration `<ts>_admin_tenants_entitlements.sql`: table `public.admin_tenants` (PK/FK `tenant_id` on delete cascade, `aprovisionamiento_administrado_habilitado boolean not null default false`, timestamps), `updated_at` trigger, idempotent backfill of one row per tenant
- [x] 3.2 In the same migration add `after insert on public.tenants` trigger `ensure_admin_tenant_row` using `on conflict (tenant_id) do nothing`
- [x] 3.3 Enable RLS with only a SELECT policy scoped to `get_admin_tenants_for_authenticated_user()`; no INSERT/UPDATE/DELETE policies; always write `public.admin_tenants` with a non-`admin_tenants` alias
- [x] 3.4 Apply locally and verify: row count equals tenant count, new tenant gets a row, tenant admin reads only own row, tenant admin `update` affects 0 rows

## 4. Database — Pending Activation State (`tenant-member-status`, `tenant-membership-model`)

- [x] 4.1 Create migration `<ts>_miembros_pendiente_activacion.sql`: drop/re-add `miembros_tenant_estado_ck` including `pendiente_activacion`; drop/re-add the `miembros_tenant_novedades.tipo` check including `activacion_cuenta`
- [x] 4.2 In the same migration, `create or replace` `get_admin_tenants_for_authenticated_user`, `get_member_tenants_for_authenticated_user`, and `get_trainer_or_admin_tenants_for_authenticated_user` adding `mt.estado <> 'pendiente_activacion'` (preserve existing signatures, return types, `security definer`, and `search_path`)
- [x] 4.3 Run a catalog audit query over `pg_policies` (`qual`/`with_check`), `pg_views.definition`, and `pg_proc.prosrc` for references to `miembros_tenant` that grant capability to `auth.uid()` without going through the three helpers; record every hit in this task and add the `estado <> 'pendiente_activacion'` predicate to each in the same migration
  - Audit hits (20 policies + 6 functions): **rewritten to use `get_member_tenants_for_authenticated_user()`** — policies `entrenamiento_categorias_select_authenticated`, `grupo_categorias_select_authenticated`, `eg_restricciones_select_authenticated`, `entrenamiento_plantillas_select_authenticated`, `ent_restricciones_select_authenticated`, `entrenamientos_select_authenticated`, `nivel_disciplina_select_authenticated`, `usuario_nivel_select_authenticated`, `reservas_select_authenticated`, `reservas_insert_authenticated`; functions `can_read_plan`, `can_subscribe_to_plan`. **Already safe (require `mt.estado = 'activo'`)** — storage `org_member_read`, `org_admin_upload/update/delete`, `athlete_upload_own_receipts`, `athlete_update_own_receipts`, `athlete_upload_own_formulario_respuestas`, `staff_upload_formulario_respuestas_on_behalf`, `formulario_respuestas_select_staff_or_owner`. **Covered by helper** — `usuarios_update_admin` (caller authz via `get_admin_tenants_…`; direct join is on the target user). **Not capability grants** — `evaluar_suspensiones_cron` / `reactivar_suspensiones_expiradas` (filter `activo`/`suspendido`), `handle_new_auth_user`; `cambiar_estado_miembro` redefined in the invitations migration (4.4). Equivalence verified: new vs old policy row counts identical for admin/trainer/athlete/outsider (36/36); pending member sees only own membership row in the pending tenant.
- [x] 4.4 Update `cambiar_estado_miembro`: raise `22023` when `p_nuevo_estado = 'pendiente_activacion'` or when the current estado is `pendiente_activacion` and target is not `activo`/`inactivo`; when leaving pending for `activo`, set the linked `altas_administradas_tenant` row to `activada` (guard with `to_regclass` or order the migration after section 5)
  - Redefined at the end of `20260916120300_invitaciones_y_altas_administradas.sql` (after `altas_administradas_tenant` exists); the caller-admin check now goes through `get_admin_tenants_for_authenticated_user()`, so a pending administrator is also rejected with `42501`.
- [x] 4.5 Apply locally and verify with SQL: check constraints accept/reject values per spec; a user who is `pendiente_activacion` in tenant B and `activo` in A gets only A from `get_member_tenants_for_authenticated_user()`; `cambiar_estado_miembro` transition matrix (pending→activo ok, pending→inactivo ok, pending→suspendido 22023, any→pendiente_activacion 22023)

## 5. Database — Invitations and Provisioned Accounts (`tenant-member-invitations`, `admin-provisioned-accounts`, `server-privileged-provisioning`)

- [x] 5.1 Create migration `<ts>_invitaciones_y_altas_administradas.sql` with table `invitaciones_tenant` (columns, checks, partial unique index on `(tenant_id, lower(email))` for active states, list/recipient/activation indexes, `updated_at` trigger) and RLS with admin-only SELECT
- [x] 5.2 Add table `altas_administradas_tenant` (columns, checks, no credential columns, partial unique index for `reservada`/`pendiente_activacion`) with admin-only SELECT RLS
- [x] 5.3 Add view `v_invitaciones_tenant_admin` (no `security definer`, excludes `canal_entrega` and `codigo_error`, joins role name)
- [x] 5.4 Add a shared internal helper (e.g. `_assert_admin_and_assignable_role(p_tenant_id, p_rol_id)`) raising `42501` / `22023`, used by all reserving RPCs
- [x] 5.5 Add `crear_invitacion_tenant` (auth, role, email normalization/validation, per-admin 30/h and per-tenant 200/day `RATE_LIMIT`, idempotent upsert on active invitation)
- [x] 5.6 Add `reenviar_invitacion_tenant` (auth, 3/h per invitation limit, allowed states, renews `expires_at`, `expirada`→`pendiente`) and `cancelar_invitacion_tenant` (auth, allowed states, idempotent on `cancelada`, `22023` from terminal states)
- [x] 5.7 Add `registrar_envio_invitacion(p_invitacion_id, p_canal)` and `registrar_fallo_invitacion(p_invitacion_id, p_codigo)`; `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`
- [x] 5.8 Add `get_mis_invitaciones_pendientes()` and `get_invitacion_para_aceptar(p_invitacion_id)` matching the caller's confirmed `auth.users.email` case-insensitively
- [x] 5.9 Add `activar_invitacion_tenant(p_invitacion_id)` (row lock, state/expiry/email checks with distinct error messages `EXPIRED`/`CANCELLED`/`EMAIL_MISMATCH`, ensure `usuarios`, conflict-safe `activo` membership insert that never changes an existing `rol_id`, mark `aceptada`, return tenant and membership ids)
- [x] 5.10 Add `reservar_alta_administrada` (auth, role, re-read `public.admin_tenants` flag → `FEATURE_DISABLED`, 20/day per tenant `RATE_LIMIT`, insert `reservada`)
- [x] 5.11 Add `completar_alta_administrada(p_alta_id, p_usuario_id)` and `registrar_fallo_alta(p_alta_id, p_codigo)` granted to `service_role` only; completion inserts a `pendiente_activacion` membership conflict-safely and updates the alta
- [x] 5.12 Add `activar_alta_administrada(p_tenant_id)` (requires caller's pending membership else `P0002`; sets `activo`, alta `activada`, inserts novedad `activacion_cuenta` with `registrado_por = auth.uid()`)
- [x] 5.13 Schedule pg_cron job `expirar-invitaciones-tenant` (daily) that sets `expirada` on active invitations past `expires_at`; do not touch provisioned accounts
- [x] 5.14 Apply locally and verify with SQL: duplicate/idempotent invite, email mismatch, expired and cancelled acceptance rejected, concurrent acceptance (two sessions) yields one membership, existing member role not escalated, browser `authenticated` role cannot execute service-role RPCs, rate limits raise `RATE_LIMIT`, `FEATURE_DISABLED` when flag is off
  - Verified (rolled-back transaction + one committed/cleaned concurrency run): all authorization, idempotency, rate-limit, recipient, cancel/expire/resend, provisioning, activation and transition checks pass; two concurrent `activar_invitacion_tenant` sessions return the same membership and create exactly one row; `anon` cannot execute any new function; outcome-recording functions are `service_role` only. Fixed during verification: `#variable_conflict use_column` added to the three functions returning named columns (`ON CONFLICT (tenant_id, …)` ambiguity). Additions beyond the task text: `invitaciones_tenant_envios` (send-attempt log backing the per-invitation resend limit; re-submitting an active invitation counts as a resend) and abandoned `reservada` altas older than 10 minutes are marked `fallida/abandonada` so a retry is not blocked.

## 6. Types (`src/types/portal/`)

- [x] 6.1 Create `invitaciones.types.ts`: `InvitacionEstado`, `InvitacionRow` (admin view shape), `MiInvitacionPendiente`, `InvitacionParaAceptar`, `AgregarMiembroInput`, `AgregarMiembroModo`, `AltaAdministradaResultado`, and `InvitacionesServiceError` with codes `forbidden | rate_limited | not_found | expired | cancelled | email_mismatch | feature_disabled | account_exists | unexpected`
- [x] 6.2 Extend `equipo.types.ts`: add `pendiente_activacion` to `MiembroEstado` and `activacion_cuenta` to `MiembroNovedadTipo`; fix every exhaustive `Record<MiembroEstado, …>` / switch that the compiler flags
- [x] 6.3 Extend `tenant.types.ts`: add `AdminTenantEntitlements` and `pendingActivation: boolean` on `TenantAccessDecision`

## 7. Server-only Libraries and Service-Role Hardening

- [x] 7.1 Confirm `server-only` resolves in this Next.js version; if not, install the `server-only` package
  - Next.js 16 aliases `server-only` natively (`next/dist/build/create-compiler-aliases.js`); no package install needed.
- [x] 7.2 Confirm no client module imports `@/services/supabase/server` (grep `'use client'` files, `src/components`, `src/hooks`); then add `import 'server-only'` to `src/services/supabase/server.ts`
- [x] 7.3 Harden `createServiceClient()`: throw when `SUPABASE_SERVICE_ROLE_KEY` is missing/empty; pass `auth: { persistSession: false, autoRefreshToken: false }`
- [x] 7.4 Add `src/lib/portal/password-generator.ts` (`server-only`, `crypto.randomInt`, 16 chars, at least one lowercase/uppercase/digit/symbol, shuffled)
- [x] 7.5 Add `src/lib/portal/audit-log.ts` (`server-only`) exposing `logAuditEvent({ evento, tenant_id, actor_id, objetivo_id, resultado, codigo })` with a typed allow-list, one JSON line via `console.info` (error results via `console.error`)
- [x] 7.6 Add a server helper (e.g. `src/lib/portal/privileged-route.ts`, `server-only`) that maps Postgres errors (`42501`, `22023`, `P0002`, `P0001` messages `RATE_LIMIT`/`FEATURE_DISABLED`/`EXPIRED`/…) to HTTP status + `InvitacionesServiceError` code, and builds the invite `redirectTo` from `APP_URL`
  - Implemented as `src/lib/portal/privileged-route.ts` (server-only: request parsing, `APP_URL` redirect builder, email-exists detection, no-store responses) plus `src/lib/portal/invitaciones-errors.ts` (shared, client-safe: SQLSTATE/message → HTTP status + code, and Spanish user messages) so the browser service maps RPC errors identically. Added codes `unauthenticated`, `invalid_request`, `already_accepted` to the error union.
- [x] 7.7 Document `SUPABASE_SERVICE_ROLE_KEY` and `APP_URL` (`http://localhost:3000` locally, `https://www.grit-arena.com` in production) in `.env.example` under a "server-only — never NEXT_PUBLIC_" comment, and set them in `.env.local`

## 8. API Routes (`src/app/api/portal/orgs/[tenant_id]/`)

- [x] 8.1 `invitaciones/route.ts` `POST`: `getUser()` → 401; validate body `{ email, rol_id, nombre?, nota? }`; `crear_invitacion_tenant` via session client; `inviteUserByEmail` via service client with `redirectTo` from `APP_URL`; on success `registrar_envio_invitacion(id,'email')`, on "already registered" `registrar_envio_invitacion(id,'in_app')`, on other errors `registrar_fallo_invitacion`; respond `202 { invitacion_id }` identically in both delivery branches; audit log
- [x] 8.2 `invitaciones/[invitacion_id]/reenviar/route.ts` `POST`: `reenviar_invitacion_tenant` via session client, repeat the invite with the same delivery-branch handling and indistinguishable `202`; audit log
- [x] 8.3 `miembros/aprovisionar/route.ts` `POST`: reject any `password` field with `422`; `reservar_alta_administrada`; generate password; `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } })`; on existing account → `registrar_fallo_alta` + `409 account_exists`; `completar_alta_administrada`; on failure `deleteUser` + `registrar_fallo_alta('compensado'|'compensacion_fallida')` + `500`; success `201 { miembro_id, contrasena_temporal }` with `Cache-Control: no-store`; audit log without password or email
- [x] 8.4 Ensure all three routes return `405` for non-`POST` methods, never echo raw Supabase/Auth error messages, and never read `Host`/`X-Forwarded-Host` for URLs
  - Only `POST` is exported, so Next.js answers other methods with `405`; errors go through `mapInvitacionesDbError`/allow-listed codes; URLs come from `APP_URL` only.
- [x] 8.5 Add the invitation callback origins to the local Supabase Auth redirect allow-list (`supabase/config.toml` `additional_redirect_urls`: `http://localhost:3000/**`); note in the PR that `https://www.grit-arena.com/**` must be present in the remote project
  - `supabase/config.toml`: `additional_redirect_urls` gains `http://127.0.0.1:3000/**` and `http://localhost:3000/**`; `[auth.email.template.invite]` enabled. Local stack must be restarted (`supabase stop && supabase start`) to pick up config changes.
- [x] 8.6 (added during implementation) Probe showed admin invites return the session in the URL fragment, unreadable by `/auth/callback`. Per decision, customize the Invite template (`supabase/templates/invite.html`) to link to the new server route `src/app/auth/confirm/route.ts` (`verifyOtp` → cookie session → `/auth/update-password?next=…`); `redirectTo` simplified to `${APP_URL}/portal/invitaciones/{id}`; delivery shared in `src/lib/portal/invitaciones-delivery.ts`
- [x] 8.7 (added) Flag in the PR: `.env.local` `SUPABASE_SERVICE_ROLE_KEY` currently holds a Supabase personal access token (`sbp_…`), not a service-role key; production and local must use the project's service-role key. Production deploy also requires pasting `supabase/templates/invite.html` into the dashboard Invite template
  - Included in the PR description deploy checklist.

## 9. Slice — Route Guard for Pending Members (`tenant-role-route-guard`)

- [x] 9.1 Page: update `src/app/portal/orgs/[tenant_id]/layout.tsx` (`TenantLayout`) to redirect to `/portal/activar-cuenta/[tenant_id]` when `pendingActivation` is true, else keep the `/portal/orgs` redirect
- [x] 9.2 Hook: confirm `useTenantAccess` reports `allowed: false` for pending members (no change expected beyond the service)
- [x] 9.3 Service: update `tenantService.canUserAccessTenant` to select `estado` and return `allowed: false, role: null, pendingActivation: true` for `pendiente_activacion`; `pendingActivation: false` otherwise
- [x] 9.4 Types: covered by 6.3

## 10. Slice — Admin: Agregar Miembro and Invitaciones (`team-management`, `tenant-member-invitations`, `admin-provisioned-accounts`)

- [x] 10.1 Page: update `EquipoPage.tsx` — add `'invitaciones'` to `ActiveTab`, the Invitaciones tab button with active-count badge after Bloqueados, the "Agregar miembro" button (`person_add`) left of "Configurar Suspensión" and at the top of the Invitaciones tab, and wiring for `AgregarMiembroModal` and `ContrasenaTemporalModal` (refresh invitations after invite, refresh members after provisioning)
- [x] 10.2 Component: `gestion-invitaciones/AgregarMiembroModal.tsx` following `AceptarSolicitudModal`/`CambiarEstadoModal` styles — Correo, Rol (from `useEquipo().roles`), Nombre, Nota (≤500), Modo choice only when entitled with amber security notice, active-member email warning from `useEquipo().members`, disabled Confirmar until valid, loading and inline error states
- [x] 10.3 Component: `gestion-invitaciones/ContrasenaTemporalModal.tsx` — email, monospace password with *Copiar*, required acknowledgement checkbox gating *Cerrar*, ignore backdrop/Escape before acknowledgement, clear password from parent state on close
- [x] 10.4 Component: `gestion-invitaciones/InvitacionesTab.tsx` mirroring `SolicitudesTab` (glass loading/error/empty states, estado `<select>` defaulting to active)
- [x] 10.5 Component: `gestion-invitaciones/InvitacionesTable.tsx` mirroring `SolicitudesTable` (Correo, Rol, Estado, Expira, Creada, Acciones; *Reenviar* and inline-confirm *Cancelar* only for `pendiente`/`enviada`/`expirada`)
- [x] 10.6 Component: `gestion-invitaciones/InvitacionEstadoBadge.tsx` mirroring `SolicitudEstadoBadge` (`pendiente`/`enviada` both amber "Pendiente")
- [x] 10.7 Component: update `EquipoStatusBadge.tsx` (sky "Pendiente de activación") and `EquipoHeaderFilters.tsx` (new chip)
- [x] 10.8 Component: update `CambiarEstadoModal.tsx` — Activo/Inactivo only for pending members, never offer pending as a target, add "Activación de cuenta" tipo
- [x] 10.9 Hook: `hooks/portal/gestion-invitaciones/useInvitacionesAdmin.ts` (`invitaciones`, `loading`, `error`, `activeCount`, `reenviar`, `cancelar`, `refresh`)
- [x] 10.10 Hook: `hooks/portal/gestion-invitaciones/useAgregarMiembro.ts` (`invitar`, `aprovisionar`, `isSubmitting`, `error`, `resultadoAlta` cleared by `limpiarResultado`)
  - Exposed as a single `agregar(modo, input)` (instead of separate `invitar`/`aprovisionar`) plus `isSubmitting`, `error`, `limpiarError`, `resultadoAlta`, `limpiarResultado`.
- [x] 10.11 Hook: `hooks/portal/gestion-invitaciones/useTenantEntitlements.ts` (`entitlements`, `loading`, `error`, fail-closed)
- [x] 10.12 Service: `services/supabase/portal/invitaciones.service.ts` — `getInvitacionesAdmin` (view), `cancelarInvitacion` (RPC), `crearInvitacion` / `reenviarInvitacion` / `aprovisionarMiembro` (`fetch` to API routes), mapping responses to `InvitacionesServiceError`
- [x] 10.13 Service: add `getTenantEntitlements` to `tenant.service.ts`; update `equipo.service.ts` mappings for the new estado and tipo
- [x] 10.14 Types: covered by 6.1 and 6.2

## 11. Slice — Recipient: Accept Invitation and Activate Account (`tenant-member-invitations`, `admin-provisioned-accounts`)

- [x] 11.1 Page: `src/app/portal/invitaciones/[invitacion_id]/page.tsx` rendering `AceptarInvitacionPage`
- [x] 11.2 Page: `src/app/portal/activar-cuenta/[tenant_id]/page.tsx` rendering `ActivarCuentaPage`
- [x] 11.3 Page: update `src/app/auth/update-password/page.tsx` to read `searchParams.next`, validate it (starts with `/`, not `//`), and pass it to `UpdatePasswordForm`
- [x] 11.4 Component: update `UpdatePasswordForm.tsx` to redirect to the validated `nextPath` after a successful update (default behavior unchanged when absent)
  - Portal destinations go through `/portal/bootstrap?next=…` (same as `/auth/callback`), because `PortalLayout` otherwise redirects cookie-less sessions to `/portal/inicio` and the invitee would lose the acceptance page.
- [x] 11.5 Component: `components/portal/invitaciones/AceptarInvitacionPage.tsx` (portal shell, tenant/role/expiry card, *Aceptar invitación*, explicit expired/cancelled/accepted/email-mismatch states, route to `/portal/orgs/[tenant_id]` on success)
- [x] 11.6 Component: `components/portal/invitaciones/ActivarCuentaPage.tsx` (new password + confirmation, inline errors, route into tenant on success)
- [x] 11.7 Component: `components/portal/invitaciones/InvitacionesPendientesSection.tsx` and render it in `PortalTenantsPage.tsx` above the organization grid when there are invitations
- [x] 11.8 Hook: `hooks/portal/invitaciones/useMisInvitaciones.ts`, `useAceptarInvitacion.ts`, `useActivarCuenta.ts` (call `activar_alta_administrada` only after `updatePassword` succeeds)
- [x] 11.9 Service: add `getMisInvitacionesPendientes`, `getInvitacionParaAceptar`, `aceptarInvitacion`, `activarAltaAdministrada` to `invitaciones.service.ts`
- [x] 11.10 Types: covered by 6.1

## 12. Slice — Admin Athlete Pickers (`training-booking`, `subscription-management`)

- [x] 12.1 Component: in `ReservaFormModal.tsx` (line ~131) replace `.neq('estado', 'inactivo')` with `.not('estado', 'in', '(inactivo,pendiente_activacion)')` (filter change only; do not refactor the inline query)
- [x] 12.2 Hook: in `useCrearSuscripcion.ts` (line ~166) apply the same filter change

## 13. Manual Verification (local stack)

- [x] 13.1 Static check: `SUPABASE_SERVICE_ROLE_KEY` and `@/services/supabase/server` appear only in server modules — never in `'use client'` files, `src/components`, or `src/hooks`
  - Only `src/services/supabase/server.ts` reads the key; `@/services/supabase/server` and the server-only libs are imported solely by server pages/layouts/route handlers — no `'use client'`, `src/components`, or `src/hooks` importer.
- [x] 13.2 Invitation, new account: invite an unused email → email arrives (local Inbucket/Mailpit) → set password → acceptance page → *Aceptar* → lands in tenant with the invited role; Invitaciones tab shows "Aceptada"
  - Verified in Chromium (Playwright): invite → custom email → `/auth/confirm` → `/auth/update-password?next=…` → `/portal/bootstrap` → acceptance page → member `activo/usuario`; admin list shows ACEPTADA; revisiting shows "Invitación aceptada". Found & fixed: relative redirects in `/auth/confirm`; local `site_url` set to `http://localhost:3000` (dev server reports `localhost`, so a 127.0.0.1 email link lost the cookie at `/portal/bootstrap`).
- [x] 13.3 Invitation, existing account: invite a registered email → same `202` body as 13.2 → no email → user sees it under "Invitaciones pendientes" on `/portal/orgs` → accepts; confirm an existing member's role is not escalated
  - Identical `202` body; no email for the registered address; "Invitaciones pendientes" on `/portal/orgs`; accepted as Entrenador.
- [x] 13.4 Invitation lifecycle: duplicate invite returns same id; resend renews expiry; cancel then attempt acceptance fails with a clear message; manually expire (`update expires_at`) and confirm acceptance is rejected and resend revives it; wrong-user acceptance shows email mismatch
  - Duplicate (case-insensitive) reused the same id and updated the role; 3rd send → `429` with user message; inline cancel → CANCELADA; expired page and other-email page show explicit messages without an accept button (DB-level cancel/expire/resend/mismatch covered in 5.14).
- [x] 13.5 Entitlement off: Modo selector hidden; direct `POST /miembros/aprovisionar` returns `403 feature_disabled`
  - Modo selector hidden; direct POST → `403 feature_disabled`; body with `password` → `422`; GET → `405`; no session → `401`.
- [x] 13.6 Entitlement on (set via SQL): provision → password modal cannot be closed before acknowledgement → member shows "Pendiente de activación" → member logs in, is redirected to `/portal/activar-cuenta/[tenant_id]` → changes password → enters tenant as `activo`
  - Password modal not dismissible via Escape/backdrop until acknowledged; 16-char password; removed from DOM on close; login → redirected to `/portal/activar-cuenta/[tenant_id]`; min-length/mismatch errors; activation → `activo`, alta `activada`, novedad `activacion_cuenta` by self; temporary password no longer valid.
- [x] 13.7 Pending denial: while pending, direct browser queries for tenant-scoped tables return nothing and all `/portal/orgs/[tenant_id]/*` routes redirect to activation
  - Pending user's REST reads of reservas/other members/member-only trainings return 0; `crear_invitacion_tenant` → `42501`; tenant and admin routes redirect to activation.
- [x] 13.8 Admin activation: activate a pending member from `CambiarEstadoModal` (only Activo/Inactivo offered); novedad `activacion_cuenta` recorded
  - Options limited to Activo/Inactivo; activation recorded `activacion_cuenta` by admin; alta `activada`; "Pendiente de activación" chip filters correctly.
- [x] 13.9 Pickers: pending member absent from booking and create-subscription pickers; appears after activation; `mora`/`suspendido` still present
  - Picker queries (same PostgREST filters as the UI) return 0 rows for the pending member and 1 after activation.
- [x] 13.10 Provisioning conflicts and compensation: provisioning an existing email returns `409 account_exists`; simulate `completar_alta_administrada` failure (temporarily) and confirm the Auth user is deleted and alta is `fallida`/`compensado`
  - Existing account → `409 account_exists` with the Spanish message; forced `completar_alta_administrada` failure (temporary revoke) → `500 unexpected`, Auth user deleted, alta `fallida/compensado`, no membership; grant restored.
- [x] 13.11 Regression: self-service access request (Solicitudes) accept/reject/block still works; Equipo, Solicitudes, and Bloqueados tabs unchanged; signup and password reset flows unchanged
  - Solicitud created by requester and accepted in the admin UI → `activo/usuario`; Equipo/Solicitudes/Bloqueados tabs render; athlete inicio and tenant pages load; signup/forgot/login unchanged; update-password without session still redirects to forgot-password.
- [x] 13.12 Check server logs contain no passwords, emails, tokens, or raw Auth errors during 13.2–13.10
  - 12 audit lines, keys limited to `tipo, at, evento, tenant_id, actor_id, objetivo_id, resultado, codigo`; 0 occurrences of test emails, passwords, tokens, or raw Auth messages in the server log. All `*.verify@example.com` fixtures removed and every entitlement flag reset to `false`.

## 14. Documentation

- [x] 14.1 Update `projectspec/03-project-structure.md`: add the new `app/api/portal/orgs/[tenant_id]/…` delivery slice, `gestion-invitaciones` and `invitaciones` feature slices (components, hooks, service, types), `src/lib/portal/password-generator.ts` and `audit-log.ts`, and annotate modified files
- [x] 14.2 Add the new `SECURITY DEFINER` functions (`crear_invitacion_tenant`, `reenviar_invitacion_tenant`, `cancelar_invitacion_tenant`, `registrar_envio_invitacion`, `registrar_fallo_invitacion`, `get_mis_invitaciones_pendientes`, `get_invitacion_para_aceptar`, `activar_invitacion_tenant`, `reservar_alta_administrada`, `completar_alta_administrada`, `registrar_fallo_alta`, `activar_alta_administrada`, `ensure_admin_tenant_row`) and the updated helpers/`cambiar_estado_miembro` to the "PL/pgSQL SECURITY DEFINER Functions" table (US-0114)
- [x] 14.3 Add `expirar-invitaciones-tenant` to the "pg_cron Scheduled Jobs" table and `SUPABASE_SERVICE_ROLE_KEY` / `APP_URL` to the "Environment Variables" section

## 15. Finalize

- [x] 15.1 Run type-check (`npx tsc --noEmit`), lint (`npm run lint`), and tests (none configured — record that); fix failures; do **not** run the build
  - `npx tsc --noEmit` clean; `npm run lint`: repo-wide 18 errors / 18 warnings, none introduced — the only findings in touched files are two pre-existing `no-unused-vars` warnings (`EquipoPage.tsx` `isCambiandoEstado`, `useCrearSuscripcion.ts:314`); no test runner is configured; build not run.
- [x] 15.2 Write the commit message and pull request description summarizing the change, referencing US-0114, listing the local-only migrations, required env vars, the remote Supabase redirect allow-list entry for `https://www.grit-arena.com/**`, and the rollout note that `aprovisionamiento_administrado_habilitado` starts `false` for every tenant
  - Commit message and PR description drafted (not committed/pushed).
