# Design

## Context

- The three routes are thin server entries that render client feature components, and all data access stays as it is:
  - `gestion-eventos/page.tsx` wraps `GestionEventosPage` in `Suspense` (it reads `?vista=`). The page uses:
    - `useGestionEventos`: loads every event of the tenant plus the disciplines, then filters, sorts, paginates and computes stats on the client;
    - `useEventosVista`, `useEventosCalendar` (per-month `listEventos`), `useEventoGuardadoBanner` and `useCambiarActivoEvento`.
  - `control-ingreso/page.tsx` → `ControlIngresoEventosPage`, which uses `useGestionEventos(tenantId, { excluirBorradores, proximosDesdeHoy })` and today reuses `EventosToolbar` + `EventosTable`.
  - `control-ingreso/[evento_id]/page.tsx` → `ControlIngresoPage`, which uses:
    - `useControlIngreso` (event, `resumen_ingresos_evento`, register/revert, the 3 s same-code window, the 4 s auto-dismiss, vibration);
    - `useAsistentesIngreso` (the `activa` tickets, client search/filter/paging).
- `EventoModalShell`, `EventoEstadoBadge` and `EventoActivoBadge` are imported outside this module: by the wizard, Compras, Mis entradas modals and `ReservaRechazoModal`. Their **APIs must not change**. Only their look moves to v3.
- `EventosTable` is used by the management list view and the check-in selector. After this change, only the list view uses it, so `renderAcciones` can be removed.
- The only check-in counter source is `resumen_ingresos_evento(p_evento_id)` (one event per call, staff-only, `security definer`). There is no batch variant. This change adds no RPC (see Decision 6).
- The kit already has `GritSegmented`, `GritSearchField`, `GritIconButton`, `gritPillSelectClass`, `GritKpiCard`, `GritTag`, `GritAvatar`, `GritPagination`, `GritMediaCard`, `GritOverlayPill`, `GritDateTile` and `GritEmptyState`. It lacks the next-event panel, an inline alert, a ring, and a display title variant.
- Design source: `projectspec/designs/pencil/grit-arena-v3.pen`. The measurements below were read from the file. The content area is 1120 wide, with `Content` vertical, gap 20 (18 on `xjlmU`) and padding 12/32/32/32, provided by the shell.

