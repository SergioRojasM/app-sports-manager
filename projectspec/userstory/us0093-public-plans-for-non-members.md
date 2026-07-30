# US-0093 — Public Plans Purchasable by Non-Members

## ID
US-0093

## Name
Expose organization plans publicly and let non-member users acquire them

## As a
Tenant administrator (publisher) and any authenticated platform user who is **not** a member of that organization (buyer)

## I Want
Administrators to be able to flag a plan as **public**, any authenticated user to browse an organization's public plans from a "Ver planes" modal in the organizations directory (with a search box that matches both plans and services), acquire one through the exact same subscription + payment-proof + admin-approval flow that members use today, and then see that subscription in a new cross-tenant **"Mis Suscripciones"** page at portal level.

## So That
Clubs can sell entry-level plans (and the service units those plans carry) to athletes outside their own organization, which is the missing prerequisite for a non-member to hold the services required to reserve public trainings — and each athlete has one place to track every subscription they hold across all organizations.

---

## Description

### Current State

**Data model (verified against `supabase/migrations/`)**

- `planes` (initial migration, evolved by `20260301000200_planes_gestion.sql` and `20260331000100_remove_planes_precio_vigencia_clases.sql`) currently holds: `id`, `tenant_id`, `nombre`, `descripcion`, `beneficios`, `tipo` (modalidad: virtual/presencial/mixto), `activo`, `created_at`, `updated_at`. Price/validity/classes were moved out to `plan_tipos`. Unique key `planes_tenant_nombre_uk (tenant_id, nombre)`. **There is no public/private flag.**
- `plan_tipos` (`20260319000300_plan_tipos.sql`) is the priced subtype: `plan_id`, `tenant_id`, `nombre`, `descripcion`, `precio`, `vigencia_dias`, `clases_incluidas` (legacy), `activo`.
- `servicios` (`20260610000100_servicios_plan_tipos_servicios.sql`) is the per-tenant service catalog; `plan_tipos_servicios (plan_tipo_id, servicio_id, unidades)` assigns service unit entitlements to a subtype (`unidades = NULL` means unlimited).
- `suscripciones` carries `tenant_id`, `atleta_id`, `plan_id`, `plan_tipo_id`, `estado` (`pendiente|activa|vencida|cancelada`), `comentarios`, dates. `suscripcion_servicios` (`20260611000100_suscripcion_servicios.sql`) is the per-subscription unit ledger, populated by the `populate_suscripcion_servicios(p_suscripcion_id, p_plan_tipo_id)` SECURITY DEFINER RPC at creation time.

**RLS as it stands today**

| Table | SELECT policy | Effect |
|-------|---------------|--------|
| `planes` | `planes_select_authenticated` → `using (true)` | **Every** authenticated user can already read **every** plan of **every** tenant |
| `plan_tipos` | `plan_tipos_select_authenticated` → `using (true)` | Same |
| `plan_tipos_servicios` | `..._select_authenticated` → `using (true)` | Same |
| `servicios` | `servicios_select_authenticated` → `using (true)` | Same |
| `planes_disciplina` | `..._select_authenticated` → `using (true)` | Same |
| `suscripciones` | `suscripciones_insert_own` → `with check (atleta_id = auth.uid())` | **Any** authenticated user can already insert a subscription into **any** tenant, member or not |
| `tenant_metodos_pago` | `tenant_metodos_pago_select_member` → `using (true)` | Non-members can already read payment methods (required by the purchase flow — leave as-is) |

So the answer to *"¿pueden los no miembros ver los planes?"* is: **yes, today they can see all of them — public and private alike — and could even subscribe to a private plan by calling PostgREST directly.** The restriction is purely a UI convention (`PlanesRolePage` is only mounted at `/portal/orgs/[tenant_id]/(shared)/gestion-planes`, which is behind the tenant membership gate in `src/app/portal/orgs/[tenant_id]/layout.tsx`). This US therefore both **opens** the intended public path and **closes** the currently over-permissive one.

**UI as it stands today**

