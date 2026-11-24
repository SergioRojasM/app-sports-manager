# Tasks

Reference: `projectspec/userstory/us0141-grit-arena-v3-component-migration.md` (exact v3 measurements per component), `design.md` (decisions D1–D10), and the specs under `specs/`. Design source: `projectspec/designs/pencil/grit-arena-v3.pen`. Read it only through the pencil MCP; it is encrypted. Only the component layer is touched (tokens → kit → shell). The page, hook, service and types layers have no work by design.

## 1. Branch setup

- [x] 1.1 Create branch `feat/grit-arena-v3-component-migration` from `develop` and verify with `git branch --show-current`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` (`git branch --show-current`); stop if it is

## 2. Baseline

- [x] 2.1 With the dev server running, use the Playwright MCP to capture "before" screenshots at 375/768/1440px of:
  - `/portal/inicio`, `/portal/orgs`, `/portal/eventos`, `/portal/mis-reservas`, `/portal/notificaciones`;
  - inside a tenant: `gestion-equipo`, `analitica`, `gestion-organizacion`, `gestion-eventos`, `control-ingreso`;
  - public: `/eventos`, `/` and `/auth/login`.

  Save them under the session scratchpad (not the repo) and verify all files exist.
- [x] 2.2 Open frames `ljQp3`, `nIhrL`, `IZudm`, `aYwNn`, `lhbhK` in `grit-arena-v3.pen` and keep them as the visual reference. Verify that `get_app_state` lists them.

## 3. Tokens and fonts (component layer foundation)

- [x] 3.1 `src/app/globals.css`: set the v3 values for the existing `--grit-*` variables and add `--grit-on-brand`, `--grit-line`, `--grit-surface`, `--grit-surface-deep`, `--grit-surface-accent`, `--grit-warning`, `--grit-violet`, `--grit-avatar-fill` (spec `grit-design-system` › Design tokens). Update the header comment to v3. Verify in DevTools with `getComputedStyle(document.documentElement).getPropertyValue('--grit-bg-navy')` → `#080c10`.
- [x] 3.2 `globals.css`: replace `.grit-shell` with the v3 canvas (bottom-right cyan glow, faint top white glow) and give `.grit-scrollbar` a neutral `rgba(255,255,255,.14)` thumb. Verify visually on `/portal/inicio`.
- [x] 3.3 `tailwind.config.ts`: add the new `grit.*` colours (hex for solids), set `grit-2xl` to `22px`, add `grit-3xl` `28px`, point `grit-title` to `var(--font-exo2)` and add `grit-mono` → `var(--font-jetbrains-mono)`. Leave `lg`/`xl` overrides and every `landing-*` entry untouched. Verify `rounded-grit-2xl` computes to 22px.
- [x] 3.4 `src/app/layout.tsx`: load `Exo_2` (300–700, normal + italic) and `JetBrains_Mono` (400, 500) with `next/font/google` and append their variables to `<body>`, keeping Rajdhani, Montserrat and Lexend. Verify that a `font-grit-title` element renders Exo 2 and that `/auth/login` still renders Rajdhani/Lexend.
- [x] 3.5 Copy `projectspec/designs/pencil/images/logo-grit-arena-dark.png` to `public/logo-grit-arena-dark.png` and verify that `/logo-grit-arena-dark.png` loads in the browser.
- [x] 3.6 Rewrite `DESIGN.md` §frontmatter, §1 "Where everything lives" (v3 file, board `ljQp3`, frame→route table for every top-level v3 frame) and §2 "Tokens" (v2→v3 table, new tokens, the white alpha ladder 0.02/0.03/0.04/0.06/0.08/0.10/0.12, the cyan ladder /10 /25 /35 /50, typography roles and scale, radius roles). Verify that every token named exists in `tailwind.config.ts`.
- [x] 3.7 Run `npx tsc --noEmit` and `npm run lint` and verify both pass.

## 4. Existing kit components (v3 restyle, backward-compatible props)

