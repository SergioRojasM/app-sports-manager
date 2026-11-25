## Context

The booking flow for the Public Training Marketplace is: card "Reservar" → `PublicTrainingReservaModal` opens → `usePublicTrainingReserva.openBooking()` resets state and calls `reservaForm.openCreate()` → `ReservaFormModal` (and, if the training has an attached internal formulario, `FormularioRespuestaModal` first) → submit → `reservasService.create()` → `validateBookingRestrictions()` pre-flight check → `book_and_deduct_service_units` RPC. Today, `validateBookingRestrictions()` is only ever invoked at that final submit step, even though it's a pure read-only client function (`createClient()`-based, no side effects) that could run the instant "Reservar" is clicked.

`validateBookingRestrictions()` (`src/services/supabase/portal/reservas.service.ts:297-498`) already works for a non-member cross-tenant visitor today — `entrenamientos` (`entrenamientos_select_authenticated`, `visibilidad = 'publico'`) and `entrenamiento_restricciones` (`ent_restricciones_select_authenticated`) are both `to authenticated` with no membership requirement, confirmed by inspecting the policies directly before writing this design (not assumed from naming convention). This is the load-bearing fact that makes the whole story low-risk: moving an existing, already-safe check earlier in the UI is not a new trust boundary.

`PublicTrainingCard.tsx` is the single shared presentational component already reused, unmodified, by the authenticated marketplace, the admin's publish-preview, and (per US-0100) the anonymous landing page. This story's new card actions must not break that sharing.

## Goals / Non-Goals

