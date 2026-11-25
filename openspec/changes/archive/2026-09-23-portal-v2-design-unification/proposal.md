## Why

The Portal currently mixes two visual systems. `entrenamientos-publicos` uses the v2 look (cyan `#14DBC4`, Rajdhani/Montserrat, glass surfaces). Around 130 other Portal files still use the legacy look (turquoise `#00E5C4`, `.glass-card`, `navy-deep`, Lexend). On top of that, the public training detail page (`/entrenamientos-publicos/[id]`) drifts from its design node `OyIqr` in `projectspec/designs/pencil/grit-arena-v2.pen`: pill-shaped buttons, and 48 px card radii caused by the `borderRadius.lg/xl` overrides in `tailwind.config.ts`. Source: **US-0116** (`projectspec/userstory/us0116-portal-v2-design-unification.md`).

This change makes the whole Portal, and the public detail page, one visual language taken 1:1 from `grit-arena-v2.pen`, delivered through a shared component kit. **It is visual-only.** No routes, link targets, data fetching, booking logic or permissions change. The Portal-scoped detail route is US-0117.

## What Changes

- **Design tokens**: add a `--grit-*` CSS variable family (mirrors the `.pen` variables), Tailwind `colors.grit.*`, `font-grit-title` / `font-grit-body`, named radii `rounded-grit-{xs,sm,md,lg,xl,2xl}`, and a `.grit-shell` background with glows. The legacy Portal tokens are marked deprecated. The `borderRadius.lg/xl` overrides are left untouched because auth and landing pages depend on them.
- **Shared UI kit** `src/components/ui/grit/`: `GritCard`, `GritTag`, `GritBadge`, `GritButton`, `GritIconTile`, `GritInfoRow`, `GritSectionHeading`, `GritPageHeader`, `GritPageContainer`, `GritDivider`, `GritIcon`, `GritEmptyState`, plus `icon-map.ts` (Lucide → Material Symbols) and `styles.ts` (input classes). Adds the helper `src/lib/portal/disciplina-visual.ts` (discipline → icon/color).
- **Public training detail**: rebuild every section against `OyIqr` with the kit; extract `PublicTrainingDetalleBody`, `PublicTrainingDetalleCtaBanner` and `PublicTrainingDetalleStates` (pure refactor). **The current landing `Header` and `Footer` are kept unchanged.** Only the content between them is restyled. The "Volver" link is kept but restyled into the breadcrumb row.
- **Portal shell**: `portal/layout.tsx` moves to `.grit-shell` + Montserrat. `PortalHeader`, `PortalNavMenu`, `UserAvatarMenu` and `RoleBasedMenu` are restyled to the v2 Navbar. `PortalBreadcrumb` moves out of the header into its own row, now visible on mobile too (wrapping), with new slug labels only. `<main>` drops `p-6`, and pages own their padding via `GritPageContainer`.
- **Module migration**: every Portal module moves to `grit-*` tokens and the kit, in groups (a)–(f). At the end, the Portal-only deprecated tokens are removed if unused.

## Capabilities

### New Capabilities
- `grit-design-system`: v2 design tokens (colors, fonts, radii, shell background) and the shared `ui/grit` component kit, with their exact visual contracts.
- `public-training-detail-visual`: visual layout of the `/entrenamientos-publicos/[id]` content per design node `OyIqr` (breadcrumb and sections), keeping the current landing `Header`/`Footer`, with navigation and behavior unchanged.
- `portal-visual-migration`: every `/portal/*` screen uses only `grit-*` tokens and kit components (no legacy tokens, no `rounded-lg/xl`).

### Modified Capabilities
- `portal-dashboard-layout`: the "Visual design aligned with dashboard.html" requirement is replaced by alignment with `grit-arena-v2.pen`. The "breadcrumb hidden on mobile" requirement is replaced by a standalone breadcrumb row below the header that wraps on mobile. The "Fixed top header" requirement gains the v2 Navbar styling.

