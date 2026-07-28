## Why

Organization plans can only be discovered and acquired from inside a tenant (`/portal/orgs/[tenant_id]/gestion-planes`, behind the membership gate), so a user who does not belong to a club has no way to buy anything from it — and therefore can never hold the service units that public trainings may require. At the same time the current RLS is the opposite of restrictive: `planes`, `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina` and `servicios` all expose `SELECT ... using (true)`, and `suscripciones_insert_own` only checks `atleta_id = auth.uid()` — so today every authenticated user can already read every plan of every tenant and could subscribe to a private one directly through PostgREST. This change opens the intended public path and closes the unintended one in the same migration.

Source: `projectspec/userstory/us0093-public-plans-for-non-members.md` (US-0093).

## What Changes

- **New `planes.es_publico` flag** (`boolean not null default false`) configurable by the tenant administrator from the existing plan form, surfaced as a `Público` badge in the plans table. Every pre-existing plan stays private.
- **Public plan catalog for non-members**: a "Ver planes" button on every organization card in `/portal/orgs` opens a modal listing that tenant's public + active plans, their active subtypes (price, `vigencia_dias`) and the services + unit counts each subtype grants, with a single search box matching plan name/description/benefits, subtype name **and service name**.
- **Acquisition reuses the existing flow verbatim** — the same `useSuscripcion` hook and `SuscripcionModal` (subtype → payment method → optional proof → `estado: 'pendiente'` → `populate_suscripcion_servicios` RPC → admin validation in `gestion-suscripciones`). No new subscription or payment code path.
- **BREAKING (RLS)**: plan-catalog `SELECT` policies change from `using (true)` to *member of the tenant OR plan is public OR caller already holds a subscription to it*. `suscripciones_insert_own` additionally requires the target plan to be active and either public or belonging to a tenant the caller is a member of.
- **BREAKING (route)**: `Mis Suscripciones` moves from the tenant-scoped `/portal/orgs/[tenant_id]/mis-suscripciones-y-pagos` to the portal-level, cross-tenant `/portal/mis-suscripciones`; the old route becomes a redirect and the menu item moves from the `usuario` tenant menu to the portal-level menu. Cards gain an organization chip and the filter bar gains an "Organización" filter.
- Acquiring a public plan does **not** grant membership — the buyer stays a non-member and still sees "Solicitar acceso" on the organization card.

## Non-goals

- **Relaxing the `servicio_restriction` publish gate** from US-0089 (`entrenamientos-publicos.service.ts`). This change invalidates its premise — an external buyer now *can* hold service units in a tenant they don't belong to, and `findServiceSubscriptionsToCharge` is already `(tenant_id, atleta_id)`-scoped — but changing published-training behavior established by US-0089/US-0092 belongs to a follow-up change.
- Payment gateway / checkout integration. Acquisition stays "declare payment + upload proof + admin validates".
- Auto-granting `miembros_tenant` membership on purchase.
- Exposing public plans to anonymous (`anon`) visitors on the public landing page — everything here is behind `/portal` and requires a session.
- Adding a stricter global "rol-atleta" gate on the new page. Roles are per-tenant, `portal_role` is hardcoded to `'usuario'` by `portal/bootstrap/route.ts`, and external buyers have no membership at all — a membership-based gate would lock out exactly the users this change creates. The page is self-scoped by `atleta_id = auth.uid()`.
- Pagination of the cross-tenant subscriptions list.

## Capabilities

### New Capabilities
- `public-plans-catalog`: plan-level public visibility flag, the tenant-agnostic public plan catalog (browse + search over plans and services) reachable from the organizations directory, and non-member acquisition through the existing subscription flow.

### Modified Capabilities
- `plan-management`: plans gain an administrator-configurable `es_publico` attribute (form control, table badge, persisted column), and plan-catalog read access becomes membership/public-scoped instead of "any authenticated user".
- `subscription-management`: self-service subscription creation is restricted at the database level to plans the caller may legitimately buy (active, and public or own-tenant); admin-on-behalf creation is unchanged.
- `user-subscriptions-and-payments-view`: the view moves to a portal-level, cross-tenant route, lists subscriptions from every organization with an organization label and filter, and drops the per-tenant `usuario` role gate.

## Impact

