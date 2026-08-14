# US-0107 — Fix Sign In/Sign Up Mobile Scrolling and Google Button Visibility

## ID
US-0107

## Name
Fix mobile Sign In/Sign Up panel scrolling and Google OAuth button visibility

## As a
mobile user visiting the Sign In or Sign Up page

## I Want
to be able to scroll through the Sign In/Sign Up form and see all available options, including the Google login button

## So That
I can complete authentication on mobile without truncated form elements or hidden action buttons

---

## Description

### Current State
The Sign In and Sign Up pages use a responsive layout that displays a two-panel design on desktop (`LoginBenefitsPanel` + `LoginCard` side-by-side). On mobile, the layout collapses to a single column via `flex-col`, but there are two issues:

1. **No internal scrolling**: The page container has `overflow-hidden` and fixed `h-screen`, preventing internal scroll on mobile. When the form content exceeds the viewport height (email, password, remember-me, forgot password link, sign-in button, divider, Google button, and signup link), the bottom elements are clipped.

2. **Benefits panel still visible on mobile**: Although the benefits panel has `md:` prefixes suggesting desktop-only display, it may still render on smaller screens (depending on breakpoint interpretation), consuming valuable vertical space and pushing the form off-screen.

3. **Google button clipped**: The "Continuar con Google" button and signup CTA at the bottom of the form are frequently cut off on mobile, making them inaccessible.

### Proposed Changes

**Layout and scrolling behavior (mobile-first)**
- Modify `src/app/auth/login/page.tsx` and `src/app/auth/signup/page.tsx` (if it has similar layout):
  - Change the outer container from `flex flex-col overflow-hidden` to `flex flex-col overflow-auto` (allow scroll when needed).
  - Or: Split the container into two parts: a non-scrolling upper section and a scrollable content area.
  - Ensure the layout is truly responsive: benefits panel should be hidden on mobile (`hidden md:flex` or similar), taking 0 space.

**Form card scrolling (mobile)**
- Modify `src/components/auth/LoginCard.tsx`:
  - Wrap the `LoginForm` content in a scrollable container when on mobile.
  - On mobile, the card should have `max-h-[calc(100vh - <safe-margin>)]` and `overflow-y-auto` to allow internal scrolling when form height exceeds viewport.
  - On desktop (`md:`), keep the existing centered layout without scroll (since it fits).

**Alternatively (minimal change)**
- Modify the page layout to ensure the form card itself is scrollable on mobile:
  - Change `LoginCard.tsx` section from `flex items-center justify-center` (which centers vertically) to a layout that allows scroll.
  - Add `overflow-y-auto` and cap max-height on the card wrapper or inner div.

---

## Database Changes
None. This is a UI/layout fix only.

---

## API / Server Actions
None. No backend changes required.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Page | `src/app/auth/login/page.tsx` | Adjust container layout to allow vertical scrolling on mobile; ensure benefits panel is truly hidden on mobile |
| Page | `src/app/auth/signup/page.tsx` | Same layout adjustments if it shares the same structure |
| Component | `src/components/auth/LoginCard.tsx` | Add scrollable container for form content on mobile (overflow-y-auto + max-height); keep centered on desktop |

---

## Acceptance Criteria

1. **Mobile form visibility**: On a mobile viewport (e.g., 375px width), all form elements are reachable by scrolling:
   - Logo/title
   - Email input
   - Password input
   - Remember me checkbox + Forgot password link
   - Sign in button
   - Divider ("O continúa con")
   - Google login button ("Continuar con Google")
   - Sign up CTA ("¿No tienes una cuenta? Regístrate")

2. **No cut-off content**: The Google button and signup link are fully visible and clickable (not clipped by `overflow-hidden`).

3. **Benefits panel not visible on mobile**: On screens smaller than `md` breakpoint (~768px), the `LoginBenefitsPanel` is completely hidden and takes no space in the layout.

4. **Desktop unchanged**: On desktop/tablet (`md:` and above), the layout remains unchanged:
   - Two-panel side-by-side layout
   - Benefits panel visible on the left
   - Form card centered on the right, no scroll (content fits)

5. **Signup page consistency**: The same fix is applied to `/auth/signup` so both forms are scrollable on mobile.

6. **Scroll behavior smooth**: On mobile, scrolling feels natural and smooth; no layout jank or jumping.

7. **Focus restoration on scroll**: If scrolling to access the Google button, the button receives focus properly when clicked (keyboard navigation unaffected).

---

## Implementation Steps

- [ ] Review the current responsive classes in `LoginCard.tsx` and page layout in `login/page.tsx`
- [ ] Identify the exact breakpoint and classes hiding `LoginBenefitsPanel` on mobile (confirm `md:` applies correctly)
- [ ] On mobile, convert the page/card to a scrollable container:
  - Option A: Make the card section `overflow-y-auto` with `max-h-[calc(100vh - safe-margin)]`
  - Option B: Restructure the page layout to have a scrollable inner div for the form card only
- [ ] Test on mobile (use browser DevTools mobile view or actual device):
  - Scroll through entire form
  - Verify Google button is accessible
  - Verify signup link is accessible
- [ ] Test on desktop to ensure the two-panel layout is unchanged
- [ ] Apply identical changes to `src/app/auth/signup/page.tsx` (if it exists and uses the same pattern)
- [ ] Test form submission flow (login, signup, Google OAuth) on mobile to ensure focus/redirect work correctly

---

## Non-Functional Requirements

- **Performance**: No additional JavaScript dependencies; use CSS-only scrolling via `overflow-y-auto`.
- **Accessibility**:
  - Scrolling must not interfere with keyboard navigation (tab order, focus management).
  - Form labels and inputs remain properly associated.
  - Error messages and alerts (already using `role="alert"`) must remain visible and announced when scrolling.
  - The Google button must be keyboard-focusable and discoverable via tab.
- **Responsive design**:
  - Breakpoint consistency: use existing Tailwind breakpoints (`md:` = 768px).
  - Safe area consideration: on devices with notches/safe areas, ensure form content is not obscured.
- **Error handling**: Validation errors and Google OAuth errors must remain visible during scroll (no hiding behind the fold).
- **Browser support**: Scrolling must work on all modern mobile browsers (iOS Safari, Chrome, Firefox).
