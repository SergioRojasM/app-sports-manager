# Proposal

> Source: user request (2026-11-24): "Crea un cambio para migrar el módulo de eventos a la nueva visual. Migra el calendario de eventos (Node ID: ZYxt2), el check in (Node ID: LV7I0), y el checkin del evento (Node ID: xjlmU)". The `DESIGN.md` §1 frame table maps `ZYxt2` to `orgs/[tenant_id]/gestion-eventos`, and `LV7I0` · `xjlmU` to `orgs/[tenant_id]/control-ingreso` · `control-ingreso/[evento_id]`. The migration contract is `DESIGN.md` §10 and §12. The archived change `2026-11-24-grit-arena-v3-portal-athlete-pages` is the reference for scope and conventions.

## Why

The athlete pages already match their v3 frames, but the admin events module still uses v2 markup:
- `rounded-grit-md` buttons, selects with stacked uppercase labels, and a radiogroup view switcher;
- emerald, amber and rose result/status colours;
- `bg-grit-glass` boxes and bold Exo 2 titles;
- a plain table to choose the event to check in, and a plain table of attendees at the door.

The v3 frames redesign the three screens staff use around an event:
- **Eventos** (`ZYxt2`): a header with tools, a KPI row and a calendar workspace with a "next event" panel;
- **Check-in · eventos** (`LV7I0`): photo-led event cards, each with its own check-in ring;
- **Check-in · evento** (`xjlmU`): a door console with a scanner column (camera, manual code, latest check-ins) and a large attendee list.

Migrating them together finishes the event-staff flow (manage → choose event → check people in) in one release. It also promotes the "Next Event Panel" (`s2Gt8L`), which `DESIGN.md` §9 lists as "drawn in v3 but not yet in the kit".

## What Changes

### Kit (`src/components/ui/grit`)
- **New** `GritNextEventPanel` (`s2Gt8L`): 320px panel with:
  - a photo cover with an overlay label pill and an optional round action;
  - the name, a date line and tags;
  - meters (icon + label, a value "N / total", and a 5px track);
  - stacked actions at the bottom.
- **New** `GritAlert`: inline dismissible banner with tones `success` / `warning` / `danger` / `info`, an icon, and `role="status"` or `role="alert"`. It replaces the hand-rolled banners of the events page and the check-in screen.
- **New** `GritProgressRing`: ring with the value "X/Y" and a caption in the centre (`LV7I0` `G1a17B`), with `role="progressbar"`.
- `GritPageHeader` gains `titleVariant="display"`: Exo 2 600 italic, as for the event name on `xjlmU`. The default stays Exo 2 300.
- `icon-map.ts` gains the new design icons (`scan-line`, `scan-qr-code`, `calendar-search`, `circle-dashed`, `clock-arrow-up`, `undo-2`, `log-in`, `arrow-down-up`, …).

### `/gestion-eventos` (frame `ZYxt2`)
- Header "Gestiona tus **eventos.**", with these tools:
  - the view switch as `GritSegmented variant="solid"` (Tarjetas / Lista / Calendario, with icons);
  - a search `GritIconButton` that expands into a `GritSearchField`, and stays open while it has a value;
  - "Nuevo evento" as `GritButton size="lg"`.
- A KPI row of four `GritKpiCard`: Total de eventos, Próximos confirmados, Cancelados (danger icon) and Borradores (muted icon).
- **Calendario**: a two-column workspace.
  - The **calendar card** has:
    - a header with chevrons, the month title (Exo 2 20/500) and a "Hoy" pill that returns to the current month;
    - the Estado and Disciplina pill selects inside that header;
    - 7-column day cells (radius 14; weekend cells darker; adjacent-month days shown muted and inert; today ringed in cyan with a glow; the selected day tinted);
    - event pills inside the cells: a brand gradient pill with the name and time for confirmed events, a muted struck-through pill + "Cancelado" text for cancelled ones, a dashed outline for drafts, and a warning `visibility_off` icon for inactive ones. Up to 2 pills, then "+N".
  - The selected-day list moves under the grid as v3 list rows.
  - The **right column** is a `GritNextEventPanel` for the next confirmed, published event (from today 00:00 Bogotá). It shows:
    - an edit button (→ wizard);
    - tags: discipline, place and estado;
    - the meters "Entradas emitidas" (`activas` / `cupo_maximo`, or "Sin límite") and "Check-in" (`ingresaron` / `activas`), from the existing `resumen_ingresos_evento` RPC;
    - "Abrir check-in" (→ `control-ingreso/{id}`) and "Ver asistentes" (→ `gestion-eventos/{id}/compras`).
  - When there is no upcoming event, the panel shows an empty state.
