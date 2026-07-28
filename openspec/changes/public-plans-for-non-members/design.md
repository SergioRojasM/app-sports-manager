## Context

Plans live at `planes` → `plan_tipos` (priced subtype) → `plan_tipos_servicios` (service unit entitlements) → `servicios`. Buying one creates a `suscripciones` row in `estado = 'pendiente'`, calls the `populate_suscripcion_servicios` SECURITY DEFINER RPC to snapshot units into `suscripcion_servicios`, creates a `pagos` row, optionally uploads a proof to storage, and waits for an administrator to validate it in `gestion-suscripciones`.

Two things constrain the design:

1. **The acquisition flow is already tenant-agnostic.** `useSuscripcion({ tenantId })` + `SuscripcionModal` take a `tenantId` argument and never assume membership; `hasPendingSuscripcion` is keyed by `(atleta_id, plan_id)`; `tenant_metodos_pago` is readable by everyone. Nothing in the write path needs to change — only a new place to launch it from.
2. **The read path is currently wide open, not closed.** `planes`, `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina` and `servicios` all carry `SELECT ... using (true)`, and `suscripciones_insert_own` only checks `atleta_id = auth.uid()`. "Members only" is a UI convention (the plans screen is mounted behind the tenant membership gate), not a database control. So this change is as much about *closing* the private-plan path as about opening the public one.

Architecture follows the hexagonal slices in `projectspec/03-project-structure.md`: page → component → hook → service → types, with no Supabase call outside `services/`.

```
/portal/orgs (page)
  └─ TenantDirectoryList
       └─ TenantIdentityCard  [primary action] [secondaryAction ← new]
            └─ VerPlanesButton (component, owns modal open state)
                 └─ PlanesPublicosModal (component)
                      ├─ usePlanesPublicos(tenantId)   → planesService.getPlanesPublicos()
                      │                                 → disciplinesService.listDisciplinesByTenant()
                      ├─ PlanPublicoCard[]  (search-filtered)
                      └─ SuscripcionModal  ← REUSED, driven by useSuscripcion({ tenantId })
                                              → suscripcionesService / pagosService / storageService

/portal/(atleta)/mis-suscripciones (server page)
  └─ fetchMisSuscripciones(supabase, userId)   ← cross-tenant, RLS-scoped
       └─ MisSuscripcionesYPagosPage → MisSuscripcionesFilters + SuscripcionCard[] → PagoCard
```

## Goals / Non-Goals

**Goals:**
- Let a tenant administrator mark a plan public, and let any authenticated user browse and acquire those plans from the organizations directory without joining the organization.
- Enforce plan visibility and purchase authorization in RLS, so the UI filter is a convenience rather than the control.
- Reuse the existing subscription/payment/approval flow with zero behavioral divergence between member and non-member purchases.
- Give every athlete one cross-tenant place to see the subscriptions they hold.
- Keep every existing member-facing flow working unchanged after the policy tightening.

**Non-Goals:**
- Relaxing the US-0089 `servicio_restriction` publish gate (follow-up change).
- Payment gateway integration; auto-granting membership on purchase; anonymous (`anon`) access to plan data.
- A stricter global "rol-atleta" gate on the new page (see Decision 6).
- Pagination of the cross-tenant subscriptions list.

## Decisions

### 1. The flag lives on `planes`, not on `plan_tipos`

`es_publico boolean not null default false` on `planes`. Publishing a plan exposes all of its **active** subtypes and their services, which is how the acquisition modal already presents a plan (subtype selection is step 1 of `SuscripcionModal`). Per-subtype visibility would let an admin build a plan whose public and private subtypes diverge, which the existing modal cannot express without a rewrite.

*Alternative considered*: a `visibilidad` enum mirroring `entrenamientos.visibilidad`. Rejected — that column pairs with `visible_para` and a whole scoping mechanism this change does not need; a boolean is honest about what it does.

*Alternative considered*: a separate `planes_publicos` publication table mirroring `entrenamientos_publicos` (US-0089). Rejected — that table exists because a public *training listing* is a curated, denormalized marketing artifact with its own price and banner. A public plan is the **same** commercial object as the private one: same price, same subtypes, same services, and it must stay in sync because it is what actually gets sold. A second table would introduce drift between what is advertised and what `populate_suscripcion_servicios` grants.

