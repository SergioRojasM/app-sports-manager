# Design

## Context

- The five routes are thin entries that render client feature components:
  - `PortalTenantsPage`, which uses `useTenantView({ mode: 'directory' })`;
  - `EventosPublicosPage` (`useEventosPublicos`, `useObtenerEntrada`);
  - `MisSuscripcionesYPagosPage`, which gets its rows from the RSC via `fetchMisSuscripciones`;
  - `MisReservasPage` (`useMisReservas`, server-side filters through `reservasService.getMisReservas`, cap 100);
  - `MisEntradasPage` (`useMisEntradas`).

  All data access stays as it is. This change is presentation, plus a few pure helpers and three small hooks.
- `EventoPublicoCard` and `EventosPublicosGrid` are shared with the public landing `/eventos` (`EventosLandingPage`). The landing is out of scope and must render the same as before.
- `team-events-discovery` requires both listings to query **only** `eventos`. The org mark on portal event cards therefore uses initials from `nombreTenant`, not the tenant logo.
- US-0141 left the kit without the photo-card family. `DESIGN.md` §9 lists `zRDg2` / `R1QegD` / `uCKmV` and the over-photo pill and date tile as "promote in the first page story that needs them". This is that story.
- Design source: `projectspec/designs/pencil/grit-arena-v3.pen`. Measurements read from the file (content area 1120 wide, `Content` = vertical, gap 20, padding 12/32/32/32, provided by the shell):

| Frame / node | Element | Measurements |
|---|---|---|
| all five | Page title | Exo 2 40/300 `ink` + accent word in `brand` (italic on LSqV5 / x9xdbA / v1lcBA, upright on kMj4F / zY4v8), gap 12 |
| `kMj4F` `y2vEfQ` / `zY4v8` `pLXVp` | Header search | 320×44, pill, white 4% fill, white 12% stroke, padding 0/18, icon 16 `ink-3`, 13px placeholder |
| `zY4v8` `ADLy0` | Discipline chips | gap 8; chip pill padding 9/16, gap 8, 15px icon, 12/500; active = `brand` fill + `on-brand` 12/600; idle = white 3% fill, white 10% stroke, cyan icon |
| `kMj4F` `K1KpU` | Member club card | 552×300, radius 28, padding 20; top: pill "MIEMBRO" (glass, cyan check icon, 11/600) + 38px round arrow; bottom: 52px org mark + name Exo 2 italic + meta 12px; actions "Ver planes" (glass pill, padding 11/18) + "Ingresar" (brand, padding 11/20, arrow icon) |
| `kMj4F` `UrDey` | Explore club card | 268×342, radius 24, padding 14; bottom: 36px org mark (initials Exo 2 15/700), name 15/600, meta 11px `ink-2` with 12px cyan icon |
| `zY4v8` `gT9JT` (`zRDg2`) | Hero event | 744×330, radius 28, padding 24, shadow `0 20 48 #00000080`; badges gap 8; date tile 64×59 (day Exo 2 29, month 10/700 tracking 1.5 cyan); organizer 26px mark + 12/500 `ink-2`; name Exo 2 48/600 italic; meta pills gap 8; price glass pill 13/600 + CTA brand 13/600 padding 12/22 with glow `0 6 … #14DBC459` |
| `zY4v8` `UArMW` (`R1QegD`) | Compact event | 360×157, radius 24, padding 16; date tile 48×52 (day 22); name Exo 2 20/500 italic; 34px round arrow |
| `zY4v8` `l1ZX0s` (`uCKmV`) | Grid event | 268×312 (387 on v1lcBA), radius 24, padding 14; date tile 48×52 + price pill; name 15/600; meta 11px `ink-2` + 12px cyan discipline icon |
| `zY4v8` `WAccz` | Section header | title Montserrat 16/500; pill action padding 7/14, white 6% fill, white 10% stroke, 12/500, 13px icon |
| `LSqV5` `WgTTu` | Status segmented | track black 30%, white 8% stroke, inner shadow, padding 4, gap 2; option padding 8/14, 12/500 `ink-2`; active brand fill 12/600 `on-brand` + glow — `GritSegmented variant="solid"` |
| `LSqV5` `r8qoH` | Pill select | padding 11/16, gap 8, white 4% fill, white 12% stroke, cyan 15px icon, 12/500, 14px chevron — `gritPillSelectClass` |
| `LSqV5` `ciyBV` | Subscription card | 1120×168, radius 24, card gradient + shadow; cover 300 (padding 18/22, gap 12, right divider white 7%); body fill (padding 18/24, gap 12); footer 240 (padding 18/22, gap 14, left divider). Plan Exo 2 26/600 italic; description 11px `ink-2`; org pill padding 5/10/5/5 with a 20px mark; status pill 11/600 + 6px dot. Dates 12px `ink-2` + 13px icon; elapsed 11px `ink-3`; track 4px white 20%. Service tile radius 14, padding 10/12, white 2.4% fill, white 6% stroke; label 12/500; value Exo 2 14/500; bar 4px, white 8% track, brand fill + glow. Price Exo 2 22; pay line 11/500 cyan + 12px icon; "Renovar" brand padding 10/16 + glow; receipt round button 38px |
| `x9xdbA` `Lbdo2` | Filters row | two solid segmented tracks, a flex spacer, then two pill selects ("Personalizado", "Todas las disciplinas") |
| `x9xdbA` `aVWHV` | Stats strip | 1120×72, radius 24, padding 18/26; 4 items gap 14: 20px icon (ink / cyan / `#FF8A80` / ink-3), number Exo 2 36/300, label 12px `ink-2`; 1px white 8% dividers |
| `x9xdbA` `m87D2O` | List panel | radius 24, padding 8/24/14/24; column heads 10/600 tracking 1.4 `ink-3` (56 · 514 · 130 · 140 · 120 · 32, gap 16); month overline 10/600 tracking 2.4 cyan + 1px cyan 15% rule; row padding 10/0, bottom stroke white 5%; date tile 56×46 radius 14 (confirmed: cyan 8% fill, cyan 25% stroke; else white 2% / white 7%); name 14/600 (`ink` confirmed, `ink-2` cancelled); meta 11px with 3px dot separators and a plan pill 10/500 padding 2/8 |
| `x9xdbA` `PNOXA` | Footnote | 11px `ink-3` + 13px info icon, padding 0/8 |
| `v1lcBA` `Up3Tc` | Segmented with counts | option padding 8/8/8/16, gap 8; count bubble 20px (active `on-brand` 15%, idle white 6%) 10/700 — `GritSegmented` `count` |
| `v1lcBA` `Q4MEM` | Ticket card | 1120×300, radius 28; photo 340 (padding 22); details 518 (padding 26/28, gap 20): countdown pill (cyan 12% fill, cyan 35% stroke, 11/600) + date 13/500 `ink-2`; 4 field tiles 107×62 radius 16 padding 12/14 (label 11px `ink-3` + 12px icon, value Exo 2 17); policy 11px `ink-3`; actions gap 8 (40px round icon button, secondary pill, brand pill). Perforation: 2×7 dashes, gap 7, white 15%. Stub 260 (padding 26/24, gap 14, radial cyan fill): overline 9/600 tracking 2 `ink-3`; QR tile 148 radius 18 padding 12 on `ink`; code label 10px + value JetBrains Mono 15/600 tracking 1.5 cyan |

