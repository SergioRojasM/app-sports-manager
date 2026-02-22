## Why

The product currently has a redesigned login experience but no dedicated signup page route and flow in the app shell. This blocks first-time users from onboarding through a consistent, production-ready authentication UI.

## What Changes

- Add a new `/auth/signup` page that follows the approved signup design.
- Reuse the existing login left panel (`LoginBenefitsPanel`) unchanged to keep visual consistency and reduce duplicate UI work.
- Implement a signup form panel (right side only) with required field validation and Supabase signup integration via existing architecture (`component -> hook -> service -> types`).
- Handle successful signup outcomes for both modes: email-confirmation required and immediate session creation.
- Add route-level navigation linkage between `/auth/signup` and `/auth/login`.
- Update project documentation to reflect the new route and signup behavior.

## Capabilities

### New Capabilities
- `signup-page`: Provide a complete signup route and UI/UX integrated with existing Supabase auth services, including validation and post-signup user feedback/redirect behavior.

### Modified Capabilities
- None.

## Impact

- **Affected files/components**:
  - Create `src/app/auth/signup/page.tsx`
  - Create `src/components/auth/SignupForm.tsx`
  - Reuse `src/components/auth/LoginBenefitsPanel.tsx`
  - Reuse or lightly adapt `src/components/auth/LoginCard.tsx`
  - Update `README.md` auth route documentation
- **APIs/Services**:
  - Reuse existing `useAuth().signUp` and `authService.signUpWithPassword`
  - No new backend endpoints
- **System impact**:
  - Improves acquisition/onboarding path without changing middleware security model

## Non-goals

- No redesign of the existing login left panel content or style.
- No OAuth/social signup providers.
- No password reset or profile onboarding feature work.
- No middleware/routing policy changes beyond adding `/auth/signup` UI route.

## Files to Modify or Create

- `src/app/auth/signup/page.tsx` (new)
- `src/components/auth/SignupForm.tsx` (new)
- `src/components/auth/LoginCard.tsx` (reuse/update only if required)
- `README.md` (update)

## Step-by-step Implementation Plan

1. Add `/auth/signup` route and compose split layout with existing left panel.
2. Build right-side `SignupForm` UI from approved design with required fields and validation.
3. Connect form submit to `useAuth().signUp` and handle loading/error/success states.
4. Implement post-signup behavior (check-email guidance or `/dashboard` redirect when session exists).
5. Add login/signup cross-links and verify responsive/accessibility behavior.
6. Update `README.md` with signup route and behavior notes.