### 2. RLS reads as: member OR public OR already-subscribed

All five plan-catalog SELECT policies become the same predicate shape:

| Table | Predicate |
|---|---|
| `planes` | `can_read_plan(id)` |
| `plan_tipos` | `can_read_plan(plan_id)` |
| `planes_disciplina` | `can_read_plan(plan_id)` |
| `plan_tipos_servicios` | `can_read_plan_tipo(plan_tipo_id)` |
| `servicios` | `can_read_servicio(id)` |

The **third branch — "caller already holds a subscription to it"** — is the non-obvious one and must not be dropped. Without it, an admin flipping `es_publico` back to `false` would silently break the external buyer's own `Mis Suscripciones` card (missing plan name) and their service-unit display, because those views join `planes`/`plan_tipos`/`servicios` from rows the buyer can no longer read. `can_read_servicio` carries the equivalent branch through `suscripcion_servicios`.

`suscripciones_insert_own` gains `can_subscribe_to_plan(plan_id, tenant_id)`: the plan must be `activo` and either public or in a tenant the caller belongs to. This is the actual enforcement of "non-members can only buy public plans".

### 3. Policy predicates go through SECURITY DEFINER helpers

`get_member_tenants_for_authenticated_user()`, `can_read_plan()`, `can_read_plan_tipo()`, `can_read_servicio()`, `can_subscribe_to_plan()` — all `language sql`, `security definer`, `stable`, `set search_path = public`, granted to `authenticated` only (never `anon`).

Rationale: a policy expression on `plan_tipos` that sub-queries `planes` would otherwise re-enter `planes`' own RLS, which is both a correctness hazard (recursive/self-referential policies) and a performance one. `security definer` makes the helper run as the owner, which bypasses RLS on the inspected tables. This mirrors the existing `get_admin_tenants_for_authenticated_user()` pattern already used across the schema, so it introduces no new idiom. `stable` lets Postgres cache the result within a statement.

### 4. The public catalog reuses the plan service, not a new data source

`planesService.getPlanesPublicos(tenantId)` is one PostgREST round trip embedding `plan_tipos → plan_tipos_servicios → servicios(nombre)` and `planes_disciplina`, reusing the existing `mapPlanRow` mapper and `mapPostgrestError`. Active-subtype filtering reuses the exported `getActiveTipos()` helper from `usePlanesView`.

Search runs **client-side** in `usePlanesPublicos` over the loaded catalog: a tenant's public catalog is tens of rows at most, and the requirement is to match across three nesting levels (plan → subtype → service), which as a server query would need either an `or=` filter with embedded resource negotiation or a view. Matching is accent- and case-insensitive via `String.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`.

### 5. `TenantIdentityCard` gains a `secondaryAction` slot

The card today accepts `actionLabel`/`actionHref` **or** a single `customAction` — there is no way to render two buttons, which members need ("Ingresar" + "Ver planes"). Adding an optional `secondaryAction?: React.ReactNode` rendered in the same action row is the smallest change that serves both branches of `TenantDirectoryList` and keeps every existing call site source-compatible.

