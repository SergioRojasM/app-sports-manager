## Why

New users discovering a public training must register, confirm their email, log back in,
re-find the training, pass an eligibility check, and — almost always, since a brand-new
profile is empty — get diverted to a separate full-page profile editor before they can even
see the training's formulario. Two concrete gaps cause this: the training being booked is
never carried through signup/email-confirmation/login (only login's `next` param is wired,
and even then only to a bare route), and nothing tells the user which step they're on or
how many remain. Both compound into abandonment right when a visitor is closest to
converting. (Source: US-0103, `projectspec/userstory/us0103-new-user-guided-booking-flow.md`)

## What Changes

- Extend the existing `next` redirect pipeline (already used by login →
  `/auth/callback` → `/portal/bootstrap`) to signup and to the public landing page's
  "Regístrate para reservar" CTA, so the chosen training's identifiers survive account
  creation, email confirmation (even on a different device, since the target is embedded in
  the confirmation link itself), and login.
- Auto-open the booking modal for the originally selected training once the user lands back
  on `/portal/entrenamientos-publicos`, instead of dropping them on an empty marketplace.
- Add a 5-step visual progress indicator (Crear cuenta → Confirmar tu correo → Completar tus
  datos → Verificar y reservar → Formulario y confirmación), shown only during a guided
  journey — never for an already-authenticated user browsing the marketplace normally.
- Replace the current "open `/portal/perfil` in a new tab" detour for incomplete-profile
  formulario gating with an inline mini-form, embedded in the same booking modal, asking
  only for the specific fields the training's formulario actually requires and that are
  actually missing.
- **BREAKING (internal contract only, not user-facing):** `SignupForm`'s post-signup
  redirect on an immediate session changes from a hardcoded `/dashboard` to the resolved
  `nextPath` (defaults to `/dashboard` when no `next` is supplied, so unguided signups are
  unaffected).

## Capabilities

### New Capabilities
- `guided-public-training-booking`: the end-to-end guided journey for a new user booking a
  public training — building/parsing the "guided booking target" carried through
  signup/email-confirmation/login, auto-opening the booking modal on return, the 5-step
  visual stepper, and the inline profile-completion step embedded in the booking modal.

### Modified Capabilities
- `signup-page`: the "Immediate session outcome" scenario's redirect target changes from a
  hardcoded `/dashboard` to a `next`-resolved path; a new requirement covers accepting and
  forwarding `next` through to `emailRedirectTo` for the confirmation-required path.
- `login-page-redesign`: new requirement — the login form renders the guided stepper when
  its `nextPath` encodes a guided booking target; no change to existing redirect semantics.
- `user-profile-management`: new requirement — `PerfilPersonalForm`/`PerfilDeportivoForm`
  accept an optional `visibleFields` filter so a caller can render a subset of fields
  in-place; omitting it preserves today's full-page behavior exactly.

## Impact

- **Affected code**: `src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx`,
  `src/services/supabase/auth.ts`, `src/hooks/auth/useAuth.ts`, `src/app/auth/signup/page.tsx`,
  `src/components/auth/SignupForm.tsx`, `src/components/auth/LoginForm.tsx`,
  `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx`,
  `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`,
  `src/components/portal/perfil/PerfilPersonalForm.tsx`,
  `src/components/portal/perfil/PerfilDeportivoForm.tsx`.
- **New code**: `src/lib/portal/entrenamientos-publicos/guidedBooking.ts`,
  `src/components/ui/GuidedBookingStepper.tsx`,
  `src/components/portal/entrenamientos/reservas/InlineProfileCompletionStep.tsx`.
- **No database/API impact**: no migrations, no new server actions or API routes — every
  change is client-side routing/state-derivation or an additional optional function
  parameter on existing service/hook functions. See US-0103's Database Changes / API
  sections for the detailed rationale.
- **No RLS/security impact**: the guided target only carries identifiers already readable
  from the public marketplace listing itself.
- **Dependent systems**: relies on existing Supabase Auth email-confirmation flow
  (`emailRedirectTo`), the existing `formulario_plantillas.perfil_campos_requeridos`
  mechanism (US-0095), and the existing `usePerfil()` profile read/save hook — no new
  external dependencies.