- **Tarjetas** and **Lista** have no frame, so they are composed from the kit (§9):
  - a filter bar of pill selects (Estado / Periodo / Disciplina) + "Limpiar filtros";
  - `EventoCard` rebuilt on `GritMediaCard` + `GritOverlayPill` + `GritDateTile`;
  - `EventosTable` rebuilt on the `gritTable*` classes + `GritTag` + `GritPagination`.
- The status, activo, privado and borrador badges become `GritTag`. The actions menu trigger becomes `GritIconButton variant="ghost"`, with a v3 glass menu panel. `EventoModalShell` follows the v3 modal pattern.
- The success / activo / error banners become `GritAlert`.
- **BREAKING (UX)**:
  - The toolbar card is removed. Search moves to the header, and filters move to the calendar header (Calendario) or the filter bar (Tarjetas / Lista).
  - The view switch changes from `role="radiogroup"` to the kit's `aria-pressed` buttons.
  - Day cells show at most 2 event pills instead of 3 chips with coloured dots.

### `/control-ingreso` (frame `LV7I0`)
- Header "Control de **ingreso.**" with a `GritSearchField` ("Buscar evento") and three pill selects: Estado (Todos / Confirmado / Cancelado), Periodo (Próximos / Pasados / Todos) and Disciplina.
- A section line "Eventos disponibles" with "N de M eventos".
- Each event is a horizontal card (`CheckinEventoCard`) with three parts:
  - **photo** (360): an estado pill and a discipline overlay pill;
  - **info**: a countdown pill ("En N días" / "Mañana" / "Hoy" / "Finalizado"), the Bogotá date, the name in Exo 2 42/600 italic, and four field tiles (Lugar, Entrenador, Cupo, Entradas);
  - **CTA** (250): a `GritProgressRing` "X/Y ingresaron" and "Abrir control" for `confirmado` events, or "Evento cancelado" otherwise.
- The counters come from the existing `resumen_ingresos_evento` RPC, called for the events on the current page (10 per page). A failed counter shows "—" and doesn't block the card.
- A three-step strip "Cómo funciona": Elige el evento · Escanea o digita · Registra el ingreso.
- `GritPagination` below the cards. The loading, empty, no-match and error states use `GritEmptyState`.
- **BREAKING (UX)**: the table (`EventosTable` + `renderAcciones`) is replaced by the cards. The page no longer depends on `EventosToolbar`.

### `/control-ingreso/[evento_id]` (frame `xjlmU`)
- **Header**:
  - "Volver a eventos" link;
  - the event name as `GritPageHeader titleVariant="display"`, with a live pill "Check-in abierto" (confirmado) or a `GritTag` "Evento cancelado";
  - a meta row with date, place and discipline;
  - a progress card: "X / Y ingresaron", a "N pendientes" pill, a glowing track, and the "N con pago pendiente de validación" line when it applies.
- **Scanner column** (400):
  - The **Escanear QR** card shows a camera status ("Cámara inactiva" / "Iniciando…" / "Cámara activa"). Its viewport has cyan corner brackets, a scan line (static under `prefers-reduced-motion`), and "Habilitar cámara". While the camera is on, it shows the video and "Desactivar cámara".
  - The **Código de la entrada** card has a fixed `EV-` prefix, a mono input and "Validar".
  - The **result card** keeps the same results and rules, with v3 tones (`grit-success` / `grit-warning` / `grit-danger`).
  - **Últimos ingresos** lists the 5 most recent check-ins (name + time), with an "En vivo" marker.