**Goals:**
- Surface a booking-blocking condition (most commonly a missing service) before the visitor invests time in the form.
- Let a visitor preview a formulario or go acquire a required plan without first attempting a booking.
- Keep every change additive/optional so existing callers (`ReservasPanel`'s formulario preview, `VerPlanesButton`, the anonymous landing page, the admin preview) are unaffected.

**Non-Goals:**
- Changing the RPC-level enforcement or its atomicity guarantees.
- Making the "Adquirir plan" button reflect the *current viewer's* actual entitlement (would require N eligibility checks on page load).
- Consolidating `ReservasPanel.tsx`'s existing inline formulario-preview state into the new hook.

## Decisions

**1. Run the pre-check inside `openBooking()`, not at the card/grid level.**
The card already opens `PublicTrainingReservaModal` instantly (local boolean state, no network round trip) when "Reservar" is clicked; the check then runs as the modal's first action, with a loading branch covering the round trip. Rejected alternative: run `validateBookingRestrictions` for every visible card on page/grid load, so the "Reservar" button itself could be disabled upfront. Rejected because it means N eligibility checks (each involving several sequential queries: `entrenamientos`, `entrenamiento_restricciones`, `miembros_tenant`, service entitlements, and conditionally `usuario_nivel_disciplina`/`entrenamiento_categorias`) fired the moment the marketplace grid renders, for trainings the visitor may never click into — unnecessary load for no benefit over checking lazily on click, since the click-to-modal-open transition already provides a natural, expected place for a brief loading state.

**2. Fail open on pre-check errors, not fail closed.**
If `validateBookingRestrictions()` throws (network blip, unrelated transient error), the hook treats it as `{ ok: true }` and proceeds to the form, rather than showing a dead-end error screen. Rationale: the RPC at actual submit time is still the authoritative, race-safe check — a failed pre-check can never let an ineligible booking through, it can only (in the worst case) let an eligible visitor proceed to a form that the RPC will still correctly accept. Failing closed here would convert a transient network hiccup into "you can never book this training," a strictly worse outcome for a check that exists purely to save the visitor time. Rejected alternative: show a retry-able error state — adds UI complexity for a rare failure mode with no security benefit, since nothing is lost by falling through to the existing, already-robust form+RPC path.

**3. `BookingRejection.servicioNombre` (a name), not `servicioId`.**
The consuming code (`usePlanesPublicos`'s `matchesSearch`) already matches search terms against service **names** — there is no existing id-based lookup path anywhere in the plan catalog. Adding `servicioNombre` lets the existing search machinery work unmodified; adding `servicioId` would require also building a new id→plan lookup (not present today) for no additional benefit, since the catalog has no id-based filter to feed it. The name is already resolved locally at every site that would populate this field (the code already fetches `servicios.nombre` to build the existing rejection message), so this is a zero-extra-query addition.

**4. `initialSearch` reset via a `useEffect` keyed on `open`, not a `useState` initializer.**
`PlanesPublicosModal` is a controlled-visibility component (`open: boolean`) that is not unmounted/remounted between opens — `usePlanesPublicos`'s internal state persists across `open` toggles (this is why `enabled: open` exists, to gate the *data fetch*, not the component lifecycle). A plain `useState(initialSearch ?? '')` would only ever apply the very first time the modal mounts in the page's lifetime; every subsequent open (from a different card, with a different required service) would keep whatever `search` was left over from the previous session. The fix is a `useEffect` that resets `search` to `initialSearch ?? ''` whenever `open` transitions to `true`, mirroring the existing focus-management effect already in `PlanesPublicosModal` (`dialogRef.current?.focus()` on open, `PlanesPublicosModal.tsx:38-41`) — same trigger, same pattern, low risk.

**5. Batched formulario enrichment in the service layer, not a persisted column.**
`entrenamientos_publicos` deliberately does **not** duplicate `formulario_id`/`formulario_externo`/`formulario_obligatorio` from the source `entrenamientos` row (an explicit, pre-existing architectural rule from the original US-0089 spec, to avoid data drift between the publication snapshot and the live training). This design respects that rule: `listPublicTrainings()` performs one additional runtime query (`entrenamientos.select('id, formulario_id, formulario_externo').in('id', entrenamientoIds)`) and merges the result into the in-memory list — no new column, no schema change, no drift risk (always reads the live value). This mirrors the function's existing enrichment pattern for booking capacity (`Promise.all` + `reservasService.getCapacidad`), just via a single batched `.in()` query instead of one-per-row, since the goal here is column values, not a computed aggregate per training.

**6. Card-level actions ("Vista previa", "Adquirir plan") own their state locally, inside `PublicTrainingCard`.**
Exactly the pattern established for the banner-viewer modal (US-0100): no prop plumbing through `PublicTrainingsGrid`/`EntrenamientosPublicosPage`/`PublicEntrenamientosLandingPage`. Because the new data these actions depend on (`formularioId`, `formularioExterno`, `tenantId`, `serviciosRequeridos`) is only ever populated by the authenticated marketplace's `listPublicTrainings()` — never by `listPublicTrainingsForLanding()` or (unless explicitly wired) the admin's publish-preview — the buttons naturally don't render on those surfaces without any extra `isAuthenticated`-style flag. Absence of data is the gate, not a new prop.

**7. Rejection screen: broaden the branch condition, keep the CTA gating narrow.**
`PublicTrainingReservaModal`'s existing rejection branch (`rejectionCode === 'SERVICIO_REQUERIDO' || rejectionCode === 'UNIDADES_AGOTADAS'`) becomes `reserva.bookingRejection != null` (any code), but the "Ver planes" button stays gated to exactly those two codes inside that branch — a plan purchase cannot fix `TIMING_RESERVA`, `USUARIO_INACTIVO`, or `NIVEL_INSUFICIENTE`, so offering it for those codes would be actively misleading.

## Risks / Trade-offs

- **[Risk] The pre-check adds a round trip (several sequential queries) before the form appears, where today the modal opens directly onto the form.** → Mitigation: a loading state (spinner + message) covers this, and it replaces time the visitor would otherwise spend filling out a form that might get rejected anyway — net faster for the common case where the check fails, break-even (one extra round trip) for the case where it passes.
- **[Risk] `servicioNombre` could theoretically collide/ambiguity when a restriction row has multiple service slots (`servicio_1_id..servicio_4_id`) and more than one is missing.** → Mitigation: `validateBookingRestrictions` already resolves and reports only the *first* missing slot's name for its message (existing behavior, unchanged) — `servicioNombre` simply exposes that same, already-singular value structurally instead of only via string interpolation. No new ambiguity introduced.
- **[Risk] Batched formulario enrichment adds one query to every `listPublicTrainings()` call.** → Mitigation: it's a single `.in()` query regardless of list size (not N+1), consistent with the function's existing performance characteristics; negligible relative to the existing per-row capacity enrichment it already performs.
- **[Trade-off] The "Adquirir plan" button doesn't know if the viewer already has the service.** → Accepted (see Non-Goals): matches the existing "Requiere: …" row's already-shipped behavior; avoiding N live checks on render is a deliberate performance choice, not an oversight.

## Migration Plan

No database migration. Frontend-only change: types, one additional batched query, new hook, component/prop additions — all additive. No local Supabase migration step is required for this change (unlike US-0100), so there is nothing to apply/verify against the local instance beyond the existing schema.

## Open Questions

None — the User Story (US-0101) and the RLS/pattern verification done before writing this design resolve every open point.
