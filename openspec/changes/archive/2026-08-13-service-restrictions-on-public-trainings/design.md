## Context

A training's access rules live in `entrenamiento_restricciones`, one row per condition set, with four service slots (`servicio_1_id`…`servicio_4_id`), a `usuario_estado` and a `validar_nivel_disciplina` flag. At booking time `validateBookingRestrictions` evaluates rows as **OR** (it returns `{ ok: true }` on the first row that passes) and the conditions **within** a row as **AND**.

US-0089 forbade publishing any training with a service slot set, and enforced it at three layers (UI gate in `EntrenamientosPage`, service check in `publicarEntrenamiento`, DB trigger on `entrenamientos_publicos`). Its justification — that an outsider can never hold a service in a tenant they don't belong to — was made obsolete by US-0093, which lets a non-member buy a public plan and receive `suscripcion_servicios` units in that tenant.

Nothing in the booking path needs to change to support this. Verified in the current code:

- `getServicioEntitlements(tenantId, atletaId, referenceDate)` reads the athlete's own subscriptions in the tenant and never joins `miembros_tenant`.
- Inside `validateBookingRestrictions`, the membership lookup is used **only** in the `if (row.usuario_estado)` branch; service slots are matched purely against the entitlement set.
- `findServiceSubscriptionsToCharge` and the `book_and_deduct_service_units` RPC deduct by `(tenant_id, atleta_id)`.

```
Publicar (admin)
  EntrenamientosPage ── hasBlockingMembershipRestrictions ──► entrenamiento_restricciones
        │                                                     (OR-aware predicate)
        └─► PublicarEntrenamientoModal ─► publicarEntrenamiento ─► entrenamientos_publicos
                                                                    └─ trigger (same predicate)

Marketplace (autenticado)
  useEntrenamientosPublicosMarketplace
        ├─ listPublicTrainings ─────────► entrenamientos_publicos (+ getCapacidad)
        └─ merge servicios_requeridos ──► entrenamientos_publicos_servicios_view   [authenticated]
                                            └─ owner privileges → servicios / entrenamiento_restricciones
  PublicTrainingCard  "Requiere: …"
  PublicTrainingReservaModal ── rechazo SERVICIO_REQUERIDO ──► PlanesPublicosModal (US-0093)

Landing (anónimo)   ← SIN CAMBIOS
  usePublicEntrenamientosLanding ─► entrenamientos_publicos_view  [anon, authenticated]
```

## Goals / Non-Goals

**Goals:**
- Let administrators publish trainings whose access conditions are service-based, so an outsider can buy the granting plan and book them.
- Keep everything published bookable by an outsider: block publication when *no* restriction row is satisfiable without membership.
- Tell a visitor what a session requires before they attempt to book, and offer the plan catalog when a booking is rejected for a missing service.
- Change nothing about the booking pipeline, and expose nothing new to anonymous visitors.

**Non-Goals:**
- Granting `anon` access to service names, or relaxing the US-0093 policies on `servicios` / `entrenamiento_restricciones`.
- Touching `entrenamientos_publicos_view` or the landing page's data path.
- Making `usuario_estado` / `validar_nivel_disciplina` satisfiable by non-members.
- Modifying `validateBookingRestrictions`, the deduction RPC, or the acquisition flow.

## Decisions

### 1. Retarget the gate rather than remove it

Removing the gate outright would let an administrator publish a training that no outsider can ever book (e.g. one restricted to `usuario_estado = 'activo'`), producing a listing that only ever fails at the booking step. The gate is therefore inverted: service restrictions stop blocking, membership-only restrictions start blocking.

*Alternative considered*: no gate at all, treating it as the administrator's responsibility. Rejected — it converts a preventable configuration error into a dead listing that wastes a visitor's time and reflects badly on the club.

### 2. The predicate must be OR-aware, and this is the subtle part

The naive rule — "block if any row is membership-only" — is **wrong**, because rows are OR-ed at booking time. A training with row A `[servicio_1=X]` and row B `[usuario_estado='activo']` is perfectly bookable by an outsider through row A; blocking it would be a false positive.

The correct rule:

> Block when the training **has** restriction rows **and none** of them is free of membership-only conditions.

```sql
exists (rows for this training)
and not exists (row where usuario_estado is null and coalesce(validar_nivel_disciplina,false) = false)
```

| Rows | Publishable |
|---|---|
| (none) | ✅ |
| `[servicio_1=X]` | ✅ **(the point of the change)** |
| `[servicio_1=X]` OR `[usuario_estado]` | ✅ (the service row is satisfiable) |
| `[usuario_estado]` | ❌ |
| `[validar_nivel_disciplina]` | ❌ |
| `[servicio_1=X, usuario_estado]` (one row) | ❌ (AND within a row) |

The same predicate is expressed twice — once in TypeScript for the UI/service gate, once in SQL in the trigger. The trigger is the authority; the TS copy exists only to disable the button and to fail fast with a typed error.

