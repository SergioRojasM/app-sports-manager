## 1. Branch Preparation

- [x] 1.1 Create and switch to implementation branch `feat/signup-page` from the latest integration baseline
- [x] 1.2 Validate current branch is not `main`, `master`, or `develop` before making code changes

## 2. Page Layer (`app/`)

- [x] 2.1 Create `src/app/auth/signup/page.tsx` with split layout composition for signup
- [x] 2.2 Reuse `LoginBenefitsPanel` unchanged on the left side and wire the right side to signup form container
- [x] 2.3 Ensure route renders correctly on desktop and mobile breakpoints without server-component violations

## 3. Component Layer (`components/`)

- [x] 3.1 Create `src/components/auth/SignupForm.tsx` as a client component with `email`, `password`, and `confirmPassword` fields
- [x] 3.2 Implement client-side validation for required fields and password confirmation mismatch
- [x] 3.3 Implement submit/loading/error/success UI states with accessible feedback regions (`role="alert"` for errors)
- [x] 3.4 Add existing-account navigation link from signup to `/auth/login`
- [x] 3.5 Reuse `LoginCard` wrapper if compatible with signup design; otherwise add minimal dedicated wrapper without changing left panel

## 4. Hook Layer (`hooks/`)

- [x] 4.1 Integrate signup submit flow through `useAuth().signUp` from `SignupForm`
- [x] 4.2 Confirm no direct Supabase SDK calls exist in page or presentation components
- [x] 4.3 Keep `useAuth` public contract stable unless a blocking issue requires a scoped change

## 5. Service Layer (`services/`)

- [x] 5.1 Reuse `authService.signUpWithPassword` for signup execution and keep callback redirect behavior
- [x] 5.2 Verify success handling supports both confirmation-required and immediate-session outcomes
- [x] 5.3 Ensure credential values are never logged during signup flow

## 6. Types and Contracts (`types/`)

- [x] 6.1 Verify existing auth types support signup flow without introducing `any`
- [x] 6.2 If new form-specific types are needed, add them with explicit narrow typing and no service contract breakage

## 7. Validation and Documentation

- [ ] 7.1 Manually verify `/auth/signup` scenarios: render, validation failures, auth errors, confirmation guidance, and `/dashboard` redirect when session exists
- [x] 7.2 Run lint for changed files and resolve only signup-related issues
- [x] 7.3 Update `README.md` with `/auth/signup`, expected post-signup behavior, and login/signup route linkage
