## 1. Branch Setup

- [x] 1.1 Create a new branch named `fix/remove-public-trainings-page-background-container`
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making changes

## 2. Component

- [x] 2.1 In `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx`, remove the outer wrapper `<div>` classes `rounded-3xl bg-landing-bg` (keep `relative` and the existing spacing/`min-h-[80vh]` classes) so the page no longer paints its own background panel
- [x] 2.2 Remove the two `aria-hidden="true"` decorative glow-blob `<div>`s (`bg-landing-primary/10 blur-[120px]` and `bg-landing-primary-dark/10 blur-[120px]`) and their wrapping `pointer-events-none absolute inset-0 overflow-hidden rounded-3xl` container
- [x] 2.3 Confirm the sticky header, filters drawer, grid, and reserva modal JSX remain structurally intact as children of the (now plain) wrapper — no other markup changes

## 3. Verification

- [x] 3.1 Run `tsc`/lint to confirm no type or lint errors were introduced
- [x] 3.2 Start the dev server and visually verify `/portal/entrenamientos-publicos` renders directly against the portal shell's `bg-navy-deep` background, with no `bg-landing-bg` panel or blurred glow blobs behind the content
- [x] 3.3 Manually verify the sticky header stays sticky and the "Filtrar" button still opens `PublicTrainingFiltersDrawer`
- [x] 3.4 Manually verify loading, error (with "Reintentar"), and populated states of `PublicTrainingsGrid` still render correctly
- [x] 3.5 Manually verify clicking "Reservar" on a card still opens `PublicTrainingReservaModal` and the booking flow works
- [x] 3.6 Visually confirm the sticky header's own `bg-landing-bg/40 backdrop-blur` panel still reads acceptably against the plain `bg-navy-deep` backdrop (note as a follow-up if not — out of scope for this fix per US-0090)

## 4. Wrap-up

- [x] 4.1 Write commit message and pull request description summarizing the removal of the duplicate background container on the public trainings marketplace page
