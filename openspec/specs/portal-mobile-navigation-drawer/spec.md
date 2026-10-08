# portal-mobile-navigation-drawer Specification

## Purpose
Defines the right-side navigation drawer shown below 1024px in the Portal shell: how it opens over the page, its full-height layout with an internal scroll region, background scroll lock, close triggers, focus management and reduced-motion behaviour (US-0138).

## Requirements
### Requirement: Right-side navigation drawer for small screens
Below 1024px, `PortalMobileDrawer` SHALL be opened by the `PortalHeader` hamburger. It SHALL render through `BodyPortal` as a `fixed inset-0 z-[60]` layer containing:
- a scrim (`bg-grit-bg/70 backdrop-blur-sm`) covering the viewport;
- a panel anchored to the **right** edge with `role="dialog"`, `aria-modal="true"`, `aria-label="Menú de navegación"`, width `336px` capped at `86vw`, height `100dvh`, `bg-grit-bg` fill, `grit-glass-border` left border, and a left shadow.

The panel SHALL slide in from right to left (`translate-x-full` → `translate-x-0`, 200ms ease-out) and the scrim SHALL fade in. The drawer SHALL NOT be mounted until it is first opened.

#### Scenario: Drawer opens from the right
- **WHEN** the user taps the hamburger at 390px width
- **THEN** a panel SHALL slide in from the right edge toward the left, covering the right side of the screen, with a dimmed and blurred scrim over the rest

#### Scenario: Drawer above other content
- **WHEN** the drawer is open
- **THEN** it SHALL render above the header and page content (`z-[60]`) and below top-most rejection dialogs (`z-[70]`)

### Requirement: Drawer layout and scrolling
The drawer panel SHALL be a vertical layout with three parts:
- a fixed header row: logo, and a 38px close button with icon `close` and `aria-label="Cerrar menú"`;
- a scroll region (`flex-1 min-h-0 overflow-y-auto overscroll-contain grit-scrollbar`) rendering `PortalNavContent variant="drawer"`;
- a fixed footer: `GritDivider` and `PortalSidebarUser`.

A bottom fade overlay SHALL be shown while the scroll region can still scroll down. While the drawer is open, `document.body` and `<main id="portal-main">` SHALL NOT scroll, and their overflow SHALL be restored on close. Drawer touch targets SHALL be at least 40px tall.

#### Scenario: All items reachable on a short screen
- **WHEN** an administrator opens the drawer at 390×844 and expands every group
- **THEN** every item, including Analítica, SHALL be reachable by scrolling the drawer's navigation region, while the header row and user footer remain visible

#### Scenario: Background does not scroll
- **WHEN** the drawer is open and the user swipes over it
- **THEN** the page behind SHALL NOT scroll

#### Scenario: Overflow restored
- **WHEN** the drawer closes
- **THEN** the page SHALL scroll normally again

### Requirement: Drawer close triggers
The drawer SHALL close when:
- the close button is clicked;
- the scrim is clicked;
- `Escape` is pressed;
- any navigation link inside it is clicked, or the pathname changes;
- the viewport becomes ≥1024px.

#### Scenario: Close on scrim
- **WHEN** the user taps the scrim
- **THEN** the drawer SHALL close

#### Scenario: Close on Escape
- **WHEN** the drawer is open and the user presses Escape
- **THEN** the drawer SHALL close

#### Scenario: Close on navigation
- **WHEN** the user taps "Mis Reservas" in the drawer
- **THEN** the app SHALL navigate to `/portal/mis-reservas` and the drawer SHALL close

#### Scenario: Close on resize to desktop
- **WHEN** the drawer is open and the viewport is resized to 1280px
- **THEN** the drawer SHALL close and the desktop sidebar SHALL be visible

### Requirement: Drawer focus management and motion
On open, focus SHALL move to the close button. Tab and Shift+Tab SHALL cycle only through focusable elements inside the panel. On close, focus SHALL return to the hamburger button. The hamburger SHALL reflect the state in `aria-expanded`. With `prefers-reduced-motion: reduce`, the drawer SHALL appear and disappear without the slide transition.

#### Scenario: Focus on open
- **WHEN** the drawer opens
- **THEN** the close button SHALL have focus

#### Scenario: Focus trapped
- **WHEN** focus is on the last focusable element in the drawer and the user presses Tab
- **THEN** focus SHALL move to the first focusable element in the drawer

#### Scenario: Focus returned
- **WHEN** the drawer closes
- **THEN** focus SHALL return to the hamburger button and its `aria-expanded` SHALL be `false`

#### Scenario: Reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` and opens the drawer
- **THEN** the panel SHALL appear without a slide animation

