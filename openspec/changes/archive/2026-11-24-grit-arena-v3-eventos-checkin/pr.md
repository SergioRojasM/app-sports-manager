# Commit message

```
feat(eventos): migrate events calendar and check-in to grit-arena-v3

- gestion-eventos (ZYxt2): "Gestiona tus eventos." header with view switch,
  expandable search and CTA; KPI row; calendar card (Hoy, inline filters,
  6-week grid, gradient event pills, ≤2 + "+N") next to a "Próximo evento"
  panel with ticket / check-in meters; Tarjetas on GritMediaCard; Lista on the
  kit table + GritPagination; GritAlert banners.
- control-ingreso (LV7I0): photo-led event cards with a check-in ring and
  "Abrir control", header filters, pagination, "Cómo funciona" strip.
- control-ingreso/[evento] (xjlmU): display-title header with live pill and
  progress card; scanner column (camera status, viewfinder, EV- prefix input,
  result card, latest check-ins); attendee panel with counts, order and
  50 rows; 20 s silent refresh while the tab is visible.
- Kit: GritNextEventPanel, GritAlert, GritProgressRing, GritPillSelect;
  GritPageHeader display variant; GritButton danger; compact table cells;
  GritKpiCard iconTone; GritOverlayPill danger; flush GritMediaCard zone.
- Shared: EventoModalShell (v3 modal, focus return), estado / activo tags,
  actions menu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

# Pull request

**Title:** feat(eventos): migrate events calendar and check-in to grit-arena-v3

## Summary

The three screens staff use around an event now match their frames in `grit-arena-v3.pen`. The OpenSpec change `grit-arena-v3-eventos-checkin` has the full contract (proposal, design and deltas for `team-events-management`, `team-events-checkin` and `grit-design-system`).

### Gestión de eventos — `/portal/orgs/[tenant]/gestion-eventos` (frame `ZYxt2`)
- **Header**: "Gestiona tus *eventos.*" with the Tarjetas / Lista / Calendario switch, a search icon that expands into a field, and "Nuevo evento".
- **KPI row**: Total, Próximos confirmados, Cancelados and Borradores.
- **Calendario**: a calendar card plus a **Próximo evento** panel.
  - The card has month navigation, "Hoy", and the Estado / Disciplina pills inside it.
  - The grid always shows 6 weeks, with the adjacent months' days muted.
  - Today gets a ring. Days show cyan gradient pills with name and time, at most 2 and then "+N". Cancelled, draft and inactive events each have their own pill style.
  - The panel shows the next confirmed event's photo and tags, the meters "Entradas emitidas" (vs. cupo) and "Check-in", and the buttons "Abrir check-in" and "Ver asistentes".
- **Tarjetas / Lista** (no frame, composed from the kit):
  - Tarjetas: photo cards with opaque tags, a date tile and a price pill.
  - Lista: the kit table with tags and `GritPagination`.
  - Both have a filter bar of pill selects with "Limpiar filtros".

### Control de ingreso — `/control-ingreso` (frame `LV7I0`)
- **Header**: "Control de *ingreso.*" with search, Estado, Periodo and Disciplina.
- **Event cards** in three zones:
  - a photo with a CONFIRMADO or CANCELADO pill and the discipline;
  - a countdown ("En N días"), the date, the name and tiles for Lugar, Entrenador, Cupo and Entradas;
  - a ring "X/Y ingresaron" with "Abrir control".
- 10 cards per page, followed by the "Cómo funciona" strip.

### Check-in de un evento — `/control-ingreso/[evento]` (frame `xjlmU`)
- **Header**: "Volver a eventos", the event name in display style, a "Check-in abierto" pill, a meta row, and a progress card ("X / Y ingresaron" plus "N pendientes").
- **Scanner column**:
  - an "Escanear QR" card with the camera status and a viewfinder (the scan line stays still under reduced motion);
  - a code field with a fixed `EV-` prefix;
  - the result card in v3 tones;
  - "Últimos ingresos (En vivo)".
- **Attendee panel**:
  - Todos / Ingresaron / Pendientes, each with a count;
  - search, and an order select (Pendientes primero, Nombre A–Z, Ingreso más reciente);
  - "Registrar" / "Deshacer" on each row, 50 rows per page.
- **En vivo**: the counters and the attendee list refresh silently every 20 s while the tab is visible. In testing, a check-in from another device showed up in about 16 s.

### Kit (`src/components/ui/grit`)
- New components: `GritNextEventPanel` (`s2Gt8L`), `GritAlert`, `GritProgressRing` and `GritPillSelect`.
- Extended:
  - `GritPageHeader`: `titleVariant="display"` and `titleAdornment`;
  - `GritButton`: `variant="danger"`;
  - compact table cell classes;
  - `GritKpiCard`: `iconTone`;
  - `GritOverlayPill`: `tone="danger"`;
  - `GritMediaCard`: `radius` / `stroke` `none`;
  - `GritSectionHeading`: `id`.
- `DESIGN.md`: §1 marks the three frames as migrated, §4 documents every addition, and §9 drops "Next Event Panel".

## UX changes to review
- The toolbar card is gone. Search lives in the header, and the filters sit in the calendar header or in the filter bar.
- The view switch now uses the kit segmented control (`aria-pressed` buttons) instead of a radiogroup with arrow keys.
- Calendar days show at most 2 pills, not 3 dots.
- The check-in selector uses cards instead of the table, and shows 10 per page instead of 20.
- On the check-in screen:
  - the camera button reads "Habilitar cámara";
  - the filter "Pendientes de ingreso" is now "Pendientes";
  - rows no longer show the email (search still finds it);
  - the list shows 50 rows per page instead of 20.
- **Shared restyle**: `EventoModalShell` and the estado / activo tags change look everywhere they are used: the wizard, Compras, Mis entradas and `ReservaRechazoModal`. Their API is unchanged.

## Follow-ups
- The calendar week view (`g9lnB`).
- The wizard and Compras pages, which have no frame yet.
- A batch counters RPC, so the selector doesn't call `resumen_ingresos_evento` once per card.
- A Realtime channel, if 20 s turns out to be too slow at the door.

## Test plan
- [x] `npx tsc --noEmit`, and `eslint` on every changed file (the project-wide lint count matches `develop`; all remaining problems are in untouched files).
- [x] `openspec validate grit-arena-v3-eventos-checkin --strict`.
- [x] Both DESIGN.md §11 v3 greps are empty on `control-ingreso/`, `gestion-eventos/*.tsx` and the kit. The global grep reports only the pre-existing `eventos/ObtenerEntradaModal.tsx`, which is out of scope.
- [x] 375 / 768 / 1440: one `h1` and no horizontal page scroll on all three routes. The Lista table fits 1120px.
- [x] Gestión:
  - expandable search (Escape returns focus to the icon, the field stays open while it has a value);
  - "Limpiar filtros", the keyboard view switch with `?vista=` sync, and "Hoy";
  - day selection, and the next-event panel's links and meters.
- [x] Menu and modals: Escape and focus return on the events page and on the Compras "Ver datos" modal.
- [x] Check-in: revert from a row (modal), register from a row (result card), a malformed code (no RPC call), order and filters, and the camera fallback (focus moves to the code field).
- [x] A change made from another device shows up through the 20 s refresh.
- [ ] Manual QA on a phone with a real camera before release.

Screenshots (before / after at 375 / 768 / 1440) are in the session scratchpad, and get attached when the PR is opened.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
