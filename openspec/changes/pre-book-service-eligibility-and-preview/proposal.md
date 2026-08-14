## Why

Today a visitor on the Public Training Marketplace only discovers they're missing a required service **after** filling out the entire booking form (and, for trainings with an attached formulario, answering every field) — the rejection only surfaces when `reservasService.create()` calls the same `validateBookingRestrictions()` check that could just as easily run the moment they click "Reservar". This wastes the visitor's time and buries the one actionable next step (buy the plan that grants the service) behind a dead-end form-fill. Separately, a visitor has no way to preview a training's attached formulario or jump straight to acquiring the required plan without first attempting — and failing — a booking.

Source: `projectspec/userstory/us0101-pre-book-service-eligibility-and-preview.md` (US-0101).

## What Changes

- **Eligibility pre-check moves to "Reservar" click, before the form opens.** `usePublicTrainingReserva.openBooking()` runs the existing `validateBookingRestrictions()` as soon as the current user resolves; on failure, the rejection screen shows immediately and the form (and formulario step) is never opened. On an unexpected error the check fails open (proceeds to the form) — the RPC-level check at actual submit time remains the authoritative, race-safe gate regardless.
- **Rejection screen broadens** from handling only `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` to any `BookingRejectionCode` the pre-check can now surface pre-form. The "Ver planes" purchase CTA still only appears for the two service-related codes; other codes (timing, membership status, level) get a message-only dialog.
- **New "Vista previa" action on public training cards**: opens a read-only preview of the attached internal formulario, or links out to an external formulario URL — without requiring "Reservar" first. Requires batching `formulario_id`/`formulario_externo` into the marketplace list query (currently only fetched once the booking modal opens).
- **New "Adquirir plan" action on public training cards**: shown whenever the training has a required service, opens the existing public plan catalog (`PlanesPublicosModal`) pre-searched to that service's name.
- **`PlanesPublicosModal`/`usePlanesPublicos` gain an optional `initialSearch` seed** (backward compatible — every existing caller, e.g. `VerPlanesButton`, is unaffected) so both the card's new "Adquirir plan" button and the (broadened) rejection screen's "Ver planes" button can open the catalog pre-filtered instead of unfiltered.
- **`BookingRejection` gains an optional `servicioNombre`** field, populated at the points in `reservas.service.ts` that already resolve the missing service's name locally — powers the pre-filtered "Ver planes" button without fragile message-string parsing.
- All of the above is scoped to the **authenticated** marketplace (`/portal/entrenamientos-publicos`) only — every table/view involved is already gated `to authenticated` with no `anon` grant, so none of this reaches the anonymous landing page (`/entrenamientos-publicos`), which keeps its existing "Regístrate para reservar" CTA unchanged.
- No breaking changes: every new field/prop is additive and optional; the atomic booking RPC and its enforcement are untouched.

## Non-goals

- **No RLS or database changes.** Every table/view read here (`entrenamientos`, `entrenamiento_restricciones`, `formularios_plantillas`, `formulario_plantilla_esquema`) is already readable `to authenticated` with no tenant-membership requirement — confirmed by inspecting the existing policies before writing this proposal.
- **No change to the atomic booking RPC** (`book_and_deduct_service_units`) or its enforcement — the pre-check is a UX layer on top of the exact validation function `create()` already runs as a pre-flight step; server-side enforcement is unchanged.
- **No live per-card entitlement check on page load.** The "Adquirir plan" button's visibility is driven by the training's static `serviciosRequeridos` (does it require a service at all), not by whether the *current viewer* already holds it — running `validateBookingRestrictions` for every visible card would mean N look-ups on render. This mirrors the existing "Requiere: …" row's identical, already-shipped behavior.
- **No changes to the anonymous landing page** (`/entrenamientos-publicos`, `PublicEntrenamientosLandingPage.tsx`, `listPublicTrainingsForLanding()`) — untouched; the new affordances simply have no data to render there (`serviciosRequeridos` is already `[]`, formulario fields are never fetched for that path).
- **No extraction of `ReservasPanel.tsx`'s existing inline formulario-preview state** into the new `useFormularioPreview` hook — that file keeps its current (duplicate) implementation; only the new marketplace card uses the new hook. A follow-up cleanup could consolidate them later.
- **No zoom/gallery features** on the formulario preview or plan catalog — both reuse existing, unmodified presentational components (`FormularioPreviewModal`, `PlanPublicoCard`).

## Capabilities

### New Capabilities
*(none)*

### Modified Capabilities
- `public-training-marketplace`: the booking-eligibility check (service requirement, timing, membership, level) now runs when "Reservar" is clicked, before the booking form opens, instead of only at final submit; the rejection screen handles any rejection code (purchase CTA still limited to service-related codes) and, when applicable, opens the plan catalog pre-searched to the missing service; every public training card gains a "Vista previa" (formulario) action and an "Adquirir plan" action, each independent of attempting a booking.

## Impact

**Frontend — booking flow**
- `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` — pre-check in `openBooking()`, new `checkingEligibility` state, fail-open error handling.
- `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` — loading branch; broadened rejection branch; `initialSearch` wiring to `PlanesPublicosModal`.
- `src/types/portal/entrenamiento-restricciones.types.ts` — `BookingRejection.servicioNombre?: string`.
- `src/services/supabase/portal/reservas.service.ts` — populate `servicioNombre` at existing service-name-resolution points in `validateBookingRestrictions` and `create()`.

**Frontend — card actions**
- `src/services/supabase/portal/entrenamientos-publicos.service.ts` — `listPublicTrainings()`: batched `formulario_id`/`formulario_externo` enrichment (single `.in()` query, not N+1).
- `src/types/portal/entrenamientos-publicos.types.ts` — `PublicTrainingListItem`/`PublicTrainingCardData`: add `formularioId`, `formularioExterno`, `tenantId` (card data only).
- `src/hooks/portal/entrenamientos-publicos/useFormularioPreview.ts` — new hook wrapping `formulariosService.getPlantillaConSecciones`.
- `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` — "Vista previa" and "Adquirir plan" actions, local state, following the existing US-0100 banner-modal pattern.
- `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx` — `toCardData()` maps the new fields.

**Frontend — plan catalog**
- `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` — optional `initialSearch` prop, reset-on-open effect.
- `src/hooks/portal/planes-publicos/usePlanesPublicos.ts` — optional `initialSearch` option.

No database migrations, no new API routes, no changes to `book_and_deduct_service_units` or any RLS policy.