## Non-goals

- The Portal detail route `/portal/entrenamientos-publicos/[id]`, the Portal-aware card link, `from` validation for Portal origins, the breadcrumb override context and moving detail files to `portal/`: all in **US-0117**.
- Switching admins to the left-sidebar layout from `zfVKC`.
- Replacing Material Symbols with `lucide-react`.
- Data-backed design elements with no source: "Nivel recomendado", amenity tags, "MÁS POPULAR" price.
- Replacing the landing `Header`/`Footer` with the design's Navbar/Footer on the public detail page.
- Restyling the marketing home (`/`) and `/auth/*`, and removing the `borderRadius.lg/xl` overrides.
- Any DB, RLS, service, hook-logic or route change.

## Files to Create or Modify

**Page** — `src/app/portal/layout.tsx` (shell, breadcrumb row, padding). `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` stays unchanged.

**Components**
- New kit: `src/components/ui/grit/{GritCard,GritTag,GritBadge,GritButton,GritIconTile,GritInfoRow,GritSectionHeading,GritPageHeader,GritPageContainer,GritDivider,GritIcon,GritEmptyState}.tsx`, `icon-map.ts`, `styles.ts`, `index.ts`; re-exported from `src/components/ui/index.ts`.
- Detail: `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalle{Hero,Descripcion,Incluye,Cronograma,Ubicacion,Reserva,Precios}.tsx` (rebuild); new `PublicTrainingDetalle{Body,CtaBanner,States,Breadcrumb}.tsx`; `PublicTrainingDetallePage.tsx` (keep `Header`/`Footer`, use the new breadcrumb, states and body); `index.ts`.
- Shell: `src/components/portal/{PortalHeader,PortalNavMenu,UserAvatarMenu,RoleBasedMenu,PortalBreadcrumb}.tsx`.
- Modules: `src/components/portal/{inicio,perfil,invitaciones,mis-reservas,mis-suscripciones,planes-publicos,entrenamientos-publicos,entrenamientos,gestion-reservas,planes,disciplines,scenarios,servicios,tenant,gestion-equipo,gestion-suscripciones,formularios,analitica}/**`, `PortalTenantsPage.tsx`; possibly delete `PortalSidebar.tsx`.

**Hook** — none changed.

**Service** — none changed.

**Types / lib / config** — `src/lib/portal/disciplina-visual.ts` (new), `src/app/globals.css`, `tailwind.config.ts`.

**Docs** — `projectspec/03-project-structure.md`.

## Implementation Plan

1. Tokens: `globals.css` variables and `.grit-shell`; `tailwind.config.ts` extensions; deprecation comments. Screenshot-compare landing and auth.
2. Kit: build the `ui/grit` components, `icon-map.ts`, `styles.ts`, `disciplina-visual.ts`, barrels.
3. Public detail: extract the body, CTA banner and states (refactor only); rebuild the sections against `OyIqr`; wire the page, keeping the current `Header`/`Footer`.
4. Portal shell: layout, header, menus, standalone breadcrumb row.
5. Modules (a) → (f), one PR per group, each compared to its `.pen` frame (`d41rX5`, `ql3Ij`, `P43Yo`, `zfVKC`).
6. Cleanup: remove unused Portal-only deprecated tokens and `PortalSidebar.tsx`; the legacy-token grep must return no matches.
7. Docs: update `03-project-structure.md`.

## Impact

- **Code**: about 150 component files across `src/components/portal/**`, the public detail slice, the Portal layout, `globals.css` and `tailwind.config.ts`.
- **Visual**: every Portal page and the public detail page change appearance. The landing home and `/auth/*` must not change.
- **APIs / DB / dependencies**: none. No new npm packages.
- **Risk**: a broad visual regression surface. It is mitigated by phased PRs, a per-group visual pass against the `.pen` frames, and smoke tests of the main flows after each group.
