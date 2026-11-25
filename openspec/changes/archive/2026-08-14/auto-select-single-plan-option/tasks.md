## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/auto-select-single-plan-option` from the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Hook — Auto-Select the Sole Active Subtype

- [x] 2.1 In `src/hooks/portal/planes/useSuscripcion.ts`, import `getActiveTipos` from `src/hooks/portal/planes/usePlanesView.ts`
- [x] 2.2 In `openModal(plan)`, compute `const activeTipos = getActiveTipos(plan);` and replace the unconditional `setSelectedTipoId(null)` with `setSelectedTipoId(activeTipos.length === 1 ? activeTipos[0].id : null)`

## 3. Component — Skip the Subtype-Picker Step When There's No Real Choice

- [x] 3.1 In `src/components/portal/planes/SuscripcionModal.tsx`, replace `const hasSubtypes = activeTipos.length > 0;` with `const hasSubtypeChoice = activeTipos.length > 1;` (with a short comment on why "more than one" is the relevant threshold) — `hasSubtypes` had no remaining use once its call sites moved to the new flag, so it was removed rather than kept alongside it
- [x] 3.2 Change the mount effect's `setStep(hasSubtypes ? 1 : 2)` to `setStep(hasSubtypeChoice ? 1 : 2)`
- [x] 3.3 Change Step 1's render guard from `step === 1 && hasSubtypes` to `step === 1 && hasSubtypeChoice`
- [x] 3.4 Change the Step 2 "Volver" button's render guard from `hasSubtypes` to `hasSubtypeChoice`

## 4. Manual Verification

- [x] 4.1 Plan with exactly 1 active subtype: clicking "Adquirir" opens `SuscripcionModal` directly on Step 2 (payment), with the subtype's price/vigencia/servicios already shown and no "Volver" button
- [x] 4.2 Plan with exactly 1 active subtype: submitting the payment form creates the `suscripcion`/`pago` with the correct `plan_tipo_id` and `monto`
- [x] 4.3 Plan with 0 active subtypes: `PlanPublicoCard` still shows "Este plan no tiene opciones disponibles" and no "Adquirir" button — unchanged
- [x] 4.4 Plan with 2+ active subtypes: Step 1 picker still shown, "Continuar" still disabled until a card is selected, "Volver" still works from Step 2 — unchanged
- [x] 4.5 Repeat 4.1 across all three shared entry points: `PlanesPublicosModal` (public marketplace), `PublicTrainingReservaModal`'s "Ver planes de {tenant}" booking-rejection action, and `PlanesViewPage` (authenticated athlete)
- [x] 4.6 Close the modal and reopen it for a different plan (different subtype count) — confirm no stale auto-selection carries over

## 5. Documentation

- [x] 5.1 Update `projectspec/03-project-structure.md`: annotate the `SuscripcionModal.tsx` and `useSuscripcion.ts` lines with a brief note about the single-active-subtype auto-select/skip-to-payment behavior (US-0105)

## 6. Finalize

- [x] 6.1 Run type-check, lint, and tests; fix any failures (do not run the build) — `npx tsc --noEmit` clean; `npm run lint` back to the same 35 pre-existing problems (17 errors/18 warnings) as before this change, no new issues; no test runner configured in this project
- [x] 6.2 Write the commit message and pull request description summarizing the change, referencing US-0105
