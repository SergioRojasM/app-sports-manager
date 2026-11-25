# Proposal

> Source: user request (2026-11-24): "Crear un cambio para migrar portal/orgs (Node ID: kMj4F), portal/eventos (Node ID: zY4v8), portal/mis-suscripciones (Node ID: LSqV5), portal/mis-reservas (Node ID: x9xdbA), portal/mis-entradas (Node ID: v1lcBA) según los diseños de projectspec/designs/pencil/grit-arena-v3.pen". The `DESIGN.md` §1 frame table maps the five frames to these routes. The migration contract is `DESIGN.md` §10 and §12. The previous page story, `/portal/inicio` (archived change `2026-11-24-grit-arena-v3-portal-inicio-migration`), is the reference for scope and conventions.

## Why

US-0141 gave the Portal the v3 tokens, kit and shell, and `/portal/inicio` now matches its frame. The other five pages in the athlete menu (Organizaciones, Eventos, Mis suscripciones, Mis reservas, Mis entradas) still use v2 markup:
- `rounded-grit-md` buttons and hand-rolled tab and chip rows;
- emerald, sky and rose badges;
- `bg-grit-glass` boxes;
- bold Exo 2 titles;
- a plain table with no grouping.

The v3 frames redesign these pages:
- the two marketplaces get photo-led cards;
- subscriptions get a three-zone card with period progress;
- bookings get a month-grouped list with a stats strip;
- tickets get a ticket-shaped card with a scannable QR stub.

All five sit under one sidebar group, so migrating them together finishes the athlete experience in one release. It also promotes the event-card family into the kit, which `DESIGN.md` §9 lists as "drawn in v3 but not yet in the kit".

## What Changes

### Kit (`src/components/ui/grit`)
- **New** `GritMediaCard`: photo surface with the two v3 shades, radius `lg` (24) / `xl` (28), stroke `neutral` (white 18%→4%) or `accent` (cyan 50%→8%), and a placeholder when there is no image or it fails to load.
- **New** `GritOverlayPill`: the over-photo pill (`#080C10` 45%, white 20% stroke, 14px blur). Tones `glass` / `brand`. Renders as a span, a button or a link.
- **New** `GritDateTile`: day + month tile. Sizes `sm` (list, 56×46), `md` (48×52), `lg` (64×59). Tones `overlay` / `accent` / `muted`.
- **New** `GritEventCard`: event card with variants `hero` (`zRDg2`), `compact` (`R1QegD`) and `grid` (`uCKmV`), built on the three primitives above.
- `GritAvatar` gains `tone="org"` (dark fill, cyan 50% stroke, cyan Exo 2 italic initials) and sizes 20 / 26 / 36 / 42 / 52 for club marks.

### `/portal/orgs` (frame `kMj4F`)
- Header "Encuentra tu **club.**" with a `GritSearchField` ("Buscar club o disciplina"). The search runs client-side over name and description, ignoring case and accents.
- **"Tus clubes"**: the user's member organizations as large `GritMediaCard` cards in two columns, each with:
  - a "MIEMBRO" pill, plus "PRIVADA" when the organization is private;
  - a round arrow that links to the role's default path;
  - a 52px org mark, the name in Exo 2 italic and a one-line description;
  - "Ver planes" (overlay pill) and "Ingresar" (primary) actions.
- **"Explora clubes"**: the other organizations as 4-column photo cards, each with:
  - a 36px org mark, the name (15/600) and a one-line description;
  - "Ver planes" and "Solicitar acceso" actions.
- `InvitacionesPendientesSection` stays above the sections.
- `SolicitarAccesoButton` is restyled with `GritButton`. Its states don't change.
- **BREAKING (UX)**: the single alphabetical grid of `TenantDirectoryCard` is replaced by the two sections. `TenantDirectoryCard` and `TenantDirectoryList` are deleted.

