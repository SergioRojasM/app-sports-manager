# US-0111 — Member Plans Offered When a Public-Training Booking Is Blocked

## ID
US-0111

## Name
Show the Organization's Member-Only Plans to a Member Whose Marketplace Booking Lacks Service Availability

## As a
Member of an organization (`miembros_tenant`) booking one of that organization's
trainings from the public marketplace (`/portal/entrenamientos-publicos`, or a training's
public detail page)

## I Want
The plan catalog offered to me when the booking is rejected for a missing/exhausted
service to include the organization's member-only plans, not just its public ones

## So That
I can acquire the plan that actually unlocks the booking and continue in the same flow,
instead of hitting an empty (or incomplete) catalog and having to navigate away

---

## Description

### Current State

When `usePublicTrainingReserva.openBooking()` pre-checks eligibility and
`validateBookingRestrictions` returns `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`,
`PublicTrainingReservaModal` shows the rejection dialog with a "Ver planes de {tenant}"
action that opens `PlanesPublicosModal`.

That catalog is fed by `usePlanesPublicos` → `planesService.getPlanesPublicos(tenantId)`,
which filters `es_publico = true and activo = true` (US-0093). The filter is right for a
visitor from outside the organization, but wrong for a booker who *is* a member:

- The service that blocks the booking is frequently granted only by an internal plan, so
  the member is shown a catalog that cannot unlock the booking.
- An organization that publishes trainings but keeps every plan internal shows
  "Esta organización no tiene planes públicos disponibles" — a dead end, even though that
  member could legitimately buy one of its plans.

The database already allows this: `planes_select_authenticated`
(`20260728000300_fix_select_policies_returning.sql`) lets a member read every plan of
their tenant, and `can_subscribe_to_plan` (`20260728000100_planes_publicos.sql`) lets a
member subscribe to a non-public plan of their own tenant. Only the client-side query
narrows it.

### Chosen Approach — widen the catalog, do not redirect

Sending the member to the in-tenant plans page (`/portal/orgs/[tenant_id]/...`) was
rejected: navigating away destroys the in-memory booking state — most importantly the
deferred `pendingPlanPurchase` of the skip-plan-confirmation flow (US-0106/US-0110), which
is deliberately *not* persisted until the reserva is submitted — as well as the guided
booking journey (US-0103) and the filled-in reservation form. The member would have to
start the booking over after buying.

So the catalog stays where it is and simply lists more: `usePlanesPublicos` resolves
membership as part of its own load and, for a member, queries the tenant's full active
catalog instead of the public-only one. Every downstream behavior (search pre-filled with
the required service name, "Adquirir" → `useSuscripcion` → `SuscripcionModal`, the
deferred-purchase `onSubscribed` hand-off) already works unchanged for those plans.

### Proposed Changes

- **`planesService.getPlanesMiembro(tenantId)`** (new): same shape/columns/order as
  `getPlanesPublicos`, without the `es_publico` filter. RLS remains the real gate — a
  wrong or stale membership check returns only public rows rather than leaking an internal
  plan.
- **`usePlanesPublicos`**: resolves membership inside `loadData` (via
  `supabase.auth.getUser()` + `tenantService.canUserAccessTenant`) and picks
  `getPlanesMiembro` or `getPlanesPublicos` accordingly. Resolving it here — rather than
  with a separate `useTenantAccess` call in the component — keeps a single `loading` flag
  and avoids painting the public-only catalog first and refetching a wider one after.
  Fails closed to the public catalog on any error. Exposes `esMiembro` and `role`.
- **`PlanesPublicosModal`**: drops its own `useTenantAccess` call and derives
  `canAcquire` from `catalog.role` (unchanged rule: staff manage plans, they don't buy
  them). Subtitle and empty state adapt to `esMiembro`.
- **`PlanPublicoCard`**: a "Solo miembros" badge on plans where `esExclusivoMiembro`
  (`!es_publico`), so a member understands why a plan they don't see publicly is listed.
- **`PublicTrainingReservaModal`**: checks membership (`useTenantAccess(tenantId)`) and,
  on a plan-acquirable rejection, tells the member the catalog also carries member-only
  plans; the CTA reads "Ver planes de miembro de {tenant}".

