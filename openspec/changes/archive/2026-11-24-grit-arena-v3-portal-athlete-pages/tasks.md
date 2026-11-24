# Tasks

**References**
- Change artifacts: `proposal.md`, `design.md` (decisions §1–§10 and the node measurement table), and the specs under `specs/`.
- Design source: frames `kMj4F`, `zY4v8`, `LSqV5`, `x9xdbA` and `v1lcBA` in `projectspec/designs/pencil/grit-arena-v3.pen`, plus the kit components `zRDg2`, `R1QegD` and `uCKmV`. Read them only through the pencil MCP, because the file is encrypted.
- Migration contract: `DESIGN.md` §10 and §12.

**How to check**: the project has no test runner, so checks use `npx tsc --noEmit`, `npm run lint`, scratch scripts in the session scratchpad (not committed) and the Playwright MCP. Never run `npm run build`.

**Order inside each page group**: page → component → hook → lib/service → types. Every group lands its own `projectspec/03-project-structure.md` entries.

## 1. Branch setup

- [x] 1.1 Create branch `feat/grit-arena-v3-portal-athlete-pages` from `develop`. Verify with `git branch --show-current`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`). Stop if it is

## 2. Baseline

- [x] 2.1 With the dev server running, capture "before" screenshots of `/portal/orgs`, `/portal/eventos`, `/portal/mis-suscripciones`, `/portal/mis-reservas`, `/portal/mis-entradas` and the landing `/eventos`, at 375/768/1440px, through the Playwright MCP. Save them in the session scratchpad. Verify that the files exist. The `/eventos` set is the regression reference for task 4.8
- [x] 2.2 Open `grit-arena-v3.pen` in Pencil. Verify that `get_app_state` lists the five frames, then export them as PNG to the scratchpad as the visual reference

## 3. Kit primitives

- [x] 3.1 `src/components/ui/grit/GritDateTile.tsx`:
  - sizes `sm` / `md` / `lg` and tones `overlay` / `accent` / `muted` (design table: `jLgGe`, `r9UZz`, `tsbPt`);
  - Bogotá day/month from an ISO instant, and "Por definir" for null;
  - an `aria-label` with the long date ("21 de noviembre de 2026").

  Verify with a scratch script that `2026-11-22T03:00:00Z` gives "21" / "NOV", and that `tsc` passes
- [x] 3.2 `src/components/ui/grit/GritOverlayPill.tsx`:
  - tones `glass` (`#080C10` 45% → use `bg-grit-bg/45`, `border-white/20`, `backdrop-blur-[14px]`) and `brand`;
  - an optional icon (`aria-hidden`);
  - renders as a `span`, a `Link` (`href`) or a `button type="button"` (`onClick`), with `gritFocusRing`.

  Verify by tabbing to the link and button forms in the Playwright MCP (the focus ring is visible)
- [x] 3.3 `src/components/ui/grit/GritMediaCard.tsx`:
  - radius `lg`/`xl` and stroke `neutral`/`accent` (gradient border via the existing kit gradient-border technique);
  - full-bleed `<img>` with `onError` → placeholder (dark gradient + optional icon);
  - top and bottom shades per `DESIGN.md` §9;
  - `top` and `bottom` slots, plus `imageAlt` (decorative by default).

  Verify against `K1KpU` / `UrDey` at 1440 in the Playwright MCP, and verify that a broken URL shows the placeholder
- [x] 3.4 `src/components/ui/grit/GritEventCard.tsx`: variants `hero` / `compact` / `grid` per `design.md` §2 (generic props, no domain imports). Link semantics:
  - single root `Link` when `href` and no `actions`;
  - otherwise an `<article>` with a stretched title link and `relative z-10` actions.

  Verify against `zRDg2`, `R1QegD` and `uCKmV`, and that `lint` reports no nested interactive elements (check the DOM in the Playwright MCP: no `<a>` or `<button>` inside an `<a>`)
- [x] 3.5 `src/components/ui/grit/GritAvatar.tsx`:
  - add `tone="org"` and sizes 20/26/36/42/52, with initials scaled per `design.md` §3;
  - move the image branch into a client child with an `onError` fallback to initials.

  Verify that the existing callers (`PortalSidebarUser`, `UserAvatarMenu`, `gestion-equipo`) still type-check and render the same, and that `<GritAvatar name="Pace Club" tone="org" size={36} />` shows "PC"