| Frame / node | Element | Measurements |
|---|---|---|
| `ZYxt2` `EmfiS` | Title | "Gestiona tus" Exo 2 40/300 `ink` + "eventos." Exo 2 40/300 italic `brand`, gap 12 |
| `ZYxt2` `InBFk` | Header tools | gap 10: View Switch `xMcfv` (track black 30%, white 8% stroke, padding 4, gap 2; option padding 8/14, gap 7, 14px icon, 12/500 `ink-2`; active `brand` fill 12/600 `on-brand`) = `GritSegmented variant="solid"`; Search 44×44 round, white 4% fill = `GritIconButton size="lg"`; "Nuevo evento" brand padding 13/22, 16px icon, 13/600 = `GritButton size="lg"` |
| `ZYxt2` `uksbZ` | KPI row | 4 × 270×72, gap 14, radius 22, padding 16/18; 40px round chip (white 4%) with a 17px icon (`brand`, `brand`, `#FF8A80`, `ink-2`); value Exo 2 36/300; label 12px `ink-2` = `GritKpiCard` inline |
| `ZYxt2` `jTpjM` | Workspace | gap 16; calendar 784 fill + panel 320, height 712 |
| `ZYxt2` `zVKas` | Calendar card | radius 26, padding 18/20, gap 12, card gradient + `0 20 48 #00000080` |
| `ZYxt2` `RToF5` | Calendar header | chevrons 32×32 round (white 4% fill, white 10% stroke); title Exo 2 20/500; "Hoy" pill padding 5/11, cyan 12% fill, cyan 35% stroke, 11/600 `brand`; filters gap 8: pill padding 8/13, gap 7, white 4% / white 10%, 13px `brand` icon, 11/500, 12px chevron (compact `gritPillSelectClass`) |
| `ZYxt2` `bvBA2` | Weekdays | gap 6, padding 4/0; cell padding 0/10; 10/600 tracking 1.4; weekdays `ink-2`, SÁB/DOM `ink-3` |
| `ZYxt2` `h7Ok29` | Grid | 6 weeks × 7, gap 6; cell 101×95, radius 14, padding 8, gap 6; weekday fill white 2.8%, weekend white 1.6%, stroke white 6%; out-of-month fill transparent, stroke white 3%; day number 11/600 `ink-2`; today (`MmYOg`) stroke cyan 50% + glow `0 0 18 #14DBC426` |
| `ZYxt2` `KJWrq` | Event pill | radius 9, padding 6/8, gap 2; gradient `#14DBC4`→`#4DF0DD`; shadow `0 4 12 #14DBC459`; name 10/700 `on-brand`; time 9px `#04121ACC` |
| `ZYxt2` `U3fEa` (`s2Gt8L`) | Next event panel | 320 wide, radius 26; cover 200 (padding 16): label pill (`#080C10` 45%, white 20% stroke, blur 14, padding 6/11, 6px cyan dot with glow, 10/700 tracking 1 "PRÓXIMO EVENTO"), 32px round edit button; name Exo 2 32/600 italic; meta 12px icon `brand` + 12px `ink-2`. Body padding 16/18/18, gap 14: tags (padding 5/10, white 3% / white 8%, 11px `brand` icon, 10/500 `ink-2`); meters (radius 16, padding 14, gap 9, white 2.4% fill, white 6% stroke; label 11px `ink-2` + 13px `ink-3` icon; value Exo 2 22 + "/ total" 11px `ink-3`; track 5px white 8%, fill `brand` + glow `0 0 8 #14DBC480`); spacer; actions gap 8: "Abrir check-in" brand 40px + glow, "Ver asistentes" secondary 40px |
| `LV7I0` `PFUxa` | Header | "Control de" 300 + "ingreso." 300 italic `brand`; tools gap 10: search 280×44 (white 4%, white 12% stroke, inner shadow) = `GritSearchField size="lg"`; three pill selects padding 12/15, gap 7, 14px `brand` icon (`circle-dot`, `clock-arrow-up`, `medal`), 12/500 `ink`, 13px chevron = `gritPillSelectClass` |
| `LV7I0` `MLdeO` | Section line | padding-top 6; "Eventos disponibles" Montserrat 16/500; count 12px `ink-3` right |
| `LV7I0` `w14ZBK` | Check-in event card | 1120×240, radius 28, card gradient + shadow. Photo 360 (padding 20): status pill `brand` padding 7/12, 13px `badge-check`, 11/700 "CONFIRMADO"; discipline glass pill 11/600. Info fill (padding 24/28, space-between): countdown pill (cyan 12% / cyan 35%, 12px `hourglass`, 11/600 `brand`) + date 13px `ink-2`, gap 10; name Exo 2 42/600 italic; fields gap 10: 4 tiles 106×58, radius 14, padding 11/14, gap 6, white 2.4% / white 6%, label 11px `ink-3` + 12px icon (`map-pin`, `user-round`, `users`, `ticket`), value Exo 2 17 (`ink-2` placeholder, `ink` value). CTA 250 (padding 24, gap 14, radial cyan fill, left stroke white 7%): ring 96 (track white 8%, value Exo 2 24, caption 10px `ink-3`), "Abrir control" brand 40px, `scan-line` icon, glow |
| `LV7I0` `lIT8g` | How it works | 3 cards, gap 14, radius 22, padding 18/20, gap 14; 44px round chip (cyan 10% / cyan 30%, 19px `brand` icon: `calendar-search`, `scan-qr-code`, `circle-check-big`); number JetBrains Mono 11/600 `brand` + title 14/600; description 12px `ink-3` |
| `xjlmU` `v4CR1` | Header left | gap 10: back link 12/500 `brand` + 14px `arrow-left`; title row gap 14: name Exo 2 40/600 italic + live pill (cyan 12% / cyan 35%, padding 5/11, 7px dot with glow, 11/600 `brand`); meta gap 16: 13px `ink-3` icon + 12px `ink-2` |
| `xjlmU` `cVNYw` | Progress card | 340 wide, radius 22, padding 16/20, gap 10, card gradient + shadow; value Exo 2 40/300 + "/ 100 ingresaron" 12px `ink-2`; pending pill (white 4% / white 10%, 12px `clock-4`, 11/500 `ink-2`); track 6px white 8%, gradient fill + glow `0 0 10 #14DBC499` |
| `xjlmU` `AA8Y3` | Scanner column | 400 wide, gap 16 |
| `xjlmU` `k4zhX7` | Scanner card | radius 26, padding 18, gap 14; title 15/600; status dot 6px + 11px `ink-3`. Viewport 364×316, radius 20, `#03060A` + radial cyan, white 7% stroke; frame 170: 8 corner bars 34×3 / 3×34 radius 2 `brand` + glow; scan line 142×2 cyan gradient + glow; 48px QR icon white 20%; "Habilitar cámara" brand padding 12/20, 16px `camera` |
| `xjlmU` `D3Ic3x` | Manual code | radius 26, padding 18, gap 12; title 14/600; input row pill (black 30%, white 12% stroke, inner shadow, padding 5/5/5/16): "EV-" JetBrains Mono 14/600 `brand`, value 14px tracking 2, button "Validar" brand padding 10/16, 14px `log-in`, 12/600 |
| `xjlmU` `es49f` | Latest check-ins | radius 22, padding 14/18, gap 10; title 13/600; "En vivo" 10/600 `brand` + 6px glowing dot; rows gap 8: 13px `circle-check` `brand`, name 12/500, time JetBrains Mono 11 `ink-3` right |
| `xjlmU` `PMix6` | Attendees panel | 704 fill, radius 26, padding 18/22, gap 14. Header: "Asistentes" 15/600 + count bubble (white 6%, padding 2/8, 11/700 `ink-2`); segmented black 30% track, padding 4, gap 2, option padding 6/8/6/12, gap 6, 11px label, count bubble padding 1/6 10/700 (active `on-brand` 15%) = `GritSegmented` with `count`. Toolbar gap 8: search 42 tall (white 3% / white 10%), sort pill padding 11/14, 13px `arrow-down-up`, 11/500. Column head: radius 12, padding 8/14, white 2.4% fill, 9/600 tracking 1.4 `ink-3` (236 · 120 · 110 · 130, gap 12). Rows gap 4: radius 12, padding 7/14, white 1.6% fill, white 4% stroke; entered rows cyan 4% fill, cyan 15% stroke; avatar 30 (entered: cyan 20% fill, cyan 40% stroke, `brand` initials); name 13/600; code JetBrains Mono 11/600 tracking 0.6 `ink-2`; status 13px icon + 11/500 (`circle-dashed` `ink-3` / `circle-check` `brand`); "Registrar" cyan 12% / cyan 40%, padding 6/12, 12px `log-in`, 11/600 `brand`; "Deshacer" text-only 11px `ink-3` + 12px `undo-2`. Scroll fade 70px + 3px cyan thumb. Pager: 11px `ink-3` summary, 28px round page buttons |