## Goals / Non-Goals

**Goals:**
- Match the five frames at 1440 px and stack cleanly at 768 and 375 px using kit components only. Missing pieces are added to the kit, never forked in feature folders.
- Keep every existing behavior that the specs keep:
  - access request states;
  - get-ticket flow;
  - proof upload;
  - purchase actions;
  - CSV export;
  - visibility rules.
- Leave `/eventos` (landing), `TenantIdentityCard` and tenant-scoped athlete pages pixel-identical.
- Make both §11 greps return nothing on `src/components/portal/{tenant,eventos,mis-suscripciones,mis-reservas,mis-entradas}` and `PortalTenantsPage.tsx`.

**Non-Goals:**
- The proposal's data-less design elements (distance, rating, favorites, featured flag, tenant disciplines, row menu, `.ics`, true renewal).
- Changes to services beyond `planes.descripcion`, and to RLS or the schema.
- A server-rendered rewrite of the client pages.

## Decisions

### 1. Architecture (page → component → hook → service → types)

```
/portal/orgs ─ PortalTenantsPage ('use client')
   ├─ useTenantView({mode:'directory'})                 (unchanged)
   ├─ useTenantDirectoryFilter(tenants) → { query, setQuery, members, explore }
   ├─ GritPageHeader title="Encuentra tu" titleAccent="club." actions=<GritSearchField size="lg"/>
   ├─ InvitacionesPendientesSection                     (unchanged)
   ├─ "Tus clubes"     → ClubMemberCard[]   (GritMediaCard xl/accent · GritOverlayPill · GritAvatar org 52 · VerPlanesButton overlay · GritButton Ingresar)
   └─ "Explora clubes" → ClubExploreCard[]  (GritMediaCard lg · GritAvatar org 36 · VerPlanesButton overlay · SolicitarAccesoButton size="sm")

/portal/eventos ─ EventosPublicosPage ('use client')
   ├─ useEventosPublicos()  (+ hasDrawerFilters)        useObtenerEntrada({surface:'portal'})
   ├─ header: GritSearchField(search) · GritIconButton "Filtros" (dot when hasDrawerFilters)
   ├─ GritChip row ← disciplinaOptions (+ getDisciplinaVisual icon)
   ├─ EventosPortalFeatured  → GritEventCard hero (items[0]) + compact (items[1..2])
   ├─ section header ("Próximos 60 días" | "Más eventos") + "Ver calendario" → drawer
   ├─ EventosPortalGrid      → GritEventCard grid (items[3..])
   ├─ EventosPublicosFiltersDrawer (dates + org only)
   └─ EventoEntradasModal                               (unchanged)

/portal/mis-suscripciones ─ RSC page → fetchMisSuscripciones (+ plan descripcion)
   └─ MisSuscripcionesYPagosPage ── useMisSuscripciones (unchanged API)
        ├─ GritPageHeader actions = MisSuscripcionesFilters (GritSegmented solid + pill selects)
        └─ SuscripcionCard[]  cover │ body (periodo lib + service tiles + GritProgress) │ SuscripcionPagoZone
                                                         (useSubirComprobante, useComprobanteViewer, PlanesPublicosModal)

/portal/mis-reservas ─ MisReservasPage ── useMisReservas (immediate apply, latest-request guard)
   ├─ header + GritButton secondary "Exportar CSV"
   ├─ MisReservasFilterBar (2× GritSegmented solid · MisReservasCustomRange popover · pill selects)
   ├─ MisReservasStats   ← computeReservaStats(rows)          lib/portal/mis-reservas-agrupacion.ts
   ├─ MisReservasList    ← groupReservasByMonth(pageRows)     (GritDateTile sm · GritTag · GritIcon)
   └─ footnote + GritPagination

/portal/mis-entradas ─ MisEntradasPage ── useMisEntradas (unchanged) + useEventosSugeridos(compras)
   ├─ header actions: GritSegmented (counts) + Estado pill select
   ├─ MiCompraCard[]  photo (GritMediaCard) │ details (countdown lib, field tiles, actions) ┆ MiCompraTicketStub (useTicketQr)
   └─ EventosSugeridos → GritEventCard grid ×4 + "Ver todos los eventos"
```