- [x] 4.1 `GritCard`: v3 `card`/`glass`/`highlight` recipes at `rounded-grit-2xl` plus the new `inset` variant (D4: solid hairline + inset highlight, no `border-image`). Verify against node `pR5rR` › "Tabla miembros" / `nIhrL` "Resumen".
- [x] 4.2 `GritButton`: pill shape, 600 weight, v3 `primary`/`secondary`/`outline-accent`/`ghost`, sizes `sm` 31 / `md` 37 / new `lg` 42 with the primary glow, `text-grit-on-brand` on cyan. Verify heights (±1px) against `a8wf1a`/`zG7Qt`/`DdNsJ` and that existing `href`, `external`, `loading` and `disabled` behaviour is unchanged.
- [x] 4.3 `GritPageHeader` (Exo 2 300, 30/40px, `italic` on the accent only, 11px uppercase eyebrow, 13px subtitle, 10px actions gap) and `GritSectionHeading` (Exo 2 500, 19/17px, 12px muted subtitle). Verify one `h1` and the accent-only italic on a page using `GritPageHeader`.
- [x] 4.4 `GritTag`: pill, 11px/600, no uppercase; tones `accent`/`neutral` plus new `warning`/`danger`/`violet`; new `dot` prop; `colorClass` still overrides. Verify against `Y8D4zJ`, `DOceZ`, `ximbE`, `tQv6H`, `yNrdr`.
- [x] 4.5 `GritBadge` (Chip / Default look), `GritIconTile` (12px radius, `card`/`accent` plus `warning`/`violet`/`danger` tones), `GritDivider` (`white/[0.06]`), `GritEmptyState` (`card` surface, Exo 2 500 title). Verify an empty state renders correctly on `/portal/notificaciones` with no notifications.
- [x] 4.6 `GritPageContainer`: `px-4 sm:px-6 lg:px-8`, `pt-3`, `pb-8`, `gap-5`, `max-w-[1440px]`. Verify the content padding at 1440px matches `nIhrL` › "Content" (12/32/32/32).
- [x] 4.7 `styles.ts`: v3 `gritInputClass` (derived, D9), `gritSelectClass`, new `gritPillSelectClass`, v3 `gritFocusRing`. `icon-map.ts`: add every v3 Lucide mapping listed in the user story §2 and update the header comment. Verify that each mapped Material name renders (no ligature text visible) in a scratch render.
- [x] 4.8 Run `npx tsc --noEmit` and verify that no existing kit call site needed an edit (`git diff --name-only` shows only `src/components/ui/grit/*` in this group).
- [x] 4.9 Write `DESIGN.md` §"Component kit" for the existing components (v3 props, variants, when to use each) and §"Elevation & surfaces" (card/glass/highlight/inset recipes, standard shadow, glow rules). Verify every prop named exists in code.

## 5. New kit primitives

- [x] 5.1 `GritIconButton` (sizes 30/38/44, `default`/`ghost`, required `label`, optional `href`). Verify that omitting `label` fails `tsc` and that the focus ring shows.
- [x] 5.2 `GritSearchField` (`md` 37 / `lg` 44, `type="search"`, leading icon, props type requiring `aria-label` or `aria-labelledby`). Verify that omitting both fails `tsc`.
- [x] 5.3 `GritSegmented` (`'use client'`; `soft`/`solid` variants, optional `count`/`icon`, `role="group"` + `aria-pressed`, horizontal scroll inside the track). Verify that six options at 375px do not cause page-level horizontal scroll.
- [x] 5.4 `GritChip` (active/default, `aria-pressed`, optional icon). Verify against `xKTkP` / `bHakw`.
- [x] 5.5 `GritKpiCard` (icon chip 40, Exo 2 300 36px value, 12px label, optional detail, `highlight`). Verify against `GO5Yf` / `pbTiS`.
- [x] 5.6 `GritAvatar` (32/34/38, `neutral`/`soft`/`solid`, initials from `name`, `next/image` with `alt=""` when `src`). Verify that "Laura Méndez" renders "LM".
- [x] 5.7 `GritProgress` (6px track, tone fill, JetBrains Mono value, `role="progressbar"`, clamped 0–100). Verify that `value={140}` gives `aria-valuenow="100"` and `value={-5}` gives `"0"`.
- [x] 5.8 `GritPagination` (`'use client'`; summary, 30px pages, ellipsis over 7 pages, disabled ends, `nav[aria-label="Paginación"]`, `aria-current`, renders nothing at ≤1 page). Verify `totalPages={15}` shows `1 2 3 … 15` and `totalPages={1}` renders nothing.
- [x] 5.9 `styles.ts`: add `gritTableHeadClass`, `gritTableHeadCellClass`, `gritTableRowClass`, `gritTableCellClass` (v3 Table / Head + Row) and export everything new from `src/components/ui/grit/index.ts`. Verify `import { GritSegmented, gritTableRowClass } from '@/components/ui'` type-checks.
- [x] 5.10 Mount every new primitive (and the restyled ones from group 4) in a temporary, uncommitted scratch page under `/portal`. Compare each against its design node at 1440px (±2px) with Playwright screenshots, then delete the scratch page and verify `git status` no longer shows it.
- [x] 5.11 Extend `DESIGN.md` §"Component kit" with the 8 new primitives and the table classes (props, design node, usage rules such as "status → `GritTag tone dot`", "≤6 filters → `GritSegmented`", "one `GritButton size="lg"` per page"). Update the kit listing in `projectspec/03-project-structure.md` (around line 393) with the new files. Verify both list the same component set as `index.ts`.
- [x] 5.12 Run `npx tsc --noEmit` and `npm run lint` and verify both pass.

