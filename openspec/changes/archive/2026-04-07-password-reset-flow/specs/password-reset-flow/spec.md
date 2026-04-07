## ADDED Requirements

### Requirement: Forgot Password Page
The system SHALL provide a `/auth/forgot-password` page with an email input form that triggers a Supabase password reset email using the PKCE flow.

#### Scenario: Page renders for unauthenticated user
- **WHEN** any user navigates to `/auth/forgot-password`
- **THEN** the system MUST render the two-panel auth layout (LoginBenefitsPanel + LoginCard) with an email input and a submit button

#### Scenario: Valid email submitted
- **WHEN** a user submits a valid email address
- **THEN** the system SHALL call `supabase.auth.resetPasswordForEmail` with `redirectTo` pointing to `/auth/callback?next=/auth/update-password`
- **THEN** the form MUST transition to a success state showing "Revisa tu correo electrónico. Te enviamos un enlace para restablecer tu contraseña."
- **THEN** the submit button MUST be disabled after success

#### Scenario: Success shown regardless of email existence
- **WHEN** a user submits an email address that does not belong to any account
- **THEN** the system MUST show the same success message (no user enumeration)

#### Scenario: Service error on submit
- **WHEN** Supabase returns an error (e.g., rate limit exceeded)
- **THEN** the system MUST display the error message inline within the form
- **THEN** the submit button MUST remain enabled so the user can retry

#### Scenario: Invalid email format
- **WHEN** a user submits a string that is not a valid email address
- **THEN** the browser's native `type="email"` validation SHALL prevent form submission

### Requirement: Update Password Page
The system SHALL provide a `/auth/update-password` page, accessible only to authenticated users (session established via the PKCE reset link), with a form to set a new password.

#### Scenario: Unauthenticated access redirected
- **WHEN** a user navigates to `/auth/update-password` without a valid session
- **THEN** the server MUST redirect to `/auth/forgot-password` before rendering any HTML

#### Scenario: Authenticated user sees form
- **WHEN** a user arrives at `/auth/update-password` with a valid session
- **THEN** the system MUST render the two-panel auth layout with a "Nueva contraseña" field and a "Confirmar contraseña" field

#### Scenario: Passwords do not match
- **WHEN** a user submits the form with mismatched password and confirmation
- **THEN** the system MUST show the inline error "Las contraseñas no coinciden"
- **THEN** the form MUST NOT call `supabase.auth.updateUser`

#### Scenario: Password too short
- **WHEN** a user submits a password shorter than 6 characters
- **THEN** the system MUST show the inline error "La contraseña debe tener al menos 6 caracteres"
- **THEN** the form MUST NOT call `supabase.auth.updateUser`

#### Scenario: Valid new password submitted
- **WHEN** a user submits a matching password of at least 6 characters
- **THEN** the system SHALL call `supabase.auth.updateUser({ password })`
- **THEN** on success the client MUST redirect to `/auth/login?reset=success`

#### Scenario: Service error on password update
- **WHEN** `supabase.auth.updateUser` returns an error
- **THEN** the system MUST display the error message inline and keep the user on the update-password page

### Requirement: Auth Service Password Reset Methods
The `authService` in `src/services/supabase/auth.ts` SHALL expose `resetPasswordForEmail(email)` and `updatePassword(password)` methods following the existing return-type pattern.

#### Scenario: resetPasswordForEmail returns no error on success
- **WHEN** `authService.resetPasswordForEmail(email)` is called with a valid email
- **THEN** it MUST return `{ errorMessage: null }`

#### Scenario: resetPasswordForEmail returns error message on failure
- **WHEN** Supabase returns an error from `auth.resetPasswordForEmail`
- **THEN** `authService.resetPasswordForEmail` MUST return `{ errorMessage: <message string> }`

#### Scenario: updatePassword returns no error on success
- **WHEN** `authService.updatePassword(password)` is called with a valid password and an active session
- **THEN** it MUST return `{ errorMessage: null }`

#### Scenario: updatePassword returns error message on failure
- **WHEN** Supabase returns an error from `auth.updateUser`
- **THEN** `authService.updatePassword` MUST return `{ errorMessage: <message string> }`

### Requirement: useAuth Hook Password Reset Methods
The `useAuth` hook SHALL expose `resetPassword(email)` and `updatePassword(password)` functions following the same delegation pattern as existing `signIn`/`signUp` methods.

#### Scenario: resetPassword delegates to authService
- **WHEN** `useAuth().resetPassword(email)` is called
- **THEN** it MUST call `authService.resetPasswordForEmail(email)` and return its result

#### Scenario: updatePassword delegates to authService
- **WHEN** `useAuth().updatePassword(password)` is called
- **THEN** it MUST call `authService.updatePassword(password)` and return its result
