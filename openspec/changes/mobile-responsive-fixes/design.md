## Context

Two mobile UI components exhibit layout issues that block user workflows:

1. **InicioProximosEntrenamientos** (home dashboard upcoming trainings section): Fixed horizontal `flex items-center gap-4` layout containing a 40px icon, content block, and status badge. Metadata (location, meeting point, org) wrapped in a non-wrapping flex row. On viewports < 640px, elements overlap and text truncates.

2. **SuscripcionModal** (plan purchase flow): Fixed center modal with `fixed inset-0 flex items-center justify-center`, modal body with `mx-4 w-full max-w-lg p-6` but no max-height or overflow. On mobile (375px × 667px), content with 3+ plan types or the full payment form extends beyond viewport, blocking access to "Continuar" / "Confirmar" buttons.

Both are presentation-layer issues with no data model, API, or contract changes. The tech stack uses Tailwind CSS for responsive utilities.

## Goals / Non-Goals

**Goals:**
- Ensure InicioProximosEntrenamientos renders without overlap on 375px-wide viewports
- Enable scrolling within SuscripcionModal on mobile without body page scroll (no double-scroll)
- Maintain visual consistency on desktop (≥ 640px) with current design
- Keep all interactive elements (links, buttons, form fields) accessible on mobile

**Non-Goals:**
- Redesign the visual appearance, colors, typography, or component hierarchy
- Change data models, API contracts, or business logic
- Add new filtering, sorting, or data display modes
- Modify validation, error handling, or state management beyond what's needed for layout

## Decisions

### Decision 1: InicioProximosEntrenamientos Layout Strategy

**Choice**: Responsive flex layout using Tailwind breakpoints (`sm:` at 640px).

**Rationale**: 
- Mobile-first approach aligns with the project's use of Tailwind. No additional CSS or media queries needed.
- `flex flex-col sm:flex-row` stacks elements on mobile, horizontal on desktop.
- `flex-wrap` on metadata row allows graceful line wrapping without overflow.
- Status badge repositioned to top-right (inline with title) on mobile, far-right on desktop.

**Alternatives considered**:
- CSS Grid with `grid-auto-flow: dense`: More complex, less intuitive for two-row layout.
- Fixed row height with `overflow: hidden`: Loses information instead of adapting.

### Decision 2: SuscripcionModal Structure

**Choice**: Fixed header + scrollable body + fixed footer using flexbox and `overflow-y-auto` on body.

**Rationale**:
- Keeps title and buttons always visible (action buttons must not scroll off).
- Content scrolls within a constrained height (`max-h-[calc(85dvh-8rem)]` accounting for header + footer).
- Uses `flex flex-col` on modal and `flex-1 overflow-y-auto` on body to achieve this without JavaScript scroll listeners.
- `85dvh` (dynamic viewport height) instead of `90vh` provides safe margin on mobile browsers with address bars.

**Alternatives considered**:
- JavaScript scroll position tracking: More complex, requires React state, harder to maintain.
- Single scrollable modal: Buttons disappear on scroll, poor UX for CTAs.
- Separate step modals: Increases complexity, inconsistent UX.

### Decision 3: Scrollable Area Height Calculation

**Choice**: `max-h-[calc(85dvh-8rem)]` for body content area.

**Rationale**:
- `85dvh` leaves 15% viewport for system UI (address bar, home indicator on mobile).
- `8rem` (128px) accounts for typical header height (3rem) + footer height (4rem) + padding gaps (1rem).
- `dvh` (dynamic viewport height) adapts to mobile browsers' collapsing address bars.

**Alternatives considered**:
- Fixed `max-h-96` or `max-h-screen`: Doesn't adapt to mobile browser chrome, breaks on small devices.
- `min-h-0` on body: Required to prevent flex-child overflow in Tailwind (flexbox quirk).

## Risks / Trade-offs

**[Risk] Users with 3+ plan types on very small phones (320px width)**
→ *Mitigation*: Even at 320px, Tailwind's `gap-3`, padding, and border classes leave ~260px for text. Training names and plan type names are typically < 20 chars; status badges and metadata fit. If a plan name is extremely long (> 40 chars), it will wrap to 2 lines, increasing scroll distance slightly but remaining usable.

**[Risk] Modal buttons slightly off-screen at first render if content is tall**
→ *Mitigation*: Flex layout with `flex-1` on body ensures the footer is always positioned at the bottom of the modal. Initial render shows buttons; scrolling reveals content above.

**[Trade-off] Removing element wraps changes DOM structure slightly**
→ *Note*: We're adding wrapper divs for scroll areas, not removing semantics. `<h2>`, links, and form elements retain their roles and accessibility.

## Migration Plan

No database migrations, rollback strategy, or deployment orchestration needed. This is a client-side layout fix.

**Rollout**:
1. Update component files locally
2. Test on multiple viewports (375px, 640px, 1024px) and devices (iPhone SE, iPad)
3. Build and deploy as part of the regular release (no hotfix needed)
4. Monitor for reported layout issues in first 24-48 hours

**Rollback** (if needed):
- Revert the two component files to their previous versions
- Redeploy

## Open Questions

None. The requirements from the user story are clear, and Tailwind provides all necessary utilities for responsive layout without additional dependencies.
