## Context

`EntrenamientosCalendar` currently renders each training instance as a clickable `<button>` (a colored dot). Two competing tap targets exist on the same area:
1. The **dot button** — calls `onOpenActions(trainingId)`, opening the training actions modal.
2. The **day cell** (`<article>`) — calls `onSelectDate(dateKey)`, filtering the list below.

On mobile (< 400 px), dots are 10–12 px. Users frequently trigger the actions modal when they intend to filter the day. The fix is a pure UI simplification: dots become decorative, the day cell is the only interactive target.

## Goals / Non-Goals

**Goals:**
- Dots are non-interactive `<span>` elements — no `onClick`, no `tabIndex`, no `role="button"`.
- Day cell click is the single calendar interaction for all users.
- `onOpenActions` is removed from `EntrenamientosCalendarProps` entirely.
- No visual regression: dot colors, shapes (star/circle), and the legend remain unchanged.
- TypeScript compiles cleanly after the change.

**Non-Goals:**
- Changing dot visuals beyond removing the `hover:scale-110` affordance.
- Removing action buttons from `EntrenamientosList` (list rows keep their three-dot menus).
- Adding any new calendar interaction (long-press, swipe, expand-on-tap, etc.).
- Modifying `useEntrenamientos`, any service, or any database object.

## Decisions

### Decision 1: `<span>` over `<div>` for dots
Use `<span>` because the current element is inline inside a `flex` container of dot shapes. `<span>` is the most semantically neutral inline element. Both are acceptable, but `<span>` avoids the block-level box model of `<div>`.

### Decision 2: Keep `title` attribute on the dot `<span>`
Retain the `title` attribute on each `<span>` (containing training name + time) for mouse users who hover. Remove only the interaction cue text ("click: opciones"). This preserves discoverability without implying an action.

### Decision 3: Remove `hover:scale-110` from dots
A hover scale effect implies interactivity. Removing it is the correct accessibility and UX choice for a non-interactive element.

### Decision 4: Do NOT add `aria-hidden="true"` to dots
The `title` attribute provides useful tooltip information for sighted users. Making dots `aria-hidden` would suppress that. Since dots are `<span>` with no role, screen readers already treat them as presentational text flow — no explicit `aria-hidden` needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Both call sites in `EntrenamientosPage` (desktop + mobile renders) must be updated — missing one causes a TypeScript error | Update both in the same PR; run `tsc --noEmit` to verify |
| Removing click from dots may confuse users who learned the old behavior | The training list directly below the calendar retains full row actions; the UX is still complete |
| `hover:scale-110` removal is a visual change that may be noticed | Intentional — hover scale on a non-interactive element is a misleading affordance |
