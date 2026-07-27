# US-0090 — Remove Duplicate Background Container from Public Trainings Page

## ID
US-0090

## Name
Remove Duplicate Background Container from Public Trainings Page

## As a
Athlete/user browsing `/portal/entrenamientos-publicos`

## I Want
The public trainings marketplace page to blend with the app's shell background instead of painting its own background panel on top of it

## So That
I don't see a visible "background on top of background" seam (double background) when viewing the page, and the page's visual style stays consistent with the rest of the portal until a future, app-wide background redesign is applied

---

## Description

### Current State
`EntrenamientosPublicosPage` ([src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx](../../src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx)) wraps its entire content in a large decorative container:

```tsx
<div className="relative min-h-[80vh] rounded-3xl bg-landing-bg px-6 pb-8 pt-3 md:px-10 md:pb-10 md:pt-4">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
    <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-landing-primary/10 blur-[120px]" />
    <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-landing-primary-dark/10 blur-[120px]" />
  </div>
  ...
</div>
```

This container paints its own `bg-landing-bg` fill plus two large blurred glow blobs, all rendered *inside* the portal shell's `<main>`, which itself sits on `bg-navy-deep` (set in [src/app/portal/layout.tsx:46](../../src/app/portal/layout.tsx#L46)). The result is a visible "fondo sobre fondo" (background-on-background) effect: a rounded, differently-colored panel floating over the app's own background, instead of the page content sitting flush against it.

A future US will apply a unified landing-style background to the entire app shell (not just this page). This story only removes the page-local duplicate background container; it does not add any new background styling.

### Proposed Changes
- Remove the outer decorative wrapper `<div>` (the `rounded-3xl bg-landing-bg ... min-h-[80vh]` container) and its two `aria-hidden` glow-blob `<div>`s from `EntrenamientosPublicosPage.tsx`.
- Replace it with a plain layout wrapper that keeps only structural/spacing concerns (padding, min-height for consistent scroll behavior) and **no background color, no rounded panel, and no decorative blur blobs**. The page must render directly against the portal shell's existing `bg-navy-deep` background — i.e., "deja solo el fondo de la app."
- Keep all other existing behavior unchanged:
  - The sticky filter header (title, `SessionsAvailableWidget`, "Filtrar" button) — its own `bg-landing-bg/40 backdrop-blur` styling stays as-is (out of scope; only the outer full-page container is being touched). If in doubt, verify visually that removing the outer background does not leave the sticky header looking mismatched; if it does, that's still out of scope for this story since the header treatment is a separate visual element, not the page's outer background container.
  - Loading state, error state, and `PublicTrainingsGrid` rendering.
  - `PublicTrainingFiltersDrawer` and `PublicTrainingReservaModal` remain unchanged (they are not part of the removed container and keep their own `bg-landing-bg` panel styling, since they are overlay/drawer surfaces, not the page background).
- No changes to `PublicTrainingCard.tsx` or `PublicTrainingFiltersDrawer.tsx` — their internal `bg-landing-bg` usages are for card/drawer surfaces, not the page-level duplicate background, and are explicitly out of scope.

---

## Database Changes
None. This is a UI-only change.

---

## API / Server Actions
None. This is a UI-only change.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | Remove the outer `rounded-3xl bg-landing-bg` wrapper `<div>` and its two glow-blob decorative `<div>`s; replace with a plain structural wrapper (spacing/min-height only, no background/rounded/blur styling) |

---

## Acceptance Criteria

1. On `/portal/entrenamientos-publicos`, the page no longer renders a `bg-landing-bg`-colored rounded panel behind its content — the page background is the portal shell's `bg-navy-deep` (from `src/app/portal/layout.tsx`), visible directly behind the page content.
2. The two decorative blurred glow-blob `<div>`s (`bg-landing-primary/10 blur-[120px]` and `bg-landing-primary-dark/10 blur-[120px]`) are removed from `EntrenamientosPublicosPage.tsx`.
3. The sticky filter header (title + `SessionsAvailableWidget` + "Filtrar" button) still renders and remains sticky/functional; its own inline styling is unchanged.
4. The "Filtrar" button still opens `PublicTrainingFiltersDrawer`, and the drawer's own background styling is unchanged.
5. Loading state, error state (with "Reintentar"), and the populated `PublicTrainingsGrid` all continue to render correctly with no visual regression other than the removed outer container.
6. Clicking "Reservar" on a card still opens `PublicTrainingReservaModal` unchanged.
7. No other page/route's background is affected — the change is scoped to `EntrenamientosPublicosPage.tsx` only.
8. No TypeScript, lint, or build errors are introduced.

---

## Implementation Steps

- [ ] Edit `EntrenamientosPublicosPage.tsx`: remove the outer `bg-landing-bg`/`rounded-3xl`/glow-blob wrapper, replacing it with a plain `<div>` that only keeps spacing (`px-6 pb-8 pt-3 md:px-10 md:pb-10 md:pt-4`) and `relative` positioning needed for the sticky header and any absolutely-positioned children
- [ ] Verify the sticky header, filters drawer, grid, and reserva modal all still render/function correctly (no JSX structure breakage from removing the wrapping div)
- [ ] Run the app locally and visually confirm the page now sits directly on the portal's `bg-navy-deep` background with no duplicate background panel or glow blobs
- [ ] Run typecheck/lint to confirm no errors introduced

---

## Non-Functional Requirements

- **Security**: None — no data access or auth logic touched.
- **Performance**: Slightly reduces DOM/paint cost by removing two large blurred decorative elements.
- **Accessibility**: No change in tab order or ARIA; the removed blobs were already `aria-hidden="true"` and non-interactive.
- **Error handling**: No change — existing loading/error UI is preserved as-is.