- **Attendees panel**:
  - the title with a count bubble, and a `GritSegmented` with counts (Todos / Ingresaron / Pendientes);
  - a `GritSearchField` ("Nombre, correo o código") and an order pill select (Pendientes primero / Nombre A–Z / Ingreso más reciente);
  - column heads ASISTENTE / CÓDIGO / INGRESO;
  - rows with `GritAvatar`, the name and ticket name, the code in JetBrains Mono, and the entry status ("Pendiente" / "h:mm a"). Entered rows are tinted cyan;
  - row actions "Registrar" (outline-accent) or "Deshacer" (ghost → `RevertirIngresoModal`);
  - 50 rows per page, scrolling inside the panel from `lg`, and `GritPagination` with "1–50 de N asistentes".
- **Live refresh**: while the tab is visible, the counters and the attendee list refresh silently every 20 s. This way, staff at several doors see each other's check-ins.
- **BREAKING (UX)**:
  - The enable button reads "Habilitar cámara" instead of "Habilitar lectura de QR con cámara".
  - The filter option "Pendientes de ingreso" becomes "Pendientes".
  - The email no longer shows in the row (it stays searchable).
  - The page size goes from 20 to 50.

### All three pages
- Exactly one `h1` per page, from `GritPageHeader`.
- Loading, empty and error states go through `GritEmptyState`, and errors offer "Reintentar".
- Both `DESIGN.md` §11 greps return nothing on `src/components/portal/control-ingreso` and on the top-level files of `src/components/portal/gestion-eventos`.

## Non-goals

- The week view of the calendar (`g9lnB`). It is mapped to the same route but was not requested; it becomes a follow-up story.
- The event wizard (`gestion-eventos/nuevo`, `[evento_id]/editar`) and the Compras page (`[evento_id]/compras`): they have no frame. They only inherit the restyled shared pieces (`EventoModalShell`, `EventoEstadoBadge`, `EventoActivoBadge`) without layout changes.
- Supabase Realtime subscriptions for check-in. "En vivo" is served by the 20 s silent refresh.
- New RPCs, tables, RLS or schema changes. A batch counters RPC is a possible later optimisation.
- Showing the trainer's photo, ratings or a map; rescheduling events by dragging them in the calendar.
- The athlete pages, the public landing `/eventos` and the shell.

## Capabilities

### New Capabilities
- None. Every screen already has an owning capability.

### Modified Capabilities
- `team-events-management`: these requirements change:
  - "Eventos management page": the v3 header with tools and the KPI row; no toolbar card;
  - "Switchable event views": `GritSegmented` with `aria-pressed` instead of a radiogroup;
  - "Cards view": the v3 media card;
  - "List view": kit table + pagination;
  - "Calendar view": filters in the calendar header, "Hoy", adjacent-month days, ≤2 pills + "+N", and the next-event panel;
  - "Event filters and stats": filters move to the header, the calendar header and the filter bar;
  - "Accessible menus and dialogs": the v3 modal pattern;
  - "Activo indicator in every management view": `GritTag` and the calendar pill treatment;
  - "Publish success banner": `GritAlert`.
- `team-events-checkin`: these requirements change:
  - "Event selector": cards with check-in ring, header filters, pagination, and the how-it-works strip, replacing the reused table;
  - "Check-in screen": the v3 header, scanner column, camera status, `EV-` prefix input, v3 result tones, latest check-ins, and the 20 s live refresh;
  - "Attendee list": segmented with counts, sort, 50 per page, row layout, and "Deshacer".
- `grit-design-system`: new requirements for the next-event panel, alert and progress-ring primitives, and the page header display title variant.

## Impact

- **UI**:
  - `src/components/portal/gestion-eventos/*.tsx` (top level only; `wizard/` and `compras/` untouched except through shared components);
  - `src/components/portal/control-ingreso/*`;
  - `src/components/ui/grit/` (new primitives, `GritPageHeader`, `index.ts`, `icon-map.ts`).
