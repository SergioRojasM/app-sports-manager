## Why

The current login page does not match the approved product experience and weakens first-use trust for coaches. We need to implement the approved `projectspec/designs/login.html` layout now while preserving the existing Supabase authentication and redirect semantics.

## What Changes

- Redesign `/auth/login` to match the approved responsive two-panel structure (brand/benefits + login card).
- Preserve current sign-in behavior: email/password auth, loading and error feedback, disabled submit while loading.
- Preserve redirect behavior: respect `next` query parameter, fallback to `/dashboard`.
- Keep architecture boundaries: page composition in route, UI in components, auth logic in existing hook/service chain.
- Add optional presentational split components for maintainability (left panel/card shell) without changing auth contracts.
- Update auth documentation reference for the redesigned login screen.

## Capabilities

### New Capabilities
- `login-page-redesign`: Redesigned login route UI and UX aligned to approved design while maintaining existing authentication flow and redirects.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/app/auth/login/page.tsx`, `src/components/auth/LoginForm.tsx`, optional new auth presentation components, and auth docs.
- APIs/systems: no backend API changes; continues using Supabase `signInWithPassword` through existing service/hook contracts.
- Dependencies: no required new runtime dependency; Tailwind token extension may be needed for consistent styling.

## Non-goals

- Adding new OAuth providers.
- Implementing password reset backend flow.
- Redesigning full signup flow.
- Changing core behavior contracts in `useAuth` or `auth` service beyond redesign needs.

## Files to Modify or Create

- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/components/auth/LoginForm.tsx`
- Create (optional): `src/components/auth/LoginBenefitsPanel.tsx`
- Create (optional): `src/components/auth/LoginCard.tsx`
- Modify (if needed): `tailwind.config.ts`
- Modify (if needed): `src/app/globals.css`
- Modify: `README.md`

## Step-by-step Implementation Plan

1. **Page**: Compose the login route layout in `page.tsx` and wire search param handling for `next`.
2. **Component**: Implement redesigned form and layout sections in auth components to match approved HTML structure and responsive behavior.
3. **Hook**: Reuse `useAuth().signIn` for submit, loading, and error state orchestration (no contract changes unless strictly necessary).
4. **Service**: Keep `authService.signInWithPassword` as the auth execution path; avoid behavior drift.
5. **Types**: Keep/adjust auth-related types only if needed for UI state shape while avoiding `any`.