- [x] 3.6 Export the new primitives from `src/components/ui/grit/index.ts` and `src/components/ui/index.ts`, and add the missing icons to `icon-map.ts` (`design.md` §10). Verify `npx tsc --noEmit` and `npm run lint`
- [x] 3.7 Update the docs:
  - `DESIGN.md` §4: add `GritMediaCard`, `GritOverlayPill`, `GritDateTile`, `GritEventCard` and the `GritAvatar` org tone to the kit tables;
  - `DESIGN.md` §9: remove the Event Card / Hero, Compacta, grid and over-photo pill/date tile rows from "not yet in the kit".

  Verify that every component and prop named exists in code

## 4. `/portal/eventos` (frame `zY4v8`)

- [x] 4.1 `src/app/portal/eventos/page.tsx`: keep the `Suspense` wrapper. Verify that the route still renders after 4.2
- [x] 4.2 `src/components/portal/eventos/EventosPublicosPage.tsx`:
  - `GritPageHeader title="Tu próximo" titleAccent="reto."`, with actions `GritSearchField` (bound to `search`) and `GritIconButton icon="tune" label="Filtros"` (dot when `hasDrawerFilters`);
  - the discipline `GritChip` row (`role="group"`, horizontal scroll on narrow screens);
  - `EventosPortalFeatured`, then the section header ("Próximos 60 días" / "Más eventos" + "Ver calendario" pill → drawer), then `EventosPortalGrid`;
  - `GritEmptyState` for loading, error ("Reintentar") and empty states;
  - no count widget, sticky header or 60-day note.

  Verify the scenarios of `specs/team-events-discovery` (Portal featured row, Short portal list, Section title follows filters, Discipline chip, No match with reset) in the Playwright MCP
- [x] 4.3 `src/components/portal/eventos/EventosPortalFeatured.tsx` and `EventosPortalGrid.tsx`:
  - hero from `items[0]`, with "Obtener entrada" wired to `useObtenerEntrada` (disabled while auth initializes);
  - compact cards from `items[1..2]`;
  - grid cards from `items[3..]`, linking to `buildEventoPortalDetalleHref(id, { from: '/portal/eventos' })`;
  - a "Solo miembros" pill when `publico = false`.

  Verify that the hero CTA opens `EventoEntradasModal`, and that a grid card navigates with `?from=%2Fportal%2Feventos`
- [x] 4.4 `src/components/portal/eventos/EventosPublicosFiltersDrawer.tsx`: remove the search and discipline controls and props, and keep the dates, chips, organization and "Limpiar filtros". Delete `EventosDisponiblesWidget.tsx` and update `index.ts`. Verify with `grep -rn EventosDisponiblesWidget src` (no hits) and `tsc`
- [x] 4.5 `src/hooks/portal/eventos/useEventosPublicos.ts`: add `hasDrawerFilters` (date range differs from the default, or `tenantId` is set). Verify that the dot appears after selecting an organization and disappears after "Limpiar filtros"
- [x] 4.6 `src/lib/portal/eventos-card-model.ts`:
  - `getEventoLugarLabel`, extracted from `EventoPublicoCard` (keep its output identical);
  - `getEventoCupoLabel` ("N cupos" / "Cupo ilimitado");
  - `toEventCardProps(evento, variant)` (price via `formatEventoPrecio`, discipline icon via `getDisciplinaVisual`).

  Switch `EventoPublicoCard` to `getEventoLugarLabel`. Verify with a scratch script on a venue / meeting-point URL / empty fixture
- [x] 4.7 `src/lib/text/normalize-search.ts`: move `normalizeSearch` there, export it, and import it from `eventos-publicos.utils.ts`. Verify that `matchesEventoSearch('Ruta del Café', 'cafe')` is still true in a scratch script
- [x] 4.8 Regression: compare `/eventos` (landing) at 375/1440 with the 2.1 screenshots (no visual change). Run the §11 greps on `src/components/portal/eventos` (both empty). Update `projectspec/03-project-structure.md` (eventos components added/removed, `eventos-card-model.ts`, `normalize-search.ts`). Verify that every listed path exists

