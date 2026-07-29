# US-0094 — Service Restrictions on Public Trainings

## ID
US-0094

## Name
Allow publishing trainings that carry service-based restrictions, and let non-members satisfy them with a public plan

## As a
Tenant administrator (publisher) and any authenticated non-member visitor (buyer/booker)

## I Want
To publish a training even when it has service-based (`servicio_1_id`…`servicio_4_id`) access restrictions, so that a visitor who is not a member of the organization can buy a public plan, receive the service units it grants, and book that training through exactly the same restriction/deduction process members already go through.

## So That
Clubs can sell and fill their restricted sessions to an outside audience — the commercial reason public plans were introduced in the first place — instead of being forced to strip the restrictions off a training just to make it visible.

---

## Description

### Current State

US-0089 introduced a **hard rule**: a training with any service-based restriction row cannot be published. The rule is enforced in three places:

1. **UI gate** — [EntrenamientosPage.tsx:230-282](src/components/portal/entrenamientos/EntrenamientosPage.tsx#L230-L282) calls `entrenamientosPublicosService.hasServicioRestrictions(tenantId, trainingId)` for the selected instance and computes `publishActionContext`, disabling the action with: *"Este entrenamiento tiene restricciones de servicios y no puede publicarse. Elimina las restricciones de servicio del entrenamiento para poder publicarlo."*
2. **Service gate** — `publicarEntrenamiento` in [entrenamientos-publicos.service.ts:102-107](src/services/supabase/portal/entrenamientos-publicos.service.ts#L102-L107) re-checks and throws `EntrenamientoPublicoServiceError('servicio_restriction', …)`.
3. **DB trigger** — `check_entrenamiento_publico_sin_restriccion_servicio()` + `entrenamientos_publicos_no_servicio_restriccion` ([20260723010000](supabase/migrations/20260723010000_entrenamientos_publicos.sql#L96-L125)) raise on any insert/update into `entrenamientos_publicos`.

The stated justification was: *"a cross-tenant visitor can never hold a subscription/service in a tenant they aren't a member of."*

**That premise no longer holds.** US-0093 lets a non-member buy a public plan, which creates a `suscripciones` row in that tenant and populates `suscripcion_servicios` with the units the subtype grants. And the booking machinery is already tenant+athlete scoped, not membership scoped:

- `getServicioEntitlements(tenantId, atletaId, referenceDate)` ([reservas.service.ts:551](src/services/supabase/portal/reservas.service.ts#L551)) reads the athlete's own subscriptions in that tenant — it never joins `miembros_tenant`.
- `validateBookingRestrictions` ([reservas.service.ts:411-495](src/services/supabase/portal/reservas.service.ts#L411-L495)) evaluates the `servicio_*_id` slots against that entitlement set only. The membership lookup (`miembroEstado`) is consulted **only inside the `if (row.usuario_estado)` branch**, so a service-only restriction row is fully satisfiable by a non-member.
- `findServiceSubscriptionsToCharge` and the `book_and_deduct_service_units` RPC deduct from `suscripcion_servicios` by `(tenant_id, atleta_id)`.

So the only thing standing between a paying non-member and a restricted public training is the publish gate itself.

Two restriction conditions **do** remain unsatisfiable by a non-member, and this story does not pretend otherwise:

| Condition | Why a non-member can never satisfy it |
|---|---|
| `usuario_estado` | Requires a `miembros_tenant` row; the check fails with *"No se encontró tu membresía en esta organización."* |
| `validar_nivel_disciplina` | Requires a `usuario_nivel_disciplina` row assigned by the organization |

### Proposed Changes

#### 1. Invert the publish gate: block on membership-only restrictions instead of service ones

The gate is not removed — it is **retargeted**, so that everything published stays bookable by an outsider who buys the right plan.

**The predicate must respect OR semantics.** `entrenamiento_restricciones` rows are evaluated as OR (a booking passes if *any* row passes — see the `if (rowPasses) return { ok: true }` early return in the loop). Therefore publishing is blocked **only when no row is satisfiable by a non-member**:

> Block publication when the training **has** restriction rows **and every one of them** sets `usuario_estado IS NOT NULL` **or** `validar_nivel_disciplina = true`.
>
> Allow publication when there are no restriction rows at all, or when **at least one** row is free of membership-only conditions (i.e. a row whose conditions are only service slots and/or nothing).

Concretely:

| Training's restriction rows | Publishable? |
|---|---|
| (none) | ✅ |
| `[servicio_1=X]` | ✅ **(new — this is the point of the story)** |
| `[servicio_1=X, servicio_2=Y]` | ✅ |
| `[servicio_1=X]` OR `[usuario_estado='activo']` | ✅ (the service row is satisfiable) |
| `[usuario_estado='activo']` | ❌ |
| `[validar_nivel_disciplina=true]` | ❌ |
| `[usuario_estado='activo']` OR `[validar_nivel_disciplina=true]` | ❌ |
| `[servicio_1=X, usuario_estado='activo']` | ❌ (same row ANDs the conditions) |

New blocking message: *"Este entrenamiento solo admite restricciones que un visitante externo nunca puede cumplir (estado de miembro o nivel de disciplina). Añade una condición basada en servicios o elimina esas restricciones para poder publicarlo."*

#### 2. Show the required services — in the authenticated marketplace only

A visitor must know a session has a requirement **before** attempting to book, not only when the booking is rejected.

`PublicTrainingCard` gains a requirements row rendering the distinct names of the services demanded by the training's restriction rows (e.g. *"Requiere: Tiquetera Natación"*). It renders nothing when the list is empty, so unrestricted listings look exactly as they do today.

**Where the names come from is constrained by RLS, and it is the crux of this section.** After US-0093, `servicios` SELECT is restricted to: member of the tenant, OR the service is granted by a public+active plan, OR the caller already holds units of it. That has two consequences:

- The `anon` role can read `servicios` **not at all** — and it must stay that way.
- An **authenticated non-member** also cannot necessarily read a required service's name: if no public plan grants that service, none of the three branches matches. So a client-side read of `servicios` would leave the chip blank precisely for the visitors the feature is meant to inform.

Therefore the names come from a **new database view, granted to `authenticated` only**:

- `entrenamientos_publicos_servicios_view` — one row per publication with `entrenamiento_id` and `servicios_requeridos text[]`. Like every view, it runs with its owner's privileges and so resolves the names without granting anyone direct access to `servicios` or `entrenamiento_restricciones`.
- **`entrenamientos_publicos_view` (the US-0091 anon view) is left completely untouched.** No new column, no new grant, no change to what an unauthenticated visitor can read.

Accordingly, the requirement row appears on the **authenticated marketplace** (`/portal/entrenamientos-publicos`) only. The **anonymous landing page** (`/entrenamientos-publicos`) keeps rendering exactly what it renders today — no requirement row — and its data path is not modified at all.

This is a deliberate trade: an anonymous visitor may click "Reservar" on a restricted session and only then be told to register. That is acceptable because the anonymous CTA is already `RegistrateParaReservarModal` — it never attempts a real booking, so nothing breaks; the visitor simply learns about the requirement one step later, after signing in. The alternative (exposing service names through the anon view) was rejected: service names are tenant catalog data, and no unauthenticated surface should carry them.

#### 3. Offer the plan catalog when a booking is rejected for a missing service

When `validateBookingRestrictions` rejects with `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, the public booking modal shows the existing rejection message **plus** a "Ver planes de {organización}" action that opens the `PlanesPublicosModal` from US-0093 for that `tenantId`. This closes the loop: discover → buy → book.

This applies to the **authenticated** marketplace (`/portal/entrenamientos-publicos`) only. The anonymous landing page keeps its existing `RegistrateParaReservarModal` CTA — an anonymous visitor cannot buy anything until they have an account.

#### 4. Existing publications are unaffected

No data migration is needed: every currently published training passed the old gate, so none of them has a service restriction, and none of them is retroactively invalidated by the new predicate. Trainings whose restrictions are membership-only were never publishable and remain so.

---

## Database Changes

Single migration: `supabase/migrations/20260729000100_entrenamientos_publicos_restricciones_servicio.sql`

### 1. Replace the publish trigger

```sql
begin;

-- Drop the US-0089 rule (service restrictions no longer block publication)
drop trigger if exists entrenamientos_publicos_no_servicio_restriccion on public.entrenamientos_publicos;
drop function if exists public.check_entrenamiento_publico_sin_restriccion_servicio();

-- New rule: block only when NO restriction row is satisfiable by a non-member.
-- Rows are OR-ed at booking time, so a single service-only row makes the
-- training bookable by an outsider who buys the plan that grants it.
create or replace function public.check_entrenamiento_publico_restricciones_membresia()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
  )
  and not exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
      and er.usuario_estado is null
      and coalesce(er.validar_nivel_disciplina, false) = false
  ) then
    raise exception
      'No se puede publicar un entrenamiento cuyas restricciones solo pueden cumplirse siendo miembro de la organización.';
  end if;

  return new;
end;
$$;

create trigger entrenamientos_publicos_restricciones_membresia
  before insert or update on public.entrenamientos_publicos
  for each row execute function public.check_entrenamiento_publico_restricciones_membresia();
```

### 2. New authenticated-only view for the required service names

```sql
-- Required-service names for published trainings, for the AUTHENTICATED
-- marketplace only. Like any view, it runs with its owner's privileges and so
-- resolves names without granting anyone direct SELECT on `servicios` or
-- `entrenamiento_restricciones` (both hardened in US-0093).
--
-- Granted to `authenticated` ONLY — never to `anon`. Service names are tenant
-- catalog data and must not reach an unauthenticated surface. The anonymous
-- landing page keeps using `entrenamientos_publicos_view`, which this migration
-- does NOT touch.
create or replace view public.entrenamientos_publicos_servicios_view as
select
  ep.entrenamiento_id,
  coalesce(
    (
      select array_agg(distinct s.nombre order by s.nombre)
      from public.entrenamiento_restricciones er
      cross join lateral (
        values (er.servicio_1_id), (er.servicio_2_id), (er.servicio_3_id), (er.servicio_4_id)
      ) as slot(servicio_id)
      join public.servicios s on s.id = slot.servicio_id
      where er.entrenamiento_id = ep.entrenamiento_id
    ),
    array[]::text[]
  ) as servicios_requeridos
from public.entrenamientos_publicos ep
where ep.activo = true
  and ep.fecha_hora >= now();

grant select on public.entrenamientos_publicos_servicios_view to authenticated;

commit;
```

> ⚠️ **Do not** add `servicios_requeridos` to `entrenamientos_publicos_view`, and **do not** grant this new view (or `servicios`, or `entrenamiento_restricciones`) to `anon`. The US-0091 anon view must come out of this change byte-identical.

### RLS

No policy is added or modified. The reasons:

- `entrenamientos_publicos` keeps its existing policies from US-0089.
- `entrenamiento_restricciones` and `servicios` are **not** read directly by any new client query, and their US-0093 policies are untouched — the new view is the only new read path and it resolves names under owner privileges, exposing nothing but the name.
- `entrenamientos_publicos_view` and its `anon, authenticated` grant are unchanged.
- The booking path (`suscripcion_servicios`, `suscripciones`, `reservas`, `reserva_servicios`) is untouched: it already works for non-members after US-0093.

---

## API / Server Actions

### `src/services/supabase/portal/entrenamientos-publicos.service.ts`

| Function | Change |
|---|---|
| `hasServicioRestrictions(tenantId, entrenamientoId)` | **Removed.** Replaced by the function below; no caller should keep the service-restriction semantics. |
| **`hasBlockingMembershipRestrictions(tenantId, entrenamientoId): Promise<boolean>`** *(new)* | Reuses `entrenamientosService.getInstanceRestrictions(tenantId, entrenamientoId)` (same query shape already used by `ReservasPanel`). Returns `true` when `rows.length > 0 && !rows.some(r => r.usuario_estado == null && !r.validar_nivel_disciplina)`. Auth: any caller who can read the training's restrictions (admin/coach in the tenant). |
| `publicarEntrenamiento(input)` | Replace the pre-insert `hasServicioRestrictions` check with `hasBlockingMembershipRestrictions`; on violation throw `EntrenamientoPublicoServiceError('membership_restriction', 'Este entrenamiento solo admite restricciones que un visitante externo nunca puede cumplir (estado de miembro o nivel de disciplina). Añade una condición basada en servicios o elimina esas restricciones para poder publicarlo.')`. Also map the trigger's `P0001` exception onto the same typed error, so a concurrent edit surfaces the same message instead of a raw Postgres error. |
| `listPublicTrainingsForLanding()` | **Unchanged.** It keeps querying `entrenamientos_publicos_view` with the same column list and maps `serviciosRequeridos: []` for every row — the anonymous landing page shows no requirement row (see Proposed Changes §2). |
| `listPublicTrainings()` | Keeps reading `entrenamientos_publicos` and enriching capacity via `reservasService.getCapacidad` (unchanged). Adds **one** extra query — `from('entrenamientos_publicos_servicios_view').select('entrenamiento_id, servicios_requeridos')` — merged by `entrenamiento_id` into the mapped rows. Rationale: that view is the only RLS-safe source for the names (an authenticated non-member cannot read `servicios` directly), and this keeps the existing per-row capacity logic untouched. Rows missing from the view (e.g. a listing that moved into the past between the two queries) default to `[]`. A failure of this second query must be caught and degrade to `[]` for all rows rather than failing the whole listing. |

### `src/services/supabase/portal/reservas.service.ts`

No signature changes. `validateBookingRestrictions`, `findServiceSubscriptionsToCharge`, `create()` and the `book_and_deduct_service_units` RPC already handle non-member athletes correctly and are explicitly **not** modified by this story.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260729000100_entrenamientos_publicos_restricciones_servicio.sql` | Drop the service-restriction trigger/function; add the membership-restriction trigger/function; create `entrenamientos_publicos_servicios_view` granted to `authenticated` only. **Must not touch `entrenamientos_publicos_view` nor any `anon` grant.** |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | Replace `'servicio_restriction'` with `'membership_restriction'` in `EntrenamientoPublicoServiceErrorCode`; add `serviciosRequeridos: string[]` to `PublicTrainingListItem` and to `PublicTrainingCardData` |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | Replace `hasServicioRestrictions` with `hasBlockingMembershipRestrictions`; update `publicarEntrenamiento` (incl. mapping the trigger's `P0001`); add `servicios_requeridos` to both listing paths |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Rename `servicioRestrictionById` → `blockingRestrictionById` and `hasServicioRestriction` → `hasBlockingRestriction`; call the new service function; update `publishActionContext`'s disabled reason |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | No prop changes — verify the new (longer) `publishDisabledReason` wraps correctly in the options menu |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Render a "Requiere: …" row from `data.serviciosRequeridos`; render nothing when the array is empty — which is what makes the same shared card work unchanged on the anonymous landing page |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx` | Pass `serviciosRequeridos` through to the card |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | When the rejection code is `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, render the "Ver planes de {tenantNombre}" action next to the message and mount `PlanesPublicosModal` for that tenant |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | The live preview builds `PublicTrainingCardData` — supply `serviciosRequeridos` (from `getInstanceRestrictions` + the services already loaded in the restriction editor) so the admin previews what a visitor will see |
| Component | `src/components/landing/entrenamientos-publicos/PublicEntrenamientosLandingPage.tsx` | **No change.** It feeds the shared card with `serviciosRequeridos: []`, so no requirement row renders and the anonymous CTA stays `RegistrateParaReservarModal` |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` | Expose `bookingRejection.code` (already available) and `tenantId`/`tenantNombre` so the modal can decide whether to offer the catalog CTA |
| Hook | `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` | Carry `serviciosRequeridos` through the mapped items; **include the service names in the existing text search** so "natación" finds a session that requires the "Tiquetera Natación" service |
| Hook | `src/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding.ts` | **No change** beyond whatever the type addition forces (`serviciosRequeridos: []`); it must not query the new view |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts` | Map the new `membership_restriction` error code to its message |
| Docs | `projectspec/03-project-structure.md` | Update the notes for `entrenamientos-publicos.service.ts`, the card, and the DB trigger table |

---

## Acceptance Criteria

**Publishing**

1. An administrator can publish a training whose restrictions are service-based only; the "Publicar" action is enabled and the publication row is created.
2. A training with **no** restriction rows remains publishable, exactly as today.
3. A training whose restriction rows are **all** membership-only (`usuario_estado` set, and/or `validar_nivel_disciplina = true`) cannot be published: the action is disabled with the new message.
4. A training with one membership-only row **and** one service-only row **can** be published (OR semantics).
5. A training with a single row that sets **both** a service slot and `usuario_estado` cannot be published (AND within a row).
6. Attempting the insert directly against the database for a blocked case raises the trigger exception; performing it through `publicarEntrenamiento` surfaces `EntrenamientoPublicoServiceError('membership_restriction')` with the user-facing message, not a raw Postgres error.
7. Trainings published before this change remain published and readable; no existing `entrenamientos_publicos` row is invalidated or deleted by the migration.

**Public listing**

8. On the authenticated marketplace, a listing whose training requires services shows a "Requiere: …" row with the **distinct** service names, sorted alphabetically.
9. A listing with no service requirement renders exactly as before — no empty row, no placeholder.
10. The anonymous landing page (`/entrenamientos-publicos`) renders **no** requirement row, and its listing output is byte-for-byte what it was before this change.
11. An authenticated non-member for whom **no public plan grants** the required service still sees the service **name** on the marketplace card — the name comes from `entrenamientos_publicos_servicios_view`, never from a client read of `servicios`.
12. `anon` cannot obtain service names anywhere: `select` on `entrenamientos_publicos_servicios_view`, on `servicios` and on `entrenamiento_restricciones` are all denied for the anonymous role, and `entrenamientos_publicos_view` exposes no service column.
13. The marketplace search matches a session by the name of a service it requires.
14. The publish modal's live preview shows the same "Requiere: …" row an authenticated visitor will see.

**Booking as a non-member**

15. A non-member who holds an **active** subscription with available units in the required service can book the published training; a `reservas` row is created and the units are deducted in `suscripcion_servicios`, with the `reserva_servicios` ledger row written.
16. A non-member with **no** subscription is rejected with the existing message naming the required service, and is offered a "Ver planes de {organización}" action.
17. Activating that action opens the public plan catalog for that organization; acquiring a plan there follows the US-0093 flow unchanged.
18. A non-member whose subscription is still `pendiente` (not yet validated by the administrator) is rejected — units are only usable once the subscription is `activa`.
19. A non-member whose units are exhausted is rejected with the "no te quedan unidades" message and is likewise offered the catalog action.
20. Cancelling such a booking restores the deducted units, exactly as for a member.
21. The anonymous landing page does **not** show the catalog action; it keeps the "Regístrate para reservar" dialog, which never attempts a real booking.

**Regression**

22. A member booking a service-restricted training (public or private) behaves exactly as before — same validation, same deduction, same messages.
23. Publishing, un-publishing (`activo = false`) and re-publishing continue to work for unrestricted trainings.
24. `entrenamientos_publicos_view` is unchanged by this story: same columns, same definition, same `anon, authenticated` grant, and the landing page consumes it exactly as before.

---

## Implementation Steps

- [ ] Create the branch `feat/service-restrictions-on-public-trainings`
- [ ] Write the migration (drop old trigger/function, add the membership-restriction trigger/function, create `entrenamientos_publicos_servicios_view` granted to `authenticated`) and apply it **locally only**
- [ ] Verify the trigger with SQL against all eight row combinations in the Proposed Changes table
- [ ] Verify the new view as an authenticated **non-member**: service names resolve even when no public plan grants the service
- [ ] Verify as `anon`: `select` on the new view is denied, `servicios` and `entrenamiento_restricciones` remain denied, and `entrenamientos_publicos_view` returns the same columns as before the migration (diff it)
- [ ] Update `entrenamientos-publicos.types.ts` (error code, `serviciosRequeridos`)
- [ ] Replace `hasServicioRestrictions` with `hasBlockingMembershipRestrictions` and update `publicarEntrenamiento` (including the `P0001` mapping)
- [ ] Add the merge query for `servicios_requeridos` to `listPublicTrainings` only — leave `listPublicTrainingsForLanding` untouched
- [ ] Update `EntrenamientosPage` state/flags and the disabled reason
- [ ] Render the "Requiere: …" row in `PublicTrainingCard` and pass it through the grid, the marketplace hook and the publish preview (the landing page passes an empty array)
- [ ] Add the service names to the marketplace search matcher
- [ ] Add the "Ver planes de {organización}" action to `PublicTrainingReservaModal`, reusing `PlanesPublicosModal`
- [ ] End-to-end test as a non-member: buy plan → admin validates → book a restricted public training → verify unit deduction → cancel → verify restoration
- [ ] Regression test: member booking a restricted training; publishing/un-publishing an unrestricted one
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npx tsc --noEmit` and `npm run lint` before writing the commit message and PR description

---

## Non-Functional Requirements

- **Security**
  - No RLS policy is relaxed and **no new `anon` grant is created**. Service names never reach an unauthenticated surface: the new `entrenamientos_publicos_servicios_view` is granted to `authenticated` only, and `entrenamientos_publicos_view` (the anon path) is not modified.
  - Do **not** grant `anon` — or anyone — direct SELECT on `entrenamiento_restricciones` or `servicios` as a shortcut for the card, and do not weaken the US-0093 `servicios` policy.
  - The new view exposes only the service **name**, resolved under owner privileges — never ids, units, or restriction internals.
  - The publish rule is enforced at all three layers (UI, service, trigger); the trigger is the authority, so a stale disabled state or a direct write cannot bypass it.
  - Unit deduction stays inside the `book_and_deduct_service_units` SECURITY DEFINER RPC — this story adds no new write path to `suscripcion_servicios`.
- **Performance**
  - The new view aggregates per publication row and is scoped to active, future listings, so cardinality stays low. If it regresses on a large tenant, index `entrenamiento_restricciones (entrenamiento_id)` before changing the view's shape.
  - The landing page's query cost is unchanged — it does not touch the new view at all.
  - The marketplace pays one extra round trip for the names; it must not become a per-row query.
  - The publish gate check runs once per opened options menu, as `hasServicioRestrictions` does today.
- **Accessibility**
  - The "Requiere: …" row must be readable text, not color-only, and must not rely on the icon alone.
  - The "Ver planes de {organización}" action is a real `<button>`, keyboard reachable, with visible focus; opening the catalog moves focus into the dialog and returns it to the trigger on close.
  - The disabled "Publicar" entry keeps its reason as text associated with the control, not only as a tooltip.
- **Error handling**
  - Blocked publication → inline message in the options menu (disabled state) and, if attempted anyway, the typed `membership_restriction` error in the publish modal.
  - Booking rejection → the existing inline `submitError` slot in the public booking modal, with the catalog action beside it.
  - A failed `servicios_requeridos` fetch must degrade gracefully: the marketplace renders the listing without the requirement row rather than failing the whole grid.
  - Because the requirement is not shown anonymously, an unauthenticated visitor who signs in and then hits the requirement must still get the full explanation at booking time — the rejection message must name the service, never a generic "no cumples los requisitos".