### 2. Kit primitives are layout shells; domain mapping stays in features
`GritEventCard` takes generic content:
- `title`, `href`, `image`, `dateIso`;
- `badges`, `meta`, `price`, `organizer: { name }`, `actions`;
- `headingLevel`, `variant`.

It renders `GritMediaCard` + `GritOverlayPill` + `GritDateTile`. The feature folder maps `EventoPublicoListItem` → props in one place: `src/lib/portal/eventos-card-model.ts`, with `getEventoLugarLabel`, `getEventoCupoLabel` and the price summary reusing `formatEventoPrecio`. The place-label logic now inline in `EventoPublicoCard` is extracted there and reused by both cards, so the landing card keeps its output.

*Alternative*: page-local `EventoHeroCard` etc. Rejected: `DESIGN.md` §9 asks for promotion, and `/portal/mis-entradas` already reuses the grid card.

**Link semantics**:
- With `href` and no `actions`, the root is a single `Link` (the `grid` card).
- With `actions`, the root is an `<article>`. The title is the link, stretched with `after:absolute after:inset-0`, and the actions sit on `relative z-10`. This avoids nested interactive elements on the hero card.

### 3. `GritAvatar` org tone and image fallback
`tone="org"` adds the club-mark style (`bg-grit-surface-deep/80 border-grit-cyan/50 text-grit-cyan font-grit-title font-bold italic`). Sizes are extended to 20 / 26 / 36 / 42 / 52, with initials scaled ~0.36 × size. The image branch becomes a tiny client child (`onError` → initials), so the existing server-side callers keep working. Tenant logos still go through `useTenantBrandingImages` first; the avatar fallback is the last step.

### 4. Orgs: filter hook and card split
`useTenantDirectoryFilter(tenants)` normalizes with the accent-folding `normalizeSearch`. It is exported from `eventos-publicos.utils.ts`, moved into `src/lib/text/normalize-search.ts` and re-exported, so there is no copy.