### `/portal/eventos` (frame `zY4v8`)
- Header "Tu próximo **reto.**" with a `GritSearchField` ("Buscar evento o ciudad", bound to the existing search state) and a "Filtros" `GritIconButton` that opens the drawer.
- Discipline `GritChip` row ("Todos" + the distinct disciplines of the loaded events), bound to the existing `disciplina` filter.
- Featured row:
  - the first event as `GritEventCard variant="hero"`: "PRÓXIMO" pill, discipline pill, 64px date tile, organizer, name, time/place/capacity pills, a price pill and "Obtener entrada";
  - the next two events as `compact` cards in a 360px column.
- A section "Próximos 60 días" (or "Más eventos" when filters are active) with a "Ver calendario" pill that opens the drawer, followed by the rest of the events as 4-column `grid` cards that link to the detail page.
- The drawer keeps the date range, chips and organization. Search and discipline move to the page.
- **BREAKING (UX)**: the count widget, the sticky header and the 60-day note are removed. Grid cards no longer have inline "Ver detalles" / "Obtener entrada" buttons: the whole card opens the detail page, where "Obtener entrada" is available.
- The public landing `/eventos` keeps `EventoPublicoCard` and `EventosPublicosGrid` unchanged.

### `/portal/mis-suscripciones` (frame `LSqV5`)
- Header "Mis **suscripciones.**" with:
  - a `GritSegmented variant="solid"` status filter (Todas / Pendiente / Activa / Vencida / Cancelada);
  - a "Pago" pill select (`gritPillSelectClass`);
  - an "Organización" pill select, only when the user has more than one organization.
- Each subscription is one card in three zones:
  - **cover**: plan name in Exo 2 26/600 italic, the plan description, an org pill with mark, and a status `GritTag dot`;
  - **body**: the date range, a time-elapsed label ("Inicia en N días", "Día N de M", "Finalizado") with a period track, and service tiles (`inset`) with units "3/4" + `GritProgress` or "∞";
  - **footer**: the amount (Exo 2 22), the payment status line, and actions. "Renovar" (primary) appears for `vencida`/`cancelada` and opens the organization's `PlanesPublicosModal`. A receipt `GritIconButton` opens the comprobante. "Subir comprobante" / "Resubir comprobante" appear when the payment is `pendiente`/`rechazado`. The rejection reason is shown inline.
- The service fetch adds `planes.descripcion`.

### `/portal/mis-reservas` (frame `x9xdbA`)
- Header "Mis **reservas.**" with an "Exportar CSV" secondary pill.
- Filter bar:
  - a date `GritSegmented` (7 días / Último mes / Mes a la fecha / Todo);
  - an attendance `GritSegmented` (Todos / Asistió / No asistió / Sin registrar);
  - a "Personalizado" pill that opens a popover with Desde / Hasta and "Aplicar" (same 60-day rule);
  - a "Disciplinas" pill select, and an "Organización" pill select when there is more than one organization.
- **BREAKING (UX)**: segment changes apply immediately. The "Aplicar" / "Limpiar" panel is removed. Only the custom range uses "Aplicar".
- A stats strip (Reservas, Asistidas, No asistió, Canceladas) computed from the filtered rows.
- The list is grouped by training month (overline "SEPTIEMBRE 2026" + rule). Each row has:
  - a date tile (`accent` for confirmed, `muted` otherwise);
  - "{organización} · {entrenamiento}";
  - a meta line with discipline icon and name, Bogotá time and a plan pill;
  - Estado (`GritTag dot`), Asistencia (icon + label) and "Reservada" (short date);
  - the rejection reason, when there is one.
- The footnote "Mostrando tus últimas 100 reservas. Usa los filtros para ver más." (or "Mostrando N reservas.") and `GritPagination` when there is more than one page.
- **BREAKING (UX)**: the 8-column table (separate Organización, Disciplina and Plan columns) is replaced by the grouped list.

### `/portal/mis-entradas` (frame `v1lcBA`)
- Header "Mis **entradas.**" with a `GritSegmented` with counts (Próximas N / Pasadas N) and an "Estado" pill select.
- Each purchase is a ticket card with four parts:
  - **photo** (340px): status pill, 64px date tile, organizer and the event name in Exo 2 48 italic;
  - **details**: a countdown pill ("Faltan N días" / "Hoy" / "Finalizado") with the long Bogotá date; four field tiles (Entrada, Total, Pago, Lugar); the ticket code list when there are several tickets; the policy line; the rejection reason; and the actions "Ver evento", "Descargar PDF", "Reenviar comprobante" and "Cancelar" with their existing rules;
  - a dashed perforation;
  - a **stub**: "PRESENTA EN EL INGRESO", the QR of the first valid ticket code (generated client-side with the existing `qrcode` dependency) and the code in JetBrains Mono. When no ticket is valid yet (`pendiente_pago` / `en_validacion`) or all tickets are void, the stub shows a status message instead of the QR.
