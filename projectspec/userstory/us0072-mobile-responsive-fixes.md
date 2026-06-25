# US-0072 — Mobile Responsive Fixes for Upcoming Trainings and Plan Subscription Modal

## ID
US-0072

## Name
Mobile responsive layout fixes for home upcoming trainings section and plan subscription modal

## As a
User (athlete) accessing the portal on a mobile device

## I Want
The upcoming trainings section on the home dashboard and the plan type selection modal to render correctly on small screens

## So That
I can read my upcoming training details without overlapping elements and scroll through plan type options to complete a plan purchase on my phone

---

## Description

### Current State

**Upcoming Trainings section (`InicioProximosEntrenamientos`):**
- Each training row uses a horizontal `flex items-center gap-4` layout containing: a 40px icon, a content block, and a status badge — all on a single line.
- The metadata sub-row (location, meeting point, org name) uses `flex items-center gap-3` with no wrapping.
- On mobile viewports (< 640px), the icon, text content, and status badge compete for horizontal space, causing text truncation and visual overlap.
- There are no responsive breakpoints (`sm:`, `md:`, `lg:`) to adapt the layout for smaller screens.

**Plan subscription modal (`SuscripcionModal`):**
- The modal container uses `fixed inset-0 flex items-center justify-center` to vertically center.
- The modal body has `mx-4 w-full max-w-lg p-6` but no `max-height` or `overflow-y-auto`.
- Step 1 (plan type selection) renders all active plan types in a `grid gap-3` with no scroll constraint. When there are 3+ plan types, the content extends beyond the viewport on mobile devices.
- Step 2 (payment form) includes plan summary, payment method select, comments textarea, and file upload — also overflows on small screens.
- Users cannot scroll to reach the "Continuar" or "Confirmar" buttons, effectively blocking the purchase flow on mobile.

### Proposed Changes

#### 1. InicioProximosEntrenamientos — Mobile-Friendly Row Layout

**Row container** (`<Link>` element, currently line 59):
- Change from `flex items-center gap-4` to a responsive layout:
  - Mobile: stack the icon + title on one line, metadata below, and badge on its own row or beside the title.
  - Desktop (≥ `sm`): keep the current single-line layout.
- Suggested approach: wrap content + badge in a flex-col on mobile, flex-row on `sm:`.

**Metadata sub-row** (currently line 72):
- Add `flex-wrap` so location, meeting point, and org name wrap to a second line on narrow screens instead of overflowing.
- Consider hiding the decorative dot separator (`·`) when items wrap, or replace with a consistent separator strategy.

**Status badge** (currently line 91):
- On mobile, position the badge at the top-right of the row or inline with the training name rather than at the far right edge where it overlaps with the truncated text.

#### 2. SuscripcionModal — Scrollable Content Area

**Modal container** (currently line 145):
- Add `max-h-[90vh]` (or `max-h-[85dvh]` for mobile-safe dynamic viewport) and `overflow-y-auto` to the modal body so the content scrolls within the viewport.
- Alternative: split the modal into a fixed header (title) + scrollable body + fixed footer (buttons). This keeps the action buttons always visible.

**Recommended implementation** — fixed header/footer with scrollable body:
- Modal wrapper keeps current positioning.
- Title (`<h2>`) stays outside the scroll area (fixed top).
- Content area (plan type cards in step 1, form fields in step 2) gets `overflow-y-auto` with `max-h-[calc(85dvh-8rem)]` (subtracting header + footer height).
- Button row stays outside the scroll area (fixed bottom).

**Step 1 plan type list** (currently line 174):
- The `grid gap-3` container will naturally scroll within the new scrollable body.
- No structural change needed to individual plan type cards.

**Step 2 form** (currently line 248):
- Also scrolls within the same scrollable body area.
- No structural change needed to individual form fields.

---

## Database Changes

No database changes required. This is a UI-only fix.

---

## API / Server Actions

No API or server action changes required. This is a UI-only fix.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` | Refactor training row layout for mobile responsiveness: add responsive flex direction, flex-wrap on metadata, reposition status badge |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Add scrollable content area with max-height constraint, restructure into fixed header + scrollable body + fixed footer |

---

## Acceptance Criteria

1. On a 375px-wide viewport (iPhone SE), each training row in "Próximos Entrenamientos" displays all elements (icon, name, date, location, org, status badge) without any visual overlap or horizontal overflow.
2. On a 375px-wide viewport, the metadata line (location, meeting point, org name) wraps gracefully to a second line when there is not enough horizontal space.
3. On viewports ≥ 640px (`sm`), the upcoming trainings rows maintain a layout visually consistent with the current design (single horizontal row with icon, content, and badge).
4. The plan subscription modal is fully visible and scrollable on a 375px × 667px viewport (iPhone SE) when there are 4+ plan types in step 1.
5. The "Continuar" button in step 1 and the "Confirmar" button in step 2 are always reachable — either visible on screen or reachable by scrolling within the modal.
6. The modal backdrop remains fixed (not scrollable) while the modal body content scrolls.
7. On step 2 (payment form), all form fields (payment method select, comments textarea, file upload) are accessible and usable on a 375px-wide viewport.
8. Body scroll is prevented when the modal is open (no double-scroll between modal and page behind).
9. On desktop/larger viewports, both components render identically or near-identically to the current design — no visual regressions.
10. The training row remains a clickable `<Link>` with the same navigation target. The modal buttons retain their existing click handlers and disabled-state logic.

---

## Implementation Steps

- [ ] Open `InicioProximosEntrenamientos.tsx` and refactor the training row `<Link>` layout:
  - Change outer flex to column on mobile, row on `sm:` (e.g., `flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4`)
  - Add a top sub-row for icon + name + badge on mobile
  - Add `flex-wrap` to the metadata sub-row
- [ ] Test the upcoming trainings section on 375px, 390px, and 768px viewports — verify no overlap and graceful wrapping
- [ ] Open `SuscripcionModal.tsx` and restructure the modal body:
  - Add `max-h-[85dvh] flex flex-col` to the modal container
  - Keep the `<h2>` title and error alert outside the scroll area
  - Wrap step content in a `<div className="flex-1 overflow-y-auto min-h-0">` container
  - Keep the button row outside the scroll area (sticky footer)
- [ ] Test the modal on 375px × 667px viewport with 4+ plan types — verify scroll works and buttons are reachable
- [ ] Test the modal on desktop — verify no visual regression
- [ ] Verify that clicking the backdrop still closes the modal
- [ ] Verify that the file input and select elements work correctly inside the scrollable area on mobile

---

## Non-Functional Requirements

- **Security**: No changes — no new data access or RLS implications.
- **Performance**: No new queries or data changes. Tailwind utility classes add negligible CSS overhead.
- **Accessibility**: Ensure the modal remains keyboard-navigable (Tab through plan types → Continue → form fields → Confirm). The scrollable area should be reachable via keyboard. Training rows remain accessible `<Link>` elements with existing `aria-label`.
- **Error handling**: No change — existing error displays (duplicate guard, file validation, metodos-pago error) remain unaffected.