- Plans are only reachable at `/portal/orgs/[tenant_id]/gestion-planes` → [PlanesRolePage.tsx](src/components/portal/planes/PlanesRolePage.tsx): `administrador` gets the CRUD `PlanesPage`, everyone else gets [PlanesViewPage.tsx](src/components/portal/planes/PlanesViewPage.tsx) with an "Adquirir" button shown only when `role === 'usuario'`.
- The acquisition flow lives in [useSuscripcion.ts](src/hooks/portal/planes/useSuscripcion.ts) + [SuscripcionModal.tsx](src/components/portal/planes/SuscripcionModal.tsx): pick subtype → pick payment method → optional proof upload → `suscripciones` insert (`estado: 'pendiente'`) → `populate_suscripcion_servicios` RPC → `pagos` insert → optional `uploadPaymentProof`. Admin then validates from `gestion-suscripciones`. **This entire flow is already tenant-agnostic and needs no behavioral change.**
- The organizations directory [TenantDirectoryList.tsx](src/components/portal/tenant/TenantDirectoryList.tsx) renders one [TenantIdentityCard.tsx](src/components/portal/tenant/TenantIdentityCard.tsx) per org: members get an "Ingresar" link, non-members get `SolicitarAccesoButton`. There is no way to look at what an organization sells before joining it.
- "Mis Suscripciones" is tenant-scoped at [mis-suscripciones-y-pagos/page.tsx](src/app/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx), guarded by the `(atleta)` layout (`decision.role !== 'usuario'` → redirect). A non-member buyer would have **no route at all** where their new subscription is visible.

### Proposed Changes

#### 1. `planes.es_publico` flag (admin-configurable)

A new `boolean not null default false` column on `planes`. `false` for every existing row — nothing becomes public by accident. The flag lives on `planes` (not `plan_tipos`): making a plan public exposes **all of its active subtypes and their services**, which matches how the acquisition modal already presents a plan.

The admin toggles it from the existing plan form ([PlanFormModal.tsx](src/components/portal/planes/PlanFormModal.tsx)) with a checkbox labelled **"Plan público"** and helper text *"Los planes públicos pueden ser vistos y adquiridos por personas que no pertenecen a la organización."*. [PlanesTable.tsx](src/components/portal/planes/PlanesTable.tsx) shows a `Público` badge next to the status badge for flagged rows.

#### 2. Tighten the plan-catalog RLS (member OR public OR already-subscribed)

Replace the five `using (true)` SELECT policies listed above with a rule that reads: *you may see a plan if you are a member of its tenant, **or** the plan is public, **or** you already hold a subscription to it.* The third branch is what keeps `Mis Suscripciones` and `gestion-suscripciones` working for an external buyer after an admin later flips `es_publico` back to `false` — without it, that buyer's own subscription card would render with a missing plan name.

`suscripciones_insert_own` is tightened the same way: `atleta_id = auth.uid()` **and** the target plan is active and either belongs to a tenant the user is a member of, or is public. This is the actual enforcement of "non-members can only buy public plans" — the UI filter alone is not a control.

All predicates go through `security definer stable` helper functions (mirroring the existing `get_admin_tenants_for_authenticated_user()` pattern) so that policy expressions never re-enter RLS on the tables they inspect.

#### 3. "Ver planes" entry point in the organizations directory

`TenantIdentityCard` gains an optional `secondaryAction?: React.ReactNode` slot rendered alongside the primary action (it currently supports only `actionLabel`/`actionHref` **or** a single `customAction`, so members could not get two buttons). `TenantDirectoryList` passes a new `<VerPlanesButton tenantId={...} tenantNombre={...} />` as the secondary action for **every** organization card — member and non-member alike.

Clicking it opens `PlanesPublicosModal`: a centered modal listing that organization's public + active plans as cards. Each card shows nombre, modalidad, disciplinas, beneficios, and one row per **active** subtype with `precio` (COP) + `vigencia_dias` + the services it grants (`servicio.nombre × unidades`, or "ilimitado" when `unidades` is `null`).

