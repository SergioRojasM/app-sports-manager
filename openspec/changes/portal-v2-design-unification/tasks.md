## 1. Branch setup

- [x] 1.1 Create a new branch `feat/portal-v2-design-unification` from an up-to-date `develop` (commit or stash the uncommitted `feat/tenant-bi-phase-one` changes first)
- [x] 1.2 Validate that the working branch is not `main`, `master`, or `develop` (`git branch --show-current`)

## 2. Design tokens (types/config layer)

- [x] 2.1 In `src/app/globals.css` `:root`, add the `--grit-*` variables with the exact values from spec `grit-design-system` (bg, accents, text, glass/card/sidebar fills, glass-border, success, danger, 6 discipline colors)
- [x] 2.2 Add `.grit-shell` to `globals.css` (`--grit-bg-navy` + top-right cyan and mid-left teal radial glows, `--grit-text-primary`, Montserrat)
- [x] 2.3 In `tailwind.config.ts`, add `colors.grit.*` (solid colors as hex, translucent ones as `var(--grit-…)`), `fontFamily['grit-title']`/`['grit-body']`, and `borderRadius` `grit-xs…grit-2xl` (6/8/10/12/14/16 px). Leave `borderRadius.lg`/`xl` untouched
- [x] 2.4 Add deprecation comments to `turquoise`, `accent-teal`, `portal-*`, `navy-*`, `card-dark` (config) and `.glass`, `.glass-card`, `.sidebar-item-active` (css)
- [x] 2.5 Verify `/` and `/auth/login` look identical to before (screenshot compare), and that `bg-grit-cyan/15` and `rounded-grit-2xl` resolve correctly

## 3. Shared kit and helpers (component + lib layer)

- [x] 3.1 Create `src/components/ui/grit/icon-map.ts` (Lucide → Material Symbols map from US-0116) and `styles.ts` (`gritInputClass`, `gritSelectClass`)
- [x] 3.2 Create `GritIcon.tsx` (Material Symbols wrapper, weight 300, `aria-hidden` unless `label`)
- [x] 3.3 Create `GritCard.tsx` (`variant` glass/card/highlight, `padding` sm/md/lg/xl, `as`, 16 px radius)
- [x] 3.4 Create `GritTag.tsx` and `GritBadge.tsx` per the spec measurements
- [x] 3.5 Create `GritButton.tsx` (variants primary/secondary/outline-accent/ghost, sizes sm/md, `icon`/`iconPosition`, `href` + `external` → `<a target="_blank" rel="noopener noreferrer">`, `loading`/`disabled`, cyan focus-visible ring)
- [x] 3.6 Create `GritIconTile.tsx` and `GritInfoRow.tsx`
- [x] 3.7 Create `GritSectionHeading.tsx`, `GritPageHeader.tsx` (single `h1`), `GritPageContainer.tsx`, `GritDivider.tsx`, `GritEmptyState.tsx`
- [x] 3.8 Create the barrel `src/components/ui/grit/index.ts` and re-export it from `src/components/ui/index.ts`
- [x] 3.9 Create `src/lib/portal/disciplina-visual.ts` with `getDisciplinaVisual()` (case/accent-insensitive matching, `sports` + cyan fallback)

## 4. Public training detail: content visual rebuild (page → component)

- [x] 4.1 Extract `PublicTrainingDetalleBody.tsx`, `PublicTrainingDetalleCtaBanner.tsx`, `PublicTrainingDetalleStates.tsx` (`GritEmptyState`, `listadoHref` prop) and `PublicTrainingDetalleBreadcrumb.tsx` (crumbs + right-aligned "Volver", same `resolveOrigin` hrefs) in `src/components/landing/entrenamientos-publicos/detalle/`, as a pure refactor
- [x] 4.2 Rebuild `PublicTrainingDetalleHero.tsx`: no banner border, gradient overlay, `GritTag` accent (icon from `getDisciplinaVisual`) + neutral "ENTRENAMIENTO PÚBLICO", 40 px title, meta gap 28 px
- [x] 4.3 Rebuild `PublicTrainingDetalleDescripcion.tsx` and `PublicTrainingDetalleIncluye.tsx` with `GritSectionHeading` (list gap 14 px, 17 px `check_circle`); keep the markdown safety rule
- [x] 4.4 Rebuild `PublicTrainingDetalleCronograma.tsx`: heading 20 px + subtitle, `GritBadge` duration in the action slot, left-aligned times, 8 px dots, 1.5 px rail, row gap 16 px
- [x] 4.5 Rebuild `PublicTrainingDetalleUbicacion.tsx`: `GritCard glass padding="xl"`, 340×240 map tile with glow (hidden below `sm`), `GritButton outline-accent` Maps link
- [x] 4.6 Rebuild `PublicTrainingDetalleReserva.tsx`: `GritCard glass padding="lg"`, `GritInfoRow` 2-column grid, side-by-side 42 px CTAs (stacked below `sm`), secondary CTA + note only with `paginaEventoUrl`
- [x] 4.7 Rebuild `PublicTrainingDetallePrecios.tsx`: 3-column grid gap 20 px, `GritCard card padding="md"`, updated subtitle
- [x] 4.8 Wire `PublicTrainingDetallePage.tsx`: keep `landing-shell` + `Header` + `Footer` and the top padding; widen the content wrapper to `max-w-[1440px]` with `gap-8`; breadcrumb → states or body; modals, `handleReservar`, `resolveOrigin` and `usePublicTrainingDetalle` unchanged; update `detalle/index.ts`
- [x] 4.9 Verify no `rounded-lg`/`rounded-xl` remains in the detail components; compare against `OyIqr` at 1440 px (±2 px) and check 375 px (no horizontal scroll, stacking)
- [x] 4.10 Verify `Header.tsx` and `Footer.tsx` have no diff. Verify behavior: anonymous booking → `RegistrateParaReservarModal`; logged in → `PublicTrainingReservaModal`; "Cargando…" while auth initializes; error "Reintentar" refetches; not-found links to `/entrenamientos-publicos`; `from=//evil.com` falls back

