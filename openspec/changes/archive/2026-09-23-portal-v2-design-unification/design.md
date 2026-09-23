## Context

- **Source**: US-0116. The design reference is `projectspec/designs/pencil/grit-arena-v2.pen`. Its frames are `OyIqr` (Public Training Detail), `ql3Ij` (Marketplace), `d41rX5` (Athlete Schedule), `zfVKC` (Operations Dashboard) and `P43Yo` (Formulario Preview).
- **Current state**: the Portal has two visual systems. `entrenamientos-publicos` uses `landing-*` tokens, which match the v2 values. The rest of the Portal (about 130 files) uses `turquoise`, `glass-card`, `navy-*` and Lexend. `tailwind.config.ts` overrides `borderRadius.lg = 2rem` and `xl = 3rem`, so any `rounded-lg` or `rounded-xl` in the Portal renders as 32 px or 48 px. The detail page wraps the marketing `Header`/`Footer` (kept as is).
- **Constraints**: visual-only (no route, link, hook, service, DB or RLS change); Tailwind 4 with the legacy `@config` file; Next.js 16 App Router; landing (`/`) and `/auth/*` must not change; no new npm dependencies.

## Goals / Non-Goals

**Goals:**
- One token source (`grit-*`) that maps 1:1 to the `.pen` variables.
- One component kit (`ui/grit`), so each design element is coded once.
- Rebuild the public detail page per `OyIqr`, with its behavior preserved.
- Put the Portal shell and all Portal modules on the kit, with no legacy tokens left.

**Non-Goals:**
- The Portal detail route and breadcrumb override context (US-0117).
- The admin sidebar layout.
- Switching to Lucide icons.
- Restyling the landing home or auth pages.
- Fields with no data source ("Nivel recomendado", amenity tags, featured price).

## Decisions

### Architecture (page → component → hook → service → types)

```
page      src/app/portal/layout.tsx ─────────────► .grit-shell + PortalHeader + PortalBreadcrumb row + <main>
          src/app/entrenamientos-publicos/[id]/page.tsx (unchanged)
               │
component      ├─ PublicTrainingDetallePage (landing) ─► landing-shell + Header / Footer (unchanged)
               │        │                                     
               │        ├─ PublicTrainingDetalleBreadcrumb (+ Volver)
               │        ├─ PublicTrainingDetalleStates (loading/error/not-found → GritEmptyState)
               │        └─ PublicTrainingDetalleBody ─► Hero · Descripcion · Incluye · Cronograma
               │                                        Ubicacion · Reserva · Precios · CtaBanner
               │                                              │
               └──────────── all Portal modules ──────────────┴──► src/components/ui/grit/*  (kit)
                                                                        │
                                                                        └─► tailwind grit-* tokens ◄─ globals.css --grit-*
hook      usePublicTrainingDetalle, useAuth (unchanged)
service   entrenamientosPublicosService.getPublicTrainingDetail (unchanged)
types     PublicTrainingListItem (unchanged); kit prop types live next to each component
lib       src/lib/portal/disciplina-visual.ts (new, pure)
```

### D1. New `grit-*` token family instead of reusing `landing-*` or `portal-*`
- **Choice**: add `--grit-*` CSS variables and `colors.grit.*` whose names mirror the `.pen` variables.
- **Why**: turning a design into code becomes mechanical (`$glass-border` → `grit-glass-border`). `landing-*` is scoped to marketing in name and lacks the glass, card and discipline tokens. `portal-*` has the wrong values.
- **Alternatives**: (a) rename `landing-*` everywhere. That is wider churn and would touch the landing page, which is a non-goal. (b) Redefine `portal-*` values in place. That would silently restyle unmigrated screens halfway and leave misleading names.
- **Detail**: solid colors are declared as hex in Tailwind, so `/opacity` modifiers work. Translucent tokens (`glass`, `card`, `glass-border`, `sidebar`) are rgba CSS variables used without modifiers.

### D2. Named radii (`rounded-grit-*`), keeping the `lg`/`xl` overrides
- **Choice**: add `grit-xs … grit-2xl` (6–16 px) and forbid `rounded-lg`/`rounded-xl` in Portal code, enforced by the grep acceptance check.
- **Why**: removing the overrides would restyle the landing and auth pages, which are out of scope.
- **Alternative**: remove the overrides now. Rejected: cross-surface regressions.

