## Why

On mobile devices, the training calendar renders each training instance as a tiny `<button>` (10–12 px dot). These dot buttons intercept tap events meant to select/filter a day, causing users to accidentally open the training actions modal instead. Removing the click behavior from dots makes day-filtering reliable and unambiguous on all screen sizes.

## What Changes

- Convert training dot elements inside `EntrenamientosCalendar` from `<button>` to `<span>` (purely decorative, no click handler).
- Remove the `onOpenActions` prop from `EntrenamientosCalendarProps` — the calendar no longer triggers training-level actions.
- Remove `event.stopPropagation()` from dots (no longer needed as dots have no handler).
- Update dot `title` tooltip text to omit "(click: opciones)" / "(click: ver reservas)" references.
- Remove the `hover:scale-110` Tailwind class from dots (misleading affordance on a non-interactive element).
- Update `EntrenamientosPage` to stop passing `onOpenActions` to both `<EntrenamientosCalendar>` renders (desktop and mobile).

No database, service, hook, or routing changes.

## Capabilities

### New Capabilities
<!-- None — this is a UI-only simplification -->

### Modified Capabilities
- `training-management`: The calendar view interaction model changes — dots are no longer interactive. The day-cell click remains the sole calendar interaction. This is a behavioral requirement change for the calendar sub-component.

## Impact

- **Files changed**: 2
  - `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` — prop type + JSX
  - `src/components/portal/entrenamientos/EntrenamientosPage.tsx` — prop removal at call sites
- **No API changes**, no migrations, no hook changes.
- **TypeScript**: Removing `onOpenActions` from the prop type will cause a compile error at the call sites in `EntrenamientosPage` until the prop is also removed there — both files must be updated together.
- **Accessibility**: Dots become decorative `<span>` elements; no `role` or `tabIndex` should be added.

## Non-goals

- Removing action buttons from the training list (`EntrenamientosList`) — the list keeps its row actions.
- Adding any new interaction model to the calendar (e.g., long-press, swipe).
- Changing the visual appearance of dots beyond removing the hover scale effect.
- Modifying how `onOpenActions` works in any other component.
