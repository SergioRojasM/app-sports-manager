# Design

## Context

- `/portal/inicio` is a server component that runs five service calls in parallel and renders `InicioPage`. Its children are v2 markup: `border-grit-glass-border bg-grit-card` boxes, `rounded-md` buttons, emerald/amber/rose badges, and a featured-training hero that is no longer in the design.
- US-0141 already gave the page the v3 tokens, the kit and the shell. This story finishes the route per `DESIGN.md` §10.
- Design source: frame `lhbhK` ("App · Inicio v9 (bento con tarjetas v6)") in `projectspec/designs/pencil/grit-arena-v3.pen`. Measurements read from the file:

| Node | Element | Measurements |
|---|---|---|
| `yTqxU` | Content | vertical, gap 24, padding 20/32/32 (the shell provides it) |
| `Ju5F9` | Welcome | "Bienvenido," + accent name, Exo 2 46/300; subtitle Montserrat 14 `ink-2`; gap 12 |
| `N1yQj` | KPI row | 4 × 268×154, gap 16 |
| `eiIt1` | KPI card | radius 28, padding 22, gap 18, card gradient `#111A21→#0B1116`, stroke white 14%→3%, shadow `0 20 48 #00000080`. Top: 36px icon chip (cyan 12% fill, cyan 35% stroke) + 36px round arrow button (white 6% fill, white 10% stroke). Value: number Exo 2 56/300 + label 13/500 `ink` + hint 12 `ink-3` |
| `vBtNu` | KPI highlight | gradient `#14302D→#0B1116`, cyan 40%→5% stroke; hint "Estás al día" in `brand` |
| `brsfw` | Agenda panel | 704 wide, radius 28, padding 22, gap 16. Header: title 16/500 + subtitle 12 `ink-3`; range pill (calendar icon, 12/500, padding 9/14) + 36px arrow button |
| `s0PYoH` | Week strip | 7 × 87×64, gap 8, radius 18. Selected: `brand` fill, DOW 10/600 + number Exo 2 24/300 in `on-brand`. Others: white 3% fill, white 7% stroke |
| `g4TUsF` | Grid (empty) | hour labels 10px `ink-3` (6:00 am, 8:00 am, 10:00 am, 12:00 pm, 5:00 pm, 7:00 pm) + 1px lines; overlay card 348 wide, radius 24, padding 24/36, `#0B1116D9`, white 8% stroke; 56px icon ring (radial cyan, cyan 35% stroke); title 15/500; sub 12 `ink-3`; button "Reservar sesión" (plus icon, 13/600, brand) |
| `Pn3Wh` | Mis suscripciones | 400 wide, radius 28, padding 22, gap 12; header title 16/500 + segmented (track black 30%, active brand fill, 11px labels) |
| `qLx9S` | Mis organizaciones | header title + "Ver todas" pill (12/500, arrow-right); row radius 18, padding 12/14, white 3% fill; logo tile 42px radius 14 (`#05080B` fill, cyan 35% stroke, initial Exo 2 20/700 cyan); name 14/600; role pill 11/600 cyan |
| `dBJ8K` (`p5Ms22`) | Agenda row (populated reference) | time column (JetBrains Mono 11/600 `ink-2` + 1px line), inset card radius 16, padding 14, gap 10: 3px discipline bar + name 13/600, venue 11 `ink-3` with pin icon |

- The populated agenda state is not drawn in `lhbhK` (it shows only the empty state). The row reuses the agenda-session row from `p5Ms22` (`dBJ8K`), without coach and capacity.

## Goals / Non-Goals

**Goals:**
- Match frame `lhbhK` at 1440px and stack cleanly at 768 and 375px.
- Use kit components only. Extend the kit (`GritKpiCard`) instead of hand-rolling the tall KPI card.
- Make KPI count and agenda share one 7-day Bogotá window, computed once on the server.
- Leave the §11 greps clean on `src/components/portal/inicio`.

**Non-Goals:**
- Week navigation, an hour-positioned calendar, the collapsed sidebar, organization city/type, coach and capacity in rows, booking from the home. Also out of scope: shell, token, RLS or schema changes (see the proposal).

## Decisions

### 1. Architecture (page → component → hook → service → types)