## 5. Portal shell (page → component)

- [x] 5.1 Update `src/app/portal/layout.tsx`: `grit-shell font-grit-body`, render the `PortalBreadcrumb` row between header and `<main>`, remove `p-6` from `<main>`
- [x] 5.2 Wrap the Portal pages in `GritPageContainer` once, in `src/app/portal/layout.tsx`, so no page renders edge-to-edge (page components drop their own outer padding in group 6)
- [x] 5.3 Restyle `PortalHeader.tsx` per `oUFl9` (padding, border, blur background, 36 px round bell and avatar) and remove the breadcrumb from it
- [x] 5.4 Restyle `PortalNavMenu.tsx`, `UserAvatarMenu.tsx`, `RoleBasedMenu.tsx`: glass dropdown panels, item styling, active item gradient/border/cyan icon
- [x] 5.5 Restyle `PortalBreadcrumb.tsx` as a standalone row per `AOIa5` (`home` icon, separators, wrapping, truncating the last crumb, `nav > ol`, `aria-current`); add the new `SLUG_LABELS`, leaving the resolution logic unchanged
- [x] 5.6 Verify at 375 / 768 / 1440 px: header items clickable, breadcrumb visible and wrapping on mobile, menus close on Escape and outside click

## 6. Portal module migration (component layer, one PR per group)

- [x] 6.1 Group (a): `inicio`, `perfil`, `invitaciones`, `PortalTenantsPage.tsx`: apply the token mapping, `GritPageHeader`, `GritCard`, `GritButton`, `gritInputClass`
- [x] 6.2 Group (b): `mis-reservas`, `mis-suscripciones`, `planes-publicos`, `entrenamientos-publicos` (`landing-*` → `grit-*`, including `PublicTrainingCard`, the filters drawer and the modals); compare with `d41rX5` / `ql3Ij`
- [x] 6.3 Group (c): `entrenamientos`, `gestion-reservas`, `planes`, `disciplines`, `scenarios`, `servicios`
- [x] 6.4 Group (d): `tenant`, `gestion-equipo`, `gestion-suscripciones`
- [x] 6.5 Group (e): `formularios` (compare with `P43Yo`; keep the US-0108 header behavior)
- [x] 6.6 Group (f): `analitica` (KPI cards per `zfVKC`: `GritCard card`, 40 px round icon tile, 28 px Rajdhani value, `grit-success` delta) — N/A on this branch: `src/components/portal/analitica` only exists on `feat/tenant-bi-phase-one` (not merged into `develop`); migrate it there/after merge with the same codemod rules
- [x] 6.7 After each group: diff hrefs and handlers to confirm no behavior change; smoke test the group's flows (booking, reservations, form builder, analytics filters, invitations, subscriptions)

## 7. Cleanup

- [x] 7.1 Run `grep -rE "turquoise|portal-primary|portal-secondary|portal-card|portal-border|glass-card|navy-deep|navy-medium|navy-soft|card-dark|font-display|landing-(primary|text|bg|border|surface)|rounded-(lg|xl)\b" src/components/portal src/app/portal` and fix every match
- [x] 7.2 Delete `src/components/portal/PortalSidebar.tsx` if nothing imports it; remove `portal-*` and `.sidebar-item-active` definitions if nothing references them

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: `ui/grit` kit and files, `grit-*` tokens and radius rule, `disciplina-visual.ts`, new detail sub-components, breadcrumb row in the Portal layout, and replace the "landing-* tokens" mentions for Portal components

## 9. Verification and delivery

- [x] 9.1 Run type-check (`npx tsc --noEmit`) and fix errors — 0 errors
- [x] 9.2 Run `npm run lint` and fix errors — 0 new errors; 12 pre-existing `react-hooks/*` errors in 11 portal modal files are identical on HEAD (not fixed here: fixing them changes behavior, out of scope for a visual-only change)
- [x] 9.3 Run the tests if a test script exists (none is configured in `package.json` today, so report that). Do not run a build — no test script; verified manually with Playwright screenshots/smoke tests instead
- [x] 9.4 Write the commit message (Conventional Commits, e.g. `feat(portal-v2-design-unification): unify portal visuals with grit-arena-v2 design`) and the pull request description (summary, per-phase changes, screenshots before and after for the detail page and one page per group, test plan, US-0116 reference, note that US-0117 follows)