## Non-Goals

- **No automatic notification or resumption when an admin approves a pending plan
  subscription.** The wait for plan approval remains manual, exactly as today; the user
  must return and retry booking themselves. (Explicitly scoped out during plan review.)
- **No new persistence layer** (no database table, `localStorage`, or `sessionStorage`) for
  tracking "which step a user is on." Every step is derived from the current URL/page and
  from existing in-memory state in `usePublicTrainingReserva` /
  `useFormularioRespuestaForm`. If a user abandons the guided journey outside the emailed
  confirmation link, there is no resumption — they land on the plain marketplace.
- **No change to the full `/portal/perfil` page's behavior** — it continues to show and
  save every profile field; the new `visibleFields` prop is opt-in and defaults to "show
  all."
- **No change to eligibility/restriction logic itself** (`validateBookingRestrictions`,
  `entrenamiento_restricciones`) — this change only reorders and clarifies the *presentation*
  of existing checks, it does not alter who is eligible to book.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Lib | `src/lib/portal/entrenamientos-publicos/guidedBooking.ts` | New — `buildGuidedNextPath()` / `parseGuidedParams()` |
| Component (UI) | `src/components/ui/GuidedBookingStepper.tsx` | New — 5-step progress indicator |
| Component | `src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx` | Build guided `next`, pass to both signup/login links, render stepper step 1 |
| Service | `src/services/supabase/auth.ts` | `signUpWithPassword` accepts optional `next`, appends to `emailRedirectTo` |
| Hook | `src/hooks/auth/useAuth.ts` | `signUp` accepts and forwards `next` |
| Page | `src/app/auth/signup/page.tsx` | Read `searchParams.next`, pass as `nextPath` to `SignupForm` |
| Component | `src/components/auth/SignupForm.tsx` | Accept `nextPath`; send `next` on submit; redirect to `nextPath` (not hardcoded); render stepper |
| Component | `src/components/auth/LoginForm.tsx` | Render stepper when `nextPath` carries a guided target |
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | Parse guided target on mount; auto-open booking modal; strip params via `router.replace` |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | New early render branch for profile completion (before eligibility); accept `guided`; render stepper |
| Component | `src/components/portal/entrenamientos/reservas/InlineProfileCompletionStep.tsx` | New — wraps `usePerfil()` + filtered `PerfilPersonalForm`/`PerfilDeportivoForm` |
| Component | `src/components/portal/perfil/PerfilPersonalForm.tsx` | Add optional `visibleFields?: FormularioPerfilCampo[]` prop |
| Component | `src/components/portal/perfil/PerfilDeportivoForm.tsx` | Add optional `visibleFields?: FormularioPerfilCampo[]` prop |

No migration files — no database changes.

## Implementation Plan (step-by-step)

1. **Foundations**: `guidedBooking.ts` helper (build/parse), extend `authService.signUpWithPassword`
   and `useAuth().signUp` with optional `next`.
2. **Signup/login entry points**: wire `next` through `/auth/signup/page.tsx` → `SignupForm`
   (fix the hardcoded `/dashboard` redirect); update `RegistrateParaReservarModal` to build
   and pass the guided target to both signup and login links.
3. **Stepper component**: build `GuidedBookingStepper.tsx`; render it in
   `RegistrateParaReservarModal`, `SignupForm`, `LoginForm` (steps 1–2 only at this point).
4. **Marketplace auto-resume**: update `EntrenamientosPublicosPage.tsx` to parse the guided
   target and auto-open `PublicTrainingReservaModal`, stripping params afterward.
5. **Profile-completion primitives**: add `visibleFields` to `PerfilPersonalForm`/
   `PerfilDeportivoForm`; build `InlineProfileCompletionStep.tsx` on top of `usePerfil()`.
6. **Wire the full booking modal sequence**: update `PublicTrainingReservaModal.tsx` to
   insert the profile-completion branch before `checkingEligibility`, accept `guided`, and
   render the stepper across steps 3–5.
7. **Manual end-to-end verification** (see US-0103's Verification section): full journey
   with a real test email, a training whose formulario has `perfil_campos_requeridos` set,
   and regression-checking the unguided/returning-user path shows no stepper.
