## Context

`EntrenamientosPublicosPage.tsx` wraps its entire content in a `relative min-h-[80vh] rounded-3xl bg-landing-bg` container plus two `aria-hidden` blurred glow-blob `<div>`s. This renders inside the portal shell's `<main>` (`src/app/portal/layout.tsx`), which already sets `bg-navy-deep` on the outer `<div>`. The two backgrounds stack, producing a visible seam/double-background effect on this one page. No other route uses this pattern — it's local to this component.

This is a small, single-file, presentation-only change. It doesn't warrant a full architectural design, but a short doc is included per the workflow's `applyRequires` for `tasks`.

## Goals / Non-Goals

**Goals:**
- Remove the page-local background container and glow blobs from `EntrenamientosPublicosPage.tsx` so the page renders directly against the portal shell's `bg-navy-deep`.
- Preserve every other visual/behavioral element of the page unchanged (sticky header, filters drawer trigger, grid, loading/error states, reserva modal).

**Non-Goals:**
- Applying a new unified background to the rest of the app — deferred to a future US per the source User Story (US-0090).
- Touching `PublicTrainingCard.tsx` or `PublicTrainingFiltersDrawer.tsx` internal `bg-landing-bg` usages — those are card/drawer surface treatments, not the page's outer background, and are out of scope.
- Any data, hook, or service change — `useEntrenamientosPublicosMarketplace` and everything it returns is untouched.

## Decisions

- **Replace the wrapper `<div>` in place, don't extract a new component.** The change is a one-file className/JSX edit; introducing an abstraction (e.g., a `PageShell` wrapper component) would be premature for a single-use removal, especially since a future app-wide background US may replace this again.
- **Keep `relative` positioning on the new plain wrapper.** The sticky header (`sticky top-4 z-10`) and the reserva modal / filters drawer (rendered as children, some using `absolute`) rely on an ancestor for stacking context; dropping `relative` entirely could shift how absolutely-positioned children resolve, so the plain wrapper keeps `relative` without the `rounded-3xl`/`bg-landing-bg` styling.
- **Keep the existing padding scale (`px-6 pb-8 pt-3 md:px-10 md:pb-10 md:pt-4`) and `min-h-[80vh]`.** These affect layout/spacing, not background, and changing them is out of scope for this fix.

## Risks / Trade-offs

- **[Risk] Removing `rounded-3xl` context might make the sticky header's own `bg-landing-bg/40 backdrop-blur` panel look visually inconsistent against the plain `bg-navy-deep` backdrop.** → Mitigation: out of scope per the User Story, but call it out during manual verification (Acceptance Criteria #3 in US-0090); if it looks wrong, that becomes a follow-up, not a blocker for this narrow fix.
- **[Risk] Some absolutely-positioned child (filters drawer, reserva modal) could depend on the removed wrapper's specific stacking/overflow behavior (`overflow-hidden` on the blob container).** → Mitigation: the blob container only had `overflow-hidden` scoped to itself (`aria-hidden` decorative div), not the whole page; removing it doesn't affect the drawer/modal, which render as siblings, not descendants of the blob container. Verified by reading the component tree before editing.

## Migration Plan

Single JSX/className edit in `EntrenamientosPublicosPage.tsx`, no data migration. Deploy as a normal frontend change; rollback is a plain git revert if needed.