**Database** (`supabase/migrations/20260728000100_planes_publicos.sql`)
- `planes`: new `es_publico` column + partial index `idx_planes_es_publico (tenant_id) where es_publico`.
- New `security definer stable` helpers: `get_member_tenants_for_authenticated_user()`, `can_read_plan(uuid)`, `can_read_plan_tipo(uuid)`, `can_read_servicio(uuid)`, `can_subscribe_to_plan(uuid, uuid)`.
- Replaced SELECT policies on `planes`, `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina`, `servicios`; replaced `suscripciones_insert_own`.
- Untouched on purpose: `suscripciones_admin_insert_rls`, `pagos_*`, `tenant_metodos_pago_select_member` (`using (true)` is required by the purchase flow), `disciplinas`/`usuarios` SELECT, and the US-0089 publish trigger.

**Services**
- `src/services/supabase/portal/planes.service.ts` — `es_publico` in select/insert/update, new `getPlanesPublicos(tenantId)`.
- `src/services/supabase/portal/mis-suscripciones.service.ts` — `fetchMisSuscripcionesTenant` replaced by cross-tenant `fetchMisSuscripciones(supabase, userId)` joining `tenants(nombre)`.

**Hooks**
- New `src/hooks/portal/planes-publicos/usePlanesPublicos.ts`.
- `src/hooks/portal/planes/usePlanForm.ts`, `usePlanes.ts` — carry `es_publico`.
- `src/hooks/portal/mis-suscripciones/{useMisSuscripciones,useSubirComprobante}.ts` — moved from `mis-suscripciones-y-pagos/`; tenant filter added.

**Components**
- New slice `src/components/portal/planes-publicos/` — `VerPlanesButton.tsx`, `PlanesPublicosModal.tsx`, `PlanPublicoCard.tsx`, `index.ts`.
- `src/components/portal/tenant/TenantIdentityCard.tsx` — new optional `secondaryAction` slot; `TenantDirectoryList.tsx` wires the button on both branches.
- `src/components/portal/planes/PlanFormModal.tsx` (public checkbox), `PlanesTable.tsx` (badge).
- `src/components/portal/mis-suscripciones/*` — moved slice, org chip + org filter.

**Pages / routing**
- New `src/app/portal/(atleta)/layout.tsx` and `src/app/portal/(atleta)/mis-suscripciones/page.tsx`.
- `src/app/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx` → redirect.
- `src/types/portal.types.ts` — menu item moved to the `!tenantId` branch.

**Types**
- `planes.types.ts` (`es_publico`), new `planes-publicos.types.ts`, `mis-suscripciones.types.ts` (renamed, `tenant_id` + `tenant_nombre`).

**Docs**
- `projectspec/03-project-structure.md` — new `planes-publicos` slice, renamed `mis-suscripciones` slice, new `(atleta)` portal route group, new DB helper functions.

**Regression surface**: `gestion-planes` (admin CRUD + read-only view), `gestion-servicios`, plan-subtype service assignment, `gestion-suscripciones`, booking with service-unit deduction, and training restriction editing all read tables whose SELECT policies change — each must be re-verified after the migration.

## Implementation Plan

1. Write and apply the migration; verify every new policy with SQL as tenant admin, tenant `usuario` member, non-member with a subscription, and non-member without one.
2. Types: `planes.types.ts`, new `planes-publicos.types.ts`, renamed `mis-suscripciones.types.ts`.
3. Services: `planes.service.ts` (`es_publico` + `getPlanesPublicos`), `mis-suscripciones.service.ts` (cross-tenant fetch).
4. Hooks: `usePlanesPublicos`, `usePlanForm`/`usePlanes` pass-through, moved `mis-suscripciones` hooks with the tenant filter.
5. Components (page → component → hook → service order per slice): `PlanPublicoCard` → `PlanesPublicosModal` → `VerPlanesButton`; `TenantIdentityCard.secondaryAction` + `TenantDirectoryList`; `PlanFormModal` checkbox + `PlanesTable` badge; moved `mis-suscripciones` components.
6. Pages: `(atleta)` group + `/portal/mis-suscripciones`; redirect the old tenant route; update `resolvePortalMenu`.
7. Verify end-to-end (non-member browses → searches by service name → acquires → admin validates → subscription + units visible in `/portal/mis-suscripciones`), run the regression pass, then `npm run type-check`, `npm run lint`, `npm test`.
8. Update `projectspec/03-project-structure.md`.