## 5. `/portal/orgs` (frame `kMj4F`)

- [x] 5.1 `src/app/portal/orgs/page.tsx`: unchanged entry. Verify that it renders the new `PortalTenantsPage`
- [x] 5.2 `src/components/portal/PortalTenantsPage.tsx`:
  - `GritPageHeader title="Encuentra tu" titleAccent="club."` with a `GritSearchField size="lg"` ("Buscar club o disciplina");
  - `InvitacionesPendientesSection`;
  - the sections "Tus clubes" (`lg:grid-cols-2`) and "Explora clubes" (`sm:grid-cols-2 xl:grid-cols-4`), each hidden when empty;
  - `GritEmptyState` for loading, error ("Reintentar" → `retry`), empty directory and no-match ("Limpiar búsqueda").

  Verify the `specs/tenant-marketplace-visibility` scenarios "Member and non-member organizations", "No memberships", "Accent-insensitive search" and "No match"
- [x] 5.3 `src/components/portal/tenant/ClubMemberCard.tsx`:
  - `GritMediaCard radius="xl" stroke="accent"`;
  - `GritOverlayPill` "MIEMBRO" (+ "PRIVADA");
  - a round arrow `GritIconButton`/`GritOverlayPill` link labelled "Ingresar a {nombre}";
  - `GritAvatar tone="org" size={52}` with the logo from `useTenantBrandingImages`;
  - the name in Exo 2 italic and a one-line description;
  - `VerPlanesButton appearance="overlay"` + `GritButton` "Ingresar" (arrow icon) → `getDefaultTenantPath`.

  Verify the scenarios "Member card actions", "Private member organization" and "Missing images"
- [x] 5.4 `src/components/portal/tenant/ClubExploreCard.tsx`: `GritMediaCard radius="lg"`, a 36px org mark, the name 15/600, a one-line description, and `VerPlanesButton appearance="overlay"` + `SolicitarAccesoButton size="sm"`. Verify "Request access from the card" (pending state shown after confirming) and "See plans" (focus returns)
- [x] 5.5 `src/components/portal/tenant/SolicitarAccesoButton.tsx`: replace the markup with `GritButton` (`size`, `variant` props), keeping every state: confirmation, pending, blocked, incomplete profile and history. `src/components/portal/planes-publicos/VerPlanesButton.tsx`: add `appearance: 'overlay' | 'secondary'` (default `secondary`). Verify each state in the Playwright MCP with a seeded pending and a blocked request, and that `/portal/orgs/{id}/landing-org` still shows "Ver planes"
- [x] 5.6 `src/hooks/portal/tenant/useTenantDirectoryFilter.ts`: `{ query, setQuery, members, explore, hasResults }`, using `normalizeSearch` on name + description and sorting with `localeCompare('es')`; a member is `canAccess && userMembershipRole`. `src/lib/portal/tenant-paths.ts`: move `getDefaultTenantPath`. Verify with a scratch script on a 3-tenant fixture (one member, "natación" description matched by "natacion")
- [x] 5.7 Delete `TenantDirectoryCard.tsx` and `TenantDirectoryList.tsx`. Verify with `grep -rn "TenantDirectory\(Card\|List\)" src` (no hits) and `tsc`
- [x] 5.8 Run the §11 greps on `src/components/portal/tenant` and `PortalTenantsPage.tsx` (both empty) and check `TenantIdentityCard` on `gestion-organizacion` (unchanged). Update `projectspec/03-project-structure.md` (tenant components, `useTenantDirectoryFilter`, `tenant-paths.ts`). Verify that every listed path exists

## 6. `/portal/mis-suscripciones` (frame `LSqV5`)

- [x] 6.1 `src/app/portal/(atleta)/mis-suscripciones/page.tsx`: unchanged entry (still passes `suscripciones` + `userId`). Verify that the unauthenticated redirect keeps `next=%2Fportal%2Fmis-suscripciones`
- [x] 6.2 `src/components/portal/mis-suscripciones/MisSuscripcionesYPagosPage.tsx`:
  - `GritPageHeader title="Mis" titleAccent="suscripciones." italic` with actions `MisSuscripcionesFilters`;
  - the list (gap 14);
  - `GritEmptyState`: "Aún no tienes suscripciones" + "Explorar organizaciones" → `/portal/orgs` (filters hidden), and "No hay suscripciones con estos filtros" + "Limpiar filtros".

  Verify the "No subscriptions" and "Clear filters" scenarios