---

## Database Changes

None. `planes_select_authenticated` and `can_subscribe_to_plan` already grant members read
and purchase access to their tenant's non-public plans (US-0093 + its follow-up fix).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/portal/planes.service.ts` | New `getPlanesMiembro(tenantId)` — active plans of the tenant, public and member-only |
| Hook | `src/hooks/portal/planes-publicos/usePlanesPublicos.ts` | Resolve membership in `loadData`, choose the query, expose `esMiembro`/`role`, tag items with `esExclusivoMiembro` |
| Types | `src/types/portal/planes-publicos.types.ts` | `esExclusivoMiembro` on `PlanPublicoItem`; `esMiembro`/`role` on `UsePlanesPublicosResult` |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | `canAcquire` from `catalog.role`; member-aware subtitle and empty state |
| Component | `src/components/portal/planes-publicos/PlanPublicoCard.tsx` | "Solo miembros" badge |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | Membership notice + CTA wording in the rejection dialog |

No new files, no migrations.

---

## Acceptance Criteria

1. A member of the publishing organization whose booking is rejected with
   `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` sees, in the catalog opened from the rejection
   dialog, both the organization's public plans and its member-only active plans.
2. A non-member in the same situation sees exactly today's catalog: public + active plans
   only.
3. Member-only plans are labeled "Solo miembros"; public plans carry no such label.
4. The catalog's search is still pre-filled with the required service's name and matches
   against member-only plans' subtypes and services too.
5. Acquiring a member-only plan works end to end: `SuscripcionModal` → `useSuscripcion` →
   `createSuscripcion` passes `can_subscribe_to_plan` for a member.
6. On a training published with `omitir_confirmacion_plan = true`, choosing a member-only
   plan follows the deferred path unchanged (US-0110): nothing is written until the reserva
   is submitted, and both are then created in the same RPC call.
7. An organization with no public plans no longer shows a dead-end empty state to its own
   members — its internal active plans are listed; if it has none at all, the message reads
   "Esta organización no tiene planes activos disponibles".
8. Administrators and coaches of the organization still get no "Adquirir" button (existing
   staff rule), in both the public and the member-only sections.
9. `VerPlanesButton` (organization directory, `TenantDirectoryList`) and
   `PublicTrainingCard`'s catalog benefit from the same widening, since they share
   `PlanesPublicosModal`.
10. If the membership lookup fails, the catalog falls back to the public-only list rather
    than erroring, and RLS still prevents any member-only plan from being read or bought.

---

## Implementation Steps

- [x] Add `planesService.getPlanesMiembro(tenantId)`
- [x] Resolve membership inside `usePlanesPublicos.loadData` and branch the catalog query
- [x] Add `esExclusivoMiembro` / `esMiembro` / `role` to the catalog types
- [x] Point `PlanesPublicosModal`'s `canAcquire` at `catalog.role`; adapt subtitle + empty state
- [x] Add the "Solo miembros" badge to `PlanPublicoCard`
- [x] Surface the membership notice and CTA wording in `PublicTrainingReservaModal`
- [ ] Manually test: member of the tenant, booking blocked by a service granted only by an internal plan
- [ ] Manually test: non-member booking the same training (catalog unchanged)
- [ ] Manually test: member + `omitir_confirmacion_plan` training (deferred purchase path)
- [ ] Manually test: admin/coach of the tenant (no "Adquirir")

---

## Non-Functional Requirements

- **Security**: No policy changes. The client-side membership check only decides which
  query to run; `planes_select_authenticated` and `can_subscribe_to_plan` remain the
  authoritative gates for reading and purchasing member-only plans.
- **Performance**: One extra `miembros_tenant` lookup per catalog load (indexed on
  `usuario_id`), offset by removing `PlanesPublicosModal`'s separate `useTenantAccess`
  query; the plan query itself is the same shape as before.
- **Accessibility**: The badge is text (not color-only); its icon is `aria-hidden`, and the
  rejection-dialog notice is plain text inside the existing dialog.
- **Error handling**: Membership resolution failures degrade to the public catalog; catalog
  load failures keep the existing retry affordance.
