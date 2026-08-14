## Context

The Sign In and Sign Up pages (`src/app/auth/login/page.tsx` and `src/app/auth/signup/page.tsx`) are built with a responsive two-panel layout: `LoginBenefitsPanel` (left, desktop-only) + `LoginCard` (right, form wrapper). Currently, the page container uses `flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row`, which:

- On desktop (`md:`+): renders as `flex-row`, showing both panels side-by-side
- On mobile (< `md:`): collapses to `flex-col`, stacking panels vertically

The problem: `overflow-hidden` clips content when form height exceeds viewport on mobile, hiding the Google OAuth button and signup link. The `LoginCard` uses `flex items-center justify-center` to vertically center the form card, which doesn't support scrolling.

## Goals / Non-Goals

**Goals:**
1. Enable vertical scrolling on the auth form on mobile (< 768px)
2. Ensure all form elements are accessible (email, password, Google button, signup link)
3. Keep desktop layout unchanged (two-panel centered display, no scroll)
4. Maintain accessibility (keyboard navigation, focus management, semantic HTML)
5. Preserve existing authentication behavior (no functional changes to login/signup/OAuth flows)

**Non-Goals:**
- Redesigning the auth UI itself
- Changing form fields, validation, or error handling
- Adding new capabilities beyond mobile responsiveness
- Modifying the benefits panel content or design

## Decisions

### Decision 1: CSS-only scrolling without JavaScript
**Choice:** Use Tailwind classes (`overflow-y-auto`, `overflow-hidden`, responsive breakpoints) instead of adding JavaScript scroll handlers.

**Rationale:** 
- Simpler implementation, no additional bundle size
- Native scrolling is performant and accessible out-of-the-box
- Tailwind already provides all needed utilities
- Reduces risk of focus/keyboard management bugs

**Alternative considered:** Custom React scroll container with custom scroll styling — rejected because native scroll is sufficient and cleaner.

### Decision 2: Mobile scrollable container strategy
**Choice:** Apply `overflow-y-auto` to the `LoginCard` section element itself on mobile, with `max-h-[calc(100vh - safe-margin)]` to leave room for status bars/notches. On desktop (`md:`), revert to `flex items-center justify-center` for centered display.

**Rationale:**
- Scopes scrolling to the form card area (consistent UX)
- `calc(100vh - safe-margin)` prevents notch/status bar overlap on mobile devices
- Desktop breakpoint (`md: = 768px`) is Tailwind default, matches existing project pattern
- Minimal changes to existing CSS structure

**Approach:**
```
Mobile (< 768px):
  - LoginCard section: overflow-y-auto, max-h-[calc(100vh - 32px)]
  - Inner card div: keeps existing style

Desktop (md: >= 768px):
  - LoginCard section: reverts to flex items-center justify-center, overflow hidden
  - Layout unchanged
```

**Alternative considered:** Wrap the form in a separate scrollable div — rejected because it adds complexity and CSS specificity issues.

### Decision 3: Benefits panel mobile visibility
**Choice:** Ensure `LoginBenefitsPanel` is wrapped with `hidden md:flex` or verified to not render on mobile.

**Rationale:**
- Benefits panel is marketing content, not essential for authentication
- Takes up half the viewport on mobile, pushing the form off-screen
- Hidden on `md:` below means it won't render at all (saves DOM overhead)

**Verification step:** Check current `LoginBenefitsPanel` classes; if already using `md:w-1/2`, confirm wrapping `hidden md:flex` applied to parent.

### Decision 4: Page container overflow
**Choice:** Change page container from `overflow-hidden` to `overflow-auto` as a fallback, but rely primarily on `LoginCard` internal scrolling.

**Rationale:**
- `overflow-hidden` prevents ANY scrolling if child elements exceed viewport
- `overflow-auto` allows page-level scroll if nested scrolling fails
- Dual-layer approach: card scrolls on mobile, page scrolls as fallback

**Alternative considered:** Full page scroll with `overflow-y-auto` on page container — rejected because card-level scroll is cleaner UX (user scrolls within the form card, not the entire page).

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Mobile viewport height varies** (notches, status bars, address bar height on mobile browsers) | Use `max-h-[calc(100vh - 32px)]` or similar safe margin; test on iOS Safari, Chrome Android with different viewport heights |
| **Scroll position lost on form submission** | Not a risk: form submission redirects to next page; scroll state doesn't matter |
| **Keyboard opens on mobile, shrinks viewport** | Native behavior; form will scroll within available space; test on real devices |
| **Desktop layout broken if responsive classes misapplied** | Test on desktop/tablet (`md:` breakpoint) to confirm two-panel layout unchanged |
| **Screen readers and keyboard nav confusion** | Risk is low: scrolling is native; ensure no ARIA landmarks are missed; verify tab order is correct |
| **Very long form (if more fields added later)** | Current form fits with scroll; future fields would still be scrollable — this is graceful |

## Migration Plan

1. No database or API changes needed
2. Code changes are CSS/layout only, safe to deploy and rollback
3. Deploy step: Push changes to login/signup pages and LoginCard component
4. Rollback: Revert CSS classes if issues arise; no data loss or state impact
5. Verification after deploy:
   - Automated: Lint/type checking passes
   - Manual: Test on mobile (< 768px) and desktop (≥ 768px) using browser DevTools
   - Real-device test (iOS Safari, Chrome Android) recommended if available

## Open Questions

1. Does `src/app/auth/signup/page.tsx` exist and use the same `LoginCard` component? (Verify before implementation)
2. Are there other auth pages (password reset, etc.) that need similar fixes?
3. What safe margin is appropriate for `max-h` on different device types? (Test and finalize in implementation)