- **Hooks**:
  - `useEventosCalendar` adds `goToday` and the adjacent-month day numbers;
  - new `useProximoEvento` (selection + counters);
  - new `useResumenesIngreso` (per-page counters for the selector);
  - `useAsistentesIngreso` adds sort, counts, page size 50, recent check-ins and the silent poll;
  - `useControlIngreso` adds the camera-status passthrough and the poll of the summary.
- **Services/types**: no new service functions. `eventoComprasService.resumenIngresos` is reused. New view types: `AsistentesIngresoOrden`, `CheckinEventoCardModel`.
- **Lib**:
  - new `src/lib/portal/gestion-eventos-calendario.ts` (month cells with adjacent days, pill tone);
  - new `src/lib/portal/proximo-evento.ts`;
  - `getCountdown` gains an "En N días" wording option (shared with Mis entradas);
  - `eventos-ingreso.utils.ts` (sorting, recent check-ins).
- **Dependencies**: none new (`qr-scanner` is already installed).
- **Docs**:
  - `DESIGN.md`: §1 marks `ZYxt2`, `LV7I0` and `xjlmU` as migrated; §4 kit tables; §9 removes the Next Event Panel row;
  - `projectspec/03-project-structure.md`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/page.tsx` | Unchanged (Suspense wrapper) |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/page.tsx` | Unchanged |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/control-ingreso/[evento_id]/page.tsx` | Unchanged |
| Component (kit) | `src/components/ui/grit/GritNextEventPanel.tsx` | New (`s2Gt8L`) |
| Component (kit) | `src/components/ui/grit/GritAlert.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritProgressRing.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritPageHeader.tsx` | `titleVariant: 'light' \| 'display'` |
| Component (kit) | `src/components/ui/grit/index.ts`, `icon-map.ts` | Exports; new icons |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | v3 header + tools, KPI row, alerts, view routing, workspace |
| Component | `src/components/portal/gestion-eventos/EventosHeaderTools.tsx` | New: view switch + expandable search + CTA |
| Component | `src/components/portal/gestion-eventos/EventosFilterBar.tsx` | New: pill selects (replaces `EventosToolbar`) |
| Component (delete) | `src/components/portal/gestion-eventos/EventosToolbar.tsx` | Remove |
| Component | `src/components/portal/gestion-eventos/EventosStatsCards.tsx` | `GritKpiCard` ×4 |
| Component | `src/components/portal/gestion-eventos/EventosCalendar.tsx` | Rewrite: v3 calendar card + day list |
| Component | `src/components/portal/gestion-eventos/EventosCalendarDayCell.tsx` | New |
| Component | `src/components/portal/gestion-eventos/ProximoEventoPanel.tsx` | New: maps the event + counters → `GritNextEventPanel` |
| Component | `src/components/portal/gestion-eventos/EventoCard.tsx`, `EventosGrid.tsx` | Rebuild on `GritMediaCard` |
| Component | `src/components/portal/gestion-eventos/EventosTable.tsx` | Rebuild on the `gritTable*` classes + `GritPagination` |
| Component | `src/components/portal/gestion-eventos/EventoEstadoBadge.tsx`, `EventoActivoBadge.tsx` | `GritTag` |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | `GritIconButton` trigger + v3 menu panel |
| Component | `src/components/portal/gestion-eventos/EventoModalShell.tsx` | v3 modal pattern (same API) |
| Component | `src/components/portal/gestion-eventos/CambiarEstadoEventoModal.tsx`, `EliminarEventoModal.tsx` | v3 error lines |
| Component | `src/components/portal/control-ingreso/ControlIngresoEventosPage.tsx` | v3 header + filters + cards + steps + pagination |
| Component | `src/components/portal/control-ingreso/CheckinEventoCard.tsx` | New |
| Component | `src/components/portal/control-ingreso/CheckinPasos.tsx` | New: how-it-works strip |
| Component | `src/components/portal/control-ingreso/ControlIngresoPage.tsx` | v3 layout: header + scanner column + attendees |
| Component | `src/components/portal/control-ingreso/IngresoResumenHeader.tsx` | Rewrite: display title, live pill, meta, progress card |
| Component | `src/components/portal/control-ingreso/QrScanner.tsx` | v3 card, viewport frame, camera status, `onStatusChange` |
| Component | `src/components/portal/control-ingreso/CodigoManualForm.tsx` | `EV-` prefix pill input |
| Component | `src/components/portal/control-ingreso/IngresoResultadoCard.tsx` | v3 tones |
| Component | `src/components/portal/control-ingreso/UltimosIngresos.tsx` | New |
| Component | `src/components/portal/control-ingreso/AsistentesIngresoTable.tsx` | Rewrite: panel, segmented, sort, rows, pagination |
| Component | `src/components/portal/control-ingreso/RevertirIngresoModal.tsx` | v3 error line |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | Option `pageSize` (default 20; 10 for the check-in selector) |
| Hook | `src/hooks/portal/gestion-eventos/useEventosCalendar.ts` | `goToday`, `isCurrentMonth` |
| Hook | `src/hooks/portal/gestion-eventos/useProximoEvento.ts` | New |
| Hook | `src/hooks/portal/control-ingreso/useResumenesIngreso.ts` | New |
| Hook | `src/hooks/portal/control-ingreso/useAsistentesIngreso.ts` | Sort, counts, page size 50, `recientes`, poll |
| Hook | `src/hooks/portal/control-ingreso/useControlIngreso.ts` | Silent summary poll |
| Hook | `src/hooks/portal/useVisibleInterval.ts` | New: interval that pauses while the tab is hidden |
| Lib | `src/lib/portal/gestion-eventos-calendario.ts` | New |
| Lib | `src/lib/portal/proximo-evento.ts` | New |
| Lib | `src/lib/portal/eventos-ingreso.utils.ts` | `ordenarAsistentes`, `ultimosIngresos`, `contarAsistentes` |
| Lib | `src/lib/portal/mis-entradas-countdown.ts` | `getCountdown(..., { estilo: 'en' })` |
| Types | `src/types/portal/eventos-compras.types.ts` | `AsistentesIngresoOrden`, rename the filter label |
| Style | `src/app/globals.css` | `grit-scan` keyframe for the scanner line |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch `feat/grit-arena-v3-eventos-checkin` from `develop`. Take "before" screenshots of the three routes at 375 / 768 / 1440.
2. **Kit first**: `GritAlert`, `GritProgressRing`, `GritNextEventPanel` and the `GritPageHeader` `display` variant; add the icons. Check them against `s2Gt8L`, `G1a17B` and `xjlmU` `WcnLn`.
3. **Shared event pieces**: `EventoEstadoBadge` / `EventoActivoBadge` → `GritTag`, `EventoActionsMenu`, `EventoModalShell`. Check that the wizard, Compras and Mis entradas modals still open, trap focus and close.
4. **Gestión de eventos**:
   - header tools and KPI row;
   - filter bar;
   - the calendar lib + hook (`goToday`, adjacent days), the day cell and the calendar card;
   - `useProximoEvento` + `ProximoEventoPanel`;
   - the cards and list views;
   - alerts;
   - delete `EventosToolbar`.
5. **Check-in selector**: `useResumenesIngreso`, `CheckinEventoCard`, `CheckinPasos`, page header filters, pagination and states.
6. **Check-in screen**:
   - `useVisibleInterval`, then the poll in both hooks;
   - the sort/counts/recent helpers;
   - the header, scanner, manual code, result card, latest check-ins and attendee panel.
7. Verify each frame at 1440 and stacking at 768 / 375: no horizontal scroll, one `h1`, keyboard pass (segmented, menu, modals, camera toggle), and the §11 greps. Run `npm run lint`, `npx tsc --noEmit` and the tests.
8. Update `DESIGN.md` and `03-project-structure.md`, then write the commit message and PR description.