- [x] 6.3 `src/components/portal/mis-suscripciones/MisSuscripcionesFilters.tsx`: rewrite with a `GritSegmented variant="solid"` (Todas / Pendiente / Activa / Vencida / Cancelada), a "Pago" `gritPillSelectClass` select, and an "Organización" select only when `tenantOptions.length > 1`. Verify the "Status filter", "Payment filter…" and "Organization select hidden…" scenarios, and that there are no network requests on change (Playwright network panel)
- [x] 6.4 `src/components/portal/mis-suscripciones/SuscripcionCard.tsx`:
  - `GritCard variant="card" padding="none"`, with `xl:grid-cols-[300px_1fr_240px]` and dividers;
  - cover: plan Exo 2 26/600 italic, description, org pill with `GritAvatar tone="org" size={20}`, status `GritTag dot`;
  - body: range + period label + track, and service tiles (`inset`) with `GritProgress` or "∞" (danger tone at 0).

  Verify the "Plan without description", "Active period", "Ended period", "Limited and unlimited services" and "Exhausted service" scenarios
- [x] 6.5 `src/components/portal/mis-suscripciones/SuscripcionPagoZone.tsx`:
  - amount in Exo 2 22 and the status line (validado / pendiente / rechazado + reason, or "Sin pago registrado");
  - a "Ver comprobante" `GritIconButton icon="receipt_long"`;
  - upload / re-upload, reusing `useSubirComprobante` and `useComprobanteViewer` (logic moved from `PagoCard`);
  - "Renovar" (vencida / cancelada) → `PlanesPublicosModal` via `BodyPortal`, with `initialSearch={plan_nombre}` and focus return.

  Delete `PagoCard.tsx`. Verify the payment-status, proof-action and renewal scenarios in the Playwright MCP (upload a test image on a pending payment)
- [x] 6.6 `src/lib/portal/mis-suscripciones-periodo.ts`: `getPeriodo(inicio, fin, hoyKey)` and `formatRangoFechas`, date-only via UTC day numbers (`design.md` §6). Verify with a scratch script: `2026-11-30` ends on "30 nov"; a 30-day period started 11 days ago → "Día 12 de 30" ≈ 40%; a future start → "Inicia en N días"; a cross-year range shows both years; null dates → `sin_fechas`
- [x] 6.7 `src/services/supabase/portal/mis-suscripciones.service.ts`: select `plan:planes!suscripciones_plan_id_fkey(nombre, descripcion)` and map it to `plan_descripcion`. `src/types/portal/mis-suscripciones.types.ts`: add `plan_descripcion: string | null`. Verify with `tsc`, and that a plan with a description shows it on the card
- [x] 6.8 Run the §11 greps on `src/components/portal/mis-suscripciones` (both empty). Update `projectspec/03-project-structure.md` (components added/removed, the period lib, the service field). Verify that every listed path exists

## 7. `/portal/mis-reservas` (frame `x9xdbA`)

- [x] 7.1 `src/app/portal/(atleta)/mis-reservas/page.tsx`: unchanged. Verify the redirect with `next=%2Fportal%2Fmis-reservas`
- [x] 7.2 `src/components/portal/mis-reservas/MisReservasPage.tsx`:
  - `GritPageHeader title="Mis" titleAccent="reservas." italic`, with `GritButton variant="secondary" size="sm" icon="download"` "Exportar CSV" (disabled at 0);
  - the filter bar, the stats strip, the list panel, the footnote and `GritPagination`;
  - `GritEmptyState` for loading, error ("No se pudieron cargar tus reservas" + "Reintentar"), no bookings ("Aún no tienes reservas" + "Ver organizaciones") and filter-empty ("Limpiar filtros");
  - a compact danger banner when a refresh fails with rows on screen.

  Verify the export, footnote and state scenarios of `specs/portal-my-bookings`