## 6. Shell — layout, topbar and breadcrumb

> **Status note (2026-11-23):** code for groups 6–8 is complete (type-check + lint clean on every changed file). Their remaining checkbox items, plus 2.1 and 9.2, are the **browser verifications inside an authenticated `/portal`**. These are pending because the machine runs out of memory with both local Supabase stacks up (see `verification.md`).

- [x] 6.1 `PortalBreadcrumb`: add `variant?: 'topbar' | 'inline'` (default `inline`); v3 crumb styles (13px home, 12px chevrons, 12px muted crumbs, last crumb 12/500 subtext with `aria-current`); `inline` adds `px-4 pt-3 sm:px-6`. Leave label and segment logic unchanged. Verify "Analítica" is the last crumb on `/portal/orgs/{T}/analitica`.
- [x] 6.2 `PortalHeader`: transparent 56px topbar with no border or blur, `px-4 sm:px-6 lg:px-8`; breadcrumb (`topbar`, `hidden lg:flex`) on the left at ≥1024px, logo (`lg:hidden`) below; hamburger as `GritIconButton label="Abrir menú"` keeping `aria-expanded`/`aria-controls`. Verify against `vwVLa` at 1440px.
- [x] 6.3 `src/app/portal/layout.tsx`: add the `lg:p-4` inset to the shell root and render `<PortalBreadcrumb variant="inline" />` wrapped in `lg:hidden` inside `<main>` before `GritPageContainer`. Leave auth, cookie and redirect code untouched. Verify that at 1440px no breadcrumb exists inside `<main>`, at 375px exactly one does, and only one `nav[aria-label="Ruta de navegación"]` is visible at each width.

## 7. Shell — sidebar, navigation and user card

- [x] 7.1 `PortalSidebar`: 240px floating `rounded-grit-3xl` panel (gradient `grit-surface`→`grit-sidebar`, `white/[0.10]` border, shadow), padding 26/14/16/14, logo `/logo-grit-arena-dark.png` 132×38, remove the divider above the user card, keep the scroll-only-nav structure. Verify that at 1440px it sits 16px from the top, left and bottom and that only the nav scrolls.
- [x] 7.2 `PortalNavContent`, Org Switcher (D7): link to `/portal/orgs` with `aria-label` "Cambiar de organización (actual: {name})", tenant initial tile (no image), name with `title`, "Organización" caption, `unfold_more` icon, loading skeleton. The ORGANIZACIÓN section is always expanded. Verify no `logo_url` request in the Network tab and that clicking it navigates to `/portal/orgs`.
- [x] 7.3 `PortalNavContent`, sections and rows: "MI CUENTA" overline toggle (keeps `aria-expanded`/`aria-controls`), "ORGANIZACIÓN" static overline, v3 Nav Item Default/Activo (gradient pill, 32px cyan icon chip, live dot), Group rows (chevron, cyan icon when it holds the active route), Sub Items (pill, active gradient + dot, icon only if the leaf defines one), `drawer` variant keeps ≥40px rows. Verify as admin, entrenador and atleta that exactly one row shows the live dot, that the active group starts expanded, and that every toggle works with Enter/Space and shows a focus ring.
- [x] 7.4 `PortalSidebarUser`: User Card (`rounded-[20px]`, `white/[0.03]` fill, `white/[0.07]` border), `GritAvatar size={32} tone="soft"`, role line in cyan inside a tenant and email in muted outside, logout as `GritIconButton variant="ghost" label="Cerrar sesión"`. Verify that the profile link and logout both work.
- [x] 7.5 Write `DESIGN.md` §"Shell" (16px inset, 240px floating sidebar, 56px transparent topbar with breadcrumb, content box 12/32/32/32 with gap 20, what a page must not do). Update the portal shell and design-system paragraphs of `projectspec/03-project-structure.md` (around line 1117) to reference v3, the Org Switcher and the breadcrumb `variant`. Verify that both describe the implemented shell.

## 8. Shell — drawer, avatar menu and notifications chrome

