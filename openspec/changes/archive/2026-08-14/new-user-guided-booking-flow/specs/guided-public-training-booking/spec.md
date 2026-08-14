## ADDED Requirements

### Requirement: Guided Booking Target Construction on the Public Landing CTA
The "Regístrate para reservar" dialog on the public landing page SHALL build a guided
booking target — carrying the selected training's `entrenamiento`, `tenant`, `disciplina`
identifiers and its display name — and pass it as the `next` query parameter to both its
"Crear cuenta gratis" and "Ya tengo cuenta" links.

#### Scenario: Signup link carries the guided booking target
- **WHEN** a visitor clicks "Reservar" on a training and then "Crear cuenta gratis"
- **THEN** the browser navigates to `/auth/signup?next=...` where `next` decodes to a path
  containing the clicked training's `entrenamiento`, `tenant`, and `disciplina` identifiers

#### Scenario: Login link carries the guided booking target
- **WHEN** a visitor clicks "Reservar" on a training and then "Ya tengo cuenta"
- **THEN** the browser navigates to `/auth/login?next=...` where `next` decodes to a path
  containing the same training's identifiers

### Requirement: Marketplace Auto-Resumes the Guided Booking
`/portal/entrenamientos-publicos` SHALL detect a guided booking target encoded in its own
URL, locate the matching training in the loaded marketplace listing once loading completes,
and automatically open the booking modal for it — equivalent to the user clicking
"Reservar" themselves.

#### Scenario: Guided target resolves to a listed training
- **WHEN** the page loads with a guided booking target in the URL and the referenced
  training is present in the loaded marketplace listing
- **THEN** the booking modal for that training opens automatically, without the user
  clicking "Reservar"

#### Scenario: Guided target references a training no longer listed
- **WHEN** the page loads with a guided booking target whose training is not found in the
  loaded marketplace listing (e.g., unpublished since the link was generated)
- **THEN** the page renders the normal marketplace view with no modal opened and no error
  shown to the user

#### Scenario: Guided query params are cleared after first use
- **WHEN** the booking modal has been auto-opened from a guided booking target
- **THEN** the guided query parameters are removed from the URL so that refreshing the page
  does not reopen the modal

### Requirement: Guided Stepper Visibility Scope
The guided booking stepper SHALL render only while the user is inside a journey that
originated from a guided booking target; it MUST NOT render when no such target is present
in context.

#### Scenario: Guided journey shows the stepper
- **WHEN** a user is on the signup page, the login page, or the booking modal, and a guided
  booking target is present in the current context
- **THEN** the guided booking stepper is rendered

#### Scenario: Ordinary marketplace browsing shows no stepper
- **WHEN** an already-authenticated user navigates to `/portal/entrenamientos-publicos`
  directly (no guided booking target in the URL) and opens the booking modal for any
  training by clicking "Reservar"
- **THEN** no stepper is rendered and the existing booking modal behavior is unchanged

### Requirement: Guided Stepper Step Sequence
The guided booking stepper SHALL be organized as independent, decoupled phases rather than
one continuous numbered sequence across pages — because a returning user going through
login never needs an account-creation/email-confirmation phase, and by the time either
path reaches the booking modal, authentication is already complete either way:
- **Signup phase** (2 steps): "Crear cuenta", "Confirmar tu correo" — shown on the signup
  page only.
- **Login phase** (1 step): "Iniciar sesión" — shown on the login page only.
- **Booking phase** (3 steps): "Completar tus datos", "Verificar y reservar", "Formulario y
  confirmación" — shown inside the booking modal only, regardless of whether the user
  arrived via signup or login.

Each phase's stepper highlights the step matching the user's current position within that
phase's own list; phases are never mixed into a single shared step count.

#### Scenario: Signup phase, step 1, before submission
- **WHEN** the guided stepper is shown on the signup page before the form is submitted
- **THEN** the stepper displays only the signup phase's 2 steps and highlights step 1
  ("Crear cuenta")

#### Scenario: Signup phase, step 2, pending email confirmation
- **WHEN** the signup form has been submitted and the outcome requires email confirmation
- **THEN** the stepper highlights step 2 ("Confirmar tu correo") within the signup phase