Members are `canAccess && userMembershipRole`, the same rule as today. Both lists are sorted with `localeCompare('es')`.

`getDefaultTenantPath` moves from `TenantDirectoryList` to `src/lib/portal/tenant-paths.ts`.

Description line: first non-empty line of `identity.description`, `line-clamp-1`.

`SolicitarAccesoButton` keeps its state machine and swaps its markup for `GritButton`:
- `size="sm"`;
- `variant="primary"` for request;
- `secondary` for pending, blocked and history.

`VerPlanesButton` gets `appearance: 'overlay' | 'secondary'`. The default is `secondary`, so other callers (tenant landing) change only from v2 to v3 pill styling.

### 5. Eventos: reuse the hook, move two filters out of the drawer
`useEventosPublicos` stays the single source of state. It only adds `hasDrawerFilters` (date range ≠ default, or organization set) for the button dot.

The drawer drops its search and discipline props. Only the portal uses it, which was checked with `grep`.

The chip row uses `GritChip` inside `role="group" aria-label="Disciplinas"`. It scrolls horizontally inside its row (`overflow-x-auto grit-scrollbar-none`) on narrow screens.

Featured split:
- `items[0]` → hero;
- `items[1..2]` → compact;
- `items[3..]` → grid.

The layout is `xl:grid-cols-[1fr_360px]`. When there is no compact item, the hero takes full width.

The hero's "Obtener entrada" calls `obtenerEntrada.obtenerEntrada(evento)` and respects `disabled`.

`EventosDisponiblesWidget` is deleted.

### 6. Subscriptions: date-only period math in lib
`src/lib/portal/mis-suscripciones-periodo.ts` handles the period math:
- It parses `'YYYY-MM-DD'` into UTC day numbers (`Date.UTC(y, m-1, d) / 86_400_000`) and compares them with `todayKeyInBogota()`. It never calls `new Date(dateStr)`.
- `getPeriodo(inicio, fin, hoyKey)` returns `{ estado: 'futuro' | 'en_curso' | 'finalizado' | 'sin_fechas', label, pct }`.
- `formatRangoFechas` returns "18 ago – 17 sep 2026", or "28 dic 2025 – 27 ene 2026" when the years differ.

The card is a `GritCard variant="card" padding="none"` with `grid xl:grid-cols-[300px_1fr_240px]`. Zone dividers are `xl:border-l border-white/[0.07]`; below `xl` they become `border-t`.

`SuscripcionPagoZone` absorbs `PagoCard`: the comprobante viewer, the upload with its hidden file input and `aria-label`, and the rejection reason. The receipt icon button opens the signed URL in a new tab, as the existing viewer does.

"Renovar" opens `PlanesPublicosModal` through `BodyPortal`, with `initialSearch={plan_nombre}`, so the expired plan is pre-filtered in the catalog. Focus returns to the trigger.

### 7. Bookings: immediate apply with a latest-request guard
`useMisReservas` changes:
- `updateFilter` sets the filter and calls `fetchReservas(next)` for segment and select changes.
- `applyCustomRange(desde, hasta)` sets `datePreset: 'rango_personalizado'` and fetches.
- A `requestIdRef` drops stale responses.
- `disciplines` / `tenantOptions` are computed from the first unfiltered response, stored in state, and not recomputed from filtered rows.
- New derived values: `stats = computeReservaStats(rows)`, and `pageGroups = groupReservasByMonth(paginatedRows)`. Pagination runs before grouping, so headings repeat per page.
- `applyFilters` and the draft/applied split are removed.
- `exportCsv` is unchanged: it exports `rows`, which are the filtered rows.

`src/lib/portal/mis-reservas-agrupacion.ts`:
- **Month key and label**: `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', month: 'long', year: 'numeric' })`, uppercased.
- **Time**: `h:mm a`, lowercase, in Bogotá.
- **Booking date**: "16 sep".
- **Status**: `reservaEstadoTag(estado)` → `{ label, tone }` (confirmada → accent, pendiente → warning, cancelada → neutral, rechazada → danger).

`MisReservasCustomRange` is a pill trigger (`aria-expanded`, `aria-controls`) and a `GritCard variant="glass"` popover with two `gritInputClass` date inputs. It keeps `validateDateRange` (moved into the lib). It closes on Escape and on outside `pointerdown`, and returns focus to the trigger.