- **New** "Te puede interesar": up to 4 upcoming events (next 60 days, Bogotá) that the user has no purchase for, as `GritEventCard variant="grid"`, plus "Ver todos los eventos" → `/portal/eventos`. The section is hidden when there are none or the fetch fails.

### All five pages
- Loading, empty and error states use `GritEmptyState`, and errors offer "Reintentar".
- One `h1` per page, built by `GritPageHeader` with `titleAccent`.
- The §11 greps return nothing on the migrated folders.

## Non-goals

- **Orgs**:
  - the map view and the sliders/filters button;
  - distance pills, "Cerca de ti" geo-sorting, ratings (stars) and favorites (heart): none of this data exists;
  - the "DESTACADO" pill: there is no featured flag on `tenants`;
  - the discipline chip row: the directory payload has no tenant disciplines, and reading `disciplinas` of non-member tenants is not covered by RLS. It is a follow-up story.
- **Eventos**: the separate calendar icon button in the header (its job is done by the "Ver calendario" pill), a map, and a "this week" date window for the compact cards (they are simply events #2 and #3 of the filtered list).
- **Mis suscripciones**: a true one-click renewal of the same plan. "Renovar" opens the organization's plan catalog.
- **Mis reservas**: the row "more" (⋯) menu, and cancelling a booking from this page.
- **Mis entradas**: the "add to calendar" button (.ics), and Apple/Google Wallet passes.
- The public landing `/eventos`, the tenant-scoped `/portal/orgs/[tenant_id]/mis-reservas` and `/mis-suscripciones-y-pagos` pages, the shell, tokens, RLS and the database schema.

## Capabilities

### New Capabilities
- `portal-my-subscriptions`: the cross-tenant `/portal/mis-suscripciones` page: header filters, the three-zone subscription card, payment proof actions, renewal entry point, and empty/error states.
- `portal-my-bookings`: the cross-tenant `/portal/mis-reservas` page: immediate filters with custom range, stats strip, month-grouped booking list, CSV export, footnote and pagination.

### Modified Capabilities
- `tenant-marketplace-visibility`: these requirements change:
  - "Directory SHALL render organizations with `TenantDirectoryCard`" is replaced by the v3 two-section marketplace (member cards and explore grid) with search;
  - "Directory card SHALL show membership and privacy badges" moves to the MIEMBRO / PRIVADA overlay pills;
  - the branding-image hook requirement names the new cards instead of `TenantDirectoryCard`.
- `team-events-discovery`: these requirements change:
  - the portal part of "Event listing layout and ordering" (hero + compact + grid, header tools, no count widget);
  - "Event card content", which now applies to the landing only, with a new portal card content;
  - "Portal listing filters" (search in the header, discipline chips, drawer keeps dates and organization);
  - "Listing loading, error and empty states" (portal states via `GritEmptyState`).
- `team-events-my-tickets`: "Mis Entradas listing" and "Mis Entradas actions" change to the ticket card with the QR stub and countdown. A suggestions requirement is added.
- `grit-design-system`: "Avatar primitive" gains the `org` tone and club sizes. New requirements are added for the media card, overlay pill, date tile and event card primitives.

## Impact

- **UI**:
  - `src/components/portal/{PortalTenantsPage.tsx,tenant/,eventos/,mis-suscripciones/,mis-reservas/,mis-entradas/}`;
  - `src/components/ui/grit/` (new primitives, `GritAvatar`, `index.ts`, `icon-map.ts`).
- **Hooks**:
  - new `src/hooks/portal/tenant/useTenantDirectoryFilter.ts`;
  - new `src/hooks/portal/mis-entradas/useEventosSugeridos.ts`;
  - new `src/hooks/portal/mis-entradas/useTicketQr.ts`;
  - `useMisReservas` (immediate apply, stats, month groups);
  - `useMisSuscripciones` (tenant option count unchanged; elapsed-period helper).
- **Services/types**:
  - `mis-suscripciones.service.ts` adds `plan:planes(nombre, descripcion)`;
  - `MiSuscripcionRow` gains `plan_descripcion`;
  - no new tables, RPCs or RLS.
- **Lib**:
  - new `src/lib/portal/mis-suscripciones-periodo.ts` (elapsed label and percentage, date-only safe);
  - new `src/lib/portal/mis-reservas-agrupacion.ts` (month groups, stats);
  - new `src/lib/portal/mis-entradas-countdown.ts`;
  - `normalizeSearch` reused from the events utils.
- **Dependencies**: none new (`qrcode` is already installed and used by the PDF).
- **Docs**:
  - `DESIGN.md`: §4 kit tables; §9 moves the event-card rows out of "not yet in the kit"; §1 marks the five frames as migrated;
  - `projectspec/03-project-structure.md`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/portal/orgs/page.tsx` | Unchanged entry, renders the new `PortalTenantsPage` |
| Page | `src/app/portal/eventos/page.tsx` | Unchanged (Suspense wrapper) |
| Page | `src/app/portal/(atleta)/mis-suscripciones/page.tsx` | Unchanged entry; the service adds the plan description |
| Page | `src/app/portal/(atleta)/mis-reservas/page.tsx` | Unchanged |
| Page | `src/app/portal/(atleta)/mis-entradas/page.tsx` | Unchanged |
| Component (kit) | `src/components/ui/grit/GritMediaCard.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritOverlayPill.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritDateTile.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritEventCard.tsx` | New (`hero` / `compact` / `grid`) |
| Component (kit) | `src/components/ui/grit/GritAvatar.tsx` | `tone="org"`, sizes 20/26/36/42/52 |
| Component (kit) | `src/components/ui/grit/index.ts`, `icon-map.ts` | Exports; new icons (`arrow_outward`, `bookmark`, `receipt_long`, `qr_code_2`, `hourglass_top`, `do_not_disturb_on`, `cancel`, …) |
| Component | `src/components/portal/PortalTenantsPage.tsx` | v3 header + search + two sections + states |
| Component | `src/components/portal/tenant/ClubMemberCard.tsx` | New (featured member card) |
| Component | `src/components/portal/tenant/ClubExploreCard.tsx` | New (grid card) |
| Component | `src/components/portal/tenant/SolicitarAccesoButton.tsx` | Restyle with `GritButton`, add `size`/`variant` props |
| Component (delete) | `src/components/portal/tenant/TenantDirectoryCard.tsx`, `TenantDirectoryList.tsx` | Remove |
| Component | `src/components/portal/planes-publicos/VerPlanesButton.tsx` | Add `appearance="overlay" \| "secondary"` (v3 pill); keep modal behavior |
| Component | `src/components/portal/eventos/EventosPublicosPage.tsx` | v3 header, chips, featured row, grid section, states |
| Component | `src/components/portal/eventos/EventosPortalFeatured.tsx` | New (hero + compact column) |
| Component | `src/components/portal/eventos/EventosPortalGrid.tsx` | New (grid cards) |
| Component | `src/components/portal/eventos/EventosPublicosFiltersDrawer.tsx` | Remove search and discipline controls (portal only) |
| Component (delete) | `src/components/portal/eventos/EventosDisponiblesWidget.tsx` | Remove (unused) |
| Component | `src/components/portal/mis-suscripciones/MisSuscripcionesYPagosPage.tsx` | v3 header + filters + list + states |
| Component | `src/components/portal/mis-suscripciones/SuscripcionCard.tsx` | Rewrite: cover / body / footer |
| Component | `src/components/portal/mis-suscripciones/SuscripcionPagoZone.tsx` | New: footer zone (replaces `PagoCard`) |
| Component | `src/components/portal/mis-suscripciones/MisSuscripcionesFilters.tsx` | Rewrite: segmented + pill selects |
| Component (delete) | `src/components/portal/mis-suscripciones/PagoCard.tsx` | Folded into `SuscripcionPagoZone` |
| Component | `src/components/portal/mis-reservas/MisReservasPage.tsx` | v3 layout |
| Component | `src/components/portal/mis-reservas/MisReservasFilterBar.tsx` | New (replaces `MisReservasFiltersPanel`) |
| Component | `src/components/portal/mis-reservas/MisReservasCustomRange.tsx` | New: popover |
| Component | `src/components/portal/mis-reservas/MisReservasStats.tsx` | New |
| Component | `src/components/portal/mis-reservas/MisReservasList.tsx` | New (replaces `MisReservasTable`) |
| Component (delete) | `MisReservasFiltersPanel.tsx`, `MisReservasTable.tsx` | Remove |
| Component | `src/components/portal/mis-entradas/MisEntradasPage.tsx` | v3 header + segmented + list + suggestions |
| Component | `src/components/portal/mis-entradas/MiCompraCard.tsx` | Rewrite as ticket card |
| Component | `src/components/portal/mis-entradas/MiCompraTicketStub.tsx` | New: QR stub |
| Component | `src/components/portal/mis-entradas/EventosSugeridos.tsx` | New |
| Hook | `src/hooks/portal/tenant/useTenantDirectoryFilter.ts` | New: search + member/explore split |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | Immediate apply, `customRange` apply, `stats`, `groups` |
| Hook | `src/hooks/portal/mis-entradas/useEventosSugeridos.ts` | New |
| Hook | `src/hooks/portal/mis-entradas/useTicketQr.ts` | New: lazy `qrcode` → data URL |
| Lib | `src/lib/portal/eventos-card-model.ts` | New: event → card props (place, capacity, price); place helper shared with `EventoPublicoCard` |
| Lib | `src/lib/text/normalize-search.ts` | New: accent-folding normalizer moved out of `eventos-publicos.utils.ts` (re-exported) |
| Lib | `src/lib/portal/tenant-paths.ts` | New: `getDefaultTenantPath` moved out of `TenantDirectoryList` |
| Lib | `src/lib/portal/mis-suscripciones-periodo.ts` | New |
| Lib | `src/lib/portal/mis-reservas-agrupacion.ts` | New |
| Lib | `src/lib/portal/mis-entradas-countdown.ts` | New |
| Service | `src/services/supabase/portal/mis-suscripciones.service.ts` | Select `planes.descripcion` |
| Types | `src/types/portal/mis-suscripciones.types.ts` | `plan_descripcion: string \| null` |
| Types | `src/types/portal/reservas.types.ts` | `MisReservasStats`, `MisReservasMonthGroup` |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch `feat/grit-arena-v3-portal-athlete-pages` from `develop`. Take "before" screenshots of the five routes at 375 / 768 / 1440.
2. **Kit first**: `GritDateTile`, `GritOverlayPill`, `GritMediaCard`, then `GritEventCard` (hero / compact / grid) and the `GritAvatar` org tone. Check them against `zRDg2`, `R1QegD`, `uCKmV`.
3. **Eventos**: chips + header search, featured row, grid section, drawer trimmed, states. Check that `/eventos` (landing) is unchanged.
4. **Orgs**: `useTenantDirectoryFilter`, member and explore cards, restyled `SolicitarAccesoButton` / `VerPlanesButton`, states. Delete the old directory card and list.
5. **Mis suscripciones**: service + type (`plan_descripcion`), period lib, the card's three zones, filters, states.
6. **Mis reservas**: grouping/stats lib, hook changes (immediate apply), filter bar + custom range popover, stats strip, grouped list, footnote + pagination.
7. **Mis entradas**: countdown lib, `useTicketQr`, ticket card + stub, `useEventosSugeridos` + suggestions, segmented with counts.
8. Verify each frame at 1440 and stacking at 768 / 375: no horizontal scroll, one `h1`, keyboard pass on segmented controls, chips, popover and modals, and the §11 greps on the migrated folders. Run `npm run lint`, `npx tsc --noEmit` and the tests.
9. Update `DESIGN.md` and `03-project-structure.md`, then write the commit message and PR description.
