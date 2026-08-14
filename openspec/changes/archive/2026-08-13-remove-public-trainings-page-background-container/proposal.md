## Why

The public trainings marketplace page (`/portal/entrenamientos-publicos`) wraps its content in a decorative `rounded-3xl bg-landing-bg` panel with two blurred glow blobs. This container renders inside the portal shell's `<main>`, which already sits on `bg-navy-deep` (`src/app/portal/layout.tsx`). The result is a visible "background on top of background" seam. The fix is scoped now (remove the page-local duplicate background) because a future, separate US will apply a unified landing-style background across the whole app shell — that broader redesign should not be blocked by or conflated with this narrow visual cleanup.

## What Changes

- Remove the outer decorative wrapper `<div>` (`relative min-h-[80vh] rounded-3xl bg-landing-bg ...`) and its two `aria-hidden` glow-blob `<div>`s from `EntrenamientosPublicosPage.tsx`.
- Replace it with a plain structural wrapper that keeps only spacing/positioning (padding, `relative` for the sticky header and modals) — no background color, no rounded panel, no blur blobs.
- No behavior, data, or other component changes. The sticky filter header, `PublicTrainingFiltersDrawer`, `PublicTrainingCard`, and `PublicTrainingReservaModal` keep their own existing styling untouched — they are overlay/card surfaces, not the page-level background, and are explicitly out of scope.

## Capabilities

### New Capabilities
- `presentation-updates`: Presentation-layer-only requirements (no data/API/behavior changes) — same bucket used by the prior `mobile-responsive-fixes` change for layout/visual-only fixes without a landed capability spec of their own.

### Modified Capabilities
None — this does not change any observable requirement of the (not-yet-archived) `public-training-marketplace` capability: the page still renders at the same route, same data, same filters, same booking flow. Only the decorative outer background container is removed.

## Impact

- **Affected code**: `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` only (outer wrapper markup).
- **Affected systems**: None — UI-only, no API/DB/service changes.
- **Dependencies**: None.
- **Risk**: Low. Purely a JSX/className change; verified visually that the sticky header, filters drawer, grid, and reserva modal continue to function unchanged.
