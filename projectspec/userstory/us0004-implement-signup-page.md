# User Story: Signup Page Implementation (Reuse Left Panel)

## ID
US-0004

## Name
Implement signup page based on `projectspec/designs/signup.html`, reusing existing left panel

### As a...
As a new coach/user of the platform

### I want...
I want a clear and modern signup page to create my account

### So that...
I can register quickly and start using the application without friction

## Description
Implement a new signup route and UI using the design source `projectspec/designs/signup.html`, with this strict scope:

- Keep the left panel exactly the same as login (`LoginBenefitsPanel`) with no content or style changes.
- Only implement/adjust the right signup panel (form/card area).

The implementation must follow architecture from `projectspec/03-project-structure.md`:
- Route composition in `src/app/auth/signup/page.tsx`
- Presentation in `src/components/auth/*`
- Auth business/integration through existing hook/service chain (`useAuth` → `authService` → Supabase)

Do not implement unrelated redesign changes.

## Functional Scope

### Required UI behavior
1. Add route `GET /auth/signup` with full-height responsive split layout.
2. Reuse `LoginBenefitsPanel` as-is for the left side.
3. Build a signup panel on the right side based on `projectspec/designs/signup.html`.
4. Provide clear form validation and inline/global error messages.
5. Disable submit action while loading.
6. Provide link to `GET /auth/login` for users that already have an account.
7. On successful signup:
   - If email confirmation is required by Supabase project settings, show success guidance to check email.
   - If session is returned immediately, redirect to `/dashboard`.

### Authentication behavior
- Use existing `useAuth().signUp` API.
- `useAuth().signUp` must continue delegating to `authService.signUpWithPassword`.
- Keep existing Supabase callback redirect behavior (`/auth/callback`) configured in service.

### Explicitly out of scope
- Redesigning or editing `LoginBenefitsPanel`.
- Implementing social signup providers.
- Changing middleware access rules.
- Adding profile onboarding flows after signup.

## Data / Fields to Handle
Minimum required fields for this story:
1. `email` (string, required, valid email)
2. `password` (string, required)
3. `confirmPassword` (string, required, must match password)
4. `firstName` (string)
4. `lastName` (string)
5. `acceptTerms` (boolean)

Derived/UI state fields:
- `loading` (boolean)
- `errorMessage` (string | null)
- `successMessage` (string | null)
- `redirectPath` (default `/dashboard` when session exists)

## Endpoints and URLs

### App routes
- `GET /auth/signup` → new signup page
- `GET /auth/login` → existing login page
- `GET /auth/callback` → existing callback handler
- `GET /dashboard` → authenticated landing route

### Auth provider call (Supabase SDK)
- Signup operation: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`
- No new custom backend REST endpoint is required.

## Files to Modify (expected)

### New files
1. `src/app/auth/signup/page.tsx`
   - Compose split layout and route-level structure
   - Reuse existing left panel component

2. `src/components/auth/SignupForm.tsx`
   - Signup form UI and submit behavior
   - Validation (required fields + password confirmation)
   - Success and error feedback

### Existing files (if required)
3. `src/components/auth/LoginCard.tsx`
   - Reuse as shared right-panel wrapper if structure fits design
   - If not suitable, create a dedicated `SignupCard.tsx` (preferred minimal change: reuse existing)

4. `src/hooks/auth/useAuth.ts`
   - No contract changes expected
   - Only update if strictly needed for UI-state compatibility

5. `src/services/supabase/auth.ts`
   - No behavior change expected
   - Keep `signUpWithPassword` as integration source

6. `README.md`
   - Add/update auth routes and signup behavior notes

## Definition of Done (task completion)
1. `GET /auth/signup` route exists and renders correctly.
2. Left panel is the same component/content as login page (`LoginBenefitsPanel`) without visual regressions.
3. Right panel matches signup design structure from `projectspec/designs/signup.html`.
4. Signup works end-to-end through `useAuth().signUp` and Supabase.
5. Password confirmation validation prevents invalid submit.
6. Loading, success, and error states are visible and understandable.
7. Link to `/auth/login` works.
8. Lint passes for changed files.
9. Documentation update is completed.

## Testing and Validation

### Manual QA checklist
- Open `/auth/signup` on desktop and mobile.
- Verify left panel equals login page left panel.
- Submit empty form and verify required validation.
- Submit mismatched passwords and verify validation message.
- Submit with valid credentials:
  - If confirmation required: show check-email guidance.
  - If session available: redirect to `/dashboard`.
- Verify `/auth/login` link navigation.
- Verify keyboard navigation and focus states.

### Unit/Component test guidance
If a test stack exists, add tests for:
1. Form renders required inputs and submit CTA.
2. Password and confirm password mismatch validation.
3. Submit triggers `signUp` with expected payload.
4. Loading state disables submit.
5. Success and error feedback rendering.

If no test stack exists, document this as a follow-up and keep this story focused on implementation.

## Documentation Updates
1. Update `README.md` authentication section with:
   - `GET /auth/signup`
   - signup success behavior (confirm email vs active session)
   - link between login/signup routes
2. Reference design source `projectspec/designs/signup.html`.

## Non-Functional Requirements

### Security
- Never log email/password values.
- Keep all auth operations in existing service/hook chain.
- Do not expose sensitive provider errors beyond safe user messaging.

### Performance
- Keep client-side logic minimal.
- Reuse existing auth and layout components to avoid duplication.

### Accessibility
- Inputs must have explicit labels.
- Error/success messages must be screen-reader friendly (e.g., `role="alert"` where appropriate).
- Full keyboard operability for form controls and links.

### Maintainability
- Preserve architecture boundaries (presentation in components, auth in hooks/services).
- Keep reusable components generic where appropriate.
- Avoid introducing new design tokens unless strictly required.

## Expected Result
A production-ready `/auth/signup` experience is available, visually aligned to `projectspec/designs/signup.html`, with unchanged left panel and a redesigned signup panel on the right, fully integrated with existing Supabase auth flow and documented for autonomous implementation.