#### Scenario: Login phase, single step
- **WHEN** the guided stepper is shown on the login page
- **THEN** the stepper displays only the login phase's 1 step ("Iniciar sesión"), with no
  "Crear cuenta" or "Confirmar tu correo" steps present

#### Scenario: Booking phase, step 1, during inline profile completion
- **WHEN** the booking modal is showing the inline profile-completion step
- **THEN** the stepper displays only the booking phase's 3 steps and highlights step 1
  ("Completar tus datos") — regardless of whether the user arrived via signup or login

#### Scenario: Booking phase, step 2, during eligibility check or plan purchase
- **WHEN** the booking modal is checking eligibility or prompting the user to acquire a
  required plan
- **THEN** the stepper highlights step 2 ("Verificar y reservar") within the booking phase

#### Scenario: Booking phase, step 3, while completing the training's formulario
- **WHEN** the booking modal is showing the training's formulario for the user to fill out
- **THEN** the stepper highlights step 3 ("Formulario y confirmación") within the booking
  phase

#### Scenario: The initial "Regístrate para reservar" dialog shows no stepper
- **WHEN** the anonymous landing page's "Regístrate para reservar" dialog is shown, before
  the visitor has chosen between creating an account or logging in
- **THEN** no guided booking stepper is rendered, since which phase applies is not yet known

### Requirement: Inline Profile Completion Precedes Eligibility Check
When the selected training's formulario declares profile fields that the current user's
profile is missing, the booking modal SHALL render an inline profile-completion step
**before** evaluating booking eligibility.

#### Scenario: Missing required profile fields block progress to eligibility
- **WHEN** the booking modal opens for a training whose formulario has
  `perfil_campos_requeridos` and the current user's profile is missing one or more of them
- **THEN** the modal renders the inline profile-completion step and does not yet run or
  display the eligibility check

#### Scenario: No missing profile fields skips the step
- **WHEN** the booking modal opens for a training and the current user's profile already
  satisfies the formulario's `perfil_campos_requeridos` (or the training has no such
  requirement)
- **THEN** the inline profile-completion step is not shown and the modal proceeds directly
  to the eligibility check

#### Scenario: Saving the inline step advances to the eligibility check
- **WHEN** the user completes and saves the inline profile-completion step successfully
- **THEN** the modal automatically re-evaluates profile completeness, finds no fields
  missing, and proceeds to the eligibility check without any further user action

### Requirement: Inline Profile Completion Field Scope
The inline profile-completion step SHALL render only the profile fields the current
training's formulario declares as required and that are currently missing — never the full
profile field set.

#### Scenario: Only missing required fields are shown
- **WHEN** the inline profile-completion step is rendered for a formulario that requires
  fields A, B, and C, and the user's profile is currently missing only B and C
- **THEN** the step displays inputs for B and C only, not A and not any other profile field

### Requirement: Inline Profile Completion Never Blocks on an Invisible Required Field
Saving the profile always requires `nombre` and `apellido` to be non-empty, regardless of
what the current training's formulario asked for. If either is empty and not already part
of the fields being shown, the inline profile-completion step SHALL show it anyway, so the
save can never fail validation on a field the user has no way to see or fix.

#### Scenario: A brand-new signup user has no nombre/apellido on file
- **WHEN** a user who signed up with only email/password (no name collected at signup)
  reaches the inline profile-completion step for a formulario that does not itself request
  `nombre` or `apellido`
- **THEN** the step still shows editable `nombre` and `apellido` fields alongside the
  formulario's actually-requested fields, and saving succeeds once all of them are filled in

#### Scenario: nombre/apellido already present are not shown redundantly
- **WHEN** the user's profile already has non-empty `nombre` and `apellido`, and the
  training's formulario does not request them
- **THEN** the inline profile-completion step does not show `nombre`/`apellido` inputs

### Requirement: Inline Profile Completion Is Available Outside Guided Journeys
Any user — guided or not — who encounters the incomplete-profile gate while booking a
public training SHALL see the inline profile-completion step inside the booking modal,
instead of being sent to a separate page.

#### Scenario: Returning member without a guided target still gets the inline step
- **WHEN** an already-authenticated returning member books a training whose formulario was
  recently updated to require a profile field they don't yet have, with no guided booking
  target present
- **THEN** the booking modal shows the inline profile-completion step in place, without
  navigating away from `/portal/entrenamientos-publicos`
