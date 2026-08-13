# US-0103 — New User Guided Booking Flow for Public Trainings

## ID
US-0103

## Name
Guided Step-by-Step Flow for New Users Booking a Public Training

## As a
New, unauthenticated visitor who discovers a public training on the marketplace
(`/entrenamientos-publicos` landing page or the authenticated `/portal/entrenamientos-publicos`
marketplace)

## I Want
To be guided step-by-step through account creation, email confirmation, and the booking
flow, without losing track of which training I originally wanted to book

## So That
I don't have to re-search for the training after signing up, confirming my email, or
logging in, and I always know how many steps are left before my booking is complete —
reducing drop-off in the new-user booking funnel

---

## Description

### Current State

The public training booking flow for a brand-new user today is: view training →
"Regístrate para reservar" → create account → confirm email → log in → find the training
again → pass the eligibility check → (if missing a plan) buy one and wait for admin
approval → fill the per-training formulario → reserve.

Two concrete frictions exist in the current implementation:

1. **The training context is lost as soon as the user leaves to sign up.**
   `RegistrateParaReservarModal` (`src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx`)
   links to `/auth/signup` with no query params at all. `SignupForm`
   (`src/components/auth/SignupForm.tsx`) always redirects to a hardcoded `/dashboard`
   after signup, ignoring any target. `authService.signUpWithPassword`
   (`src/services/supabase/auth.ts`) builds `emailRedirectTo` without a `next` param, so
   the confirmation email link cannot carry the training back either. The only piece of
   this chain that already supports an arbitrary `next` (including a full path + query
   string, propagated end-to-end via `encodeURIComponent`) is
   login → `/auth/callback/route.ts` → `/portal/bootstrap/route.ts`. That existing,
   working pipeline is the mechanism this story extends to signup and to the landing page
   entry points — no new transport mechanism needs inventing.
2. **Nothing tells the user which step they're on**, which matters because two steps take
   the user out of the app entirely (checking their email inbox; waiting on the existing
   `checkingEligibility` / booking-rejection states inside
   `usePublicTrainingReserva.ts`). The authenticated booking flow itself is a sequence of
   modal swaps driven by `usePublicTrainingReserva`'s local state machine
   (`checkingEligibility`, `bookingRejection`, `isFormularioStep`, `successMessage`) with
   no visible progress indicator.

### Proposed Changes

**Part A — Persist the booking context through signup / email confirmation / login**

Reuse and extend the `next` pipeline that already exists for login, instead of building a
new persistence mechanism:

- A new helper builds a single "guided target" query string
  (`guiado=1&entrenamiento=<id>&tenant=<id>&disciplina=<id>&nombre=<encoded>`) pointing back
  at `/portal/entrenamientos-publicos`, and parses it back out on the receiving page.