## Goals / Non-Goals

**Goals:**
- Match `ZYxt2`, `LV7I0` and `xjlmU` at 1440 px, and stack cleanly at 768 and 375 px, using kit components only. Missing pieces go into the kit (`DESIGN.md` §5).
- Keep every behavior the specs keep: the filters and their defaults, `?vista=` sync, `?guardado=`, the quick activo toggle, the modals, the check-in throttling, the auto-dismiss, vibration, revert, and the camera-off-by-default rule.
- Keep the shared pieces' APIs (`EventoModalShell`, the badges, `EventoActionsMenu`) so the wizard, Compras and Mis entradas compile and behave unchanged.
- Make both §11 greps return nothing on `src/components/portal/control-ingreso` and `src/components/portal/gestion-eventos/*.tsx` (top level).

**Non-Goals:**
- Restyling the layouts of `wizard/` and `compras/` (only the shared pieces change underneath).
- Any server-side change: no RPCs, RLS or migrations. Nothing is pushed to the remote Supabase.
- A Realtime channel for check-ins (Decision 9).

## Decisions

### 1. Architecture (page → component → hook → service → types)

```
/gestion-eventos ─ GestionEventosPage ('use client')
   ├─ useGestionEventos (unchanged API) · useEventosVista · useEventoGuardadoBanner · useCambiarActivoEvento
   ├─ GritPageHeader title="Gestiona tus" titleAccent="eventos." italic
   │     actions = EventosHeaderTools ── GritSegmented solid (vista) · expandable GritIconButton→GritSearchField · GritButton lg
   ├─ GritAlert × (guardado | activo | activo error)
   ├─ EventosStatsCards ── GritKpiCard ×4
   ├─ vista tarjetas|lista: EventosFilterBar (pill selects + Limpiar) → EventosGrid(EventoCard: GritMediaCard…) | EventosTable(gritTable* + GritPagination)
   └─ vista calendario: grid xl:[1fr_320px]
        ├─ EventosCalendar ── header(GritIconButton ‹ › · title · "Hoy" · Estado/Disciplina pill selects)
        │                    weekdays · EventosCalendarDayCell ×42 ← buildCalendarCells()   lib/portal/gestion-eventos-calendario.ts
        │                    undated note · selected-day list rows (GritTag · EventoActionsMenu)
        │     ← useEventosCalendar (+ goToday, isCurrentMonth)
        └─ ProximoEventoPanel → GritNextEventPanel
              ← useProximoEvento(eventos) → pickProximoEvento()  lib/portal/proximo-evento.ts
                                          → eventoComprasService.resumenIngresos(id)

/control-ingreso ─ ControlIngresoEventosPage
   ├─ useGestionEventos(tenantId, {excluirBorradores, proximosDesdeHoy, pageSize: 10})
   ├─ GritPageHeader "Control de" / "ingreso." actions = GritSearchField lg + 3 pill selects
   ├─ section line "Eventos disponibles" · "N de M eventos"
   ├─ CheckinEventoCard ×≤10 ← useResumenesIngreso(pageIds) → resumenIngresos ×N (allSettled)
   │     GritMediaCard (photo) │ info (countdown pill, date line, field tiles) │ GritProgressRing + GritButton
   ├─ GritPagination
   └─ CheckinPasos (3 static GritCard steps)

/control-ingreso/[evento_id] ─ ControlIngresoPage
   ├─ useControlIngreso (+ silent summary poll)      useAsistentesIngreso (+ orden, conteos, recientes, poll, page 50)
   │        └───────────── useVisibleInterval(20 s) ─────────────┘
   ├─ IngresoResumenHeader ── back link · GritPageHeader display + live pill · meta · progress card
   ├─ lg:grid-cols-[400px_1fr]
   │   ├─ scanner column: QrScanner (status) · CodigoManualForm (EV-) · GritAlert errors · IngresoResultadoCard · UltimosIngresos
   │   └─ AsistentesIngresoTable (panel: GritSegmented counts · GritSearchField · orden select · rows · GritPagination)
   └─ RevertirIngresoModal (EventoModalShell)
```