### 3. Service names come from a new view granted to `authenticated` only

Rendering "Requiere: …" needs service names, and after US-0093 `servicios` SELECT requires: member of the tenant, OR the service is granted by a public+active plan, OR the caller already holds units. Two consequences drive the design:

- `anon` cannot read `servicios` at all — and must not start to.
- An **authenticated non-member** may also fail all three branches, when no public plan grants the required service. A client-side read would leave the chip blank for exactly the visitors the feature is meant to inform.

So the names are resolved server-side by a view, which runs with its owner's privileges. The access decision is *which role gets the grant*:

| Option | Verdict |
|---|---|
| Add `servicios_requeridos` to `entrenamientos_publicos_view` | **Rejected** — that view is granted to `anon`, so service names would reach unauthenticated visitors. |
| Read `servicios` from the client | **Rejected** — blank for non-members and impossible for `anon`; would require weakening US-0093. |
| **New `entrenamientos_publicos_servicios_view`, granted to `authenticated` only** | **Chosen** — resolves names without any new grant on the underlying tables, and leaves the anon surface byte-identical. |

Consequence, accepted deliberately: the anonymous landing page shows no requirement row. An anonymous visitor may click "Reservar" on a restricted session and learn about the requirement one step later — harmless, because the anonymous CTA is `RegistrateParaReservarModal`, which never attempts a real booking.

### 4. The marketplace pays one extra round trip instead of switching to the view

`listPublicTrainings` reads `entrenamientos_publicos` and computes per-row capacity through `reservasService.getCapacidad`; the view computes `reservas_activas` its own way. Rewriting the marketplace onto the view would put that capacity semantics at risk for no benefit here.

Instead it issues **one** additional query — `select entrenamiento_id, servicios_requeridos from entrenamientos_publicos_servicios_view` — and merges by `entrenamiento_id`. Rows absent from the view (a listing that slipped into the past between the two queries) default to `[]`, and a failure of that query degrades every row to `[]` rather than failing the grid. It must never become a per-row query.

### 5. `REMOVED` + `ADDED` rather than `MODIFIED` for the gate requirement

The US-0089 requirement is named *"Pre-publish validation blocks servicio-based restrictions"*. Its subject changes entirely, so editing it in place under the same header would leave the spec's name contradicting its body. The delta removes it (with reason and migration) and adds *"Pre-publish validation blocks membership-only restrictions"*.

## Risks / Trade-offs

- **The OR-aware predicate is easy to get wrong**, and getting it wrong silently blocks legitimate publications (false positive) or allows dead listings (false negative) → the eight-row truth table is an explicit verification task against the trigger, not just the UI.
- **The predicate is duplicated in TS and SQL and can drift** → the trigger is documented as the authority; the service re-check maps the trigger's `P0001` onto the same typed error, so even a drifted TS copy surfaces the right message instead of a raw Postgres error.
- **`create or replace view` on the anon view is a tempting one-line shortcut** for the names → called out as a hard non-goal in the proposal, the story, and a verification step that diffs the anon view's output before and after.
- **A published training may still be unbookable by an outsider** through conditions the gate does not model (e.g. a per-level `entrenamiento_categorias` capacity split) → out of scope; the booking rejection remains explicit and now carries a path to the plan catalog.
- **Anonymous visitors see less than authenticated ones**, so the landing page can advertise a session whose requirement is only revealed after sign-in → accepted in Decision 3; mitigated by the rejection message always naming the specific service.
- **Depends on US-0093 being merged first** (the CTA reuses `PlanesPublicosModal`, and the premise needs non-member subscriptions) → sequence the branches; do not merge this one alone.

## Migration Plan

1. Apply `20260729000100_entrenamientos_publicos_restricciones_servicio.sql` **locally only**; never push to a remote project as part of this change.
2. No data migration: every currently published training passed the old gate, so none carries a service restriction and none is invalidated by the new predicate.
3. Verify the trigger against the eight combinations; verify the new view as an authenticated non-member (names resolve) and as `anon` (denied); diff `entrenamientos_publicos_view`'s output before/after to prove it is untouched.
4. **Rollback**: drop the new trigger/function and view, and re-create `check_entrenamiento_publico_sin_restriccion_servicio()` with its original trigger. Publications created in the meantime that carry service restrictions would then violate the restored rule — they are not deleted, but they would block on their next update, so rollback should be paired with un-publishing (`activo = false`) any listing whose training has service slots.

## Open Questions

- Should the administrator see, at publish time, an explicit note that a service-restricted listing is only bookable by outsiders who buy a plan granting that service? Currently they only see it disappear from the blocked list.
- Should the "Requiere: …" row link to the specific plan(s) that grant the service, rather than to the organization's whole catalog? Deferred — needs a service→plan reverse lookup that no current query provides.
