## Context

Today a new user discovering a public training goes: view training → "Regístrate para
reservar" → create account → confirm email → log in → re-find the training → eligibility
check → (if a plan is missing) buy one and wait for admin approval → fill the per-training
formulario → reserve. Two structural gaps make this worse than it needs to be:

1. **No context survives the trip through auth.** `RegistrateParaReservarModal` links to
   `/auth/signup` with no params; `SignupForm` redirects to a hardcoded `/dashboard`;
   `authService.signUpWithPassword`'s `emailRedirectTo` carries no `next`. The one place
   that *does* support an arbitrary `next` — login → `/auth/callback/route.ts` →
   `/portal/bootstrap/route.ts` — already forwards a full path + query string end-to-end via
   `encodeURIComponent`/`new URL(nextPath, request.url)`. This design reuses that pipeline
   rather than inventing a second one.
2. **A brand-new profile fails almost every formulario's profile-completeness gate.**
   `handle_new_auth_user()` seeds `usuarios` from (usually empty) signup metadata and never
   creates a `perfil_deportivo` row, so `useFormularioRespuestaForm`'s `perfilFaltantes`
   check nearly always finds every `perfil_campos_requeridos` field missing on a first
   booking attempt. Today's remedy — a `target="_blank"` link to the full `/portal/perfil`
   page — pulls the user out of the flow entirely.

This design covers: (a) the `next`-based context pipeline extended to signup and the
landing CTA, (b) an early-render "profile completion" branch inside
`PublicTrainingReservaModal` that runs *before* eligibility, and (c) a stepper component
that visualizes progress across all of this, shown only during a guided journey.

Relevant existing code (read in full during exploration, referenced throughout):
`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`,
`src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts`,
`src/hooks/portal/perfil/usePerfil.ts`,
`src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`,
`src/app/auth/callback/route.ts`, `src/app/portal/bootstrap/route.ts`.

## Goals / Non-Goals

**Goals:**
- Preserve the selected training's identity through signup, email confirmation (even across
  devices), and login, landing the user back in the booking modal automatically.
- Give the user a visible, always-accurate sense of progress across a journey that
  necessarily leaves the app twice (email inbox, and formerly the profile page).
- Eliminate the "leave the booking modal to fill your whole profile" detour by asking only
  for the specific fields a given formulario needs, inline, before eligibility is even
  checked — so the effort is never wasted even if the user later needs to buy a plan.
- Reuse every existing mechanism that already does the job correctly (`next` propagation,
  `usePerfil()`, `perfilFaltantes` computation) rather than reimplementing any of it.

**Non-Goals:**
- Automatic notification or resumption when an admin approves a pending plan subscription —
  the wait stays manual. Explicitly deferred; see proposal's Non-Goals.
- Any new persistence layer (database table, `localStorage`, `sessionStorage`) for tracking
  step progress. Every step is derived from current URL/page + existing in-memory state.
- Any change to eligibility/restriction evaluation logic itself
  (`validateBookingRestrictions`, `entrenamiento_restricciones`) — only its presentation
  order relative to profile completion changes.
- Any change to the full `/portal/perfil` page's own behavior or requirements.

## Decisions

### 1. Carry the guided target as a URL query string, not client-side storage

**Decision**: A single helper (`src/lib/portal/entrenamientos-publicos/guidedBooking.ts`)
builds/parses `guiado=1&entrenamiento=<id>&tenant=<id>&disciplina=<id>&nombre=<encoded>` as
part of the existing `next` path, and it flows exclusively through URLs: the signup/login
link → `emailRedirectTo` (baked into the confirmation email at signup time) →
`/auth/callback` → `/portal/bootstrap` → the marketplace page's own URL.

**Alternatives considered**:
- `localStorage`/`sessionStorage` on the signup device — rejected because the confirmation
  link is frequently opened on a different device/browser (e.g., mobile Gmail app), which
  would silently lose the context. A URL-embedded target survives that by construction,
  since Supabase bakes `emailRedirectTo` into the link itself.
- A new `guided_booking_sessions` database table keyed by user/email — rejected as
  disproportionate: the entire value of the guided target is "which training was clicked",
  three UUIDs and a name, already public information visible on the marketplace listing
  itself. A stateful table would need cleanup/expiry logic for zero added correctness.

**Consequence**: no new persistence layer at all (see Non-Goals). If a user abandons the
tab and later opens the app directly instead of via the emailed link, the context is lost —
accepted, matches the existing (unguided) experience.

