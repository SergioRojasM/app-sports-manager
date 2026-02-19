## 1. Branch Setup and Validation

- [x] 1.1 Create and switch to branch `feat/redesign-login-page`
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop`

## 2. Page Layer (Route Composition)

- [x] 2.1 Update `src/app/auth/login/page.tsx` to render the redesigned responsive layout shell for login
- [x] 2.2 Preserve `next` query param handling and default redirect fallback contract to `/dashboard`

## 3. Component Layer (Presentation)

- [x] 3.1 Refactor `src/components/auth/LoginForm.tsx` to match the approved design structure and required controls
- [x] 3.2 Add `src/components/auth/LoginBenefitsPanel.tsx` for the left panel content block
- [x] 3.3 Add `src/components/auth/LoginCard.tsx` (or equivalent wrapper) to isolate right-panel card composition
- [x] 3.4 Ensure loading, disabled submit, error feedback, and keyboard-accessible labels/focus states remain intact

## 4. Hook Layer (Application Logic)

- [x] 4.1 Confirm `useAuth().signIn` remains the login action entrypoint for form submission
- [x] 4.2 Ensure UI consumes hook loading/error state without introducing duplicated auth logic

## 5. Service Layer (Infrastructure)

- [x] 5.1 Confirm login continues to call `authService.signInWithPassword` with no behavior drift
- [x] 5.2 Verify no new auth endpoints/providers are added in this change

## 6. Types and Styling Support

- [x] 6.1 Add or adjust auth UI state typing only if required, avoiding `any`
- [x] 6.2 Update `tailwind.config.ts` tokens required by the redesign
- [x] 6.3 Add minimal `src/app/globals.css` utilities only when Tailwind utilities are insufficient

## 7. Validation and Documentation

- [x] 7.1 Manually verify `/auth/login` on desktop and mobile layouts
- [x] 7.2 Verify invalid credentials show user-friendly errors
- [x] 7.3 Verify successful login redirects with and without `next` query parameter
- [x] 7.4 Run linting for changed files and resolve login-redesign related findings
- [x] 7.5 Update `README.md` auth section with redesigned login route behavior and design reference
