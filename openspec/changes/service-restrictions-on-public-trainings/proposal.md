## Why

US-0089 hard-blocked publishing any training that carries a service-based restriction, on the premise that *"a cross-tenant visitor can never hold a subscription/service in a tenant they aren't a member of."* US-0093 invalidated that premise: a non-member can now buy a public plan, which creates a subscription in that tenant and populates `suscripcion_servicios` with the units the subtype grants.

The booking machinery was already tenant+athlete scoped, never membership scoped — `getServicioEntitlements(tenantId, atletaId, …)` never joins `miembros_tenant`, and `validateBookingRestrictions` only consults membership inside its `if (row.usuario_estado)` branch. So a service-only restriction row is *already* satisfiable by a paying non-member; the publish gate is the only thing standing in the way, and it forces administrators to strip restrictions off a training just to make it visible.

Source: `projectspec/userstory/us0094-service-restrictions-on-public-trainings.md` (US-0094), continuation of US-0093.

## What Changes

- **The publish gate is retargeted, not removed.** Service-based restrictions stop blocking publication. In their place, publication is blocked when **no** restriction row is satisfiable by a non-member — that is, when the training has restriction rows and *every* one of them sets `usuario_estado` or `validar_nivel_disciplina`.
- **The predicate respects OR semantics.** Restriction rows are OR-ed at booking time (`validateBookingRestrictions` returns on the first passing row), so a single service-only row makes the training bookable by an outsider and therefore publishable — even alongside membership-only rows. Conditions ANDed *within* one row still block.
- **Required services are shown before booking**, as a "Requiere: …" row on the marketplace card, and are added to the marketplace search so a session can be found by the name of a service it demands.
- **A rejected booking offers the way out**: when a booking fails with `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, the public booking modal offers "Ver planes de {organización}", opening the US-0093 plan catalog for that tenant.
- **New `entrenamientos_publicos_servicios_view`, granted to `authenticated` only**, is the sole source of the service names.
- **BREAKING (error contract)**: `EntrenamientoPublicoServiceErrorCode` replaces `'servicio_restriction'` with `'membership_restriction'`; `hasServicioRestrictions` is replaced by `hasBlockingMembershipRestrictions`.
- No existing publication is invalidated: everything published today passed the old gate, so none of it carries a service restriction.

## Non-goals

- **Granting `anon` any access to service names.** The anonymous landing page (`/entrenamientos-publicos`) shows no requirement row and its data path is not touched; `entrenamientos_publicos_view` must come out of this change byte-identical, with its `anon, authenticated` grant unchanged. Service names are tenant catalog data and stay off unauthenticated surfaces.
- **Weakening the US-0093 `servicios` / `entrenamiento_restricciones` policies** as a shortcut for rendering the card.
- **Changing the booking pipeline.** `validateBookingRestrictions`, `findServiceSubscriptionsToCharge`, `reservas.create()` and the `book_and_deduct_service_units` RPC already handle non-member athletes and are explicitly out of scope.
- **Making `usuario_estado` / `validar_nivel_disciplina` satisfiable by non-members.** They remain membership-dependent by design; this change only stops them from being silently publishable when they are the *only* condition.
- Auto-granting membership, changing plan pricing, or altering the acquisition flow from US-0093.
- Back-filling or re-validating existing `entrenamientos_publicos` rows.

## Capabilities

### New Capabilities
*(none — this change modifies the existing public-training capability)*

### Modified Capabilities
- `public-training-marketplace`: the pre-publish validation requirement is replaced (service restrictions no longer block; membership-only restrictions now do); marketplace listings gain a required-services display fed by a new authenticated-only view; marketplace search additionally matches required service names; a booking rejected for a missing service offers the organization's public plan catalog.

## Impact

**Database** — `supabase/migrations/20260729000100_entrenamientos_publicos_restricciones_servicio.sql`
- Drop trigger `entrenamientos_publicos_no_servicio_restriccion` and function `check_entrenamiento_publico_sin_restriccion_servicio()`.
- Add function `check_entrenamiento_publico_restricciones_membresia()` and trigger `entrenamientos_publicos_restricciones_membresia`.
- Create view `entrenamientos_publicos_servicios_view` (`entrenamiento_id`, `servicios_requeridos text[]`), granted to `authenticated` only.
- **Untouched:** `entrenamientos_publicos_view` and its grants; every RLS policy on `servicios`, `entrenamiento_restricciones`, `entrenamientos_publicos`, `suscripciones`, `suscripcion_servicios`.

**Services**
- `entrenamientos-publicos.service.ts` — `hasServicioRestrictions` → `hasBlockingMembershipRestrictions`; `publicarEntrenamiento` re-check + `P0001` trigger-error mapping; `listPublicTrainings` merges `servicios_requeridos` from the new view; `listPublicTrainingsForLanding` unchanged.

**Hooks**
- `useEntrenamientosPublicosMarketplace.ts` — carry `serviciosRequeridos`, extend the search matcher.
- `usePublicTrainingReserva.ts` — expose the rejection code plus tenant identity for the catalog CTA.
- `usePublicarEntrenamiento.ts` — map the new error code.
- `usePublicEntrenamientosLanding.ts` — no behavioral change (empty array).

**Components**
- `EntrenamientosPage.tsx` (flags + disabled reason), `EntrenamientoActionModal.tsx` (verify longer reason wraps), `PublicTrainingCard.tsx` (requirement row), `PublicTrainingsGrid.tsx`, `PublicTrainingReservaModal.tsx` (catalog CTA reusing `PlanesPublicosModal`), `PublicarEntrenamientoModal.tsx` (preview parity).

**Types**
- `entrenamientos-publicos.types.ts` — error code, `PublicTrainingListItem.serviciosRequeridos`, `PublicTrainingCardData.serviciosRequeridos`.

**Docs**
- `projectspec/03-project-structure.md` — service notes, card notes, and the DB trigger/view entries.

**Dependency**: builds on US-0093 (`public-plans-for-non-members`), which must be merged first — the catalog CTA reuses `PlanesPublicosModal`, and the whole premise depends on non-members being able to hold subscriptions.

**Regression surface**: publishing/un-publishing unrestricted trainings; the anonymous landing page; member booking of service-restricted trainings.

## Implementation Plan

1. Write the migration (drop old trigger/function, add the membership-restriction trigger/function, create the authenticated-only view); apply **locally only**.
2. Verify the trigger against all eight row combinations, and verify the view as an authenticated non-member and as `anon` (denied), diffing `entrenamientos_publicos_view` before/after to prove it is untouched.
3. Types: error code and `serviciosRequeridos`.
4. Service: replace the gate function, update `publicarEntrenamiento`, add the merge query to `listPublicTrainings` only.
5. Hooks: marketplace (data + search), publish modal error mapping, booking rejection metadata.
6. Components (page → component → hook → service order per slice): `EntrenamientosPage` gate, `PublicTrainingCard` requirement row + grid + publish preview, `PublicTrainingReservaModal` catalog CTA.
7. End-to-end as a non-member: buy plan → admin validates → book a restricted public training → verify deduction → cancel → verify restoration.
8. Regression: member booking a restricted training; publish/un-publish unrestricted; landing page unchanged.
9. Update `projectspec/03-project-structure.md`; run `npx tsc --noEmit` and `npm run lint`; write commit message and PR description.