### 2. Three independent step phases, not one continuous 1-N sequence; never stored

**Decision** (revised after manual QA — the original design used one shared 5-step
sequence across signup/login/booking, which showed a returning user the same "Crear
cuenta" / "Confirmar tu correo" steps as a brand-new signup, even though neither applies to
login): the stepper component is fully generic — `steps: readonly string[]`,
`currentStep: number` (1-indexed within that list) — and each phase owns its own
independent list, defined once in `guidedBooking.ts`:
- `GUIDED_SIGNUP_STEPS` (2 steps) — shown only on the signup page.
- `GUIDED_LOGIN_STEPS` (1 step) — shown only on the login page.
- `GUIDED_BOOKING_STEPS` (3 steps) — shown only inside the booking modal, regardless of
  which auth path was taken to get there.

The initial "Regístrate para reservar" dialog shows no stepper at all, since the visitor
hasn't yet chosen between the two auth paths and showing either phase's steps there would
be presumptuous. Each caller computes its own `currentStep` synchronously from state it
already owns: `SignupForm`'s local `successMessage` (steps 1–2 of the signup phase),
`LoginForm` (always step 1 of its single-step phase), and
`PublicTrainingReservaModal`'s `formularioRespuestaForm.perfilFaltantes` /
`checkingEligibility`/`bookingRejection`/`isFormularioStep` (steps 1–3 of the booking
phase).

**Alternatives considered**:
- A shared "booking journey" context/hook that tracks step state centrally — rejected
  because every input the stepper needs already exists as local state in the component
  tree it's rendered from; introducing a shared context would be state duplication (two
  sources of truth that must be kept in sync) for no behavioral gain.
- Keeping one continuous 1-5 sequence but relabeling step 1 for login (e.g. "Iniciar
  sesión" instead of "Crear cuenta") while still showing "Confirmar tu correo" greyed
  out — rejected: a returning user has no email-confirmation step at all, so showing it as
  an upcoming step misrepresents what's actually left to do.

### 3. Profile completion is checked *before* eligibility, as an early render branch

**Decision**: `PublicTrainingReservaModal.tsx` gets one new render branch — ordered before
its existing `checkingEligibility` check — that renders `InlineProfileCompletionStep` while
`reserva.formularioRespuestaForm.perfilFaltantes.length > 0`. This is viable specifically
because `useFormularioRespuestaForm.ts` already computes `perfilFaltantes` *eagerly and
independently* of `isFormularioStep`/eligibility (its plantilla-loading `useEffect` fires as
soon as `formularioPlantillaId` resolves; its `loadPerfil()` effect fires whenever the
resulting `perfilCamposRequeridos` list changes) — there is no dependency to break by
moving the check earlier in the render sequence.

**Why before eligibility, not after** (this reverses the initial design, changed after
product review): profile completion is entirely within the user's control and, once saved,
is permanent on their account — it never needs to be repeated on a retry. Eligibility can
require the user to buy a plan and wait for manual admin approval (out of scope to
automate), meaning a user might leave and come back much later; front-loading the
profile step means that returning attempt has one less thing to redo. Checking eligibility
first would risk the opposite: asking for profile data only to reject the booking anyway,
with no guarantee the user returns to finish it.

**Alternatives considered**: nesting the profile-completion check inside the existing
`isFormularioStep` branch (i.e., after eligibility, as originally scoped) — rejected per the
reasoning above once it was pointed out that profile data is durable across retries while
eligibility/plan approval is not.

### 4. Reuse `usePerfil()` and the existing personal/deportivo form components, filtered

**Decision**: `InlineProfileCompletionStep` wraps the existing `usePerfil()` hook as-is (no
new fetch/save logic) and renders the existing `PerfilPersonalForm`/`PerfilDeportivoForm`,
each extended with a new optional `visibleFields?: FormularioPerfilCampo[]` prop that hides
field blocks not in the list. Omitting the prop preserves today's full-page rendering
exactly, so `/portal/perfil` needs no changes.

**Alternatives considered**:
- A new, separate minimal form driven directly by the `FORMULARIO_PERFIL_CAMPOS` catalog —
  rejected because it would duplicate each field's existing UI (selects for
  `tipo_identificacion`/`rh`, date inputs, icons, validation display) that
  `PerfilPersonalForm`/`PerfilDeportivoForm` already implement; two field-rendering
  implementations would drift over time.
- Calling `updatePerfil`/`upsertPerfilDeportivo` directly from the new component instead of
  through `usePerfil()` — rejected because `usePerfil()` already handles validation
  (nombre/apellido required), the parallel save, and error/success state; reimplementing it
  would be pure duplication.

