## Purpose

Update the existing login-page-redesign specification to include precise mobile responsiveness requirements with scrolling behavior.

## MODIFIED Requirements

### Requirement: Redesigned Login Layout
The system SHALL render `/auth/login` as a responsive two-panel login experience aligned with the approved layout and content structure from `projectspec/designs/login.html`, including a left informational panel (desktop-only) and a right authentication card (scrollable on mobile).

#### Scenario: Desktop two-panel rendering
- **WHEN** a user opens `/auth/login` on desktop viewport width (≥ 768px)
- **THEN** the page MUST display both the left brand/benefits panel and the right login form panel in a side-by-side layout with the form card vertically centered

#### Scenario: Mobile scrollable rendering
- **WHEN** a user opens `/auth/login` on mobile viewport width (< 768px)
- **THEN** the page MUST render a full-width scrollable form card with the benefits panel completely hidden; all form elements SHALL be accessible by scrolling without any content clipping

#### Scenario: No horizontal overflow on any viewport
- **WHEN** a user views `/auth/login` on any device
- **THEN** the page MUST NOT have horizontal scrolling or overflow on any viewport width