- [x] 7.3 `src/components/portal/mis-reservas/MisReservasFilterBar.tsx`:
  - two `GritSegmented variant="solid"` (7 días / Último mes / Mes a la fecha / Todo, and Todos / Asistió / No asistió / Sin registrar);
  - `MisReservasCustomRange`;
  - a "Disciplinas" pill select, and an "Organización" pill select when there are more than one.

  The bar wraps on narrow screens, and the tracks scroll. Verify "Segment applies without a button" and "Organization select hidden…"
- [x] 7.4 `src/components/portal/mis-reservas/MisReservasCustomRange.tsx`:
  - a pill trigger (`aria-expanded`, `aria-controls`) showing the active range;
  - a `GritCard variant="glass"` popover with Desde / Hasta (`gritInputClass`) and "Aplicar";
  - validation messages;
  - Escape and outside-click close, with focus return.

  Verify the "Valid custom range" and "Range too long" scenarios and a keyboard-only pass
- [x] 7.5 `src/components/portal/mis-reservas/MisReservasStats.tsx` (4 items, dividers, a 2×2 grid below `md`) and `MisReservasList.tsx`:
  - column heads from `lg`;
  - month overline + rule;
  - rows with `GritDateTile size="sm"` (accent when confirmed), the name, the meta (discipline icon via `getDisciplinaVisual`, time, plan pill), a status `GritTag dot`, the attendance icon + label, the booking date, and the rejection reason;
  - stacked layout below `lg`.

  Delete `MisReservasFiltersPanel.tsx` and `MisReservasTable.tsx`. Verify the "Counts match the list", "Month grouping across years", "Row content", "Rejected booking reason" and "Phone width" scenarios
- [x] 7.6 `src/hooks/portal/mis-reservas/useMisReservas.ts`:
  - immediate fetch on filter change;
  - `applyCustomRange`;
  - a `requestIdRef` stale guard;
  - filter options frozen from the first unfiltered load;
  - `stats`, `pageGroups`, `isCapped` (no filters and `rows.length >= 100`);
  - remove `applyFilters` and the draft/applied split, and keep `exportCsv`.

  Verify "Out-of-order responses" (throttle the network and click two segments quickly) and "Options do not shrink"
- [x] 7.7 `src/lib/portal/mis-reservas-agrupacion.ts`: `groupReservasByMonth`, `computeReservaStats`, `formatHoraBogota`, `formatFechaCorta`, `reservaEstadoTag` and `validateDateRange` (moved from the old panel). `src/types/portal/reservas.types.ts`: add `MisReservasStats` and `MisReservasMonthGroup`. Verify with a scratch script: the 2026-01-03 / 2025-12-28 grouping order and labels, stats on a 7-row fixture (2/1/3), "6:00 am", "1 sep", and that a 75-day range is rejected
- [x] 7.8 Run the §11 greps on `src/components/portal/mis-reservas` (both empty). Update `projectspec/03-project-structure.md` (components added/removed, hook API, lib). Verify that every listed path exists

## 8. `/portal/mis-entradas` (frame `v1lcBA`)

- [x] 8.1 `src/app/portal/(atleta)/mis-entradas/page.tsx`: unchanged. Verify the redirect and the "Mis entradas" breadcrumb
- [x] 8.2 `src/components/portal/mis-entradas/MisEntradasPage.tsx`:
  - `GritPageHeader title="Mis" titleAccent="entradas." italic`, with actions `GritSegmented` (Próximas / Pasadas with `count`) + "Estado" pill select;
  - the list of `MiCompraCard`;
  - `EventosSugeridos`;
  - `GritEmptyState` for loading, error, empty ("Aún no tienes entradas." + "Explorar eventos") and filter-empty.

  Verify the "Empty state", "Tab counts" and "Rejected purchase shows reason" scenarios
- [x] 8.3 `src/components/portal/mis-entradas/MiCompraCard.tsx`:
  - rewrite as a ticket card: `lg:grid-cols-[340px_minmax(0,1fr)_2px_260px]`;
  - photo side (`GritMediaCard`, estado `GritOverlayPill`, `GritDateTile lg`, org mark, name in Exo 2 48 italic);
  - details (countdown pill, long date, 4 field tiles, multi-ticket code list with "Usada", policy, rejection reason, actions with the existing rules and pending/error states);
  - perforation (vertical from `lg`, horizontal dashed below).

  Keep `CancelarCompraModal` / `ReenviarComprobanteModal` wiring. Verify the countdown, place-value, multiple-ticket and action scenarios of `specs/team-events-my-tickets`