**Consequence accepted**: `usePerfil()` fetches profile data independently on mount, which
duplicates the fetch `useFormularioRespuestaForm.loadPerfil()` already performed to compute
`perfilFaltantes`. This is a minor, one-time redundant read (not a write), and simpler than
threading fetched values across two hooks with different internal shapes
(`PerfilFormValues` vs. `PerfilResumenItem[]`/`PerfilFaltanteItem[]`).

### 5. `InlineProfileCompletionStep` is a general-purpose fix, not guided-journey-exclusive

**Decision**: The new render branch in `PublicTrainingReservaModal.tsx` is gated only on
`perfilFaltantes.length > 0`, not on whether the booking originated from a guided journey.
Any returning member who hits an incomplete-profile gate (e.g., an admin adds a new
`perfil_campos_requeridos` field to an existing formulario) gets the same inline
experience. The stepper is the only piece that's guided-journey-exclusive (via the `guided`
prop) — it's purely a progress *indicator*, layered on top of behavior that improves for
everyone.

## Risks / Trade-offs

- **[Risk, found in manual QA]** `usePerfil().submit()` unconditionally requires
  `nombre`/`apellido`, but `SignupForm` never collects them — so a just-signed-up user
  always has them empty. If a training's formulario doesn't itself request `nombre`/
  `apellido`, `InlineProfileCompletionStep`'s `visibleFields` wouldn't include them, hiding
  the validation error and leaving "Guardar y continuar" appearing to do nothing on every
  click. → **Mitigation**: `InlineProfileCompletionStep` unions `missingFields` with any of
  `nombre`/`apellido` that are currently empty before computing `visibleFields`, so the
  mandatory fields are always shown when needed regardless of what the formulario asked
  for.
- **[Risk]** Two async effects (`checkingEligibility`'s pre-check and
  `useFormularioRespuestaForm`'s `perfilLoading`) resolve independently on modal mount; a
  naive implementation could flash the eligibility spinner before the profile-loading
  result is known, then flip to the profile step. → **Mitigation**: gate the new render
  branch on `perfilFaltantes.length > 0 && !perfilLoading` so the initial profile check
  finishes resolving before any other branch is evaluated; document this explicitly in
  `tasks.md` so it isn't missed during implementation.
- **[Risk]** A formulario with `formulario_obligatorio = false` (skippable) could still
  force a user through the new profile-completion step even though they'd have chosen to
  skip the formulario entirely and never needed those fields. → **Mitigation**: none in this
  change — matches existing behavior, since today's gate (`perfilIncompleto` disabling
  submit in `FormularioRespuestaModal`) already blocks the *submit* path regardless of
  `allowSkip`; only the "Reservar sin formulario" skip button bypasses it, which remains
  available and unaffected since it's outside the new profile-completion branch.
- **[Risk]** Embedding the same visual chrome (border, `bg-navy-medium`, spacing) across
  `InlineProfileCompletionStep` and the existing `FormularioRespuestaModal`/
  `ReservaFormModal` by hand risks visual drift if one is updated later without the other.
  → **Mitigation**: implement `InlineProfileCompletionStep` inside the same modal
  container markup pattern already used by its siblings in
  `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` (copy the
  existing wrapper classes rather than inventing new ones).
- **[Trade-off]** Duplicate profile fetch on mount (Decision 4) — accepted as a minor,
  one-time cost in exchange for reusing a fully-tested hook instead of threading state
  across two different hook shapes.
- **[Trade-off]** No cross-device/cross-session resumption once the guided journey's URL
  trail is lost (Decision 1, Non-Goals) — accepted; matches the story's explicitly agreed
  scope boundary around plan-approval resumption.

## Migration Plan

No database migration. Deployment is a standard code release:
1. Ship additive, backward-compatible changes first (helper lib, optional hook/service
   params, optional component props) — these are inert until wired up, so they can land
   without behavior change.
2. Wire up signup/login/landing entry points and the marketplace auto-resume.
3. Wire up the booking modal's new profile-completion branch and stepper last, since it
   touches the most heavily-used existing component
   (`PublicTrainingReservaModal.tsx`).
4. Rollback is a plain revert — no data was written or migrated, so no backward migration
   step is needed.

## Open Questions

- None blocking implementation. `tasks.md` should still call out explicit manual QA for the
  `perfilLoading` race described in Risks, since it's the one place a subtle ordering bug
  could slip through review.