### 2. Kit additions are layout shells; domain mapping stays in features
- `GritNextEventPanel` takes:
  - `cover: { image, label, action?: { icon, label, href | onClick } }`;
  - `title`, `subtitle` (`ReactNode`), `tags: ReactNode`;
  - `meters: { icon, label, value: number | null, total?: number | null, caption? }[]`;
  - `actions: ReactNode`, `headingLevel`.
- `ProximoEventoPanel` maps `EventoListItem` + `ResumenIngresos` to those props. `getEventoLugarLabel` is reused from `eventos-card-model.ts`.
- `GritProgressRing` is an inline SVG (two circles, `stroke-dasharray`). It needs no new dependency and scales with `size` (96 by default).
- `GritAlert` replaces three copy-pasted banners in `GestionEventosPage` and two error boxes in `ControlIngresoPage`.
- `GritPageHeader` gains `titleVariant` and `titleAdornment`. The adornment renders outside the `h1`, so the accessible heading stays the event name.

*Alternative*: page-local panel and ring components. Rejected, because §9 asks for promotion. The ring is also a natural kit sibling of `GritProgress`.

### 3. Header search: an expandable icon instead of a permanent field
§9 "Page header with tools" allows "a `GritIconButton icon="search" size="lg"` that expands". `EventosHeaderTools` keeps a local `expanded` state:
- `expanded || filters.search !== ''` renders `GritSearchField size="lg"` with `autoFocus`;
- Escape or blur collapses it only when empty, and focus returns to the icon (ref).

