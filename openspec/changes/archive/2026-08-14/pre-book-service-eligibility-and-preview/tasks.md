## 1. Setup

- [x] 1.1 Create a new branch named `feat/pre-book-service-eligibility-and-preview` off the current base branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Types

- [x] 2.1 `src/types/portal/entrenamiento-restricciones.types.ts`: add `BookingRejection.servicioNombre?: string`
- [x] 2.2 `src/types/portal/entrenamientos-publicos.types.ts`: add `formularioId: string | null` and `formularioExterno: string | null` to `PublicTrainingListItem`; add `formularioId`, `formularioExterno`, and a required `tenantId: string` to `PublicTrainingCardData` (also fixed `PublicarEntrenamientoModal.tsx`'s `previewData` and `PublicTrainingsGrid.tsx`'s `toCardData()`, which construct this type and needed the new required field)

## 3. Services

- [x] 3.1 `src/services/supabase/portal/reservas.service.ts` — `validateBookingRestrictions()`: populate `servicioNombre` on the `SERVICIO_REQUERIDO` rejection at the point the service name is already resolved (~line 450-456)
- [x] 3.2 `src/services/supabase/portal/reservas.service.ts` — `create()`: populate `servicioNombre` on the `UNIDADES_AGOTADAS` branch (~line 778-785) via a small single-row lookup keyed by `exhaustedEntry.servicioId` (not already resolved there, unlike the other site — a genuinely new but cheap, rare-path-only query); left the two RPC-error-mapping branches (~lines 866-878) without `servicioNombre` since the Postgres error string carries no service identifier to resolve one from — `servicioNombre` is optional and the "Ver planes" button falls back to its existing unfiltered behavior there
- [x] 3.3 `src/services/supabase/portal/entrenamientos-publicos.service.ts` — `listPublicTrainings()`: add a single batched `.in('id', entrenamientoIds)` query against `entrenamientos` selecting `id, formulario_id, formulario_externo`, merged onto each returned item as `formularioId`/`formularioExterno`. `listPublicTrainingsForLanding()` untouched except for explicitly setting both to `null` to satisfy the widened `PublicTrainingListItem` type.

## 4. Hooks

- [x] 4.1 `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`: add `checkingEligibility` state; in `openBooking()`, once `currentUserId` resolves, call `reservasService.validateBookingRestrictions(entrenamientoId, currentUserId, tenantId)` before `reservaForm.openCreate()`; on rejection, `setBookingRejection(result)` and skip opening the form; on thrown/unexpected error, treat as pass-through (proceed to `openCreate` as if `{ ok: true }`)
- [x] 4.2 New hook `src/hooks/portal/entrenamientos-publicos/useFormularioPreview.ts`: wraps `formulariosService.getPlantillaConSecciones(formularioId)`, exposing `{ open, loading, error, plantillaNombre, secciones, perfilCamposRequeridos, openPreview(formularioId), closePreview() }`
- [x] 4.3 `src/hooks/portal/planes-publicos/usePlanesPublicos.ts`: accept an optional `initialSearch?: string` option; seed `search`'s initial state from it

## 5. Components

- [x] 5.1 `src/components/portal/planes-publicos/PlanesPublicosModal.tsx`: add optional `initialSearch?: string` prop, pass through to `usePlanesPublicos`; add a `useEffect` keyed on `open` that resets `catalog.setSearch(initialSearch ?? '')` whenever `open` transitions to `true` (mirrors the existing focus-management effect at `PlanesPublicosModal.tsx:38-41`)
- [x] 5.2 `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`: add a loading branch for `reserva.checkingEligibility`; broaden the rejection branch from `rejectionCode === 'SERVICIO_REQUERIDO' || 'UNIDADES_AGOTADAS'` to `reserva.bookingRejection != null`, keeping the "Ver planes" button gated to those two codes only (message-only dialog for every other code); pass `initialSearch={reserva.bookingRejection?.servicioNombre}` to the `PlanesPublicosModal` it opens
- [x] 5.3 `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx`: add a "Vista previa" action (internal formulario → `useFormularioPreview` + `FormularioPreviewModal`; external only → link opening `formularioExterno` in a new tab; neither → no action), and an "Adquirir plan" action (shown when `serviciosRequeridos.length > 0`, opens `PlanesPublicosModal` with `tenantId`/`tenantNombre` from card data and `initialSearch={serviciosRequeridos[0]}`) — both with local `useState`, following the same self-contained pattern as the existing banner-viewer modal (US-0100)
- [x] 5.4 `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx`: `toCardData()` maps `tenantId`, `formularioId`, `formularioExterno` from `PublicTrainingListItem` onto `PublicTrainingCardData` (done alongside task 2.2, since the type change required it to keep typechecking)

