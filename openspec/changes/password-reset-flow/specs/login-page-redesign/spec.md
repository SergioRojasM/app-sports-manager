## ADDED Requirements

### Requirement: Post-Reset Success Banner
The system SHALL display a dismissible success banner on the `/auth/login` page when the `?reset=success` query parameter is present, informing the user that their password was updated.

#### Scenario: Banner shown after successful reset redirect
- **WHEN** a user navigates to `/auth/login?reset=success`
- **THEN** the login page MUST display a success banner with the text "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña."

#### Scenario: Banner dismissed on user input
- **WHEN** the success banner is visible and the user starts typing in any form field (email or password)
- **THEN** the banner MUST disappear

#### Scenario: Banner absent without query param
- **WHEN** a user navigates to `/auth/login` without the `?reset=success` parameter
- **THEN** no success banner SHALL be rendered
