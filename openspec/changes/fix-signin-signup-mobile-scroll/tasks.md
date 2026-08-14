## 1. Setup and Branch Creation

- [ ] 1.1 Create a new git branch with name `fix/signin-signup-mobile-scroll`
- [ ] 1.2 Verify that the current working branch is not `main`, `master`, or `develop`

## 2. Component Updates

- [ ] 2.1 Open `src/components/auth/LoginCard.tsx` and review current responsive classes
- [ ] 2.2 Update `LoginCard.tsx` section element to add mobile scrolling: replace `flex items-center justify-center` with responsive classes:
  - Mobile (< md): `flex flex-col overflow-y-auto max-h-[calc(100vh - 32px)]`
  - Desktop (md:+): `flex items-center justify-center`
  - Result example: `flex flex-col overflow-y-auto max-h-[calc(100vh - 32px)] md:items-center md:justify-center md:overflow-hidden`
- [ ] 2.3 Ensure the inner card div styling remains unchanged (rounded-xl border bg-navy-medium/70 etc.)

## 3. Page Layout Updates

- [ ] 3.1 Open `src/app/auth/login/page.tsx` and review the current layout structure
- [ ] 3.2 Update the outer container classes in login page:
  - Change `overflow-hidden` to `overflow-auto` (fallback scroll)
  - Ensure `LoginBenefitsPanel` is wrapped with `hidden md:flex` to hide on mobile
  - Verify structure: `<div className="flex h-screen w-full flex-col overflow-auto bg-navy-deep hidden md:flex-row">`
- [ ] 3.3 Verify `LoginBenefitsPanel` component has correct responsive classes (`md:w-1/2` for desktop width)
- [ ] 3.4 Check if `src/app/auth/signup/page.tsx` exists and has similar layout
- [ ] 3.5 If signup page exists and uses same pattern, apply identical layout updates from 3.2 to signup page

## 4. Mobile Benefits Panel Verification

- [ ] 4.1 Confirm that `LoginBenefitsPanel` in `src/components/auth/LoginBenefitsPanel.tsx` has `md:` prefixes on width classes (should have `md:w-1/2` or similar)
- [ ] 4.2 If benefits panel doesn't have responsive sizing, add `w-full md:w-1/2` to the section element
- [ ] 4.3 Verify on mobile viewport that the benefits panel does not render or is completely hidden

## 5. Testing and Verification

- [ ] 5.1 Start the development server with `npm run dev` (or appropriate dev command)
- [ ] 5.2 Open `/auth/login` in browser DevTools mobile view (375px width, e.g., iPhone SE)
- [ ] 5.3 Verify all form elements are visible by scrolling:
  - Logo/title
  - Email input
  - Password input
  - Remember me + Forgot password link
  - Sign in button
  - Divider ("O continúa con")
  - Google button ("Continuar con Google")
  - Sign up CTA ("¿No tienes una cuenta? Regístrate")
- [ ] 5.4 Verify no content is clipped by scrolling to the very bottom and confirming signup link is fully clickable
- [ ] 5.5 Test on tablet viewport (~600px width) to confirm scrolling works
- [ ] 5.6 Test on desktop viewport (≥ 768px) to verify two-panel layout is unchanged and benefits panel is visible
- [ ] 5.7 Test keyboard navigation on mobile (Tab through all form elements) and confirm focus order is correct
- [ ] 5.8 Test Google OAuth button click on mobile (should not lose focus or break redirect)
- [ ] 5.9 If signup page was updated, repeat tests 5.2-5.8 on `/auth/signup`
- [ ] 5.10 Verify no layout jank or jumping during scroll

## 6. Type Checking, Linting, and Tests

- [ ] 6.1 Run `npm run type-check` (or appropriate TypeScript check) to verify no type errors
- [ ] 6.2 Run `npm run lint` (or appropriate linter) on modified files and fix any linting issues
- [ ] 6.3 Run existing test suite with `npm run test` (if applicable) to ensure no regressions

## 7. Documentation Updates

- [ ] 7.1 Review `projectspec/03-project-structure.md` to see if auth layout or responsive behavior is documented
- [ ] 7.2 If applicable, update the auth section in `projectspec/03-project-structure.md` to note mobile responsiveness (scrollable form cards on < 768px)
- [ ] 7.3 Add a note in the `LoginCard.tsx` or `LoginForm.tsx` file (comment) explaining the responsive scroll behavior

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
