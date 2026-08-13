# Specification: Presentation Updates for Mobile Responsiveness

This specification covers the mobile responsiveness improvements to two UI components.

## Overview

This change is **presentation-layer only** with no changes to data models, APIs, business logic, or behavioral contracts. The requirements remain unchanged; only the rendering and layout adapt to mobile viewports.

## ADDED Requirements

### Requirement: InicioProximosEntrenamientos displays correctly on mobile
The upcoming trainings list SHALL render without visual overlap or horizontal overflow on mobile viewports (≤ 640px wide).

#### Scenario: 375px-wide viewport shows all elements
- **WHEN** user views the upcoming trainings section on a 375px-wide viewport (iPhone SE)
- **THEN** all elements (icon, name, date, location, org, status badge) are visible without overlap or truncation

#### Scenario: Metadata wraps on narrow screens
- **WHEN** location, meeting point, and org name exceed available horizontal space
- **THEN** they wrap to a second line without hiding any text

#### Scenario: Desktop layout unchanged
- **WHEN** user views the section on a viewport ≥ 640px wide
- **THEN** layout matches the current single-line design (icon, content, badge on one row)

### Requirement: SuscripcionModal is fully scrollable and actionable on mobile
The plan subscription modal SHALL be scrollable and allow users to reach all action buttons on mobile viewports.

#### Scenario: Modal scrolls with 4+ plan types
- **WHEN** user views step 1 (plan type selection) with 4+ plan types on a 375px × 667px viewport (iPhone SE)
- **THEN** the modal body scrolls vertically and the "Continuar" button is reachable by scrolling

#### Scenario: All form fields accessible in payment form
- **WHEN** user completes step 2 (payment form) on a 375px × 667px viewport
- **THEN** all form fields (payment method select, comments textarea, file upload) and the "Confirmar" button are accessible by scrolling within the modal

#### Scenario: Buttons remain visible at scroll edges
- **WHEN** user scrolls within the modal
- **THEN** the "Continuar" / "Confirmar" buttons remain visible or reachable at the bottom of the modal (not scrolled off)

#### Scenario: Backdrop remains fixed
- **WHEN** user scrolls within the modal
- **THEN** the modal backdrop and outer container remain fixed; only the modal body content scrolls

### Requirement: Navigation and interaction preserved
All existing links, buttons, form fields, and interactions SHALL function identically after layout changes.

#### Scenario: Training links navigate correctly
- **WHEN** user clicks a training row in InicioProximosEntrenamientos
- **THEN** navigation to the training management page works as before

#### Scenario: Modal buttons retain handlers
- **WHEN** user clicks "Continuar", "Confirmar", or "Cancelar" buttons in SuscripcionModal
- **THEN** the corresponding click handlers execute as before (no change to event handling)

#### Scenario: Form submission works
- **WHEN** user completes and submits the plan subscription form on mobile
- **THEN** form validation, file upload, and submission logic work identically to desktop

## Summary of Unchanged Behavior

The following remain **completely unchanged**:
- Data fetched and displayed (training names, dates, locations, plan types, pricing, services)
- Navigation targets and routing
- Form validation and submission logic
- Authentication and authorization checks
- Error handling and user messaging
- Accessibility tree and ARIA attributes
- Keyboard navigation

This specification documents layout-only changes.