Responsive layout:
- From `lg`, rows use the same `grid-cols-[56px_minmax(0,1fr)_130px_140px_120px]` as the column heads.
- Below `lg`, rows switch to `grid-cols-[56px_1fr]` with a wrapped meta line.

### 8. Tickets: QR on the client, suggestions in parallel
`useTicketQr(code)` does `import('qrcode')` lazily and runs `toDataURL(code, { margin: 1, width: 296, errorCorrectionLevel: 'M' })`, the same options family as the PDF. Results are cached in a module-level `Map`. It returns `{ src, error }`. On error, the stub shows the code without a QR.

The ticket picked for the QR is the first `activa` ticket. The "Usada" badge shows when it has `ingresoAt`.

`src/lib/portal/mis-entradas-countdown.ts` diffs Bogotá day keys: 0 → "Hoy", 1 → "Mañana", >1 → "Faltan N días", <0 → "Finalizado". `formatFechaLarga` returns "Sábado 21 de noviembre · 4:20 pm".

`useEventosSugeridos(compras)`:
- calls `eventosService.listEventosPublicados({ soloPublicos: false })` once, in parallel with `useMisEntradas`;
- excludes `compra.eventoId` and every `ticket.eventoId`;
- keeps events dated within [today, today + 60] in Bogotá;
- takes the first 4;
- on error it logs `console.error` and returns `[]`.

Card layout: `grid lg:grid-cols-[340px_minmax(0,1fr)_2px_260px]`. Below `lg` the stub moves under the details, and the perforation becomes a horizontal dashed rule (`border-t border-dashed border-white/15`).

The existing modals (`CancelarCompraModal`, `ReenviarComprobanteModal`) are restyled only if they fail the §11 greps.

### 9. Headers and states
Every page uses `GritPageHeader title titleAccent italic? actions`:
- `italic` for the three "Mis …" pages;
- upright for the marketplaces.

Loading, error and empty states use `GritEmptyState`, and errors offer "Reintentar" with `GritButton variant="secondary"`. A refresh failure with data on screen (bookings filter change) shows a compact danger banner above the list instead of replacing it.

### 10. Icons
New names go to `icon-map.ts`: `arrow_outward`, `bookmark`, `receipt_long`, `qr_code_2`, `hourglass_top`, `event_available`, `do_not_disturb_on`, `cancel`, `radio_button_unchecked`, `download`, `tune`, `calendar_month`, `info`, `location_on`, `group`, `schedule`, `confirmation_number`, `sell`. Only the ones missing are added, with Lucide equivalents per the map's convention.

## Risks / Trade-offs

- **[Directory has no disciplines]** → No chip row on `/portal/orgs`, so the page diverges from `kMj4F`. This is called out in the PR, with a follow-up story (a tenant disciplines summary in the directory RPC).
- **[Immediate apply sends more requests]** → Each segment click is one capped query (≤100 rows). The latest-request guard prevents flicker. No debounce is needed because segments are discrete.
- **[Grid event cards lose the inline "Obtener entrada"]** → It adds one click for non-hero events. The hero keeps the CTA, and the detail page has it. Spec updated (`team-events-discovery`).
- **[Shared landing components]** → `EventoPublicoCard` changes only by importing the extracted place helper. A before/after screenshot of `/eventos` is part of the verification.
- **[QR shown on screen]** → It encodes the same code already printed on the page and in the PDF, and only for `activa` tickets of the signed-in owner. No new exposure.
- **[Second request on Mis entradas]** → It runs in parallel and never blocks the list. On failure the section hides silently.
- **["Renovar" is a catalog, not a renewal]** → `initialSearch` pre-filters the same plan, so it is one click from subscribing.
- **[`GritAvatar` API growth]** → The change is additive, and existing callers keep the 32/34/38 sizes and tones. `tsc` catches misuse.
- **[Date-only parsing]** → Plan dates are `date` columns, so the period lib never builds `Date` from them in local time (the same bug class as the inicio story).
- **[Long organization or event names over photos]** → Titles truncate in grid and compact cards (`line-clamp-2` on the hero) and keep the full text in the accessible name.

## Migration Plan

Frontend-only. There are no migrations, RPC or RLS changes, so no Supabase push. Ship it behind the normal PR to `develop`. To roll back, revert the merge commit. The only data-layer touch (`planes.descripcion` in a select) is backward compatible.

## Open Questions

- Should "DESTACADO" and the org discipline chips come back once there is data (a featured flag, tenant disciplines in the directory)? This is deferrable: it does not change this change's specs or tasks.
