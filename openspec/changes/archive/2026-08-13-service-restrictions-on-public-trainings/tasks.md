## 1. Branch setup

- [x] 1.1 Create the working branch `feat/service-restrictions-on-public-trainings` **from the US-0093 branch/merge point** — this change depends on `public-plans-for-non-members` (the catalog CTA reuses `PlanesPublicosModal`, and the whole premise needs non-member subscriptions)
- [x] 1.2 Verify the working branch is not `main`, `master` or `develop` before making any change

## 2. Database migration (local only)

- [x] 2.1 Create `supabase/migrations/20260729000100_entrenamientos_publicos_restricciones_servicio.sql` and drop the US-0089 rule: trigger `entrenamientos_publicos_no_servicio_restriccion` and function `check_entrenamiento_publico_sin_restriccion_servicio()`
- [x] 2.2 Add `check_entrenamiento_publico_restricciones_membresia()` implementing the OR-aware predicate — raise only when the training **has** restriction rows **and** `not exists` a row with `usuario_estado is null and coalesce(validar_nivel_disciplina,false) = false` — plus its `before insert or update` trigger
- [x] 2.3 Create `entrenamientos_publicos_servicios_view` (`entrenamiento_id`, `servicios_requeridos text[]`, scoped to `activo` and future `fecha_hora`), aggregating distinct service names across the four service slots
- [x] 2.4 `grant select` on the new view to `authenticated` **only** — never to `anon`; add the header comment explaining why
- [x] 2.5 Confirm the migration does **not** touch `entrenamientos_publicos_view`, its grants, or any RLS policy on `servicios` / `entrenamiento_restricciones` / `entrenamientos_publicos`
- [x] 2.6 Apply the migration to the **local** Supabase stack only (never push to a remote project)
- [x] 2.7 Verify the trigger against all eight row combinations from the design's truth table: none / service-only / two service rows / service + membership rows (allowed) / usuario_estado only / nivel only / both membership rows / service+usuario_estado in one row (blocked)
- [x] 2.8 Verify the new view as an authenticated **non-member**: names resolve even for a service that no public plan grants
- [x] 2.9 Verify as `anon`: select on the new view is denied, and `servicios` / `entrenamiento_restricciones` remain denied
- [x] 2.10 Capture `entrenamientos_publicos_view`'s output as `anon` before and after the migration and diff them — must be identical

## 3. Types

- [x] 3.1 In `src/types/portal/entrenamientos-publicos.types.ts`, replace `'servicio_restriction'` with `'membership_restriction'` in `EntrenamientoPublicoServiceErrorCode`
- [x] 3.2 Add `serviciosRequeridos: string[]` to `PublicTrainingListItem` and to `PublicTrainingCardData`

## 4. Services

- [x] 4.1 Replace `hasServicioRestrictions` with `hasBlockingMembershipRestrictions(tenantId, entrenamientoId)` in `src/services/supabase/portal/entrenamientos-publicos.service.ts`, reusing `entrenamientosService.getInstanceRestrictions` and returning `rows.length > 0 && !rows.some(r => r.usuario_estado == null && !r.validar_nivel_disciplina)`
- [x] 4.2 Update `publicarEntrenamiento` to use the new check and throw `EntrenamientoPublicoServiceError('membership_restriction', …)` with the user-facing message
- [x] 4.3 Map the trigger's `P0001` exception in `publicarEntrenamiento` onto the same typed error, so a stale disabled state never surfaces a raw Postgres error
- [x] 4.4 In `listPublicTrainings`, add one merge query against `entrenamientos_publicos_servicios_view` keyed by `entrenamiento_id`; default missing rows to `[]`; catch a failure of that query and degrade all rows to `[]` without failing the listing
- [x] 4.5 Leave `listPublicTrainingsForLanding` querying `entrenamientos_publicos_view` unchanged, mapping `serviciosRequeridos: []`

## 5. Hooks

