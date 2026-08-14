## 1. Setup and Branch Creation

- [x] 1.1 Create a new git branch with name `fix/signin-signup-mobile-scroll`
- [x] 1.2 Verify that the current working branch is not `main`, `master`, or `develop`

## 2. Component Updates

- [x] 2.1 Open `src/components/auth/LoginCard.tsx` and review current responsive classes
- [x] 2.2 Update `LoginCard.tsx` section element to add mobile scrolling. Implemented as: base classes `flex w-full flex-1 min-h-0 items-start justify-center overflow-y-auto` (mobile — the section becomes the flex item that fills remaining height in the `h-screen flex-col` parent and scrolls internally), overridden on desktop with `md:flex-none md:items-center md:overflow-visible` (reverts to original centered, non-scrolling layout). This is equivalent to the `max-h`-based approach sketched in the design but uses `flex-1 min-h-0` instead, which is more robust since it derives its height from the actual flex layout rather than a hardcoded viewport offset.
- [x] 2.3 Ensure the inner card div styling remains unchanged (rounded-xl border bg-navy-medium/70 etc.) — confirmed unchanged.

## 3. Page Layout Updates

- [x] 3.1 Open `src/app/auth/login/page.tsx` and review the current layout structure
- [x] 3.2 Update the outer container classes in login page: changed `overflow-hidden` to `overflow-auto` as a fallback scroll layer (primary scrolling now happens inside `LoginCard`)
- [x] 3.3 Verify `LoginBenefitsPanel` component has correct responsive classes (`md:w-1/2` for desktop width) — confirmed present
- [x] 3.4 Check if `src/app/auth/signup/page.tsx` exists and has similar layout — confirmed, identical structure
- [x] 3.5 Apply identical layout updates from 3.2 to signup page

## 4. Mobile Benefits Panel Verification

- [x] 4.1 Confirm that `LoginBenefitsPanel` has `md:` prefixes on width classes — had `md:w-1/2` but was NOT actually hidden on mobile (used `w-full`, not `hidden`), which was a root cause of the bug
- [x] 4.2 Fixed: changed base class from `flex w-full` to `hidden w-full` with `md:flex` override, so the panel is fully removed from layout flow on mobile
- [x] 4.3 Verified via Playwright: benefits panel text ("Optimiza el...") is not visible/rendered on a 375px mobile viewport, and is visible on desktop

## 5. Testing and Verification

- [x] 5.1 Started the development server with `npm run dev`
- [x] 5.2 Opened `/auth/login` via Playwright/Chromium at 375px width and at a constrained 375x500 viewport (to force scroll)
- [x] 5.3 Verified all form elements are visible by scrolling (logo, email, password, remember-me, forgot-password link, sign-in button, divider, Google button, signup CTA)
- [x] 5.4 Verified no content is clipped: at 375x500 (scrollHeight 712 > clientHeight 500) the sign-in button is cut off pre-scroll and the Google button + Regístrate link become fully visible after scrolling to the bottom of the card
- [x] 5.5 Tablet-equivalent behavior covered by the same responsive breakpoint logic (`md:` = 768px); scroll container applies to any viewport below that threshold
- [x] 5.6 Tested on 1440x900 desktop viewport: two-panel layout unchanged, benefits panel visible, form centered, no scroll needed
- [x] 5.7 Tested keyboard navigation via Playwright Tab presses on mobile: focus order is email → password → checkbox → forgot-password link → sign-in button → Google button → Regístrate link, correct and complete
- [x] 5.8 Verified Google OAuth button is a real, focusable, clickable `<button>` unchanged by this fix (no logic changes made to `LoginForm.tsx`/`SignupForm.tsx`); reaching it via scroll/keyboard was confirmed in 5.4/5.7
- [x] 5.9 Repeated mobile checks on `/auth/signup`: benefits panel hidden, Google button reachable after scroll
- [x] 5.10 No layout jank observed in screenshots; scrolling is native CSS `overflow-y-auto`, no JS-driven animation involved

## 6. Type Checking, Linting, and Tests

- [x] 6.1 Ran `npx tsc --noEmit` — no type errors
- [x] 6.2 Ran `npx eslint` on all 4 modified files — no lint issues
- [x] 6.3 N/A — no test framework/script is configured in this project (`package.json` has no `test` script), consistent with the gap already noted in US-0003

## 7. Documentation Updates

- [x] 7.1 Reviewed `projectspec/03-project-structure.md` — auth components (`LoginCard`, `LoginBenefitsPanel`) are not individually documented at that level of detail; no structural/architectural change was made (no new files, no new components), so no update needed
- [x] 7.2 N/A per 7.1
- [x] 7.3 Added a one-line comment in `LoginCard.tsx` explaining the non-obvious `min-h-0` flexbox override (a subtle CSS invariant future edits could easily break)

## 8. Git Commit and Pull Request

- [ ] 8.1 Stage all modified files with `git add` (files: `src/app/auth/login/page.tsx`, `src/components/auth/LoginCard.tsx`, signup page if modified, documentation if modified)
- [ ] 8.2 Create a git commit with message:
  ```
  fix(auth): enable mobile scrolling for sign in/up forms
  
  - Make LoginCard scrollable on mobile (< 768px) with overflow-y-auto and max-h-[calc(100vh - 32px)]
  - Ensure LoginBenefitsPanel is hidden on mobile (hidden md:flex)
  - Update page container overflow from hidden to auto for fallback scroll
  - Apply same fixes to both login and signup pages for consistency
  - Preserves desktop two-panel layout and centered form card display
  
  Fixes: Hidden Google button and signup link on mobile (US-0107)
  ```
- [ ] 8.3 Create pull request with:
  - **Title**: `fix(auth): enable mobile scrolling for sign in/up forms`
  - **Body**:
    ```
    ## Summary
    Fix mobile viewport scrolling issue on Sign In and Sign Up forms. Forms were truncated with Google OAuth and signup CTA buttons inaccessible due to `overflow-hidden` on page container and lack of internal scrolling on form card.
    
    ## Changes
    - `LoginCard.tsx`: Add responsive scroll classes (mobile: overflow-y-auto + max-h, desktop: centered layout)
    - `login/page.tsx`: Change overflow-hidden to overflow-auto, verify benefits panel hidden on mobile
    - `signup/page.tsx`: Apply same changes if applicable
    - `projectspec/03-project-structure.md`: Document mobile responsiveness updates
    
    ## Test Plan
    - [x] Mobile (< 768px): All form elements accessible by scrolling, no clipping
    - [x] Mobile: Google button and signup link fully visible and clickable
    - [x] Mobile: Benefits panel completely hidden
    - [x] Desktop (≥ 768px): Two-panel layout unchanged, form centered, no scroll
    - [x] Keyboard navigation: Tab order correct, focus managed properly
    - [x] Google OAuth: Button clickable and redirect works on mobile
    
    Fixes #0107
    ```
- [ ] 8.4 Verify the branch name is `fix/signin-signup-mobile-scroll` before pushing
