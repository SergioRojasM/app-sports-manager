# Spec Delta

## MODIFIED Requirements

### Requirement: Right-side navigation drawer for small screens
Below 1024px, `PortalMobileDrawer` SHALL be opened by the `PortalHeader` hamburger. It SHALL render through `BodyPortal` as a `fixed inset-0 z-[60]` layer containing:
- a scrim (`bg-grit-bg/70 backdrop-blur-sm`) covering the viewport;
- a panel anchored to the **right** edge with `role="dialog"`, `aria-modal="true"`, `aria-label="Menú de navegación"`, width `336px` capped at `86vw`, height `100dvh`, and the v3 sidebar surface: a `grit-surface`→`grit-sidebar` vertical gradient, a 28px radius on its left corners, a white 10% left border and a left shadow.

The panel SHALL slide in from right to left (`translate-x-full` → `translate-x-0`, 200ms ease-out) and the scrim SHALL fade in. The drawer SHALL NOT be mounted until it is first opened. The close button SHALL be a 38px round icon button (white 4% fill, white 12% border).

#### Scenario: Drawer opens from the right
- **WHEN** the user taps the hamburger at 390px width
- **THEN** a panel SHALL slide in from the right edge toward the left, covering the right side of the screen, with a dimmed and blurred scrim over the rest

#### Scenario: Drawer above other content
- **WHEN** the drawer is open
- **THEN** it SHALL render above the header and page content (`z-[60]`) and below top-most rejection dialogs (`z-[70]`)

#### Scenario: Drawer matches the sidebar surface
- **WHEN** the drawer is open at 390px
- **THEN** the panel SHALL show the same gradient surface as the desktop sidebar, with rounded left corners and no cyan border
