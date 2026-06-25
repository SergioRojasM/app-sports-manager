## Why

Athletes accessing the portal on mobile devices encounter two critical UX blockers: the upcoming trainings list displays overlapping elements on narrow screens, and the plan subscription modal cannot be scrolled, making the purchase flow unreachable. These UI issues prevent users from completing intended actions on their primary devices.

## What Changes

1. **Upcoming Trainings section** (`InicioProximosEntrenamientos`): Refactor training row layout from fixed horizontal flex to responsive stacked layout on mobile / horizontal on desktop. Metadata (location, meeting point, org) now wraps gracefully instead of overflowing.

2. **Plan Subscription Modal** (`SuscripcionModal`): Restructure modal into fixed header + scrollable body + fixed footer. Content scrolls within viewport constraints while action buttons remain reachable. Applies to both step 1 (plan type selection) and step 2 (payment form).

## Capabilities

### New Capabilities
- None. This is a UI-only layout fix with no new data models, APIs, or capabilities.

### Modified Capabilities
- None. Data contracts and behavior remain unchanged — only presentation layout adapts to mobile viewports.

## Impact

**Code Changes**:
- `src/components/portal/inicio/InicioProximosEntrenamientos.tsx`: Flex layout refactoring (responsive breakpoints, flex-wrap, badge repositioning)
- `src/components/portal/planes/SuscripcionModal.tsx`: Modal structure refactoring (fixed header/footer, scrollable body, max-height constraints)

**No impact to**:
- Database schema or migrations
- API endpoints or server actions
- Data types or contracts
- Authentication or authorization
- Styling of individual elements (only layout)

## Non-Goals

- Redesigning the visual appearance of training cards or modal content
- Changing form field behavior or validation
- Adding new filtering, sorting, or display options
- Modifying which data is shown to users
- Handling edge cases beyond the scope of mobile responsiveness

## Files to be Modified or Created

| File | Type | Change |
|------|------|--------|
| `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` | Modify | Responsive row layout with `sm:` breakpoints and `flex-wrap` |
| `src/components/portal/planes/SuscripcionModal.tsx` | Modify | Modal restructure with fixed header/footer and scrollable body |

## Step-by-Step Implementation Plan

1. **Refactor InicioProximosEntrenamientos training row**:
   - Change outer Link container from `flex items-center gap-4` to `flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4`
   - Rearrange sub-elements for mobile-first layout (icon + title on top line, metadata below, badge repositioned)
   - Add `flex-wrap` to metadata row for line wrapping on narrow screens
   - Test on 375px, 390px, 640px, and 768px viewports

2. **Refactor SuscripcionModal structure**:
   - Wrap modal inner content in a flex column with max-height and overflow-y-auto
   - Keep title (`<h2>`) and error alert outside scroll area (fixed top)
   - Wrap step content in scrollable container with `flex-1 overflow-y-auto min-h-0`
   - Keep button row outside scroll area (fixed bottom)
   - Test on 375px × 667px and desktop viewports

3. **Verify responsive behavior**:
   - Confirm elements don't overlap on mobile
   - Confirm buttons are always reachable
   - Confirm no visual regression on larger screens
   - Verify modal backdrop remains fixed while content scrolls