- [x] 5.1 Carry `serviciosRequeridos` through `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts`
- [x] 5.2 Extend that hook's search matcher so a listing matches on the names of its required services, keeping the existing `nombre`/`descripcion` matching and staying client-side
- [x] 5.3 Expose the booking rejection `code` plus `tenantId`/`tenantNombre` from `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` so the modal can decide whether to offer the catalog action
- [x] 5.4 Map the `membership_restriction` code to its message in `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts`
- [x] 5.5 Confirm `src/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding.ts` needs no change beyond the type default, and does **not** query the new view

## 6. Components — publish gate

- [x] 6.1 In `src/components/portal/entrenamientos/EntrenamientosPage.tsx`, rename `servicioRestrictionById` → `blockingRestrictionById` and `hasServicioRestriction` → `hasBlockingRestriction`, and call the new service function
- [x] 6.2 Update `publishActionContext`'s disabled reason to the membership-restriction message, keeping the existing past-training and loading branches intact
- [x] 6.3 Verify the longer reason wraps correctly inside `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` (no prop changes expected)

## 7. Components — marketplace display

- [x] 7.1 Render the "Requiere: …" row in `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` from `data.serviciosRequeridos`, rendering nothing when the array is empty (this is what keeps the shared card unchanged on the landing page)
- [x] 7.2 Pass `serviciosRequeridos` through `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx`
- [x] 7.3 Supply `serviciosRequeridos` to the live preview in `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` so the admin sees what a visitor sees
- [x] 7.4 Confirm `src/components/landing/entrenamientos-publicos/PublicEntrenamientosLandingPage.tsx` renders no requirements row and keeps `RegistrateParaReservarModal`

## 8. Components — booking rejection CTA

- [x] 8.1 In `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`, render a "Ver planes de {tenantNombre}" action beside the rejection message when the code is `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`
- [x] 8.2 Mount `PlanesPublicosModal` for that `tenantId` from the action, restoring focus to the trigger on close
- [x] 8.3 Ensure the action is a real `<button>`, keyboard reachable with visible focus, and that the rejection text never degrades to a generic "no cumples los requisitos" when a specific service is known

## 9. Verification

- [x] 9.1 End-to-end as a non-member: buy a public plan granting service X → admin validates the subscription → book a published training restricted to X → confirm the `reservas` row, the `suscripcion_servicios` deduction and the `reserva_servicios` ledger entry
- [x] 9.2 Cancel that booking and confirm the units are restored
- [x] 9.3 As a non-member with **no** subscription: confirm the rejection names the service and offers the catalog action, and that acquiring a plan from it follows the US-0093 flow
- [x] 9.4 As a non-member whose subscription is still `pendiente`: confirm the booking is rejected
- [x] 9.5 As a non-member with exhausted units: confirm the exhausted-units message and the catalog action
- [x] 9.6 Marketplace: confirm the requirements row, the alphabetical distinct names, and that searching by a service name finds the session
- [x] 9.7 Landing page as an anonymous visitor: confirm no requirements row, unchanged listing output, and the registration prompt on "Reservar"
- [x] 9.8 Publish gate in the UI for each of the eight row combinations, matching the trigger results from 2.7
- [x] 9.9 Regression: a member books a service-restricted training (public and private) with identical validation, deduction and messages
- [x] 9.10 Regression: publish, un-publish (`activo = false`) and re-publish an unrestricted training

## 10. Documentation and delivery

- [x] 10.1 Update `projectspec/03-project-structure.md` — the `entrenamientos-publicos.service.ts` notes, the `PublicTrainingCard` notes, and the Database Functions table (drop the old trigger entry, add the membership-restriction trigger and the new view)
- [x] 10.2 Run `npx tsc --noEmit` and `npm run lint` and fix anything they report (do not run a build; this repo defines no test script)
- [x] 10.3 Write the commit message and the pull request description, stating the dependency on US-0093 and that the migration was applied locally only