- `RegistrateParaReservarModal` builds this target and passes it as `next` to **both**
  `/auth/signup?next=...` and `/auth/login?next=...` (today only the login link passes a
  `next`, and it's a bare route with no training identifiers).
- `authService.signUpWithPassword` accepts an optional `next` and appends it to
  `emailRedirectTo`, mirroring the existing pattern already used by
  `resetPasswordForEmail` in the same file. This is what makes the training context
  survive even if the confirmation link is opened on a **different device/browser** than
  the one used to sign up — the target lives inside the emailed link itself, not in
  browser storage.
- `useAuth().signUp` forwards `next` through to the service call.
- `/auth/signup/page.tsx` reads `searchParams.next` the same way `/auth/login/page.tsx`
  already does, and passes it to `SignupForm` as `nextPath`.
- `SignupForm` sends `next: nextPath` on submit, and — if Supabase returns an immediate
  session (email confirmation disabled) — redirects to `nextPath` instead of the
  hardcoded `/dashboard`.
- `/auth/callback/route.ts` and `/portal/bootstrap/route.ts` require **no changes** — both
  already forward an arbitrary `next` (including its query string) end-to-end via
  `new URL(nextPath, request.url)`.
- `EntrenamientosPublicosPage.tsx` reads the guided target from the URL on mount via
  `useSearchParams()`; once the marketplace list has loaded, it looks up the matching
  training and calls the existing `setSelectedForReserva(item)` — the same state setter
  already wired to `onReservar` — to auto-open `PublicTrainingReservaModal` exactly as if
  the user had clicked "Reservar". It then strips the guided query params via
  `router.replace(pathname)` so refreshing the page doesn't reopen the modal. If the
  training can no longer be found (e.g. unpublished), it silently falls back to the plain
  marketplace view.

**No new persistence layer.** The step number is always *derived*, never stored:
- Steps 1–2 (create account / confirm email) come from which page the user is on plus
  `SignupForm`'s own local `successMessage` state.
- Steps 3–4 (eligibility/plan, formulario) come from `usePublicTrainingReserva`'s existing
  in-memory state (`checkingEligibility`, `bookingRejection`, `isFormularioStep`,
  `successMessage`) — the stepper only reads it.
- If a user abandons the tab and later opens the app directly (not via the emailed link),
  there is no way to resume where they left off — they land on the plain marketplace, same
  as today. This is an accepted limitation, consistent with keeping pending-plan-approval
  resumption/notification **out of scope** for this story (see Non-Functional
  Requirements).

**Part B — Visual stepper**

- A new reusable stepper component renders a 4-step progress indicator: (1) Crear cuenta,
  (2) Confirmar tu correo, (3) Verificar y reservar (covers eligibility check + optional
  plan purchase), (4) Formulario y confirmación.
- It is shown **only** when the user is inside a guided journey that originated from the
  public landing page (i.e., a guided target is present) — an already-authenticated user
  browsing `/portal/entrenamientos-publicos` normally must never see it.
- Rendered in: `RegistrateParaReservarModal` (step 1), `SignupForm`/`LoginForm` when
  `nextPath` carries a guided target (step 1, moving to step 2 after the "check your
  email" message appears), and `PublicTrainingReservaModal` across its
  `checkingEligibility`/rejection-with-plans state (step 3) and `isFormularioStep` state
  (step 4) when it was opened automatically via the guided target.

---

## Database Changes

None. This story is purely a client-side routing/state-derivation change; no new tables,
columns, RLS policies, or migrations are required.

---

## API / Server Actions

No new server actions or API routes. Existing functions are extended with an additional
optional parameter:

- **File**: `src/services/supabase/auth.ts`
  - **Function**: `authService.signUpWithPassword(credentials: AuthCredentials, next?: string)`
  - **Change**: when `next` is provided, `emailRedirectTo` becomes
    `` `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` ``
    instead of the current fixed `/auth/callback`.
  - **Auth/RLS**: unchanged — this only affects the redirect URL Supabase embeds in the
    confirmation email.

- **File**: `src/hooks/auth/useAuth.ts`
  - **Function**: `signUp(credentials: AuthCredentials, next?: string): Promise<AuthResult>`
  - **Change**: forwards `next` to `authService.signUpWithPassword`.

No changes to `src/app/auth/callback/route.ts` or `src/app/portal/bootstrap/route.ts` —
both already accept and propagate an arbitrary `next` value including its query string.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Lib | `src/lib/portal/entrenamientos-publicos/guidedBooking.ts` | New. `buildGuidedNextPath()` / `parseGuidedParams()` — single source of truth for the guided query param names |
| Component (UI) | `src/components/ui/GuidedBookingStepper.tsx` | New. 4-step progress indicator, `currentStep: 1\|2\|3\|4`, `trainingNombre: string` |
| Component | `src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx` | Build guided `next` via helper; pass to both signup and login links; render stepper at step 1 |
| Service | `src/services/supabase/auth.ts` | `signUpWithPassword` accepts optional `next`, appends to `emailRedirectTo` |
| Hook | `src/hooks/auth/useAuth.ts` | `signUp` accepts and forwards `next` |
| Page | `src/app/auth/signup/page.tsx` | Read `searchParams.next` (mirror `src/app/auth/login/page.tsx`), pass as `nextPath` to `SignupForm` |
| Component | `src/components/auth/SignupForm.tsx` | Accept `nextPath` prop; send `next` on `signUp()`; redirect to `nextPath` (not hardcoded `/dashboard`) on immediate session; render stepper when `nextPath` carries a guided target |
| Component | `src/components/auth/LoginForm.tsx` | Render stepper when `nextPath` carries a guided target |
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | Parse guided target from URL on mount; auto-call `setSelectedForReserva`; strip params via `router.replace` afterward |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | Accept `guided?: boolean` prop; render stepper at step 3 (`checkingEligibility`/rejection) and step 4 (`isFormularioStep`) |

No migration files — see Database Changes.

---

## Acceptance Criteria

1. From the public landing page (`/entrenamientos-publicos`), clicking "Reservar" on a
   training and then "Crear cuenta gratis" navigates to `/auth/signup` with the chosen
   training's identifiers preserved in the URL, and the signup screen shows the stepper at
   step 1.
2. After submitting the signup form (email confirmation required), the screen shows step 2
   ("confirma tu correo") instead of the current plain success message with no next step.
3. Clicking the confirmation link in the received email — even when opened in a different
   browser or device than the one used to sign up — lands the now-authenticated user
   directly on `/portal/entrenamientos-publicos` with the **same training's** booking
   modal already open (not on `/dashboard`, and not on an empty marketplace requiring the
   user to search again).
4. Repeating the same journey via "Ya tengo cuenta" (login) instead of signup also
   preserves the training context end-to-end and lands the user back in the booking modal
   for the same training after login.
5. While the booking modal is auto-opened from a guided journey, the stepper shows step 3
   during the eligibility check / plan-purchase prompt, and step 4 while filling out the
   training's formulario.
6. An already-authenticated user who navigates to `/portal/entrenamientos-publicos`
   directly (no guided target in the URL) and clicks "Reservar" on any card sees the
   existing behavior with **no stepper shown** — this story must not change the flow for
   returning users.
7. Refreshing the page at `/portal/entrenamientos-publicos` after the guided modal has
   auto-opened once does not reopen it again (guided query params are cleared from the URL
   after first use).
8. If the training referenced by the guided target no longer exists in the marketplace
   listing (e.g., unpublished), the page falls back silently to the normal marketplace
   view with no error shown to the user.
9. Pending-plan-approval notification/auto-resume is explicitly **not** part of this story
   — the existing "El administrador revisará tu suscripción" message and manual retry
   remain unchanged.

---

## Implementation Steps

- [ ] Add `src/lib/portal/entrenamientos-publicos/guidedBooking.ts` with
      `buildGuidedNextPath()` / `parseGuidedParams()`
- [ ] Add `src/components/ui/GuidedBookingStepper.tsx`
- [ ] Update `RegistrateParaReservarModal.tsx` to build and pass the guided `next` to both
      signup and login links, and render the stepper
- [ ] Extend `authService.signUpWithPassword` with optional `next`
- [ ] Extend `useAuth().signUp` to forward `next`
- [ ] Update `src/app/auth/signup/page.tsx` to read and forward `searchParams.next`
- [ ] Update `SignupForm.tsx`: accept `nextPath`, send `next` on submit, fix the hardcoded
      `/dashboard` redirect, render stepper (steps 1–2)
- [ ] Update `LoginForm.tsx` to render the stepper when `nextPath` carries a guided target
- [ ] Update `EntrenamientosPublicosPage.tsx` to auto-open the booking modal from a guided
      URL target and clean up the URL afterward
- [ ] Update `PublicTrainingReservaModal.tsx` to accept `guided` and render the stepper at
      steps 3–4
- [ ] Manual end-to-end test with a real test email (see Verification below)
- [ ] Confirm no stepper/behavior change for an already-authenticated user browsing the
      marketplace normally

---

## Non-Functional Requirements

- **Security**: No new data exposure — the guided target only contains identifiers already
  readable from the public marketplace listing itself (`entrenamientoId`, `tenantId`,
  `disciplinaId`, training name), all currently visible to any visitor. No RLS changes
  needed.
- **Performance**: No additional queries introduced beyond what
  `useEntrenamientosPublicosMarketplace` / `usePublicTrainingReserva` already run; the
  guided-target lookup is a client-side find over the already-fetched marketplace list.
- **Accessibility**: The new stepper component must be a `role="status"`/`aria-live="polite"`
  region (or equivalent) so screen readers announce step changes, consistent with existing
  patterns in `PublicTrainingReservaModal.tsx` (e.g. its `checkingEligibility` state already
  uses `role="status" aria-live="polite"`).
- **Error handling**: If the guided target's training can't be resolved (removed/expired),
  fail silently to the normal marketplace view — no toast/error banner, per Acceptance
  Criterion 8.
- **Explicitly out of scope**: Automatic notification or resumption when an admin approves
  a pending plan subscription. The wait remains manual, as today.
