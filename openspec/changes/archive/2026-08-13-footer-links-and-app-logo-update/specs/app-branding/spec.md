## ADDED Requirements

### Requirement: Unified App Logo Asset
Every screen in the application (landing, authentication, and portal) SHALL reference `/logo-navbar.png` as the brand logo image. No component SHALL reference any other logo asset path (e.g. `/icono_2.png`, `/logo2.png`, or `/landing/logo-navbar.png`).

#### Scenario: Landing header uses the canonical logo
- **WHEN** a visitor loads the landing page
- **THEN** the header logo `<Image>` has `src="/logo-navbar.png"`

#### Scenario: Portal header uses the canonical logo
- **WHEN** an authenticated user views the portal header
- **THEN** the header logo `<Image>` has `src="/logo-navbar.png"`

#### Scenario: Portal sidebar uses the canonical logo
- **WHEN** an authenticated user views the portal sidebar
- **THEN** the sidebar logo `<Image>` has `src="/logo-navbar.png"` and no longer references the non-existent `/logo2.png`

#### Scenario: Auth screens use the canonical logo
- **WHEN** a user views the login, signup, forgot-password, or update-password screens
- **THEN** every logo `<Image>` on those screens has `src="/logo-navbar.png"`

#### Scenario: Duplicate asset removed
- **WHEN** the codebase is inspected after this change
- **THEN** `public/landing/logo-navbar.png` no longer exists and no component references it

### Requirement: Logo Container Preserves Aspect Ratio
Any container that renders the app logo SHALL use a wide (~4:1) aspect ratio matching the 800×200 source image, instead of a square (1:1) container, so the logo is never visibly stretched or cropped.

#### Scenario: Square containers are resized
- **WHEN** the logo is rendered inside a container that was previously square (e.g. `h-8 w-8` in the portal header/sidebar, `size-30` in the login benefits panel)
- **THEN** the container is resized to a wide rectangle appropriate for an 800×200 image
- **AND** the rendered logo shows no visible distortion or cropping on both desktop and mobile viewports
