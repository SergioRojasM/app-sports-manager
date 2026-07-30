## 1. Branch Setup

- [x] 1.1 Create a new git branch: `fix/calendar-dots-filter-only`
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop`

## 2. Update EntrenamientosCalendar Component

- [x] 2.1 In `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` — remove `onOpenActions: (trainingId: string) => void` from the `EntrenamientosCalendarProps` type
- [x] 2.2 Remove `onOpenActions` from the destructured props in the `EntrenamientosCalendar` function signature
- [x] 2.3 Replace the dot `<button>` element with a `<span>` — remove `type="button"`, `onClick` handler, and `event.stopPropagation()` call
- [x] 2.4 Remove the `hover:scale-110` Tailwind class from the dot element (non-interactive affordance)
- [x] 2.5 Update the `title` attribute text on the dot `<span>` — remove "(click: opciones)" and "(click: ver reservas)" suffixes; keep training name and time only

## 3. Update EntrenamientosPage Call Sites

- [x] 3.1 In `src/components/portal/entrenamientos/EntrenamientosPage.tsx` — remove `onOpenActions={openActionModal}` from the desktop `<EntrenamientosCalendar>` render
- [x] 3.2 Remove `onOpenActions={openActionModal}` from the mobile `<EntrenamientosCalendar>` render (second usage)

## 4. Verify

- [x] 4.1 Run `npx tsc --noEmit` and confirm zero TypeScript errors
- [ ] 4.2 Manually test on desktop: click a training dot — confirm no modal opens; click a day cell — confirm day is selected and list filters
- [ ] 4.3 Test on mobile emulation (375 px): tap a day cell that contains dots — confirm day is consistently selected without triggering any modal

## 5. Commit and PR

- [x] 5.1 Stage changes and create commit: `fix: remove click action from calendar dots, keep day-filter only`
- [ ] 5.2 Write pull request description:
  - **Problem**: On mobile, tiny training dot buttons (~12 px) intercept taps meant to filter a day, opening the actions modal instead.
  - **Solution**: Converted dot `<button>` → `<span>` in `EntrenamientosCalendar`; removed `onOpenActions` prop entirely. Day cell click is now the sole calendar interaction.
  - **Files changed**: `EntrenamientosCalendar.tsx`, `EntrenamientosPage.tsx`
  - **Testing**: Verified TypeScript compiles; tested desktop + mobile emulation manually.
