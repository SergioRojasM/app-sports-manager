# Tasks

**References**
- Change artifacts: `proposal.md`, `design.md` (decisions §1–§14 and the node measurement table), and the specs under `specs/`.
- Design source: frames `ZYxt2`, `LV7I0` and `xjlmU` in `projectspec/designs/pencil/grit-arena-v3.pen`, plus the component `s2Gt8L`. Read them only through the pencil MCP, because the file is encrypted.
- Migration contract: `DESIGN.md` §10 and §12.

**How to check**: the project has no test runner, so checks use `npx tsc --noEmit`, `npm run lint`, scratch scripts in the session scratchpad (not committed) and the Playwright MCP. Never run `npm run build`.

**Order inside each group**: page → component → hook → lib/service → types. Every group lands its own `projectspec/03-project-structure.md` and `DESIGN.md` entries.

## 1. Branch setup

- [x] 1.1 Create branch `feat/grit-arena-v3-eventos-checkin` from `develop`. Verify with `git branch --show-current`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`). Stop if it is

## 2. Baseline

- [x] 2.1 With the dev server running, capture "before" screenshots through the Playwright MCP, at 375/768/1440px, and save them in the session scratchpad. Verify that the files exist. Capture:
  - `/portal/orgs/{tenant}/gestion-eventos` in all three views;
  - `/control-ingreso`;
  - `/control-ingreso/{evento}`;
  - one wizard modal, the Compras validation modal and the Mis entradas cancel modal (regression references for group 4).
- [x] 2.2 Export `ZYxt2`, `LV7I0`, `xjlmU` and `s2Gt8L` as PNG to the scratchpad through the pencil MCP, as the visual reference. Verify that the four files exist

## 3. Kit primitives

- [x] 3.1 `src/components/ui/grit/GritAlert.tsx`:
  - tones `success` / `warning` / `danger` / `info` (token at 10% fill, 35% stroke, 16px radius), with a leading icon;
  - `role="status"` for success/info and `role="alert"` for warning/danger;
  - optional `action`, and `onDismiss` → `GritIconButton size="sm" variant="ghost" label="Cerrar mensaje"`.

  Verify with `tsc` and by rendering each tone on a scratch page in the Playwright MCP (correct role in the snapshot)
- [x] 3.2 `src/components/ui/grit/GritProgressRing.tsx`:
  - an SVG track (white 8%) + cyan arc (`stroke-dasharray`), `size` 96 by default;
  - centre "value/max" Exo 2 24 + caption 10px muted;
  - `role="progressbar"` with min/max/now + label;
  - `null` → "—" and no arc; `max = 0` → empty arc.

  Verify with a scratch render of 1/4, 0/0 and null (quarter arc, empty, "—")
- [x] 3.3 `src/components/ui/grit/GritNextEventPanel.tsx` (`s2Gt8L`, design table row `U3fEa`):
  - a cover with the image (or the placeholder from `GritMediaCard`), a label pill with a glowing dot, and an optional round action (`GritIconButton`, `label` required);
  - title Exo 2 32/600 italic as a heading (`headingLevel`), and a subtitle;
  - tags;
  - meters (inset tiles, value + "/ total", 5px track with `role="progressbar"`, caption when there is no total, "—" for null);
  - actions at the bottom.

  Verify against the `s2Gt8L` PNG at 320px in the Playwright MCP
- [x] 3.4 `GritPageHeader`: add `titleVariant: 'light' | 'display'` (display = Exo 2 600 italic) and `titleAdornment` rendered beside the `h1`, outside it. Verify that existing pages (e.g. `/portal/inicio`) render unchanged, and that a display header has exactly one `h1` whose text excludes the adornment
- [x] 3.5 Export the three new components from `src/components/ui/grit/index.ts`. Add the new design icons to `icon-map.ts` (`scan-line`, `scan-qr-code`, `calendar-search`, `circle-check-big`, `circle-dashed`, `clock-arrow-up`, `clock-4`, `undo-2`, `log-in`, `arrow-down-up`, `badge-check`, `hourglass`, `footprints`, `medal`, `user-round`, `ticket`, `camera`) mapped to Material Symbols. Verify with `tsc` and with a grep that each key resolves
- [x] 3.6 Add the `grit-scan` keyframe to `src/app/globals.css` (a vertical translate inside the 170px frame). Run `rm -rf .next` before checking, because Turbopack can serve a stale stylesheet. Verify that the animation runs, and stops under emulated `prefers-reduced-motion: reduce` (Playwright `browser_emulate_media`)
- [x] 3.7 `DESIGN.md`:
  - §4: add the `GritAlert`, `GritProgressRing` and `GritNextEventPanel` rows, and the `GritPageHeader` `titleVariant` / `titleAdornment` note;
  - §9: remove the "Next Event Panel" row from "drawn in v3 but not yet in the kit".

  Verify with `grep -n "GritNextEventPanel" DESIGN.md`
- [x] 3.8 Run the §11 v3 grep on `src/components/ui/grit`. Verify that it returns nothing

## 4. Shared event pieces

- [x] 4.1 `src/components/portal/gestion-eventos/EventoEstadoBadge.tsx` and `EventoActivoBadge.tsx` → `GritTag` (design §14), with unchanged props:
  - confirmado: `accent` dot; cancelado: `danger` dot; borrador: `neutral` + `edit_note`;
  - activo: `accent` + `visibility`; inactivo: `warning` + `visibility_off`.

  Verify that the Compras page and the wizard preview still render the tags (Playwright snapshot)
- [x] 4.2 `EventoActionsMenu.tsx`:
  - the trigger becomes `GritIconButton size="sm" variant="ghost" icon="more_horiz"`, labelled with the event name, keeping `aria-haspopup` / `aria-expanded`;
  - the portalled menu panel becomes a glass card with 13px items and `hover:bg-white/[0.04]`;
  - the item set, the flip-up and the Escape/focus return are unchanged.

  Verify with the keyboard in the Playwright MCP: open, arrow through, Escape returns focus
- [x] 4.3 `EventoModalShell.tsx` → the §9 modal pattern, with the same props (design §14):
  - a `GritCard glass` panel, a `GritSectionHeading` title with `id`, and a close `GritIconButton` "Cerrar";
  - focus in on open and focus return on close, Escape / backdrop click when not `busy`;
  - `EventoDangerButton` → `GritButton secondary` with `text-grit-danger`.

  Restyle the error lines of `CambiarEstadoEventoModal` / `EliminarEventoModal` (`rounded-grit-lg`, token tones). Verify that the wizard "Salir sin guardar" modal, the Compras "Validar" modal, the Mis entradas "Cancelar" modal and `ReservaRechazoModal` open, trap focus and close, and compare them with the group 2 screenshots
- [x] 4.4 Update `projectspec/03-project-structure.md` for the badges, the menu and the modal shell. Run the §11 v3 grep on these five files and verify that it returns nothing

## 5. Gestión de eventos (`ZYxt2`)

- [x] 5.1 `GestionEventosPage.tsx`:
  - the header becomes "Gestiona tus" / "eventos." (`italic`), with `actions = <EventosHeaderTools/>`;
  - the three banners become `GritAlert` (`guardado` success, activo success, activo error danger), each dismissible;
  - the order is header → alerts → KPI row → filter bar (tarjetas/lista) → view;
  - remove `EventosToolbar`.

  Verify with Playwright: one `h1`, the alert after `?guardado=creado`, and the URL cleaned of `guardado` with `vista` kept
- [x] 5.2 New `EventosHeaderTools.tsx` (design §3–§4):
  - `GritSegmented variant="solid"` with Tarjetas `grid_view` / Lista `view_list` / Calendario `calendar_month` (`ariaLabel` "Vista de eventos");
  - an expandable search: `GritIconButton size="lg" icon="search" label="Buscar evento"` ⇄ `GritSearchField size="lg" aria-label="Buscar evento por nombre"`; it collapses on Escape/blur only when empty and returns focus to the icon;
  - `GritButton size="lg" icon="add"` "Nuevo evento".

  Verify the spec scenarios "Expand and type", "Collapse when empty", "Stays open with a value" and "Keyboard switching", and that `?vista=` still syncs
- [x] 5.3 New `EventosFilterBar.tsx`:
  - Estado (Todos/Confirmado/Cancelado/Borrador, or without Borrador via `ocultarBorrador`), Periodo and Disciplina as `<select className={gritPillSelectClass}>`, each with an `aria-label` and a leading cyan icon;
  - `GritButton ghost sm` "Limpiar filtros" when a filter or the search is non-default;
  - a `periodo` prop to hide Periodo, and `layout: 'bar' | 'inline'` (inline = the compact calendar-header pills of `gQPV3`).

  Verify the "Clear filters" scenario
- [x] 5.4 `EventosStatsCards.tsx` → four `GritKpiCard` (inline) with the labels and icon tones of the frame (Cancelados `text-grit-danger`, Borradores `text-grit-subtext`), and skeletons while loading. Verify that the values are unchanged after filtering ("Stats ignore filters")
- [x] 5.5 New `src/lib/portal/gestion-eventos-calendario.ts`:
  - `buildCalendarCells(monthStartDate)` → 42 cells `{ dateKey, dayNumber, inMonth, isWeekend }`;
  - `pillTone(evento)`;
  - `MAX_PILLS_PER_DAY = 2`;
  - `dayAriaLabel(dateKey, eventos)`, keeping the "N eventos, M inactivos" wording.

  Verify with a scratch script: November 2026 starts with 26–31 Oct (`inMonth=false`), has 30 in-month cells, and ends with 1–6 Dec; `2026-10-01T01:00:00Z` lands on `2026-09-30`
- [x] 5.6 `useEventosCalendar.ts`: add `goToday()` (Bogotá current month + select today) and `isCurrentMonth`. Verify the "Return to today" scenario (range request for the current month in the network panel)
- [x] 5.7 New `EventosCalendarDayCell.tsx` + rewritten `EventosCalendar.tsx` (design table rows `zVKas`, `RToF5`, `bvBA2`, `h7Ok29`, `KJWrq`):
  - the card surface and header (chevron `GritIconButton`s "Mes anterior"/"Mes siguiente", the month title, the "Hoy" pill, `EventosFilterBar layout="inline"` with Estado + Disciplina);
  - the weekday row;
  - the cells: weekend surface; adjacent days `aria-hidden` and muted; today ring + glow; selected tint;
  - the pills: confirmado gradient + time, cancelado muted/struck + sr-only "Cancelado", borrador dashed italic, inactivo `visibility_off` warning; dots below `sm`; "+N";
  - the undated note;
  - the selected-day list as §9 list rows with `GritTag` + `EventoActionsMenu`;
  - the inline month error with "Reintentar".

  Remove `DISCIPLINE_COLOR_PALETTE`. Verify the "Day overflow", "Adjacent-month days", "Select a day", "Calendar day with an inactive event" and "Calendar month fails" scenarios
- [x] 5.8 New `src/lib/portal/proximo-evento.ts` `pickProximoEvento(eventos, now)` (design §7), and new `src/hooks/portal/gestion-eventos/useProximoEvento.ts`:
  - the selection, plus `eventoComprasService.resumenIngresos(id)` when the id changes;
  - `reload()`, and `resumen: ResumenIngresos | null` with an error → null.

  Verify with a scratch script: drafts and cancelled events are skipped; an event earlier today is kept; the choice is independent of the month shown
- [x] 5.9 New `ProximoEventoPanel.tsx` → `GritNextEventPanel`:
  - the label "PRÓXIMO EVENTO" and the edit action → `/{id}/editar`;
  - tags for discipline, place (`getEventoLugarLabel`, "Por definir"), estado and Inactivo;
  - the meters "Entradas emitidas" (`activas`/`cupo_maximo`, or "Sin límite") and "Check-in" (`ingresaron`/`activas`), "—" on failure;
  - "Abrir check-in" (primary) → `control-ingreso/{id}` and "Ver asistentes" (secondary) → `/{id}/compras`;
  - the empty state "Sin eventos próximos".

  Lay out the calendar view as `xl:grid-cols-[1fr_320px]` in `GestionEventosPage`, and call `proximo.reload()` in `handleMutationSuccess` / `handleActivoSuccess`. Verify the "Counters shown", "Unlimited capacity", "Counters fail", "No upcoming event", "Open check-in from the panel" and "Edit from the panel" scenarios
- [x] 5.10 `EventoCard.tsx` + `EventosGrid.tsx`, rebuilt on `GritMediaCard` (radius 24):
  - overlay pills with the estado/borrador tag, the Activo/Inactivo tag and Privado;
  - `GritDateTile md`, the name, the meta lines (date, duration, place, trainers, cupo), and the price;
  - the actions menu top-right (`hideActions` kept for the wizard preview);
  - a dashed warning border when inactive;
  - skeletons.

  Verify the cards view scenarios, including "Banner fails to load", and that the wizard preview still renders the card without the menu
- [x] 5.11 `EventosTable.tsx` → a `GritCard variant="card" padding="none"` with the `gritTable*` classes:
  - the columns Evento · Fecha y hora · Lugar · Entrenador · Cupo · Visibilidad · Activo · Estado · Acciones, as tags;
  - stacked rows below `md`;
  - `GritPagination` with "Mostrando A–B de N eventos";
  - remove `renderAcciones` (no longer used).

  Verify the "Table columns rendered", "Pagination" and "Single page hides pagination" scenarios
- [x] 5.12 Delete `EventosToolbar.tsx`, update `gestion-eventos/index.ts`, and check that nothing else imports the deleted pieces (`grep -rn "EventosToolbar\|renderAcciones" src` is empty)
- [x] 5.13 Update `projectspec/03-project-structure.md` (`GestionEventosPage`, the new components, the calendar lib, `useProximoEvento`, `useEventosCalendar`). Mark `ZYxt2` as migrated in `DESIGN.md` §1, noting that `g9lnB` (the week view) is not built. Run the §11 v3 grep on `src/components/portal/gestion-eventos/*.tsx` and verify that it returns nothing

## 6. Check-in selector (`LV7I0`)

- [x] 6.1 `useGestionEventos.ts`: add the `pageSize` option (default 20). Verify that the management list still pages at 20
- [x] 6.2 `src/lib/portal/mis-entradas-countdown.ts`: `getCountdown(fechaHora, now, { estilo: 'en' })` → "En N días" / "Mañana" / "Hoy" / "Finalizado". The default wording is unchanged. Verify with a scratch script, for both styles
- [x] 6.3 New `src/hooks/portal/control-ingreso/useResumenesIngreso.ts`: `Promise.allSettled` over the given ids, cached by id, a rejected call → `null`, and cancellation on unmount. Verify in the network panel that changing page requests only the new page's ids ("Counters per page")
- [x] 6.4 New `CheckinEventoCard.tsx` (design row `w14ZBK`):
  - **photo zone** (`GritMediaCard`): the estado pill and the discipline `GritOverlayPill`;
  - **info zone**: the countdown pill (`estilo: 'en'`) + the date, the name in display style, and four inset field tiles (Lugar, Entrenador "Sin asignar", Cupo "Ilimitado", Entradas);
  - **CTA zone**: `GritProgressRing` + `GritButton` "Abrir control" (`href`) for confirmado, or "Evento cancelado".

  It stacks below `lg` (photo on top, CTA at the bottom). Verify the "Card content", "Event today", "Cancelled event" and "Counter fails" scenarios
- [x] 6.5 New `CheckinPasos.tsx`: three `GritCard` steps with `GritIconTile shape="circle" tone="accent"`, a JetBrains Mono number, a title and the description texts from the spec. Verify the copy against the spec
- [x] 6.6 Rewrite `ControlIngresoEventosPage.tsx`:
  - the header "Control de" / "ingreso." (`italic`), with actions = `GritSearchField size="lg"` ("Buscar evento") + `EventosFilterBar` without Borrador;
  - the section line "Eventos disponibles" + "N de M eventos";
  - the cards (`pageSize: 10`) + `GritPagination`;
  - `CheckinPasos`;
  - skeleton cards, the error with retry, the empty and no-match states.

  Verify the spec scenarios "Draft events hidden", "Event in progress stays listed", "Past events through the filter", "Count line" and "Pagination"
- [x] 6.7 Update `projectspec/03-project-structure.md` (selector, card, steps, hook, countdown option). Mark `LV7I0` as migrated in `DESIGN.md` §1

## 7. Check-in screen (`xjlmU`)

- [x] 7.1 New `src/hooks/portal/useVisibleInterval.ts` (design §9): it runs the callback every N ms while visible, pauses while hidden, and fires once on return. Verify with the Playwright MCP that no requests are made while the page is hidden (`document.visibilityState` emulated through `browser_evaluate`), and that one refresh runs on return
- [x] 7.2 `src/lib/portal/eventos-ingreso.utils.ts`: add `ordenarAsistentes`, `contarAsistentes` and `ultimosIngresos`. Add `AsistentesIngresoOrden` to `src/types/portal/eventos-compras.types.ts`. Verify with a scratch script:
  - `pendientes` puts the no-entry attendees first (each group by name);
  - `recientes` is newest-first with nulls last;
  - the counts are 100/37/63 on a fixture.
- [x] 7.3 `useAsistentesIngreso.ts`:
  - `orden` (default `pendientes`), `conteos` computed before the filter, and `recientes` (5);
  - `ASISTENTES_INGRESO_PAGE_SIZE = 50`;
  - a 20 s silent poll via `useVisibleInterval`, skipped while a row action is pending, keeping the filters, page and data on failure.

  Verify the "Segment counts", "Pending first by default", "Most recent entry order" and "Silent refresh fails" scenarios (block the request in Playwright)
- [x] 7.4 `useControlIngreso.ts`: add a silent summary poll (same interval, skipped while `pending`). Verify the "Another door checks someone in" scenario with two browser contexts
- [x] 7.5 Rewrite `IngresoResumenHeader.tsx`:
  - the "Volver a eventos" link;
  - `GritPageHeader titleVariant="display"` + `titleAdornment` (live pill "Check-in abierto", or a `GritTag danger` "Evento cancelado");
  - the meta row (calendar, map-pin and discipline icons);
  - the progress card ("X / Y ingresaron", the "N pendientes" pill, a glowing track with `role="progressbar"`, and the pago-pendiente line in `text-grit-warning`).

  Verify the "Pending counter" and "Cancelled event header" scenarios
- [x] 7.6 `QrScanner.tsx` (design §12):
  - a card with the title "Escanear QR" and the status (`onStatusChange`, `role="status"`);
  - the 316px viewport with corner brackets + the `grit-scan` line + the QR placeholder icon;
  - "Habilitar cámara" (primary), and "Desactivar cámara" (secondary) while on;
  - the fallback message;
  - unchanged camera lifecycle (lazy import, visibility stop, destroy).

  Verify the "Camera off by default", "Camera enabled" and "Camera denied" scenarios (Playwright with granted/denied camera permission)
- [x] 7.7 `CodigoManualForm.tsx` (design §11): a card titled with the `<label>` "Código de la entrada", a pill row with an `aria-hidden` "EV-" prefix, a mono suffix input (`maxLength` 17) and `GritButton sm` "Validar". On submit it sends `EV-{suffix}` unless the prefix was pasted. Verify the "Manual code with prefix pasted" scenario and that a malformed code shows "Código no encontrado" without a network request
- [x] 7.8 `IngresoResultadoCard.tsx`: v3 tones (`grit-success` / `grit-warning` / `grit-danger` at 10/35%), the title `font-medium`, and the always-mounted live region. Verify each result code with a scratch fixture render, and the 4 s auto-dismiss on `ok`
- [x] 7.9 New `UltimosIngresos.tsx`: a card with "Últimos ingresos", the "En vivo" glowing marker, up to 5 rows (`circle-check`, the name, the JetBrains Mono time), and "Aún no hay ingresos.". Verify the "Newest first" and "Revert removes the entry" scenarios
- [x] 7.10 Rewrite `AsistentesIngresoTable.tsx` (design row `PMix6`):
  - the panel header: title + count bubble + `GritSegmented` with counts (Todos / Ingresaron / Pendientes);
  - the toolbar: `GritSearchField md` ("Nombre, correo o código") + the order pill select;
  - column heads from `md`;
  - the rows: `GritAvatar size={32}` (cyan tone when entered), the name + ticket name, the mono code, the status, "Registrar" (`GritButton sm outline-accent`, "Registrando…") or "Deshacer" (`GritButton sm ghost`), with `aria-label`s that include the name; the entered-row tint;
  - an `lg` scroll area with a fade;
  - `GritPagination` with "A–B de N asistentes";
  - the states (loading, error + retry, empty, no match + "Limpiar filtros").

  Verify the "Filter used tickets", "Manual registration from the list" and "Email search" scenarios
- [x] 7.11 `ControlIngresoPage.tsx`:
  - the layout `lg:grid-cols-[400px_1fr]`, with the mobile order from the spec (header, scanner, manual, result, latest, attendees);
  - the inline errors (`control.error`, `cardError`) become `GritAlert danger`, with "Reintentar" as the action;
  - `RevertirIngresoModal` error line on tokens.

  Verify the whole screen against the `xjlmU` PNG at 1440px, and that the "Undo from the card" and "Green result" scenarios still pass
- [x] 7.12 Update `projectspec/03-project-structure.md` (`control-ingreso` slice, the hooks, `useVisibleInterval`, the utils). Mark `xjlmU` as migrated in `DESIGN.md` §1. Run the §11 v3 grep on `src/components/portal/control-ingreso` and verify that it returns nothing

## 8. Integration checks

- [x] 8.1 Compare the three routes with the frame PNGs at 1440px, and check stacking at 768 / 375px through the Playwright MCP:
  - no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`);
  - exactly one `h1` per page;
  - segmented controls scroll inside their track.

  Save the "after" screenshots in the scratchpad
- [x] 8.2 Keyboard pass in the Playwright MCP on the three pages:
  - the view switch and segmented controls expose `aria-pressed`;
  - the expandable search;
  - the actions menu, the modals (Escape + focus return), the camera toggle, the manual code;
  - the row actions.

  Focus rings must be visible
- [x] 8.3 Run `npx tsc --noEmit` and `npm run lint` with zero errors. Run the §11 global grep across `src/components/portal src/app/portal` (empty). Do not run `npm run build`
- [x] 8.4 Run `openspec validate grit-arena-v3-eventos-checkin --strict`. Verify that it reports the change as valid

## 9. Delivery

- [x] 9.1 Confirm that `DESIGN.md` §1 marks `ZYxt2`, `LV7I0` and `xjlmU` as migrated, and that §4/§9 match the code. Verify every new component name with `grep`
- [x] 9.2 After 8.3 passes, write the commit message (Conventional Commits, e.g. `feat(eventos): migrate events calendar and check-in to grit-arena-v3`) and the PR description to `openspec/changes/grit-arena-v3-eventos-checkin/pr.md`. The PR description has:
  - a summary per page;
  - before/after screenshots;
  - the UX breaks (toolbar removed, the view switch semantics, 2 pills per day, the selector cards replacing the table, "Habilitar cámara", "Pendientes", no email in rows, 50 per page);
  - the shared-component restyle and its callers;
  - the 20 s poll;
  - the follow-ups (week view `g9lnB`, a batch counters RPC, wizard/Compras pages);
  - the test plan.

  Verify that the file exists and references every spec

## Workflow follow-up

- Run `/opsx:verify` and then archive the change once reviewed. The archive merges the deltas of `team-events-management`, `team-events-checkin` and `grit-design-system`.
