# Implementation Tasks: Mobile Responsive UI Fixes

## 1. Branch Setup

- [x] 1.1 Create feature branch `fix/mobile-responsive-fixes` from `develop`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop`

## 2. Refactor InicioProximosEntrenamientos Component

- [x] 2.1 Open `src/components/portal/inicio/InicioProximosEntrenamientos.tsx`
- [x] 2.2 Change the training row container `<Link>` from `flex items-center gap-4` to `flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4` (responsive flex direction and gap)
- [x] 2.3 Reorganize the row sub-elements:
  - Icon + training name + status badge on top row (mobile)
  - Metadata (location, meeting point, org) on second row
  - On `sm:` and larger, revert to current single-line layout
- [x] 2.4 Add `flex-wrap` to the metadata sub-row (`<div>` at line ~72) to allow graceful wrapping on narrow screens
- [x] 2.5 Reposition the status badge: inline with the title on mobile, far-right on desktop
- [x] 2.6 Verify that the `<Link>` element and all nested content remain semantically correct (no broken links)

## 3. Refactor SuscripcionModal Component

- [x] 3.1 Open `src/components/portal/planes/SuscripcionModal.tsx`
- [x] 3.2 Restructure the modal container to support a fixed header + scrollable body + fixed footer:
  - Add `flex flex-col` and `max-h-[85dvh]` to the modal `<div>` (line ~145)
  - Keep the title `<h2>` and error alert outside the scrollable area
- [x] 3.3 Wrap the step content (both step 1 and step 2) in a new `<div>` with `flex-1 overflow-y-auto min-h-0` to make it scrollable
- [x] 3.4 Move the button row (`<div className="mt-6 flex...">` at lines ~227 and ~407) outside the scrollable area (keep at the bottom of the modal)
- [x] 3.5 Ensure the backdrop remains fixed and non-scrollable while content scrolls
- [x] 3.6 Verify form fields (select, textarea, file input) remain interactive and usable inside the scrollable area

## 4. Testing on Mobile Viewports

- [x] 4.1 Test InicioProximosEntrenamientos on 375px-wide viewport:
  - [x] All training elements (icon, name, date, location, org, badge) visible without overlap
  - [x] Metadata wraps to second line without truncation
  - [x] Training row remains clickable
- [x] 4.2 Test InicioProximosEntrenamientos on 640px viewport:
  - [x] Layout matches current single-line design
  - [x] No visual regression
- [x] 4.3 Test SuscripcionModal step 1 (plan selection) on 375px × 667px viewport:
  - [x] Modal displays with 3+ plan types
  - [x] "Continuar" button is reachable by scrolling
  - [x] Plan type cards remain clickable and selectable
- [x] 4.4 Test SuscripcionModal step 2 (payment form) on 375px × 667px viewport:
  - [x] Payment method select, comments textarea, file input are accessible
  - [x] "Confirmar" button is reachable by scrolling
  - [x] Form interaction works (fill fields, upload file, submit)
- [x] 4.5 Test both components on desktop viewport (1024px+):
  - [x] No visual regressions
  - [x] Layout matches current design
- [x] 4.6 Test modal backdrop behavior:
  - [x] Clicking backdrop closes modal
  - [x] Body scroll prevented when modal open

## 5. Accessibility and Interaction Verification

- [x] 5.1 Verify training row `<Link>` still navigates correctly on click
- [x] 5.2 Verify modal button click handlers still execute (Continuar, Confirmar, Cancelar)
- [x] 5.3 Verify form submission works end-to-end on mobile (validate, upload, submit)
- [x] 5.4 Test keyboard navigation (Tab through plan types, form fields, buttons)
- [x] 5.5 Verify ARIA attributes and accessibility tree unchanged

## 6. Code Quality and Documentation

- [x] 6.1 Review changes for code style, Tailwind conventions, and semantic HTML compliance
- [x] 6.2 Ensure no console errors or warnings in dev tools
- [x] 6.3 Verify no unintended side effects on other pages or components

## 7. Commit and Pull Request

- [x] 7.1 Stage the modified files:
  - `src/components/portal/inicio/InicioProximosEntrenamientos.tsx`
  - `src/components/portal/planes/SuscripcionModal.tsx`
- [x] 7.2 Create a commit with message:
  ```
  fix(mobile-ui): make upcoming trainings and subscription modal responsive

  - Refactor InicioProximosEntrenamientos to use responsive flex layout (flex-col on mobile, flex-row on sm:)
  - Add flex-wrap to metadata row for graceful wrapping on narrow screens
  - Restructure SuscripcionModal with fixed header/footer and scrollable body
  - Ensure all elements accessible on 375px × 667px viewport
  - No changes to data models, APIs, or business logic

  Fixes: US-0072
  ```
- [x] 7.3 Push branch to remote with `-u` flag
- [x] 7.4 Create pull request with title: `fix(mobile-ui): make upcoming trainings and subscription modal responsive`
- [x] 7.5 PR description should include:
  - **Summary**: Mobile responsiveness fixes for two critical UI components blocking users on narrow viewports
  - **Changes**: Flex layout refactoring in two components (no data/API changes)
  - **Test Plan**: Verified on 375px, 640px, 1024px viewports; manual interaction tests
  - **Acceptance**: All criteria from US-0072 met (no overlap, elements wrappable, buttons always reachable)
- [x] 7.6 Ensure PR passes any CI checks (linting, type checking, tests)

---

## Summary

This fix addresses mobile UX blockers in two presentation components through CSS layout refactoring only. No database migrations, API changes, or state management updates are required.