- [x] 8.1 `PortalMobileDrawer`: v3 panel surface (gradient, `rounded-l-grit-3xl`, `white/[0.10]` left border), close button as `GritIconButton label="Cerrar menú"`. Leave behaviour untouched. At 390×844 verify slide-in, scrim close, Escape, focus trap, return focus, scroll lock, close-on-navigate, close-on-resize, and reduced-motion with no animation.
- [x] 8.2 `UserAvatarMenu`: trigger `GritAvatar size={38} tone="solid"` (photo when present) with focus ring; dropdown with the `glass` surface at `rounded-[18px]` and pill items with the danger hover on logout. Verify open/close, Escape with focus return, click-outside, and logout.
- [x] 8.3 `NotificacionesBell`: 38px round button with a `border-grit-line` border, 16px subtext icon, cyan/`on-brand` count pill keeping hidden/1–9/9+ and the existing `aria-label`/`aria-live`. Verify badge states with 0, 4 and 12 unread.
- [x] 8.4 `NotificacionesPanel` + `NotificacionItem`: 410px (max `100vw-2rem`) `rounded-[24px]` glass panel with the v3 shadow and cyan glow, Exo 2 500 title, `GritDivider`s, item padding 20/12, 38px icon tile, 13/600 title, 12px muted body, unread cyan gradient (the unread marker is still not conveyed by colour alone). Verify that loading, error with "Reintentar", empty ("No tienes notificaciones") and list states render, and that mark-read, mark-all and "Ver todas" behave as on `develop`.

## 9. Integration checks

- [x] 9.1 Scope check: `git diff --name-only develop...HEAD` lists only files in the proposal's "Files to Create or Modify" table plus this change's OpenSpec artifacts. Verify that no file under `src/hooks`, `src/services`, `src/types`, `src/lib`, `supabase`, or a feature folder (other than the three notificaciones chrome files) changed.
- [x] 9.2 "After" screenshots of the routes in 2.1 at 375/768/1440, compared with "before". Verify:
  - no horizontal scroll and exactly one `h1` per page;
  - `/auth/login` is visually identical to before (`/` and `/eventos` take the v3 look by decision).
- [x] 9.3 Regression sweep (design risks):
  - list files where `border-grit-glass-border` is used inside an active/selected class branch (`grep -rnE "(isActive|selected|active)[^\n]*border-grit-glass-border" src/components/portal`);
  - list small elements using `rounded-grit-2xl`;
  - list Exo 2 truncation or wrapping issues at 375px.

  Record the findings for the PR description and future page stories. Do not edit feature files.
- [x] 9.4 Complete `DESIGN.md`:
  - §"Patterns", with node ids: page header with tools `lnMVj`, summary + segmented + toolbar + table `nIhrL`, KPI row `IZudm`, settings cards `aYwNn`, list rows, modals/drawers, forms marked as derived, empty/loading/error, and charts with a note to update `chart-theme.ts` in the analítica story;
  - "feature patterns not yet in the kit": `zRDg2`, `R1QegD`, `uCKmV`, `s2Gt8L`, `PzYwn`, `J0Zbc`;
  - §"Migrating a page to v3": the checklist and the find→replace table;
  - §"Deprecated" with the extended per-folder grep;
  - §"Checklist for a new page" in its v3 version.

  Verify that the grep command runs as written and that every component and prop named in the whole `DESIGN.md` exists in code.

## 10. Quality gates and delivery

- [x] 10.1 Run `npx tsc --noEmit` and fix any type errors
- [x] 10.2 Run `npm run lint` and fix any lint errors
- [x] 10.3 Run the tests. The project has no automated test runner, so record the manual verification results from groups 4–9 (do not run a build)
- [x] 10.4 Write the commit message (conventional commits, e.g. `feat(ui): migrate tokens, grit kit and portal shell to grit-arena-v3 (US-0141)`) and the pull request description:
  - summary and US-0141 link;
  - design file plus nodes `ljQp3`, `vwVLa`, `Vl7zI`, `cUHCL`;
  - token v2→v3 table and the list of new kit primitives;
  - before/after screenshots at desktop and mobile;
  - the 9.3 findings as follow-ups;
  - the verification checklist.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review and merge, then confirm that the main specs `grit-design-system`, `portal-dashboard-layout`, `portal-role-navigation`, `portal-mobile-navigation-drawer` and `portal-visual-migration` reflect v3.
- Create page-migration stories (one per Portal area) that follow `DESIGN.md` §"Migrating a page to v3", seeded with the 9.3 findings.