"Adquirir" visibility inside the modal mirrors the in-tenant rule (shown to non-members and to `usuario` members; hidden for that tenant's `administrador`/`entrenador`), resolved with the existing `useTenantAccess(tenantId)` hook — one extra query, fired only when the modal opens.

### 6. `/portal/mis-suscripciones` is authenticated-only, not role-gated

The requirement asks for "solo el rol-atleta". Two facts make a literal membership gate wrong here:

- Roles are **per-tenant** (`miembros_tenant.rol_id`); there is no global role. The portal-level `portal_role` cookie is hardcoded to `'usuario'` for everyone by `portal/bootstrap/route.ts`, which is exactly why `resolvePortalMenu(role, undefined)` already treats every user as an athlete outside a tenant.
- The external buyers this change creates have **no membership at all**, so a "must have a `usuario` membership" gate would lock out precisely the users the page exists for.

Decision: the `(atleta)` route group guards authentication only; the data is self-scoped by `suscripciones_select_own` (`atleta_id = auth.uid()`), so nothing leaks to anyone. A user who is only an administrator and has never subscribed sees the existing empty state. The menu item is added unconditionally to the `!tenantId` branch, consistent with `PUBLIC_TRAININGS_MENU_ITEM`. A stricter gate would require a global athlete flag propagated through the bootstrap cookie — deliberately deferred, not improvised here.

### 7. The old tenant-scoped route redirects instead of 404-ing

`/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx` becomes a `redirect('/portal/mis-suscripciones')`. The `(atleta)` layout guard above it still applies, so a non-`usuario` member hitting the old URL is redirected to the tenant landing page first — acceptable, since that was already the behavior. The feature slice is renamed `mis-suscripciones-y-pagos` → `mis-suscripciones` across components/hooks/types to match the route.

### 8. Migration is applied locally only

The migration runs against the local Supabase stack (`supabase migration up` / `supabase db reset`). It is **not** pushed to any remote project as part of this change.

## Risks / Trade-offs

- **Tightening five `using (true)` policies at once can silently break member-facing reads** (`gestion-planes`, `gestion-servicios`, plan-subtype service assignment, `gestion-suscripciones`, booking deduction, training restriction editing, `Mis Suscripciones`) → every one of those flows is an explicit regression item in tasks.md, verified after the migration against a member, an admin, a non-member buyer, and a non-member non-buyer. The membership branch is deliberately role- and `estado`-agnostic (any `miembros_tenant` row counts), so suspended or `mora` members keep the read access they have today.
- **Per-row `can_read_plan` / `can_read_servicio` calls add planner overhead on list queries** → helpers are `stable` and back onto indexed lookups (`miembros_tenant (usuario_id)`, `planes.id`, plus the new partial `idx_planes_es_publico`). If `gestion-planes` latency regresses on a large tenant, the fix is an `idx_suscripciones_atleta_plan (atleta_id, plan_id)` index, not reverting the policy.
- **An external buyer's subscription is invisible to the tenant's own member-scoped tooling** (`gestion-equipo`, team lists) because they have no `miembros_tenant` row → intended; `gestion-suscripciones` joins `usuarios` (still `using (true)`), so the admin can still see, name and validate the buyer. Verified as an acceptance criterion.
- **A plan can be un-published or deactivated between catalog load and submit** → RLS rejects the insert with `42501`; the hook maps it to *"Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente."* rather than the generic failure message.
- **Making a plan public exposes its service catalog names to any authenticated user** (`can_read_servicio` branch 2) → this is inherent to advertising what a plan grants; service rows carry only `nombre`/`descripcion`, no operational data.
- **A public plan whose subtypes grant services used by service-restricted trainings creates an expectation the buyer cannot yet fulfil** — US-0089 still refuses to publish those trainings, so the buyer holds units they cannot spend on public sessions → out of scope by decision; called out in the proposal's Non-goals as the follow-up change, and worth a note to admins before they publish such a plan.
- **Renaming the `mis-suscripciones-y-pagos` slice touches every import in it** → mechanical; `npm run type-check` catches any missed reference, and the old route keeps working through the redirect.

## Migration Plan

1. Apply `supabase/migrations/20260728000100_planes_publicos.sql` **locally only** (`supabase migration up`); never push to a remote Supabase project as part of this change.
2. The column is additive with `default false`, so no backfill is needed and no existing plan becomes public.
3. Verify each replaced policy with SQL as four personas — tenant admin, tenant `usuario` member, non-member holding a subscription, non-member holding none — before touching any TypeScript.
4. Ship the frontend changes; the redirect keeps old `Mis Suscripciones` links working.
5. **Rollback**: re-create the five SELECT policies as `for select to authenticated using (true)` and restore `suscripciones_insert_own` to `with check (atleta_id = auth.uid())`; `es_publico` and the helper functions can stay in place (inert with the permissive policies). No data is destroyed at any point, so rollback is policy-only.

## Open Questions

- Should an administrator be warned when marking a plan public while the tenant has service-restricted trainings that cannot be published (the US-0089 gate)? Deferred with the gate itself.
- Should `Mis Suscripciones` group cards by organization instead of using a flat list with an organization filter? Flat list + filter is implemented here; revisit if users routinely hold subscriptions in many clubs.
