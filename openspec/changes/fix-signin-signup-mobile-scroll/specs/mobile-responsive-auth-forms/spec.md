## Purpose

Define requirements for mobile-responsive scrollable authentication forms on Sign In and Sign Up pages. Ensures all form elements are accessible on small screens without truncation or overflow clipping.

## ADDED Requirements

### Requirement: Mobile Form Scrollability
The system SHALL enable vertical scrolling on the Sign In and Sign Up form cards when viewport height is insufficient to display all form elements on mobile devices (viewport width < 768px).

#### Scenario: All form elements accessible on mobile
- **WHEN** a user opens `/auth/login` or `/auth/signup` on a mobile device (375px width)
- **THEN** the user SHALL be able to scroll through all form elements including email input, password input, remember-me checkbox, forgot-password link, sign-in button, divider, Google OAuth button, and signup/login CTA link

#### Scenario: Google button visible and clickable on mobile
- **WHEN** a user scrolls to the bottom of the form on mobile
- **THEN** the "Continuar con Google" button SHALL be fully visible and clickable without any clipping

#### Scenario: No form clipping or overflow on mobile
- **WHEN** form content exceeds the viewport height on mobile
- **THEN** no form elements SHALL be hidden by `overflow-hidden` or viewport clipping; scrolling SHALL reveal all content

### Requirement: Mobile Benefits Panel Hidden
The system SHALL completely hide the `LoginBenefitsPanel` on mobile devices (viewport width < 768px) so it does not consume screen space or interfere with form access.

#### Scenario: Benefits panel hidden on mobile
- **WHEN** a user opens `/auth/login` or `/auth/signup` on a mobile device (< 768px width)
- **THEN** the `LoginBenefitsPanel` SHALL not be rendered or displayed; the form SHALL occupy the full available width

#### Scenario: Benefits panel visible on desktop
- **WHEN** a user opens `/auth/login` or `/auth/signup` on a desktop device (≥ 768px width)
- **THEN** the `LoginBenefitsPanel` SHALL be rendered on the left side of the layout

### Requirement: Desktop Layout Unchanged
The system SHALL preserve the existing desktop two-panel layout (benefits panel + centered form card) without adding scroll or changing centering behavior on screens ≥ 768px.

#### Scenario: Desktop side-by-side layout
- **WHEN** a user opens `/auth/login` or `/auth/signup` on a desktop viewport width (≥ 768px)
- **THEN** the page MUST display both the left brand/benefits panel and the right login form panel in a side-by-side layout, with the form card vertically centered

#### Scenario: Desktop form fits without scroll
- **WHEN** the form is rendered on desktop (≥ 768px)
- **THEN** all form elements SHALL fit within the viewport without requiring vertical scrolling

### Requirement: Smooth Scrolling and Focus Management
The system SHALL enable native smooth scrolling on mobile form cards and maintain proper focus management during scrolling to ensure keyboard navigation works correctly.

#### Scenario: Smooth scrolling on mobile
- **WHEN** a user scrolls through the form on mobile
- **THEN** scrolling SHALL feel smooth and natural with no layout jank, jumping, or shifting

#### Scenario: Keyboard navigation during scroll
- **WHEN** a user navigates via keyboard (Tab key) on mobile
- **THEN** focus SHALL move through all interactive elements (inputs, buttons, links) in the correct order regardless of scroll position

#### Scenario: Button focus preserved during scroll
- **WHEN** a user scrolls to the Google button on mobile and clicks it
- **THEN** focus SHALL be properly transferred to the Google OAuth flow without being lost during scroll

### Requirement: Mobile Safe Area Consideration
The system SHALL account for device notches, status bars, and soft keyboards to ensure form content is not obscured by browser UI elements on mobile devices.

#### Scenario: Content not obscured by status bar
- **WHEN** a user opens the form on mobile with a status bar present (iOS/Android)
- **THEN** the form content SHALL not be hidden behind the status bar or notch area

#### Scenario: Form accessible when keyboard opens
- **WHEN** a user taps an input field on mobile, triggering the soft keyboard
- **THEN** the form SHALL remain scrollable and the focused input SHALL be visible above the keyboard
