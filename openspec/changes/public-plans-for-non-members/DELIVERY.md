# Delivery notes — public-plans-for-non-members (US-0093)

## Commit message

```
feat(public-plans-for-non-members): allow non-members to browse and acquire public plans

Adds planes.es_publico so an administrator can expose a plan outside the
organization, a "Ver planes" catalog modal on every organization card, and a
cross-tenant "Mis Suscripciones" page at portal level.

Acquisition reuses the existing flow verbatim (useSuscripcion + SuscripcionModal
-> suscripciones pendiente -> populate_suscripcion_servicios -> pagos -> admin
validation), so member and non-member purchases follow the same path.

Also closes a pre-existing hole: planes, plan_tipos, plan_tipos_servicios,
planes_disciplina and servicios all had `SELECT ... using (true)`, letting any
authenticated user read every plan of every tenant, and suscripciones_insert_own
only checked atleta_id, allowing a subscription against a private plan straight
through PostgREST. Reads are now "member OR public+active OR already-subscribed"
and self-service inserts are authorized against the target plan.

BREAKING: /portal/orgs/{tenant_id}/mis-suscripciones-y-pagos now redirects to
/portal/mis-suscripciones; the menu entry moves from the usuario tenant menu to
the portal-level menu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Pull request description

```markdown
## Summary

Lets a tenant administrator mark a plan as **public** and lets any authenticated
user — member or not — browse that organization's public plans from `/portal/orgs`
and acquire one through the existing subscription + payment-proof + admin-approval
flow. Subscriptions are now visible in a cross-tenant **Mis Suscripciones** page at
portal level, which is where an external buyer (who has no membership anywhere)
can see what they bought.

Implements US-0093 · OpenSpec change `public-plans-for-non-members`.

## Why this also tightens RLS

The plan catalog was not restricted at all: `planes`, `plan_tipos`,
`plan_tipos_servicios`, `planes_disciplina` and `servicios` each had
`SELECT ... using (true)`, so every authenticated user could already read every
plan of every tenant, and `suscripciones_insert_own` only checked
`atleta_id = auth.uid()` — a subscription against another org's *private* plan
went through. "Members only" was a UI convention (the plans screen sits behind the
tenant membership gate), never a database control. This change opens the intended
public path and closes the unintended one in the same migration.

Reads are now **member OR (public AND active) OR already-subscribed**. The third
branch is deliberate: without it, an administrator un-publishing a plan would
silently break the buyer's own subscription card (missing plan/service names).

## Changes

**Database** — `supabase/migrations/20260728000100_planes_publicos.sql`
- `planes.es_publico boolean not null default false` + partial index `idx_planes_es_publico`.
- Five `security definer stable` helpers (`get_member_tenants_for_authenticated_user`,
  `can_read_plan`, `can_read_plan_tipo`, `can_read_servicio`, `can_subscribe_to_plan`)
  so policy expressions never re-enter RLS on the tables they inspect — the same
  pattern as the existing `get_admin_tenants_for_authenticated_user`.
- Replaced SELECT policies on the five catalog tables; `suscripciones_insert_own`
  now also requires the plan to be active and purchasable by the caller.
- Untouched on purpose: `suscripciones_admin_insert_rls`, `pagos_*`,
  `tenant_metodos_pago_select_member` (the purchase flow needs it), and the
  US-0089 publish trigger.

**Backend** — `es_publico` on plan read/write; new `getPlanesPublicos(tenantId)`;
`fetchMisSuscripcionesTenant` replaced by cross-tenant `fetchMisSuscripciones`;
`createSuscripcion` maps a `42501` rejection to a typed `plan_unavailable` error
so a stale catalog produces "Este plan ya no está disponible" instead of a generic
failure.

**Frontend**
- New slice `components/portal/planes-publicos/` (`VerPlanesButton`,
  `PlanesPublicosModal`, `PlanPublicoCard`) + `hooks/portal/planes-publicos/usePlanesPublicos`
  with accent-insensitive in-memory search across plan, subtype **and service** names.
- `TenantIdentityCard` gains a `secondaryAction` slot (it could only render one
  action before, so members could not get both "Ingresar" and "Ver planes").
- "Plan público" checkbox in `PlanFormModal`, `Público` badge in `PlanesTable`.
- `mis-suscripciones-y-pagos` slice renamed to `mis-suscripciones`, moved to
  `/portal/(atleta)/mis-suscripciones`, with an organization chip per card and an
  "Organización" filter; the legacy tenant route redirects.

## Decisions worth reviewing

1. **No `rol-atleta` gate on the new page.** Roles are per-tenant and `portal_role`
   is hardcoded to `'usuario'` by `portal/bootstrap/route.ts`; the external buyers
   this change creates hold no membership at all, so a membership gate would lock
   out exactly the intended users. The page is self-scoped by `atleta_id = auth.uid()`
   through RLS, so nothing leaks. A stricter gate needs a global athlete flag in
   the bootstrap cookie — deliberately deferred.
2. **The public read branch requires `activo`.** Surfaced during verification: a
   retired-but-flagged-public plan was still readable while the catalog query
   filters `activo = true`. RLS now matches the query exactly; members keep seeing
   inactive plans through the membership branch (needed to reactivate them).
3. **Out of scope: the US-0089 `servicio_restriction` publish gate.** That gate
   assumes "an outsider can never hold a service in a tenant they aren't a member
   of" — this change invalidates that premise, and `findServiceSubscriptionsToCharge`
   is already `(tenant_id, atleta_id)`-scoped, so relaxing it would work. It changes
   published-training behavior from US-0089/US-0092 and belongs in its own change.

## Verification

Migration applied **locally only**. Verified against the local stack with minted
JWTs over the real PostgREST endpoints (not just SQL), which also exercises the
service layer's select strings and embeds:

- Read policies across four personas — admin, `entrenador`, `usuario` member, and
  non-member: members see the unchanged full catalog (14 plans / 27 subtypes /
  62 service assignments / 42 discipline links / 6 services); a non-member sees
  only the public plan and its subtype/service.
- Insert policy: non-member → public plan **succeeds**; → private plan, → inactive
  public plan, and → another user's `atleta_id` are each rejected with `42501`;
  member → own-tenant private plan still succeeds.
- Full acquisition over REST as a non-member: `suscripciones` (pendiente) →
  `populate_suscripcion_servicios` (8 units) → `pagos` (pendiente), then the
  cross-tenant `fetchMisSuscripciones` query returning tenant/plan/payment/units.
- Administrator sees the non-member subscription with the buyer resolved; the buyer
  received **no** `miembros_tenant` row.
- Un-publish branch: buyer still reads plan + service names, catalog goes empty.
- Regression: `gestion-planes`, `gestion-servicios`, restriction service joins and
  the booking service-unit entitlement query all return identical results for all
  three member roles.
- Routes compile and respond; the legacy route redirects. Test data was cleaned up
  (DB back to 0 public plans, no leftover subscription).

`npx tsc --noEmit` is clean and `npm run lint` sits at the pre-change baseline
(34 problems, all pre-existing). This repo defines no test script.

**Still needs a human pass:** the visual click-through — modal layout on mobile,
search interaction, the organization filter, and comprobante upload from the new
page. Everything beneath the UI is verified above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