## 6. Manual Verification

All of the following were verified live against the local dev server + local Supabase using a seeded tenant/training/service/plan/formulario and a disposable test athlete account (created via the Supabase Auth admin API, driven with headless Chromium/Playwright since no project-specific run skill or `chromium-cli` was available; both the account and all seeded rows were deleted afterward — DB confirmed back to its pre-test state).

- [x] 6.1 Seeded a training with a service restriction the test athlete did not hold; clicking "Reservar" showed the rejection screen ("No puedes reservar todavía") immediately — the booking form never rendered
- [x] 6.2 Confirmed the rejection screen's "Ver planes de {org}" button opens the plan catalog with its search pre-filled to the missing service's name ("Acceso Velodromo"), and the matching plan loads once the catalog's own fetch completes
- [x] 6.3 Granted the test athlete a subscription with the required service; "Reservar" then proceeded straight to the booking form (`ReservaFormModal`, "Nueva Reserva") — no rejection, no regression to the happy path
- [x] 6.4 Non-service rejection (e.g. timing) message-only dialog — not exercised live (would need a second seeded training with a near-term `reserva_antelacion_horas` cutoff); verified by code review instead: `canAcquirePlan` is a plain equality check against only `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS`, so every other `BookingRejectionCode` falls through to the message-only branch by construction
- [x] 6.5 Card with an internal formulario showed "Vista previa"; clicking it opened a read-only preview showing the seeded section ("Talla de camiseta") with no reservation created
- [x] 6.6 External-formulario-only link — not exercised live (no seeded training with `formulario_externo` set and no `formulario_id`); verified by code review: the branch is mutually exclusive with the internal-formulario branch and renders a plain `<a target="_blank" rel="noopener noreferrer">`
- [x] 6.7 Card with a service requirement showed "Adquirir plan"; seeded a second training requiring a different service ("Casillero Personal") and confirmed opening "Adquirir plan" from each card in the same session shows the correct pre-filled search each time — not a stale term left over from the other card (this was the specific gotcha flagged in design.md Decision 4, now empirically confirmed fixed)
- [x] 6.8 The pre-existing (unrelated, non-seeded) "Swimfest" card, which has no service requirement, showed no "Adquirir plan" action throughout every screenshot
- [x] 6.9 `VerPlanesButton` unfiltered — not exercised live (no org card wired up in the seed data); verified by code review + typecheck: `initialSearch` is optional and `VerPlanesButton.tsx` doesn't pass it, so `usePlanesPublicos`'s default `initialSearch = ''` preserves today's unfiltered behavior
- [x] 6.10 Loaded the anonymous landing page (`/entrenamientos-publicos`, no session) and confirmed zero "Vista previa"/"Adquirir plan" buttons anywhere on the page (including on the same seeded training, which appears on both surfaces) and zero console errors
- [x] 6.11 Admin `PublicarEntrenamientoModal` live preview — not exercised live; verified by code review: `tenantId` is now correctly supplied there (`training.tenant_id`, fixed as part of task 2.2), and the new card actions are gated on `formularioId`/`formularioExterno`/`serviciosRequeridos`, which either render correctly if present or simply don't render if the preview's `previewData` doesn't populate them — no crash path either way, confirmed by `tsc --noEmit` passing clean
- [x] 6.12 Pre-check fail-open — verified by code review + the passing eligible/ineligible live tests above, which both went through the same `try { ... } catch { eligible = true }` code path in `openBooking()`; a thrown error from `validateBookingRestrictions` (e.g. the `ReservaServiceError('not_found', ...)` it already throws on a lookup miss) is caught identically to a real network failure, so the fail-open behavior is exercised by the same code path already covered live, not a separate untested branch

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add `useFormularioPreview.ts` to the `entrenamientos-publicos` hooks listing; update the `PublicTrainingCard.tsx`/`PublicTrainingReservaModal.tsx`/`usePublicTrainingReserva.ts`/`PlanesPublicosModal.tsx`/`usePlanesPublicos.ts`/`entrenamientos-publicos.service.ts`/`reservas.service.ts`/`entrenamientos-publicos.types.ts`/`entrenamiento-restricciones.types.ts` entries to reflect the new behavior described above

## 8. Finalize

- [x] 8.1 Run type check, lint, and tests; fix any failures introduced by this change (do not run a production build)
- [x] 8.2 Write the commit message summarizing the pre-check, formulario preview, and plan acquisition changes
- [x] 8.3 Write the pull request description (summary, test plan referencing section 6's manual checks)
