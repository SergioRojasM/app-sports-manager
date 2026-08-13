# Specification: Presentation Updates — Public Trainings Page Background

This specification covers a presentation-layer-only fix to the public trainings marketplace page's outer container.

## Overview

This change is **presentation-layer only** with no changes to data models, APIs, business logic, or behavioral contracts of the `public-training-marketplace` capability. Only the page's outer background/decoration markup changes.

## ADDED Requirements

### Requirement: Public trainings marketplace page renders without a duplicate background container
The `/portal/entrenamientos-publicos` page SHALL NOT render its own page-level background color, rounded panel, or decorative glow-blob elements around its full content area. The page SHALL render directly against the portal shell's existing background (`bg-navy-deep`, set in `src/app/portal/layout.tsx`).

#### Scenario: Page background matches the portal shell
- **WHEN** an authenticated user visits `/portal/entrenamientos-publicos`
- **THEN** no `bg-landing-bg`-colored rounded panel or blurred glow-blob decoration SHALL render behind the page's full content area; the visible background SHALL be the portal shell's `bg-navy-deep`

#### Scenario: Sticky header remains functional
- **WHEN** the page loads
- **THEN** the sticky header (title, sessions-available widget, "Filtrar" button) SHALL still render, remain sticky on scroll, and its own styling SHALL be unchanged

#### Scenario: Filters drawer, grid, and reserva modal unaffected
- **WHEN** a user opens the filters drawer, views the trainings grid (loading/error/populated states), or opens the reserva modal from a card
- **THEN** each SHALL render and function identically to before this change, including their own existing `bg-landing-bg` surface styling (drawer panel, cards)

## Summary of Unchanged Behavior

The following remain **completely unchanged**:
- Route, data fetching, and filtering logic (`useEntrenamientosPublicosMarketplace`)
- Sticky header content and the "Filtrar" button's click handler
- `PublicTrainingFiltersDrawer`, `PublicTrainingCard`, `PublicTrainingsGrid`, `PublicTrainingReservaModal` — all internal styling and behavior
- Loading and error states and their retry action
- Booking flow triggered from a card

This specification documents an outer-container/background-only change.
