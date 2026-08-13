## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/new-user-guided-booking-flow` from the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Guided Booking Foundations (lib + service + hook)

- [x] 2.1 Add `src/lib/portal/entrenamientos-publicos/guidedBooking.ts` with `buildGuidedNextPath()` and `parseGuidedParams()` — single source of truth for the guided query param names (`guiado`, `entrenamiento`, `tenant`, `disciplina`, `nombre`)
- [x] 2.2 Extend `authService.signUpWithPassword` (`src/services/supabase/auth.ts`) to accept an optional `next` and append it to `emailRedirectTo` (mirror the existing pattern in `resetPasswordForEmail` in the same file)
- [x] 2.3 Extend `useAuth().signUp` (`src/hooks/auth/useAuth.ts`) to accept and forward `next` to `authService.signUpWithPassword`

## 3. Signup & Login Entry Points

- [x] 3.1 Update `src/app/auth/signup/page.tsx` to read `searchParams.next` and pass it to `SignupForm` as `nextPath` (mirror `src/app/auth/login/page.tsx`)
- [x] 3.2 Update `SignupForm.tsx` to accept a `nextPath` prop, send `next: nextPath` on `signUp()`, and redirect to `nextPath` (instead of the hardcoded `/dashboard`) when an immediate session is returned
- [x] 3.3 Update `RegistrateParaReservarModal.tsx` to build the guided target via `buildGuidedNextPath()` and pass it as `next` to both the "Crear cuenta gratis" and "Ya tengo cuenta" links

## 4. Guided Booking Stepper Component

- [x] 4.1 Add `src/components/ui/GuidedBookingStepper.tsx` — 5-step progress indicator (`currentStep: 1 | 2 | 3 | 4 | 5`, `trainingNombre: string`), exposed as a `role="status" aria-live="polite"` region
- [x] 4.2 Render the stepper in `RegistrateParaReservarModal.tsx` at step 1
- [x] 4.3 Render the stepper in `SignupForm.tsx` when `nextPath` decodes to a guided target (`parseGuidedParams`) — step 1 before submission, step 2 after the confirmation-required outcome message appears
- [x] 4.4 Render the stepper in `LoginForm.tsx` when `nextPath` decodes to a guided target — step 1

## 5. Marketplace Auto-Resume

- [x] 5.1 Update `EntrenamientosPublicosPage.tsx` to parse the guided target from the URL via `useSearchParams()` once the marketplace list has finished loading
- [x] 5.2 Auto-call the existing `setSelectedForReserva(item)` when the guided target's training is found among `featuredItem`/`standardItems`
- [x] 5.3 Strip the guided query params via `router.replace(pathname)` immediately after the modal auto-opens, so a page refresh does not reopen it
- [x] 5.4 Fall back silently to the normal marketplace view (no modal, no error) when the guided target's training can't be found in the loaded listing

## 6. Inline Profile Completion Step

- [x] 6.1 Add an optional `visibleFields?: FormularioPerfilCampo[]` prop to `PerfilPersonalForm.tsx` — omitted means render every field, unchanged from today
- [x] 6.2 Add the same optional `visibleFields?: FormularioPerfilCampo[]` prop to `PerfilDeportivoForm.tsx`
- [x] 6.3 Add `src/components/portal/entrenamientos/reservas/InlineProfileCompletionStep.tsx`, wrapping the existing `usePerfil()` hook as-is and rendering `PerfilPersonalForm`/`PerfilDeportivoForm` with `visibleFields` set to the caller-provided missing-field keys
- [x] 6.4 Wire its "Guardar y continuar" action to call `usePerfil().submit()` and, on success, the caller's `refetchPerfil()` callback

## 7. Booking Modal Wiring

- [x] 7.1 Update `PublicTrainingReservaModal.tsx`: add a new render branch, evaluated **before** the existing `checkingEligibility` branch, that shows `InlineProfileCompletionStep` while `reserva.formularioRespuestaForm.perfilFaltantes.length > 0 && !reserva.formularioRespuestaForm.perfilLoading`
- [x] 7.2 Wire the step's save to call `reserva.formularioRespuestaForm.refetchPerfil()` so the branch naturally falls through to the existing `checkingEligibility` → `bookingRejection` → `isFormularioStep` → `ReservaFormModal` sequence once resolved
- [x] 7.3 Accept a `guided?: boolean` prop on `PublicTrainingReservaModal.tsx` and render the stepper at step 3 (profile completion), step 4 (`checkingEligibility`/rejection-with-plans), and step 5 (`isFormularioStep`)
- [x] 7.4 Pass `guided` from `EntrenamientosPublicosPage.tsx` when the modal was opened automatically via a guided target (not when opened by a manual "Reservar" click)

## 8. Manual Verification

- [ ] 8.1 Run the full guided signup journey with a real test email and a training whose formulario has `perfil_campos_requeridos` set: confirm the training context survives signup → email confirmation (ideally opened on a different device/browser) → auto-opened booking modal → inline profile step → eligibility check → formulario → success, with the stepper showing the correct step at every stage
- [ ] 8.2 Repeat the same journey via "Ya tengo cuenta" (login) instead of signup
- [ ] 8.3 Confirm an already-authenticated user browsing `/portal/entrenamientos-publicos` directly and clicking "Reservar" manually sees no stepper and fully unchanged existing behavior
- [ ] 8.4 Confirm `/portal/perfil` still renders and saves every profile field when visited directly (no regression from the new `visibleFields` prop)
- [ ] 8.5 Confirm refreshing `/portal/entrenamientos-publicos` after the guided modal has auto-opened once does not reopen it
- [ ] 8.6 Confirm the initial `perfilLoading` fetch resolves before the profile-completion branch is evaluated, so the eligibility spinner never flashes before a real profile-completion prompt (see `design.md` Risks)
- [ ] 8.7 Confirm a training whose formulario has no `perfil_campos_requeridos` (or no formulario at all) skips the inline profile step entirely, for both guided and non-guided bookings

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` to list the new files (`src/lib/portal/entrenamientos-publicos/guidedBooking.ts`, `src/components/ui/GuidedBookingStepper.tsx`, `src/components/portal/entrenamientos/reservas/InlineProfileCompletionStep.tsx`) and annotate the modified files per the existing per-file comment conventions

## 10. Finalize

- [x] 10.1 Run type-check, lint, and tests; fix any failures (do not run the build) — `npx tsc --noEmit` clean; `npm run lint` clean of new warnings, one new `react-hooks/set-state-in-effect` error in `EntrenamientosPublicosPage.tsx`'s guided-resume effect, left as-is to match the same pre-existing pattern already present unfixed in 16 other data-loading hooks across the codebase (not a correctness issue); no test runner is configured in this project
- [x] 10.2 Write the commit message and pull request description summarizing the change, referencing US-0103