```
app/portal/inicio/page.tsx  (RSC)
 ├─ auth.getUser() ─────────────── redirect /auth/login if none
 ├─ readPortalProfileName()  ←── portal_profile cookie (no DB)
 ├─ ventana = buildAgendaVentana(now)          lib/portal/inicio-agenda.ts
 ├─ Promise.all([
 │    fetchInicioStats(sb, uid, ventana),       services/.../inicio.service.ts
 │    fetchProximosEntrenamientos(sb, uid, ventana),
 │    fetchMisSuscripciones, fetchPagosPendientes, fetchMisMembresias ])
 └─ <InicioPage data nombre ventana/>
      ├─ InicioWelcome            (GritPageHeader title="Bienvenido," titleAccent=nombre)
      ├─ InicioStatsCards         (4 × GritKpiCard layout="stacked")
      └─ grid xl:[1fr_400px]
          ├─ InicioAgendaSemanal  'use client' ── useAgendaSemanal(dias, hoyKey)
          │    ├─ header + range pill + GritIconButton → /portal/mis-reservas
          │    ├─ week strip (7 × day button, aria-pressed)
          │    └─ InicioAgendaItem[] | empty overlay (hour lines + GritEmptyState-like card)
          └─ right column
               ├─ InicioSuscripciones 'use client' (GritSegmented solid + rows)
               └─ InicioOrganizaciones (rows + InicioOrgLogo 'use client' onError fallback)
```

### 2. The window is computed on the server and passed down
`buildAgendaVentana(now)` returns `{ desde, hasta, hoyKey, dias: [{ key: 'YYYY-MM-DD', dow: 'DOM', dia: 15, nombreLargo: 'Domingo 15' }×7], rangoLabel: '15 – 21 nov' }`. Day keys are taken in `America/Bogota` with `Intl.DateTimeFormat('en-CA', { timeZone })`. `desde` is the current instant, and `hasta` comes from `bogotaDayEndIso(dias[6].key)`. The client gets `hoyKey` from the server rather than computing "today" itself, which avoids hydration mismatches around midnight and with browser time zones. *Alternative*: compute in the client. Rejected because of hydration mismatches and because the server needs the same bounds for the queries.