The debounce stays in `useGestionEventos` (250 ms).

On narrow screens, the header actions wrap. The expanded field gets `basis-full sm:basis-auto` so the page never scrolls sideways.

### 4. View switch: `GritSegmented` instead of the radiogroup
The kit's segmented control is the documented view switch (§4 "Which component for which job"). It uses `aria-pressed` buttons in a labelled group. We accept the semantic change (spec updated) instead of forking the kit into a radiogroup. The roving-tabindex code in `EventosToolbar` is deleted with the file.

### 5. Calendar: a pure cell builder and a stable 6-week grid
`buildCalendarCells(monthStartDate)` moves to `src/lib/portal/gestion-eventos-calendario.ts` and returns 42 cells (6 weeks, like the frame, so the height doesn't jump between months), each `{ dateKey, dayNumber, inMonth, isWeekend }`. Adjacent-month cells carry real numbers but render `aria-hidden` `<div>`s.

`pillTone(evento)` returns `confirmado | cancelado | borrador`, plus an `inactivo` flag, so the cell has no styling conditionals. The `DISCIPLINE_COLOR_PALETTE` of raw Tailwind colours (`bg-emerald-400`, …) is removed: the v3 pill no longer encodes discipline by colour.

The cell stays one `<button>` (the pills are `aria-hidden` spans, as today), so the "no nested interactive" rule holds.

`MAX_PILLS_PER_DAY = 2`, because two 37px pills plus the number fit the 95px cell. The cell grows with `min-h`, never clips.

`useEventosCalendar` adds:
- `goToday()`, which sets the Bogotá current month and selects today;
- `isCurrentMonth`, so "Hoy" can show as active.

### 6. Counters: reuse the per-event RPC, scoped to what is visible
- **Next event panel**: one `resumenIngresos(id)` call when the chosen event changes, and again after a mutation (`handleMutationSuccess` calls `proximo.reload()`).
- **Check-in selector**: `useResumenesIngreso(ids)` runs `Promise.allSettled` over the current page's ids (≤10). It keys results by id, so changing pages reuses cached entries, and a rejected promise yields `null` → "—".

*Alternative*: a new `resumen_ingresos_eventos(uuid[])` RPC. Rejected for this story: it adds a migration and grants to a presentation change. Ten parallel `stable` calls are acceptable, so the RPC stays a noted follow-up. For the same reason the selector page size drops from 20 to 10 (also the frame's density: 240px cards).

### 7. Picking the "next event" on the client
`pickProximoEvento(eventos, now)` filters `!borrador && estado === 'confirmado' && fechaHora && toDateKeyInBogota(fechaHora) >= toDateKeyInBogota(now)`, then sorts ascending and takes the first. It reads `gestion.eventos`, the unfiltered full list that `useGestionEventos` already loads, so it is independent of the visible month and the filters. The rule "today 00:00 Bogotá" matches the check-in selector's `proximosDesdeHoy`, so an event in progress stays "próximo".

### 8. Countdown wording
`getCountdown` (Mis entradas) returns "Faltan N días". The selector frame says "En N días". `getCountdown(fechaHora, now, { estilo: 'en' })` adds the alternative wording without duplicating the Bogotá day arithmetic. The default is unchanged, so Mis entradas is unaffected.

### 9. "En vivo": a visible-tab poll, not Realtime
`useVisibleInterval(callback, 20_000)` uses `setInterval` while `document.visibilityState === 'visible'`. It clears on `visibilitychange → hidden` and fires once on return. Both hooks expose a silent refresh, which already exists for the list (`refrescar`). `useControlIngreso` adds `refrescarResumen` to the interval. A failed silent refresh is logged and ignored (spec: keep the data on screen).

The poll is skipped while a register/revert is pending (`pending` ref), so a stale response cannot overwrite a fresh one. The list hook uses its `cancelled` guard per request.

*Alternative*: a Supabase Realtime subscription on `evento_tickets`. Rejected: it needs a publication change and RLS review for staff channels, which is out of scope. 20 s is enough at a door.

### 10. Attendee list helpers and paging
`eventos-ingreso.utils.ts` gains pure helpers:
- `ordenarAsistentes(list, orden)` (`pendientes` | `nombre` | `recientes`, with a stable name tiebreak);
- `contarAsistentes(list)` → `{ todos, ingresaron, pendientes }`;
- `ultimosIngresos(list, 5)`.

`useAsistentesIngreso` applies filter → search → sort → page (50). The counts are computed before the filter, so the segments don't change as you filter. The search still matches the email (spec) even though the row no longer shows it.

From `lg`, the rows sit in `max-h-[393px] overflow-y-auto grit-scrollbar`, with a bottom fade (a `pointer-events-none` gradient). Below `lg`, they flow with the page.

### 11. Manual code input with a fixed prefix
The visible "EV-" is a decorative `aria-hidden` span. The `<input>` holds only the suffix (`maxLength` 17 to tolerate a pasted full code). On submit, it sends `EV-${value}` unless the value already starts with `EV-`. `normalizarCodigoTicket` keeps doing the canonicalisation. The `<label>` is the card title "Código de la entrada", and the hint moves to `aria-describedby`.

### 12. Scanner status and viewport
`QrScanner` reports `onStatusChange('inactiva' | 'iniciando' | 'activa')`. The card header renders the dot + text inside a `role="status"` so the change is announced. The corner brackets and scan line are `aria-hidden` absolutely-positioned spans. The scan line uses `motion-safe:animate-[grit-scan_2.4s_ease-in-out_infinite]`, with a keyframe added in `globals.css`. Under reduced motion it is static, mid-frame.

The video keeps `object-cover` inside the 316px viewport (`aspect-square` below `sm`), so the old `aspect-video` jump disappears.

### 13. Result tones
`TONE_CLASSES` swaps emerald/amber for the tokens:
- `success`: `border-grit-success/35 bg-grit-success/10 text-grit-success`;
- `warning`: `grit-warning`;
- `danger`: `grit-danger`.

The title moves from `font-bold` to `font-medium` (§10 table). The live region wrapper stays always mounted. On mobile the card sits right after the manual input, which is the order the staff's eyes follow.

### 14. Shared modal shell and badges
`EventoModalShell` keeps `title`, `onClose`, `busy`, `footer` and `children`. Its internals move to the §9 modal pattern:
- a `GritCard variant="glass"` panel;
- a `GritSectionHeading as="h2"` title with `id` for `aria-labelledby`;
- a `GritIconButton icon="close" label="Cerrar"`;
- focus capture on open and focus return on close (it stores `document.activeElement`).

`EventoDangerButton` becomes a `GritButton variant="secondary"` with `text-grit-danger`.

The badges keep their props and render `GritTag`:
- confirmado `accent dot`, cancelado `danger dot`, borrador `neutral` with `edit_note`;
- activo `accent` with `visibility`, inactivo `warning` with `visibility_off`.

Over photos, `EventoCard` passes them as `GritOverlayPill` content to keep them opaque.

## Risks / Trade-offs

- [Shared shell restyle leaks into the wizard, Compras, Mis entradas and training reservations] → The API is unchanged. Open each of the five modals in the verification task. The look converges on v3 anyway.
- [N parallel RPCs on the selector] → It is capped at 10 per page, cached per id, and `allSettled` isolates failures. A batch RPC is a follow-up if the tenants have many events.
- [The 20 s poll adds load during big events] → One list query and one summary call per open screen every 20 s, paused when hidden. That is acceptable for staff-only screens. The interval is a constant, so it is easy to tune.
- [A poll response races a fresh check-in] → The poll is skipped while `pending`, and the hooks' `cancelled` guards drop late responses.
- [Removing the email from rows makes duplicates harder to tell apart] → The ticket name shows under the name, the code is always visible, and search still matches the email.
- [Expandable search hides the active filter] → The field stays expanded while it has a value, and "Limpiar filtros" covers it.
- [Two pills per day hides events] → "+N" stays visible, the day's list shows all of them, and the list view is one click away.

## Migration Plan

- Front-end only. Deploy with the usual Vercel flow, and roll back by reverting the merge commit.
- There are no data migrations, and nothing is pushed to the remote Supabase.
- After deploy, smoke-test a real event:
  1. open `control-ingreso`;
  2. open an event and enable the camera;
  3. check in by QR and by manual code;
  4. undo;
  5. confirm that a second device sees the change within 20 s.
- `globals.css` gains a keyframe. Locally, Turbopack can serve a stale stylesheet, so run `rm -rf .next` before verifying.

## Implementation notes

These came up while building. Each one extends the kit instead of overriding kit classes. With Tailwind v4, two utilities for the same property (`text-grit-text` vs `text-grit-danger`, `pl-3.5` vs `pl-9`) resolve by stylesheet order, not by class order, so overriding is unreliable.

- **`GritPillSelect`** (new): a pill `<select>` with a leading icon and an `sm` (29px) size, for the filter pills of `ZYxt2` / `LV7I0`. `gritPillSelectClass` stays for plain selects.
- **`GritButton variant="danger"`**: a danger-tinted pill for destructive confirms. `EventoDangerButton` uses it. DESIGN.md's rule "secondary + `text-grit-danger`" is replaced.
- **Compact table classes** (`gritTableHeadCellCompactClass`, `gritTableCellCompactClass`, 14px side padding): the 9-column Lista view fits 1120px without a horizontal scroll.
- **`GritKpiCard iconTone`** (accent / danger / muted): for the Cancelados / Borradores icons of `uksbZ`.
- **`GritOverlayPill tone="danger"`**: the CANCELADO pill on check-in cards.
- **`GritMediaCard radius="none"` / `stroke="none"`**: the photo zone inside the check-in card reuses the image / placeholder / shade logic.
- **`GritSectionHeading id`**: lets the modal shell point `aria-labelledby` at the kit heading.
- **Scan line**: a `.grit-scan-line` class in `globals.css` with a `prefers-reduced-motion` override, instead of an arbitrary `motion-safe:animate-[…]` class.
- **Selected-day cell label**: it also counts cancelled events ("…, 1 cancelado"), because the pills are decorative inside the labelled button.