A single search input at the top filters the list, matching, case- and accent-insensitively, against: plan `nombre`, plan `descripcion`, plan `beneficios`, subtype `nombre`, and **service `nombre`** ("un buscador en planes y servicios"). A plan stays visible if any of its subtypes or any of their services match. Filtering is client-side over the already-loaded catalog (a tenant's public catalog is small — tens of rows at most).

#### 4. Acquisition reuses the existing flow verbatim

The "Adquirir" button on a public plan card opens the **existing** [SuscripcionModal.tsx](src/components/portal/planes/SuscripcionModal.tsx) driven by the **existing** [useSuscripcion.ts](src/hooks/portal/planes/useSuscripcion.ts) hook, instantiated with the browsed `tenantId`. No new subscription/payment code path is introduced: same subtype selection, same payment-method list, same optional proof upload, same `estado: 'pendiente'`, same `populate_suscripcion_servicios` RPC, same admin approval in `gestion-suscripciones`, same duplicate guard (`hasPendingSuscripcion` is keyed by `atleta_id` + `plan_id`, already tenant-agnostic).

"Adquirir" visibility mirrors the in-tenant rule: shown to non-members and to members whose role is `usuario`; hidden for `administrador`/`entrenador` of that tenant (resolved with the existing `useTenantAccess(tenantId)` hook when the modal opens).

#### 5. Move "Mis Suscripciones" to portal level (cross-tenant)

- New route `src/app/portal/(atleta)/mis-suscripciones/page.tsx` (server component) fetching **all** of the user's subscriptions across every tenant, ordered newest-first.
- Each card gains the organization name as a chip, and the filter bar gains an **"Organización"** chip/select alongside the existing subscription-status and payment-status chips.
- The old tenant-scoped route file is replaced by a permanent `redirect('/portal/mis-suscripciones')` so existing links/bookmarks don't 404, and `Mis Suscripciones` is removed from the `usuario` tenant menu and added to the portal-level menu in [portal.types.ts](src/types/portal.types.ts).
- The feature slice is renamed from `mis-suscripciones-y-pagos` to `mis-suscripciones` across components/hooks/types to match the new route.

##### Access rule for the new route — read this before implementing

The requirement is *"únicamente para que el rol-atleta pueda ver sus suscripciones"*. Two facts constrain how literally that can be implemented:

1. Roles in this app are **per-tenant** (`miembros_tenant.rol_id`). There is no global role. The portal-level `portal_role` cookie is **hardcoded to `'usuario'`** for everyone by [bootstrap/route.ts](src/app/portal/bootstrap/route.ts#L41), which is exactly why `resolvePortalMenu(role, undefined)` already treats every user as an athlete outside a tenant.
2. The external buyers this US creates have **no membership at all** — so a guard of the form "must have a `usuario` membership" would lock out precisely the new users the story is for.

**Decision (implement this):** the `(atleta)` route group is an authenticated-only group; the page is self-scoped by `atleta_id = auth.uid()` and therefore leaks nothing to anyone. Users who are only `administrador`/`entrenador` and have never subscribed simply land on the existing empty state. The menu item is added to the `!tenantId` branch unconditionally, consistent with `PUBLIC_TRAININGS_MENU_ITEM`. Do **not** add a `usuario`-membership gate. If a stricter gate is wanted later it needs a global athlete flag propagated through the bootstrap cookie — call it out as a follow-up, don't improvise it here.

### Out of scope (deliberate, do not implement here)

- **Relaxing the `servicio_restriction` publish gate.** [entrenamientos-publicos.service.ts](src/services/supabase/portal/entrenamientos-publicos.service.ts#L48-L57) blocks publishing a training that has servicio-based restrictions, on the US-0089 premise that "a cross-tenant visitor can never hold a service in a tenant they aren't a member of". **This US invalidates that premise** — an external buyer of a public plan now holds `suscripcion_servicios` rows in that tenant, and `findServiceSubscriptionsToCharge` in [reservas.service.ts](src/services/supabase/portal/reservas.service.ts#L611) is already `(tenant_id, atleta_id)`-scoped, so the deduction would work correctly for them. Relaxing the gate (service check + the DB trigger added by US-0089) is the natural follow-up US, but it changes published-training behavior established by US-0089/US-0092 and is not part of the scope requested here.
- Payments/checkout integration — acquisition stays "declare payment + upload proof + admin validates".
- Auto-granting membership on purchase. An external buyer stays a non-member; they get a subscription, not access to the tenant portal. Requesting access remains the separate `SolicitarAccesoButton` flow.
- Exposing public plans to **anonymous** (`anon`) visitors on the public landing page. Everything here is behind `/portal` and requires an authenticated session.

---

## Database Changes

Single migration: `supabase/migrations/20260728000100_planes_publicos.sql`

```sql
begin;

-- ─────────────────────────────────────────────
-- 1. es_publico flag on planes
-- ─────────────────────────────────────────────
alter table public.planes
  add column if not exists es_publico boolean not null default false;

comment on column public.planes.es_publico is
  'When true, the plan (and its active subtypes/services) is visible to and purchasable by users who are not members of the tenant. US-0093.';

-- Partial index: the public catalog query is always (tenant_id, es_publico = true)
create index if not exists idx_planes_es_publico
  on public.planes (tenant_id)
  where es_publico;

-- ─────────────────────────────────────────────
-- 2. Helper functions (SECURITY DEFINER so policy
--    expressions never re-enter RLS)
-- ─────────────────────────────────────────────
create or replace function public.get_member_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql security definer set search_path = public stable
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  where mt.usuario_id = auth.uid();
$$;

-- Readable when: plan is public, OR caller is a member of its tenant,
-- OR caller already holds a subscription to it (keeps historical rows readable
-- after an admin un-publishes the plan).
create or replace function public.can_read_plan(p_plan_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select
    exists (
      select 1
      from public.planes p
      where p.id = p_plan_id
        and (
          p.es_publico
          or p.tenant_id in (
            select mt.tenant_id from public.miembros_tenant mt where mt.usuario_id = auth.uid()
          )
        )
    )
    or exists (
      select 1 from public.suscripciones s
      where s.plan_id = p_plan_id and s.atleta_id = auth.uid()
    );
$$;

create or replace function public.can_read_plan_tipo(p_plan_tipo_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.plan_tipos pt
    where pt.id = p_plan_tipo_id and public.can_read_plan(pt.plan_id)
  );
$$;

-- Readable when: caller is a member of the service's tenant, OR the service is
-- granted by some public plan's subtype, OR the caller already holds units of it.
create or replace function public.can_read_servicio(p_servicio_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select
    exists (
      select 1 from public.servicios sv
      where sv.id = p_servicio_id
        and sv.tenant_id in (
          select mt.tenant_id from public.miembros_tenant mt where mt.usuario_id = auth.uid()
        )
    )
    or exists (
      select 1
      from public.plan_tipos_servicios pts
      join public.plan_tipos pt on pt.id = pts.plan_tipo_id
      join public.planes     p  on p.id  = pt.plan_id
      where pts.servicio_id = p_servicio_id and p.es_publico
    )
    or exists (
      select 1
      from public.suscripcion_servicios ss
      join public.suscripciones su on su.id = ss.suscripcion_id
      where ss.servicio_id = p_servicio_id and su.atleta_id = auth.uid()
    );
$$;

-- Purchase authorization: the plan must be active and either public or
-- belong to a tenant the caller is a member of.
create or replace function public.can_subscribe_to_plan(p_plan_id uuid, p_tenant_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.planes p
    where p.id = p_plan_id
      and p.tenant_id = p_tenant_id
      and p.activo
      and (
        p.es_publico
        or p.tenant_id in (
          select mt.tenant_id from public.miembros_tenant mt where mt.usuario_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.get_member_tenants_for_authenticated_user()      to authenticated;
grant execute on function public.can_read_plan(uuid)                              to authenticated;
grant execute on function public.can_read_plan_tipo(uuid)                         to authenticated;
grant execute on function public.can_read_servicio(uuid)                          to authenticated;
grant execute on function public.can_subscribe_to_plan(uuid, uuid)                to authenticated;

-- ─────────────────────────────────────────────
-- 3. Replace the over-permissive SELECT policies
-- ─────────────────────────────────────────────
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (public.can_read_plan(id));

drop policy if exists plan_tipos_select_authenticated on public.plan_tipos;
create policy plan_tipos_select_authenticated on public.plan_tipos
  for select to authenticated
  using (public.can_read_plan(plan_id));

drop policy if exists plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios;
create policy plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios
  for select to authenticated
  using (public.can_read_plan_tipo(plan_tipo_id));

drop policy if exists planes_disciplina_select_authenticated on public.planes_disciplina;
create policy planes_disciplina_select_authenticated on public.planes_disciplina
  for select to authenticated
  using (public.can_read_plan(plan_id));

drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (public.can_read_servicio(id));

-- ─────────────────────────────────────────────
-- 4. Restrict self-service subscription inserts
-- ─────────────────────────────────────────────
drop policy if exists suscripciones_insert_own on public.suscripciones;
create policy suscripciones_insert_own on public.suscripciones
  for insert to authenticated
  with check (
    atleta_id = auth.uid()
    and public.can_subscribe_to_plan(plan_id, tenant_id)
  );

commit;
```

**Untouched on purpose** (documented so nobody "fixes" them):

- `suscripciones_admin_insert_rls` / `suscripciones_select_own` / `suscripciones_select_admin` / `pagos_*` — policies are OR-ed, admin-on-behalf creation keeps working unchanged.
- `tenant_metodos_pago_select_member` stays `using (true)` — the purchase flow needs non-members to read the tenant's payment methods.
- `disciplinas` / `usuarios` SELECT stay `using (true)` — the public plan card shows discipline names, and `gestion-suscripciones` resolves a non-member buyer's name through `usuarios`.
- `entrenamientos_publicos` and the `servicio_restriction` publish trigger from US-0089 — see *Out of scope*.

---

## API / Server Actions

All access stays in the browser Supabase client except the new server-rendered page.

### `src/services/supabase/portal/planes.service.ts` (modified)

| Function | Change |
|---|---|
| `getPlanes(tenantId)` | Add `es_publico` to the select list; `mapPlanRow` maps it onto `PlanWithDisciplinas` |
| `createPlan(input)` | Insert `es_publico: input.esPublico ?? false`; add it to the returning select |
| `updatePlan(input)` | Update `es_publico: input.esPublico ?? false`; add it to the returning select |
| **`getPlanesPublicos(tenantId)`** *(new)* | `select('id, tenant_id, nombre, descripcion, tipo, beneficios, activo, es_publico, created_at, updated_at, planes_disciplina(disciplina_id), plan_tipos(*, plan_tipos_servicios(servicio_id, unidades, servicios(nombre))))'` filtered by `.eq('tenant_id', tenantId).eq('es_publico', true).eq('activo', true).order('nombre')`. Reuses `mapPlanRow`. Returns `PlanWithDisciplinas[]`. Inactive subtypes are dropped by the hook via the existing `getActiveTipos()`. Auth: authenticated; RLS allows the rows because `es_publico` is true. Errors go through the existing `mapPostgrestError`. |

### `src/services/supabase/portal/mis-suscripciones.service.ts` (modified)

| Function | Change |
|---|---|
| `fetchMisSuscripcionesTenant(supabase, tenantId, userId)` | **Removed** — its only caller (the tenant-scoped page) is deleted |
| **`fetchMisSuscripciones(supabase, userId)`** *(new, replaces it)* | Same select as today plus `tenant_id` and `tenant:tenants!suscripciones_tenant_id_fkey(nombre)`; filtered only by `.eq('atleta_id', userId)`, ordered `created_at desc` (and `pagos.created_at desc` as today). Returns `MiSuscripcionRow[]` with the two new fields populated. Auth: `suscripciones_select_own` RLS restricts to `atleta_id = auth.uid()`; called with the **server** client from the page. |

### `src/services/supabase/portal/servicios.service.ts`
No signature change. Verify `getPlanTipoServicios` still returns rows for a public plan viewed by a non-member (it does — `can_read_plan_tipo` covers it).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260728000100_planes_publicos.sql` | **New** — `es_publico` column + index, 5 helper functions, 5 SELECT policy replacements, `suscripciones_insert_own` tightening |
| Types | `src/types/portal/planes.types.ts` | Add `es_publico: boolean` to `Plan`; `esPublico?: boolean` to `CreatePlanInput`/`UpdatePlanInput`; `es_publico: boolean` to `PlanFormValues`; extend `PlanFormField` union with `'es_publico'` |
| Types | `src/types/portal/planes-publicos.types.ts` | **New** — `PlanPublicoItem` (plan + resolved discipline names + active subtypes with their service rows), `PlanPublicoTipoItem`, `PlanesPublicosState` |
| Types | `src/types/portal/mis-suscripciones.types.ts` | **New (renamed from `mis-suscripciones-y-pagos.types.ts`)** — `MiSuscripcionRow` gains `tenant_id: string` and `tenant_nombre: string` |
| Service | `src/services/supabase/portal/planes.service.ts` | `es_publico` in select/insert/update + new `getPlanesPublicos(tenantId)` |
| Service | `src/services/supabase/portal/mis-suscripciones.service.ts` | Replace `fetchMisSuscripcionesTenant` with cross-tenant `fetchMisSuscripciones(supabase, userId)`; join `tenants(nombre)`; update the type import path |
| Hook | `src/hooks/portal/planes-publicos/usePlanesPublicos.ts` | **New** — loads `getPlanesPublicos(tenantId)` + `listDisciplinesByTenant(tenantId)` on modal open; owns `search` state and the accent-insensitive plan/subtype/service matcher; exposes `{ loading, error, plans, filteredPlans, search, setSearch, retry }` |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Add `es_publico` to initial values, `setFormFromPlan`, `setFormForDuplicate`, and the change handler |
| Hook | `src/hooks/portal/planes/usePlanes.ts` | Pass `esPublico` through to `createPlan`/`updatePlan` |
| Hook | `src/hooks/portal/mis-suscripciones/useMisSuscripciones.ts` | **Moved** from `mis-suscripciones-y-pagos/`; add `tenantFilter` state (`'all' | tenant_id`) AND-ed with the existing two filters; expose `tenantOptions` derived from the rows |
| Hook | `src/hooks/portal/mis-suscripciones/useSubirComprobante.ts` | **Moved** from `mis-suscripciones-y-pagos/` — no logic change (still takes `tenantId`, now per-row) |
| Component | `src/components/portal/planes-publicos/VerPlanesButton.tsx` | **New** — `'use client'` button labelled **"Ver planes"** (icon `card_membership`); owns modal open state; renders `PlanesPublicosModal` |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | **New** — modal with header (org name), search input, loading/error/empty states, list of `PlanPublicoCard`; hosts the reused `SuscripcionModal` wired to `useSuscripcion({ tenantId })` and shows its success banner |
| Component | `src/components/portal/planes-publicos/PlanPublicoCard.tsx` | **New** — one public plan: nombre, modalidad, disciplinas, beneficios, one row per active subtype (precio COP + `vigencia_dias` + services with units/"ilimitado"), and the "Adquirir" button |
| Component | `src/components/portal/planes-publicos/index.ts` | **New** — barrel export |
| Component | `src/components/portal/tenant/TenantIdentityCard.tsx` | Add optional `secondaryAction?: React.ReactNode`, rendered next to the primary action / `customAction` in the same action row |
| Component | `src/components/portal/tenant/TenantDirectoryList.tsx` | Pass `secondaryAction={<VerPlanesButton tenantId={...} tenantNombre={...} />}` on **both** branches (member "Ingresar" card and non-member `SolicitarAccesoButton` card) |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Add the "Plan público" checkbox + helper text (admin-only form, already role-gated) |
| Component | `src/components/portal/planes/PlanesTable.tsx` | Render a `Público` badge for rows with `es_publico` |
| Component | `src/components/portal/mis-suscripciones/MisSuscripcionesYPagosPage.tsx` | **Moved**; props become `{ suscripciones, userId }`; passes `s.tenant_id` per row to `SuscripcionCard`; empty-state CTA now links to `/portal/orgs` ("Explora las organizaciones y sus planes") |
| Component | `src/components/portal/mis-suscripciones/MisSuscripcionesFilters.tsx` | **Moved**; add the "Organización" filter control fed by `tenantOptions` |
| Component | `src/components/portal/mis-suscripciones/SuscripcionCard.tsx` | **Moved**; show the organization name chip; keep `tenantId`/`userId` props (now per-row) |
| Component | `src/components/portal/mis-suscripciones/PagoCard.tsx` | **Moved**; import path updates only |
| Component | `src/components/portal/mis-suscripciones/index.ts` | **Moved** barrel |
| Page | `src/app/portal/(atleta)/layout.tsx` | **New** — authenticated-only guard (`redirect('/auth/login?next=/portal/mis-suscripciones')` when no session); no role gate (see *Access rule*) |
| Page | `src/app/portal/(atleta)/mis-suscripciones/page.tsx` | **New** — server component: `getUser()` → `fetchMisSuscripciones(supabase, user.id)` → `<MisSuscripcionesYPagosPage suscripciones={...} userId={user.id} />` |
| Page | `src/app/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx` | **Replaced** with `redirect('/portal/mis-suscripciones')` |
| Types | `src/types/portal.types.ts` | Remove `Mis Suscripciones` from `ROLE_TENANT_ITEMS.usuario`; add `MIS_SUSCRIPCIONES_MENU_ITEM` (`/portal/mis-suscripciones`, icon `receipt_long`) to the `!tenantId` branch of `resolvePortalMenu` |
| Docs | `projectspec/03-project-structure.md` | Update the tree: new `planes-publicos` slice, renamed `mis-suscripciones` slice, new `(atleta)` portal route group, new DB helper functions in the *Database Functions* table |

---

## Acceptance Criteria

**Admin configuration**

1. Creating or editing a plan as `administrador` shows a "Plan público" checkbox; saving it persists `planes.es_publico` and the value is reflected on reopen.
2. `PlanesTable` shows a `Público` badge only on plans with `es_publico = true`.
3. Every plan that existed before the migration has `es_publico = false` and is therefore invisible to non-members.

**Public catalog**

4. Every organization card in `/portal/orgs` shows a "Ver planes" button, next to "Ingresar" (member) or "Solicitar acceso" (non-member), without breaking the existing card layout on mobile.
5. Clicking "Ver planes" opens a modal listing **only** plans of that organization with `es_publico = true` **and** `activo = true`, each showing its **active** subtypes with price, `vigencia_dias`, and the services + unit counts they grant (`unidades = null` renders as "ilimitado").
6. Typing in the search box filters the list live, matching (case- and accent-insensitively) plan name, plan description, plan benefits, subtype name **and service name**; a plan whose only match is a service name still appears.
7. An organization with no public plans shows *"Esta organización no tiene planes públicos disponibles."*; a search with no hits shows a "no results" state with a "Limpiar búsqueda" action; a load failure shows an error message with a "Reintentar" action.

**Acquisition**

8. A user who is **not** a member of the organization can click "Adquirir" on a public plan and complete the existing flow (subtype → payment method → optional proof), producing a `suscripciones` row with `estado = 'pendiente'`, a linked `pagos` row with `estado = 'pendiente'`, and `suscripcion_servicios` rows matching the subtype's `plan_tipos_servicios` (unit values included, `null` preserved as unlimited).
9. The resulting subscription appears in that tenant's `gestion-suscripciones` for the admin, with the buyer's name/email resolved, and can be validated/rejected exactly like a member's.
10. Attempting to acquire the same plan twice while a `pendiente` request exists is blocked with the existing "Ya tienes una solicitud pendiente para este plan." message.
11. "Adquirir" is not offered to a user who is `administrador` or `entrenador` of the browsed organization; it is offered to non-members and to members with role `usuario`.
12. Acquiring a plan does **not** create a `miembros_tenant` row — the buyer remains a non-member and still sees "Solicitar acceso" on the organization card.

**RLS / security**

13. A non-member querying `planes` for a tenant receives **only** rows with `es_publico = true` (verify directly against PostgREST/SQL as that user, not just through the UI); private plans of that tenant are absent.
14. `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina` and `servicios` rows belonging exclusively to private plans are likewise invisible to a non-member.
15. A non-member's direct insert into `suscripciones` referencing a **private** plan is rejected by RLS (`42501`), while the same insert against a public plan succeeds.
16. After an admin flips a purchased plan back to `es_publico = false`, the external buyer still sees their existing subscription with the correct plan name, subtype and service names in "Mis Suscripciones", but the plan no longer appears in that organization's public catalog.
17. Every pre-existing member-facing flow still works unchanged: `gestion-planes` (admin CRUD and the `usuario`/`entrenador` read-only view), `gestion-servicios`, plan-subtype service assignment, `gestion-suscripciones`, booking with service-unit deduction, and `gestion-entrenamientos` restriction editing showing service names.

**Mis Suscripciones**

18. `/portal/mis-suscripciones` lists the signed-in user's subscriptions across **all** organizations, newest first, each card showing the organization name.
19. The filter bar filters by subscription status, payment status **and** organization, combined with AND logic; "Limpiar filtros" resets all three.
20. Uploading a payment proof from a card writes to the storage path of **that row's** tenant and updates the corresponding `pagos.comprobante_path`.
21. `Mis Suscripciones` appears in the portal-level menu (outside any organization) and no longer appears in the `usuario` tenant menu.
22. Visiting the old `/portal/orgs/{tenant_id}/mis-suscripciones-y-pagos` URL redirects to `/portal/mis-suscripciones`.
23. A user with no subscriptions at all sees the empty state with a CTA to `/portal/orgs`.
24. An unauthenticated visit to `/portal/mis-suscripciones` redirects to login with the correct `next` parameter.

---

## Implementation Steps

- [ ] Create `20260728000100_planes_publicos.sql` (column + index + helpers + policies) and apply it locally
- [ ] Verify each new policy with SQL as three personas: tenant admin, tenant `usuario` member, and a non-member with/without a subscription
- [ ] Update `planes.types.ts` and add `planes-publicos.types.ts`
- [ ] Extend `planes.service.ts` (`es_publico` read/write + `getPlanesPublicos`)
- [ ] Wire the "Plan público" checkbox through `usePlanForm` / `usePlanes` / `PlanFormModal`, plus the `Público` badge in `PlanesTable`
- [ ] Create `usePlanesPublicos` (load + accent-insensitive plan/subtype/service search)
- [ ] Build `PlanPublicoCard`, `PlanesPublicosModal` (reusing `useSuscripcion` + `SuscripcionModal`) and `VerPlanesButton`
- [ ] Add `secondaryAction` to `TenantIdentityCard` and wire `VerPlanesButton` into both `TenantDirectoryList` branches
- [ ] Rename the `mis-suscripciones-y-pagos` slice to `mis-suscripciones` (components, hooks, types) and fix all imports
- [ ] Replace `fetchMisSuscripcionesTenant` with cross-tenant `fetchMisSuscripciones` (+ `tenant_id` / `tenant_nombre`)
- [ ] Add the organization chip + "Organización" filter to the list UI
- [ ] Create `src/app/portal/(atleta)/layout.tsx` and `src/app/portal/(atleta)/mis-suscripciones/page.tsx`; replace the old tenant route with a redirect
- [ ] Update `resolvePortalMenu` (remove tenant item, add portal-level item)
- [ ] Manual end-to-end test: non-member browses → searches by service name → acquires → admin validates → subscription and its service units visible in `/portal/mis-suscripciones`
- [ ] Manual regression pass over every flow listed in AC-17
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npm run type-check`, `npm run lint` and `npm test` before committing

---

## Non-Functional Requirements

- **Security**
  - Plan/subtype/service visibility and subscription insertion are enforced **in RLS**, not only in the UI; the service-layer `.eq('es_publico', true)` filter is a convenience, never the control (AC-13/14/15).
  - All new policy helpers are `security definer` + `stable` + `set search_path = public`, matching `get_admin_tenants_for_authenticated_user()`, and are granted only to `authenticated` (never `anon`).
  - `es_publico` is writable only through `planes_update_admin_only` / `planes_insert_admin_only` — no new write path is opened.
  - `/portal/mis-suscripciones` returns only `atleta_id = auth.uid()` rows, enforced by `suscripciones_select_own`; the server component must not accept a user id from the request.
  - Public plan cards must not leak member-only data: show name, modalidad, disciplines, benefits, subtype price/validity and service names/units — nothing about existing subscribers or internal notes.
- **Performance**
  - `idx_planes_es_publico (tenant_id) where es_publico` backs the catalog query.
  - The catalog loads once per modal open (single round trip with embedded `plan_tipos` → `plan_tipos_servicios` → `servicios`); search filters in memory, no per-keystroke query.
  - `can_read_plan` / `can_read_servicio` run per row; they are `stable` so Postgres can cache within a statement. If `gestion-planes` list latency regresses noticeably on a large tenant, prefer adding `idx_suscripciones_atleta_plan (atleta_id, plan_id)` over reverting the policy.
  - `/portal/mis-suscripciones` is server-rendered in one query; if a user ever exceeds ~100 subscriptions, add pagination in a follow-up — not needed now.
- **Accessibility**
  - The modal is a `role="dialog"` with `aria-modal="true"`, an `aria-labelledby` heading, focus trapped inside, focus restored to "Ver planes" on close, and Escape-to-close — matching the existing `SuscripcionModal` behavior.
  - The search input has an associated visible label or `aria-label` ("Buscar planes o servicios"); result count changes are announced via an `aria-live="polite"` region.
  - Filter chips are real `<button>`s with `aria-pressed`; the "Plan público" checkbox is a labelled native input.
  - "Ver planes" and "Adquirir" are keyboard reachable with visible focus rings; card actions never rely on color alone (badges carry text).
- **Error handling**
  - Catalog load failure → inline error inside the modal with "Reintentar" (same treatment as `PortalTenantsPage`).
  - Acquisition failures reuse the existing `useSuscripcion` messaging; an RLS rejection on insert (plan deactivated or un-published between load and submit) must surface as *"Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente."* rather than the generic message.
  - Proof-upload failure stays non-blocking (subscription + payment already created), as today.
  - `Mis Suscripciones` page-level fetch failure surfaces through the route's `error.tsx`/inline error rather than crashing the portal shell.
