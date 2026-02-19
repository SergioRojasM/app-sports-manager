# User Story: Login Page Redesign Implementation

## [original]

## ID
US-0003

## Name
Implement new login page based on `projectspec/designs/login.html`

### As a...
As a coach/user of the platform

### I want...
I want a modern, responsive login page aligned with the approved design

### So that...
I can access the application with a clear, professional, and trustworthy authentication experience

### Description
Implement the login page UI/UX using the design in `projectspec/designs/login.html`, while preserving the current authentication flow with Supabase and existing redirect behavior (`next` query parameter).

The implementation must follow the project architecture defined in `projectspec/03-project-structure.md`:
- Presentation logic in `src/components/auth/*`
- Route composition in `src/app/auth/login/page.tsx`
- Business/auth logic in existing hook/service layers (`src/hooks/auth/useAuth.ts`, `src/services/supabase/auth.ts`)

This story is focused on login page redesign and integration only. Do not implement unrelated features.

## Functional Scope

### Required UI behavior
1. Render a full-screen responsive login layout:
   - Left panel (brand/benefits/content block)
   - Right panel (login form card)
2. Match the visual structure and content from `projectspec/designs/login.html`:
   - Branding/title block
   - Hero copy and benefits list
   - Email field with icon
   - Password field with icon
   - Remember me checkbox
   - Forgot password link (visual link)
   - Primary Sign In button
   - Divider with “Or continue with” text (visual only unless social providers already exist)
   - Sign up CTA link (to defined route or placeholder)
3. Keep loading, error feedback, and successful login redirect behavior.
4. Preserve current redirect semantics:
   - If `next` query param exists, redirect to that path after successful login.
   - Otherwise redirect to `/dashboard`.

### Authentication behavior
- Keep login action using existing hook/service chain:
  - `LoginForm` ➜ `useAuth().signIn` ➜ `authService.signInWithPassword` ➜ Supabase client SDK.
- Keep existing error handling and show user-friendly error messages on failed auth.
- Keep submit button disabled while request is in progress.

### Out of scope (explicit)
- New OAuth providers
- Backend/API changes for auth
- Password reset flow implementation (only link placeholder/navigation if target route exists)
- Full signup flow redesign (only CTA/link behavior as defined)

## Data/Fields to Handle
1. `email` (string, required, valid email format)
2. `password` (string, required)
3. `rememberMe` (boolean, UI field; persistence behavior only if explicitly implemented)
4. `nextPath` (derived from query param `next`, fallback `/dashboard`)
5. `loading` (UI state)
6. `errorMessage` (from auth hook/service)

## Endpoints and URLs

### App routes
- `GET /auth/login` → redesigned login page
- `GET /dashboard` → post-login default destination
- `GET /auth/callback` → existing auth callback route (unchanged)

### Auth integration (Supabase SDK)
- Client call: `supabase.auth.signInWithPassword({ email, password })`
- No new custom REST endpoint required in this story

### Navigation links in UI
- Forgot password link target:
  - Preferred: `/auth/forgot-password` (if route exists)
  - Otherwise keep temporary non-breaking placeholder and document pending route
- Sign up link target:
  - Preferred: `/auth/signup` (if route exists)
  - Otherwise use existing signup/login mode behavior or placeholder, documented in notes

## Files to Modify (expected)

### Primary
1. `src/app/auth/login/page.tsx`
   - Compose page layout container and server/client boundaries
   - Keep `Suspense` usage if still required by search params behavior

2. `src/components/auth/LoginForm.tsx`
   - Implement redesigned form UI matching provided design
   - Preserve sign-in submit flow, loading, error handling, and redirect behavior

### Optional (recommended for maintainability)
3. `src/components/auth/LoginBenefitsPanel.tsx` (new)
   - Extract left-side brand/benefits panel as a reusable presentation component

4. `src/components/auth/LoginCard.tsx` (new)
   - Extract right-side card shell if needed to keep `LoginForm` focused

5. `tailwind.config.ts`
   - Add/extend theme tokens needed by the design (colors/radius/font aliases)
   - Prefer theme tokens over scattered hard-coded values

6. `src/app/globals.css`
   - Add minimal reusable utility classes only when Tailwind utilities are insufficient

### Must NOT change
- `src/services/supabase/auth.ts` behavior (unless bugfix directly needed for login)
- `src/hooks/auth/useAuth.ts` contract (unless strictly required by redesign)

## Definition of Done (completion steps)
1. Login page visually matches `projectspec/designs/login.html` structure and responsive behavior.
2. Existing email/password login works end-to-end with Supabase.
3. Loading/error states are visible and accessible.
4. Redirect behavior with `next` query parameter is preserved.
5. Desktop and mobile responsive behavior verified manually.
6. Code follows architecture boundaries (component → hook → service).
7. Linting passes for changed files.
8. Documentation is updated with the new login screen reference.

## Testing and Validation

### Manual QA checklist
- Open `/auth/login` on desktop and mobile widths.
- Submit invalid credentials and verify error message.
- Submit valid credentials and verify redirect to `/dashboard`.
- Open `/auth/login?next=/dashboard` and verify redirect target.
- Verify button loading state and disabled submit during request.
- Verify keyboard navigation and visible focus states.

### Unit/Component testing guidance
- If test framework exists, add tests for:
  - Form render and required fields
  - Submit invokes sign-in action
  - Error message render on failed sign-in
  - Loading state behavior
  - Redirect call on success
- If test framework does not yet exist, document this gap and create a follow-up task to add `Vitest + React Testing Library` baseline for component tests.

## Documentation Updates
1. Update `README.md` authentication section with:
   - Login route (`/auth/login`)
   - Redirect behavior with `next`
   - Reference to design source `projectspec/designs/login.html`
2. Add notes for pending routes (forgot password/signup) if left as placeholders.

## Non-Functional Requirements

### Security
- Do not log raw credentials to console.
- Keep authentication through existing Supabase client.
- Preserve route protection semantics already enforced by middleware.

### Performance
- Keep page lean (avoid unnecessary client-side dependencies).
- Optimize rendering by splitting large UI blocks into focused components when appropriate.

### Accessibility
- All form controls must have labels.
- Inputs and actions must be keyboard accessible.
- Ensure color contrast remains readable in dark theme.

### Maintainability
- Keep business logic out of presentational components.
- Reuse hook/service contracts without duplicating auth logic.
- Prefer semantic naming and small components.

## Expected Result
- A redesigned `/auth/login` page consistent with the provided design.
- Existing login behavior remains functional and stable.
- Clear implementation boundaries and technical guidance allow autonomous development.
- Story includes implementation details, validation criteria, and documentation/testing expectations.