- [x] 8.4 `src/components/portal/mis-entradas/MiCompraTicketStub.tsx`: "PRESENTA EN EL INGRESO", the QR `<img alt="Código QR de la entrada {código}">` from `useTicketQr`, the code in `font-grit-mono`, the "Usada" badge, and the messages for pending or void purchases. Verify the "Confirmed purchase", "Pending validation", "Cancelled purchase" and "Used ticket" scenarios. Scan the rendered QR with a phone or `qr-scanner` in a scratch page and confirm that it decodes to the code
- [x] 8.5 `src/components/portal/mis-entradas/EventosSugeridos.tsx`: a section header "Te puede interesar" + a "Ver todos los eventos" pill → `/portal/eventos`, and up to 4 `GritEventCard variant="grid"` linking to the portal detail page. Hidden when empty. Verify "Suggestions exclude purchased events"
- [x] 8.6 `src/hooks/portal/mis-entradas/useTicketQr.ts` (lazy `qrcode`, module cache, `{ src, error }`) and `useEventosSugeridos.ts` (parallel fetch, exclusion of purchased event ids, 60-day Bogotá window, top 4, `console.error` + `[]` on failure). Verify "Suggestions failure is silent" by blocking `rest/v1/eventos` in the Playwright MCP
- [x] 8.7 `src/lib/portal/mis-entradas-countdown.ts`: `getCountdown(fechaHora, now)` and `formatFechaLarga`. Verify with a scratch script: 6 days → "Faltan 6 días", the next day → "Mañana", the same day → "Hoy", past → "Finalizado", null → none, and "Sábado 21 de noviembre · 4:20 pm"
- [x] 8.8 Run the §11 greps on `src/components/portal/mis-entradas` (both empty; restyle the two modals if they fail). Update `projectspec/03-project-structure.md` (components, hooks, lib). Verify that every listed path exists

## 9. Integration verification

- [x] 9.1 Compare each route against its frame at 1440 (Playwright MCP screenshot next to the exported PNG), and check 768 and 375: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) and exactly one `h1` per page. Save the "after" screenshots in the scratchpad
- [x] 9.2 Keyboard pass on all five pages:
  - segmented controls and chips expose `aria-pressed`;
  - the popover, the plans dialog and the purchase modals close on Escape and return focus;
  - focus rings are visible on overlay pills and cards.

  Verify by recording the pass in the Playwright MCP
- [x] 9.3 Run `npx tsc --noEmit` and `npm run lint` with zero errors, and the §11 global grep across `src/components/portal src/app/portal` (empty). Do not run `npm run build`

## 10. Delivery

- [x] 10.1 Confirm that `DESIGN.md` §1 marks `kMj4F`, `zY4v8`, `LSqV5`, `x9xdbA` and `v1lcBA` as migrated, and that §4/§9 match the code (task 3.7). Verify every component name with `grep`
- [x] 10.2 After 9.3 passes, write the commit message (Conventional Commits, e.g. `feat(portal): migrate orgs, eventos and athlete pages to grit-arena-v3`) and the PR description to `openspec/changes/grit-arena-v3-portal-athlete-pages/pr.md`. The PR description has:
  - a summary per page;
  - before/after screenshots;
  - the UX breaks (org sections, grid event cards without an inline CTA, immediate booking filters, the bookings list replacing the table);
  - the design elements left out for lack of data (org disciplines, distance, rating, favorites, DESTACADO, row menu, .ics), flagged for design review;
  - the test plan.

  Verify that the file exists and references every spec

## Workflow follow-up

- Run `/opsx:verify` and then archive the change once reviewed. The archive merges these deltas:
  - `tenant-marketplace-visibility`, `team-events-discovery`, `team-events-my-tickets` and `grit-design-system`;
  - the new `portal-my-subscriptions` and `portal-my-bookings` specs.
