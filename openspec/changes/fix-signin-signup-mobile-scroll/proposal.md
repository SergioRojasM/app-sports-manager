## Why

Mobile users attempting to sign in or sign up encounter truncated form elements due to fixed viewport height and `overflow-hidden` styling. The "Continuar con Google" button and signup link are clipped off-screen, making OAuth login and account creation impossible on small screens. This blocks authentication for a significant user segment and diminishes the value of the Google OAuth integration added in US-0104.

## What Changes

- **Login page layout** (`src/app/auth/login/page.tsx`): Change outer container from `overflow-hidden` to `overflow-auto` to allow vertical scrolling on mobile; ensure `LoginBenefitsPanel` is explicitly hidden on small screens with `hidden md:flex`.
- **Signup page layout** (`src/app/auth/signup/page.tsx`): Apply identical scrolling and visibility changes for consistency.
- **Form card component** (`src/components/auth/LoginCard.tsx`): Replace vertical-center layout with a scrollable container on mobile (`overflow-y-auto` + `max-h-[calc(100vh - safe-margin)]`); preserve desktop centered layout (`md:` breakpoint).

## Capabilities

### New Capabilities
- `mobile-responsive-auth-forms`: Responsive layout behavior for Sign In/Sign Up pages allowing full form access on mobile via internal scrolling; ensures all form elements (inputs, buttons, links) are discoverable and usable on viewport sizes < 768px without truncation or overflow clipping.

### Modified Capabilities
- `login-page-redesign`: Existing login page now includes mobile-first responsive scrolling; the desktop two-panel layout is unchanged, but mobile flow shifts to single-column scrollable form.
- `password-reset-flow`: Potential related fix needed if password-reset form has similar layout structure (to be verified).

## Impact

**Affected files:**
- `src/app/auth/login/page.tsx`
- `src/app/auth/signup/page.tsx`
- `src/components/auth/LoginCard.tsx`

**Affected capabilities:**
- Authentication (Sign In, Sign Up, Google OAuth)
- Mobile responsiveness of the entire auth flow

**No API or database changes.** This is purely a presentation/layout fix. All existing hooks, services, and authentication logic remain unchanged.

## Non-goals

- Adding new authentication methods (OAuth is already implemented in US-0104)
- Changing form fields or validation rules
- Redesigning the auth UI itself (only fixing layout issues on mobile)
- Modifying desktop layout or experience

## Files to be Modified or Created

| File | Type | Change |
|------|------|--------|
| `src/app/auth/login/page.tsx` | Modify | Update container overflow and layout classes for mobile scrollability |
| `src/app/auth/signup/page.tsx` | Modify | Update container overflow and layout classes for mobile scrollability |
| `src/components/auth/LoginCard.tsx` | Modify | Add mobile-specific `overflow-y-auto` and `max-h` with desktop fallback |

## Implementation Plan

1. Review current responsive classes and breakpoints in `LoginCard.tsx` and page layouts
2. Verify `LoginBenefitsPanel` visibility is correctly scoped to `md:` breakpoint
3. Update `LoginCard.tsx` section element with mobile scrolling classes and desktop centered layout
4. Update `login/page.tsx` and `signup/page.tsx` outer container from `overflow-hidden` to `overflow-auto`
5. Ensure `LoginBenefitsPanel` is wrapped with `hidden md:flex` if not already
6. Test on mobile (< 768px) to verify scroll behavior and all elements are accessible
7. Test on desktop (≥ 768px) to verify two-panel layout unchanged
8. Verify Google OAuth button is properly clickable and does not lose focus during scroll
9. Test keyboard navigation (tab through all form elements) on both layouts