### D3. Presentational kit in `src/components/ui/grit/`
- **Choice**: small components with no data fetching (`GritCard`, `GritButton`, …) and variant props. Classes are composed with plain template strings, following the codebase idiom (no `clsx`/`cva` dependency).
- **Why**: the design reuses about ten primitives across every frame, and coding them once removes drift. `src/components/ui/` already exists as the shared UI home.
- **Alternative**: shared class-string constants only. Rejected: they can't encode structure (icon tile + label + value) or accessibility defaults.

### D4. Keep Material Symbols behind `GritIcon` + `icon-map.ts`
- **Choice**: wrap Material Symbols Outlined at weight 300 to get closer to Lucide's stroke, and keep a single Lucide→Material map.
- **Why**: the Portal already loads Material Symbols. Moving about 130 files to a new library is out of scope, and the wrapper makes a later swap a one-file change.
- **Alternative**: adopt `lucide-react` now. Rejected: new dependency plus a larger diff.

### D5. Extract `PublicTrainingDetalleBody` in place (under `landing/`)
- **Choice**: the body, CTA banner, states and breadcrumb become their own components in the current `landing/entrenamientos-publicos/detalle/` folder, with identical props and handlers.
- **Why**: US-0117 needs the body for the Portal route. Extracting it now as a pure refactor keeps this change visual-only, and US-0117 then only moves files.

### D6. Keep the landing `Header`/`Footer` on the public detail page
- **Choice**: the page keeps `landing-shell`, the fixed `Header`, the `Footer` and the top padding. Only the content between them follows `OyIqr`.
- **Why**: product decision. The marketing chrome is already consistent with the rest of the public site, and replacing it adds risk without being needed for this story.
- **Alternative**: new v2 `PublicGritNavbar`/`Footer` per `oUFl9`/`iDRcK`. Rejected for now.

### D7. Breadcrumb becomes a layout row; `<main>` loses `p-6`
- **Why**: design `AOIa5` places the breadcrumb under the navbar, and the design body padding (24/48/48/48) differs from `p-6`. Pages own their padding through `GritPageContainer`, so padding is consistent everywhere.
- **Implementation note**: the layout itself wraps `children` in one `GritPageContainer` (instead of every page doing it), so all 27 routes get the design padding from a single place and no page renders edge-to-edge. Page components drop their own outer padding during their migration group.

### D8. `getDisciplinaVisual` derives the discipline icon/color from the name
- **Why**: the design colors disciplines, but there is no DB column for it. A pure name matcher with a fallback keeps this change DB-free.
- **Trade-off**: new discipline names fall back to `sports` + cyan until the matcher learns them.

## Risks / Trade-offs

- [Broad visual regression across about 150 files] → Phased PRs (tokens → kit → detail → shell → six module groups). Each group gets a visual pass against its `.pen` frame and a smoke test of the core flows.
- [Dropping `p-6` from `<main>` makes unmigrated pages touch the edges] → Phase 4 wraps every page root in `GritPageContainer` in the same PR as the layout change.
- [Hidden behavior change while restyling (for example a button type or a removed handler)] → The spec forbids behavior change. Reviewers diff handlers and hrefs, and the grep and build checks run per group.
- [Tailwind 4 + legacy `@config` may not pick up rgba `var()` colors with modifiers] → Translucent tokens are never used with `/opacity`; solid tokens are hex.
- [Material Symbols at weight 300 won't match Lucide exactly] → Accepted; the swap path is documented in D4.
- [Name-based discipline mapping misses custom names] → Fallback icon/color; extend the matcher over time.
- [Contrast of `grit-muted` `#8A9AAB`] → Only used for secondary text of 11 px or larger (about 6:1 on `#07111F`).

## Migration Plan

1. Merge tokens and the kit first (no visual change, because nothing uses them yet).
2. Detail page PR.
3. Shell PR (layout + header + breadcrumb + `GritPageContainer` wrap on every page).
4. Module groups (a)→(f), each deployable on its own.
5. Cleanup PR (unused deprecated tokens, `PortalSidebar.tsx`).

**Rollback**: each PR is purely presentational and reverts cleanly. No DB migrations are involved (nothing is pushed to Supabase).

## Open Questions

- None blocking.