### 3. Service changes are minimal
- `fetchProximosEntrenamientos(supabase, userId, ventana)`: `.gte(desde).lte(hasta)` on `entrenamientos.fecha_hora`, with no `limit` (one athlete's week is small). A defensive cap of 100 rows is logged if hit.
- `fetchInicioStats(supabase, userId, ventana)`: the bookings count adds `.lte('entrenamientos.fecha_hora', hasta)`.
- The other three services are unchanged. The subscriptions hint (soonest `fecha_fin` of active subscriptions) is derived in the component from `suscripciones`, so no query is added.

### 4. Grouping in lib, selection in a hook
`agruparPorDia(entrenamientos, dias)` returns `Record<key, InicioEntrenamiento[]>`, already ordered. `useAgendaSemanal({ dias, hoyKey, porDia })` holds `selectedKey` and returns `{ selectedKey, select, sesionesDelDia, ventanaVacia }`. It is pure UI state, so there's no data fetching in the hook.

### 5. `GritKpiCard` gets a `stacked` layout (kit extension, not a fork)
New props: `layout?: 'inline' | 'stacked'` (default `inline`, so existing call sites are unchanged), `hint?: ReactNode`, `hintTone?: 'muted' | 'accent' | 'warning'`, `href?: string`, `hrefLabel?: string` (required when `href` is set, enforced with a discriminated union). In stacked mode:
- surface `GritCard variant={highlight?'highlight':'card'}` with `rounded-grit-3xl p-[22px]`;
- top row: icon chip `h-9 w-9 rounded-full border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-cyan`, plus a `GritIconButton href icon="arrow_outward" size="md"` with `label={hrefLabel}`;
- value row: `font-grit-title text-[56px] font-light leading-none`, then a label (13/500 `grit-text`) and hint (12px, tone class) column.

*Alternative*: a page-local `InicioKpiCard`. Rejected because `DESIGN.md` §9 forbids forking kit components, and other v3 pages (`LSqV5`, `x9xdbA`) draw the same tall KPI.

### 6. Week strip and rows
- Each day is a `<button type="button" aria-pressed>` with `aria-label="Jueves 19, 2 sesiones"`, in a `role="group" aria-label="Días de la semana"`. Days use `grid grid-cols-7 gap-1.5 sm:gap-2`, so at 375px each cell is about 40px and stays inside the panel. Selected: `bg-grit-cyan text-grit-on-brand rounded-[18px]`. Others: `border-white/[0.07] bg-white/[0.03]`. The session marker is a 4px dot (`aria-hidden`; the count is in the label).
- `InicioAgendaItem` is a `Link` to `/portal/orgs/{tenant_id}/entrenamientos-disponibles`: a time column (`font-grit-mono text-[11px] font-semibold text-grit-subtext`, format `h:mm a` in Bogotá, e.g. "5:30 am") and a `GritCard variant="inset"` with a 3px bar in `getDisciplinaVisual(disciplina_nombre).colorClass` + `bg-current`, the name, a venue / meeting point line (`location_on`, `pin_drop`), the organization, and a `GritTag dot` (`accent` "Confirmada", `warning` "Pendiente").
- At ≥1280px the day list scrolls inside the panel (`max-h` matching the grid area, `grit-scrollbar`) so the panel and the right column stay aligned. Below that it grows naturally.

### 7. Empty states
- Empty day: a relative container with the six hour labels and lines (`aria-hidden`), and an overlay card (`GritCard variant="glass"` 348px max, icon ring, title `h3`, sub, `GritButton icon="add"` "Reservar sesión").
- Copy depends on `ventanaVacia` (see spec).
- "Reservar sesión" goes to `/portal/orgs/{id}/entrenamientos-disponibles` when the user has exactly one membership, otherwise to `/portal/orgs`.
- Subscriptions and organizations use the panel-sized empty layout (icon ring + title + sub). A full `GritEmptyState` card would nest a card in a card, so a local `InicioPanelEmpty` composes `GritIconTile`-style ring markup from kit classes. If a second page needs it, promote it to the kit as a `GritEmptyState variant="inline"`. That is noted in `DESIGN.md`.

### 8. Subscriptions
- Header: `GritSectionHeading` (title "Mis suscripciones") with `action` = `GritSegmented variant="solid"` (matches `b0Oyt8`: dark track, brand-filled active option), options Todas / Activas / Pendientes, `ariaLabel="Filtrar suscripciones"`.
- Rows follow the §9 list-row pattern, separated by `divide-y divide-white/[0.06]`:
  - plan 13/600 and organization 11px muted;
  - right side: status `GritTag dot`;
  - meta line: the date range, formatted date-only to avoid TZ shift (`'YYYY-MM-DD'` parsed as local date parts, not `new Date(str)`);
  - payment `GritTag` (no dot) and service units.
- The list scrolls inside the card at ≥1280px.

### 9. Organizations
Rows are `Link`s (`rounded-[18px] border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] px-3.5 py-3`) containing:
- `InicioOrgLogo` (client): an `<img>` with `alt="Logo de {nombre}"` and `onError` → initial tile;
- the name;
- `GritTag` with the role label.

Role labels come from a local map (`administrador`→Administrador, `entrenador`→Entrenador, `usuario`/`atleta`→Atleta), with any other value capitalized.

### 10. Welcome name from the cookie
`readPortalProfileName()` in `src/lib/portal/portal-profile-cookie.ts` decodes `portal_profile` (base64 JSON, same as the layout) and returns the first word of `nombre` or `''`. Parse errors return `''`. The layout already guarantees the cookie exists or redirects to bootstrap. *Alternative*: query `usuarios`. Rejected because it adds a round trip for data the shell already has.

### 11. Loading skeleton
`loading.tsx` mirrors the layout with `GritCard variant="card"` blocks (`rounded-grit-3xl`) and `motion-safe:animate-pulse`.

## Risks / Trade-offs

- **[UX change: the KPI counts only 7 days]** → Users with bookings further ahead see a lower number. The hint "Esta semana" makes the scope explicit, and the shortcut leads to `/portal/mis-reservas` with the full list.
- **[Populated agenda not drawn in `lhbhK`]** → The row is derived from `dBJ8K`. If design later draws it, only `InicioAgendaItem` changes. This is flagged in the PR for design review.
- **[No featured training]** → Details of the next session (meeting point) move into the agenda row. No data is lost.
- **[Discipline colour from name heuristics]** → Unknown disciplines get the cyan fallback (existing `getDisciplinaVisual` behavior).
- **[Date-only parsing]** → `fecha_inicio`/`fecha_fin` are dates. Using `new Date('2026-11-30')` would show 29 nov in Bogotá, so formatting uses date parts explicitly.
- **[`GritKpiCard` API growth]** → It is additive, and existing callers (analítica, gestión) keep the `inline` default. `npx tsc --noEmit` catches misuse of the `href`/`hrefLabel` union.
