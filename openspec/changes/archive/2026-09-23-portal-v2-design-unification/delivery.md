# Delivery — portal-v2-design-unification (US-0116)

## Commit message

```
feat(portal-v2-design-unification): unify portal visuals with grit-arena-v2 design

- Add grit-* design tokens (globals.css + tailwind.config.ts) mirroring
  grit-arena-v2.pen, named rounded-grit-* radii and the .grit-shell background
- Add the ui/grit presentational kit (GritCard, GritButton, GritTag, GritBadge,
  GritIconTile, GritInfoRow, GritSectionHeading, GritPageHeader,
  GritPageContainer, GritDivider, GritIcon, GritEmptyState) and
  getDisciplinaVisual()
- Rebuild the public training detail content per node OyIqr (landing
  Header/Footer unchanged); extract Body, Breadcrumb, States and CtaBanner
- Restyle the Portal shell (header, menus, standalone breadcrumb row, single
  GritPageContainer in the layout) to the v2 navbar
- Migrate every Portal module from legacy tokens (turquoise, glass-card,
  navy-*, rounded-lg/xl, slate-*) to grit-* tokens; unify modal backdrops and
  page titles; remove the unused PortalSidebar and portal-* tokens
- Document the visual design system in 03-project-structure.md

Visual-only: no routes, link targets, handlers, hooks, services or DB changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Pull request description

**Title:** feat(portal): unify Portal visuals with the grit-arena-v2 design (US-0116)

### Summary
The Portal mixed two visual systems: v2 (cyan `#14DBC4`, Rajdhani/Montserrat, glass) in `entrenamientos-publicos`, and a legacy one (turquoise `#00E5C4`, `.glass-card`, `navy-*`, Lexend) elsewhere. `rounded-lg`/`rounded-xl` also rendered as 32/48 px because of the legacy radius overrides. This PR moves the whole Portal and the public training detail content onto one design system taken from `projectspec/designs/pencil/grit-arena-v2.pen`.

**This change is visual-only.** No routes, link targets, click handlers, hooks, services, RLS or DB changes. The Portal-scoped detail route follows in US-0117.

### Changes
- **Tokens**:
  - `--grit-*` CSS variables, 1:1 with the `.pen` variables;
  - `colors.grit.*`, `font-grit-title/body` and `rounded-grit-{xs..2xl}` in Tailwind;
  - `.grit-shell` background.
  - The legacy `lg`/`xl` radius overrides are kept for landing/auth. Legacy tokens are marked deprecated, and the Portal-only ones (`portal-*`, `.sidebar-item-active`) are removed.
- **Kit**:
  - `src/components/ui/grit/*`, exported from `@/components/ui`;
  - `icon-map.ts` (design Lucide → Material Symbols);
  - `src/lib/portal/disciplina-visual.ts`.
- **Public detail** (`/entrenamientos-publicos/[id]`):
  - All sections rebuilt per node `OyIqr`: bordered tags with a per-discipline icon, 2×2 reserve info grid with side-by-side CTAs, map tile with glow, outlined Google Maps button, 16 px pricing cards, `event_available` CTA banner.
  - New `PublicTrainingDetalleBody`/`Breadcrumb`/`States`/`CtaBanner`.
  - The landing `Header` and `Footer` are unchanged, and "Volver" is kept.
- **Portal shell**:
  - v2 navbar styling.
  - The breadcrumb is a standalone row, now visible and wrapping on mobile, with new slug labels.
  - Glass dropdown menus.
  - One `GritPageContainer` in `portal/layout.tsx`.
- **Modules** (138 files changed only in classes, via a deterministic codemod; 17 hand edits):
  - legacy tokens → `grit-*`;
  - page titles → `GritPageHeader` / v2 `h1`;
  - modal backdrops → `bg-grit-bg/70 backdrop-blur-sm`.
- **Cleanup**: deleted the unused `PortalSidebar.tsx`.
- **Docs**: new "Visual Design System" section and updated tree in `projectspec/03-project-structure.md`.

### Screenshots
_Attach before/after for:_
- `/entrenamientos-publicos/[id]` at 1440 and 375 px;
- `/portal/inicio`;
- `/portal/entrenamientos-publicos`;
- `gestion-entrenamientos`;
- `gestion-suscripciones`;
- `gestion-formularios`;
- the "Agregar miembro" modal.

### Test plan
- [x] `npx tsc --noEmit`: 0 errors.
- [x] `npm run lint`: no new errors. There are 12 existing `react-hooks/*` errors in 11 modal files; the count per file is identical on `HEAD`.
- [x] Legacy-token grep over `src/components/portal` and `src/app/portal`: 0 matches.
- [x] A normalized diff confirms that 138 of the 155 changed Portal files differ only inside string literals (classes).
- [x] Public detail with mocked data (Playwright):
  - no horizontal scroll at 1440 and 375 px, and no 32/48 px radii;
  - `from=//evil.com` falls back to `/entrenamientos-publicos`;
  - an anonymous "Reservar" click opens "Regístrate para reservar";
  - error and not-found states render;
  - `Header.tsx` and `Footer.tsx` have no diff.
- [x] Portal smoke test as an administrator on local Supabase:
  - shell at 1440 and 375 px;
  - nav menu;
  - pages: inicio, orgs, perfil, marketplace, mis-reservas, entrenamientos, planes, suscripciones, formularios list and editor, equipo;
  - booking modal and "Agregar miembro" modal.
- [ ] Reviewer: click through the remaining admin, coach and athlete flows.

### Notes
- `analitica` exists only on `feat/tenant-bi-phase-one`. It needs the same token mapping when that branch lands.
- A menu item for "Organizaciones Disponibles" also highlights inside `/portal/orgs/*`. This is existing `activePath` logic and was left untouched (visual-only scope).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
