## 1. Setup

- [x] 1.1 Create a new branch named `fix/hide-breadcrumb-on-mobile`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop`

## 2. Component Update

- [x] 2.1 Open `src/components/portal/PortalHeader.tsx` and locate the left-section block containing the second `<div className="h-5 w-px bg-portal-border" />` (the one immediately before `<PortalBreadcrumb />`)
- [x] 2.2 Wrap that divider and `<PortalBreadcrumb />` together in `<div className="hidden md:flex items-center gap-2">` with a JSX comment explaining the purpose
- [x] 2.3 Verify `PortalBreadcrumb.tsx` itself has NOT been modified

## 3. Validation

- [ ] 3.1 Run the app (`pnpm dev`) and open DevTools at 375 px width — confirm breadcrumb and its divider are not visible and avatar/notifications are fully accessible
- [ ] 3.2 Confirm breadcrumb and divider are fully visible at 1280 px width with no visual regression
- [x] 3.3 Run `pnpm lint` and confirm no lint errors
- [x] 3.4 Run `pnpm build` and confirm no type or build errors

## 4. Commit & PR

- [ ] 4.1 Stage changes and create a commit with message: `fix: hide portal breadcrumb on mobile to prevent avatar obstruction`
- [ ] 4.2 Create a pull request with the following description:

  **Title**: `fix: hide portal breadcrumb on mobile`

  **Body**:
  ```
  ## Summary
  Wraps `PortalBreadcrumb` and its preceding divider in a `hidden md:flex` container
  inside `PortalHeader.tsx`.

  On viewports < 768 px the breadcrumb is removed from layout and accessibility tree,
  ensuring `UserAvatarMenu` and notifications remain fully visible and clickable.
  Desktop behaviour is unchanged.

  ## Changes
  - `src/components/portal/PortalHeader.tsx`: wrap breadcrumb section in responsive container

  ## Testing
  - Verified at 375 px: breadcrumb hidden, avatar accessible
  - Verified at 1280 px: no visual regression
  - `pnpm lint` and `pnpm build` pass

  Closes #38
  ```
