# US-0057 — Remove Training Actions from Calendar Dots (Filter by Day Only)

## ID
US-0057

## Name
Remove per-training action trigger from calendar dots; keep day-filter click only

## As a
Any portal user (administrador, entrenador, atleta)

## I Want
Calendar training dots to be non-clickable visual indicators only, with the entire day cell remaining the sole interactive target

## So That
Selecting a day in the calendar — especially on mobile — is easier and unambiguous, avoiding mis-taps on tiny dot buttons that open training actions instead of filtering the day

---

## Description

### Current State
`EntrenamientosCalendar` renders each training as a `<button>` element (the colored dot). Clicking a dot calls `onOpenActions(trainingId)` and the event is stopped from propagating to the parent day cell. The day cell itself also calls `onSelectDate(dateKey)` when clicked. This creates two competing tap targets on the same area:
- Tapping a small dot → opens training actions (edit, delete, reservas, etc.)
- Tapping the cell background → selects/filters the day

On mobile, dots are 10–12 px, making it nearly impossible to reliably tap the cell without accidentally hitting a dot. Users who want to filter a day often end up triggering the actions menu instead.

### Proposed Changes
1. **Convert dots from `<button>` to `<span>` (or inert `<div>`)** inside `EntrenamientosCalendar`. They keep all current visual styling (color, shape, star clip-path for public, ring for private) but become purely decorative.
2. **Remove the `onOpenActions` prop** from `EntrenamientosCalendarProps` entirely. No click handler is attached to individual dots.
3. **Day cell `onClick`** continues to call `onSelectDate(dateKey)` unchanged — the full cell area is now the only tap target.
4. **Update `EntrenamientosPage`** to stop passing `onOpenActions` to `EntrenamientosCalendar`. The `openActionModal` function stays for the list view (`EntrenamientosList`) and is not removed from the page.
5. **Update `title` / `aria-label` attributes** on dots: remove references to "(click: opciones)" or "(click: ver reservas)" since dots are no longer interactive. Keep the tooltip text describing the training name and time for accessibility (using `title` on the `<span>`).

No database changes, no service changes, no routing changes.

---

## Database Changes
None.

---

## API / Server Actions
None.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` | Remove `onOpenActions` prop; convert dot `<button>` to `<span>`; remove `event.stopPropagation()` and click handler on dots; update `title` text |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Remove `onOpenActions` prop from both `<EntrenamientosCalendar>` usages (desktop and mobile calendars) |

---

## Acceptance Criteria

1. Clicking a colored dot in the calendar does **not** open a training actions modal or any overlay.
2. Clicking anywhere on a day cell (including on top of a dot) triggers `onSelectDate` and the day is highlighted as selected.
3. Dots remain visually unchanged: correct discipline color, star shape for public trainings, circle shape for private trainings.
4. The `onOpenActions` prop no longer exists in `EntrenamientosCalendarProps`; TypeScript compilation succeeds with no errors.
5. `EntrenamientosPage` compiles without passing `onOpenActions` to `<EntrenamientosCalendar>`.
6. The training list below the calendar (`EntrenamientosList`) still shows action buttons per row — only the calendar dots lose their click handler.
7. Dot tooltips (`title` attribute) still show training name and time but do not mention "click" interaction.
8. On a mobile viewport (375 px wide), tapping any part of a day cell that has dots consistently selects that day without triggering unintended navigation.

---

## Implementation Steps

- [ ] In `EntrenamientosCalendar.tsx`: remove `onOpenActions` from the `EntrenamientosCalendarProps` type and from the destructured props.
- [ ] In `EntrenamientosCalendar.tsx`: replace the dot `<button>` element with a `<span>` (or `<div>`); remove the `onClick` handler, `event.stopPropagation()`, and the `type="button"` attribute.
- [ ] In `EntrenamientosCalendar.tsx`: update the `title` text on the dot to remove the "(click: opciones)" / "(click: ver reservas)" suffixes.
- [ ] In `EntrenamientosCalendar.tsx`: remove the `hover:scale-110` transition class from the dot since it is no longer interactive (optional: keep if desired for aesthetics, but it can be misleading on non-interactive elements — remove for clarity).
- [ ] In `EntrenamientosPage.tsx`: remove the `onOpenActions={openActionModal}` prop from both `<EntrenamientosCalendar>` renders (desktop and mobile).
- [ ] Run `tsc --noEmit` to confirm no TypeScript errors.
- [ ] Manually test on a desktop browser: verify dot click does nothing and day cell click filters correctly.
- [ ] Manually test on a mobile browser / DevTools mobile emulation: verify day-tap reliability.

---

## Non-Functional Requirements

- **Security**: No RLS changes required. No new data exposure.
- **Performance**: No new queries or data fetching. Change is purely presentational.
- **Accessibility**: Dots converted to `<span>` must not have `role="button"` or `tabIndex` attributes. They are decorative; if `aria-hidden="true"` is added, the parent cell's accessible label should still convey the presence of trainings (via day number and existing cell structure). The `title` attribute on the `<span>` still provides a hover tooltip for sighted mouse users.
- **Error handling**: Not applicable — no async operations involved.
