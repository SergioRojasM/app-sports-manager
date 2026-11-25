# Tasks

**References**
- Change artifacts: `proposal.md`, `design.md` (decisions D1–D9) and `specs/training-management/spec.md`. User Story: `projectspec/userstory/us0142-grit-arena-v3-entrenamientos-calendario.md`.
- Design source: frame `p5Ms22` in `projectspec/designs/pencil/grit-arena-v3.pen`. Key nodes:
  - `VE2IC` header, `oYM0c` KPIs;
  - `A5VHvt` week card, `np1YZ` session block;
  - `FWuM3` agenda, `dBJ8K` / `Dx343` / `u7ddwV` agenda cards.
  Read them only through the pencil MCP, because the file is encrypted.
- Month view reference: `ZYxt2` (`EventosCalendar` / `EventosCalendarDayCell`). Migration contract: `DESIGN.md` §10 and §12.

**How to check**: the project has no test runner, so checks use:
- `npx tsc --noEmit` and `npm run lint`;
- scratch scripts in the session scratchpad (run with `npx tsx`, never committed);
- the Playwright MCP against the dev server.

Never run `npm run build`.

**Order inside each group**: page → component → hook → lib/service → types. Every group lands its own `projectspec/03-project-structure.md` entries.

## 1. Branch setup

- [x] 1.1 Create branch `feat/grit-arena-v3-entrenamientos-calendario` from `develop`. Verify with `git branch --show-current`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`). Stop if it is

## 2. Baseline

- [x] 2.1 With the dev server running, capture "before" screenshots of `/portal/orgs/{tenant}/gestion-entrenamientos` through the Playwright MCP, at 375 / 768 / 1440px, as administrador and as usuario. Also capture the action modal open and the `ReservasPanel` open (regression reference). Save them in the session scratchpad and verify that the files exist
- [x] 2.2 Export `p5Ms22` (and `ZYxt2` for the month cells) as PNG to the scratchpad through the pencil MCP. Verify that the files exist

## 3. Types and calendar lib

- [x] 3.1 `src/types/portal/entrenamientos.types.ts`: add these types (design D2/D4):
  - `EntrenamientosVista` (`'semana' | 'mes' | 'lista'`);
  - `DiaSemana`, `FilaHoraria`, `DisciplinaTono`;
  - `EntrenamientosKpis` (`sesiones`, `disciplinas`, `reservas`, `sesionesLlenas`, `ocupacionPct: number | null`, `cupos`, `entrenadores`);
  - `EntrenamientoAgendaEstado`.

  Verify with `npx tsc --noEmit`
- [x] 3.2 `src/lib/portal/entrenamientos-calendario.ts`: date-key helpers (`startOfWeekKey`, `addDaysKey`, `addMonthsKey`), `buildSemana`, `formatSemanaLabel`, `formatMesLabel`, `bogotaMinutosDelDia` and `formatHoraCorta`. Verify with a scratch `tsx` script that asserts:
  - "16 – 22 nov 2026", "28 nov – 4 dic 2026" and "29 dic 2026 – 4 ene 2027";
  - Monday of 2026-11-22 = 2026-11-16;
  - `formatHoraCorta('2026-11-20T23:00:00Z')` = "18:00".
- [x] 3.3 Same lib: `buildFilasHorarias(items, expandidas)` + `offsetPx` + `alturaPx` (64px per hour as measured in `CBZLO`, 30px bands, no bands in an empty week, range at least 5–21 and extended to fit, bands for runs of 3 or more empty hours) and `asignarCarriles` (greedy lanes per overlap cluster). Verify with the scratch script:
  - sessions at 5:30, 6:30 and 18:00 produce one band 10–16 (or the run matching the data);
  - a 4:00 session starts the range at 4;
  - two overlapping sessions get lanes 0/1 with total 2;
  - a non-overlapping third session gets total 1.
- [x] 3.4 Same lib: `getDisciplinaTono` + the literal `TONO_CLASES` map (accent / violet / warning / danger / success / teal, only `grit-*` classes), `calcularKpis`, `findProximaId`, `getEstadoAgenda` (precedence cancelado > finalizado > lleno > proxima) and `nombreCorto`. Verify with the scratch script:
  - the spec example (18/24, 22/30, 24/24 + 1 cancelled) → 3 sesiones, 64 reservas, 1 llena, 82 %, 78 cupos;
  - no cupos → `ocupacionPct = null`;
  - "Camilo Hernández" → "Camilo H.";
  - unknown discipline → `accent`.
- [x] 3.5 Document the lib and the new types in `projectspec/03-project-structure.md` (lib and types sections). Verify that the entries exist

## 4. Hooks: period state and split loading

- [x] 4.1 Rewrite `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts` per design D2:
  - `vista`, `setVista` (keeps the anchor; mes → semana uses the selected day);
  - `anchorKey`, `periodo { from, to, label, dias, monthStartDate }` (the month range = the 42-cell grid from `buildCalendarCells`);
  - `goPrevious` / `goNext` / `goToday`;
  - `selectedDateKey`, `selectDate`, `clearSelectedDate`.

  Verify with `tsc`, and by logging `periodo` in the dev server while navigating:
  - week 16–22 nov → next → 23–29 nov;
  - Mes for Nov 2026 → from 2026-10-26 to 2026-12-06.
- [x] 4.2 Refactor `src/hooks/portal/entrenamientos/useEntrenamientos.ts` per design D3:
  - `loadCatalogos` runs once per `tenantId`;
  - `loadInstancias(from, to)` runs per period, with a stale-response guard (`useRef` counter) and `instancesLoading` / `instancesError`;
  - `refresh` reloads the groups + the instances of the current period;
  - expose `calendar` instead of `monthLabel` / `monthStartDate` / `goToNextMonth` / `goToPreviousMonth`.

  Verify that clicking "next week" in the Network tab (Playwright MCP `browser_network_requests`) requests only `entrenamientos` + capacity, and no `disciplinas` / `escenarios` / services / templates / groups
- [x] 4.3 Update the hooks entries in `projectspec/03-project-structure.md`. Verify that the entries exist

## 5. Shared page pieces

- [x] 5.1 `src/components/ui/grit/icon-map.ts`: add `gauge: 'speed'`. Verify with `tsc` and with `grep -n "gauge" src/components/ui/grit/icon-map.ts`
- [x] 5.2 `src/components/portal/entrenamientos/EntrenamientosHeaderTools.tsx`:
  - `GritSegmented variant="soft"` Mes / Semana / Lista (`ariaLabel="Vista del calendario"`);
  - `GritButton size="lg" icon="add"` "Crear entrenamiento", rendered only when `canManage`.

  Verify the `aria-pressed` states in a Playwright snapshot
- [x] 5.3 `EntrenamientosKpis.tsx`: 4 × `GritKpiCard` with the icons `calendar_month` / `event_available` / `speed` / `fitness_center`, the labels and details from the spec (with the "de la semana" / "del mes" suffix), and "—" while loading or when `ocupacionPct` is null. Verify the spec example numbers on seeded local data via Playwright
- [x] 5.4 `EntrenamientosPeriodoHeader.tsx`:
  - `GritIconButton` chevrons (labels "Semana/Mes anterior/siguiente");
  - the Exo 2 20/500 label;
  - the "Hoy" accent pill (`aria-label="Ir a hoy"`);
  - the legend (dot + name for the disciplines present), wrapping below `lg`.

  Verify at 1440 and 375 that nothing overflows

## 6. Week view (frame `A5VHvt`)

- [x] 6.1 `EntrenamientoBloque.tsx`: an absolute `button` with:
  - the tone gradient + border, the 3px accent bar, the name (Montserrat 10/600, `line-clamp-2`);
  - the mono meta row with the time and "N/M" in the tone colour (warning when full; "N" when there is no cupo);
  - a compact mode under 45px;
  - cancelled → `line-through opacity-60` with the neutral tone; past → `opacity-70`;
  - the full `aria-label` from the US, and the `gritFocusRing`.

  Verify visually against `np1YZ` / `EEfSW` in the pencil export
- [x] 6.2 `EntrenamientosSemana.tsx` (design D5):
  - day header tiles (today solid cyan + glow, selected tinted, `aria-pressed`, labels "Viernes 20 de noviembre, 3 sesiones");
  - the 44px sticky gutter with hour labels and band toggles (`GritIconButton icon="unfold_more"`, "Mostrar 10 am – 3 pm", `aria-expanded`, state reset on week change);
  - 7 relative columns with hour rules, band fill and lane-positioned blocks;
  - `overflow-x-auto` + `min-w-[680px]` below `md`;
  - the empty-week message (+ CTA for managers).

  Verify at 1440 against `A5VHvt`, and at 375 that the grid scrolls inside the card with no page horizontal scroll (`document.documentElement.scrollWidth <= innerWidth` in `browser_evaluate`)
- [x] 6.3 Add the components to `projectspec/03-project-structure.md` (entrenamientos slice). Verify that the entries exist

## 7. Day agenda panel (frame `FWuM3`)

- [x] 7.1 `EntrenamientoAgendaItem.tsx` (design D6):
  - the 42px time column + line;
  - an inset card `button`: discipline bar, name, `GritTag dot` status (Próxima accent + highlighted card, Lleno warning, Cancelado danger, Finalizado neutral);
  - the venue row + `punto_encuentro`;
  - the coach `GritAvatar size={22}` + `nombreCorto` or "Sin entrenador";
  - `GritProgress` (warning when full) + "N/M", or "N reservas" when there is no cupo;
  - a sibling "Reservar" / "Cupo lleno" `GritButton size="sm"` for usuario on future, non-cancelled sessions.

  Verify against `dBJ8K` / `Dx343` / `u7ddwV`, and that there are no nested buttons in the Playwright snapshot
- [x] 7.2 `EntrenamientosAgendaDia.tsx`:
  - the `GritCard` at 340px from `lg`;
  - the 58×62 date tile (today solid cyan), the title (Exo 2 17/500) and "N sesiones · M reservas";
  - the timeline scrolling inside the card from `lg` (`grit-scrollbar`);
  - the empty state "Sin sesiones este día" (+ CTA for managers);
  - the footer "Ver detalle del día" (`GritButton variant="secondary" icon="list"`).

  Verify that selecting a different day tile updates the panel
- [x] 7.3 Add the components to `projectspec/03-project-structure.md`. Verify that the entries exist

## 8. Month and list views

- [x] 8.1 Rewrite `EntrenamientosCalendar.tsx` as the Mes view:
  - `buildCalendarCells`, with "LUN…DOM" headers;
  - 14px-radius cells with `min-h-[95px]`, weekend shading, muted inert adjacent days, today ring, selected tint;
  - up to 2 tone pills ("6:30 Running Pista", struck through when cancelled; click → modal) + "+N";
  - each cell is a `button` with `aria-pressed` and the label "20 de noviembre, 3 sesiones".

  Remove `DISCIPLINE_COLOR_PALETTE` and the footer month buttons. Verify a day with 5 sessions shows 2 pills + "+3"
- [x] 8.2 Rewrite `EntrenamientosList.tsx` as the Lista view (design D7):
  - a `gritTable*` table with the columns Fecha, Entrenamiento (+ Serie + "Formulario externo" link with `target="_blank" rel="noopener noreferrer"`), Disciplina (tone dot), Escenario, Entrenador, Cupo, Estado, Acciones (`GritIconButton variant="ghost" icon="more_horiz"` "Opciones de {nombre}" + "Reservar" for usuario);
  - stacked inset cards below `md`;
  - `GritPagination` at 20 per page, reset on period / filter change;
  - the removable day `GritChip`;
  - the empty messages.

  Verify pagination with more than 20 sessions and the link attributes in a snapshot
- [x] 8.3 Update the `EntrenamientosCalendar` / `EntrenamientosList` descriptions in `projectspec/03-project-structure.md`. Verify that the entries exist

## 9. Action modal and page wiring

- [x] 9.1 Restyle `EntrenamientoActionModal.tsx` to the v3 modal pattern (design D8), with **unchanged props**:
  - glass panel, Exo 2 500 title;
  - full-width secondary `GritButton` actions, "Eliminar" as `danger`;
  - muted disabled reasons;
  - `useGritDialogFocus` (trap, Escape, focus return).

  Verify, as admin on a past training, that Editar / Eliminar are disabled with the existing reasons, and that Escape returns focus to the opener
- [x] 9.2 Rewire `EntrenamientosPage.tsx`:
  - `GritPageHeader` (role-based title, `titleAccent="entrenamientos."`) with `EntrenamientosHeaderTools`;
  - `?vista=` sync via `useSearchParams` + `router.replace(..., { scroll: false })`, falling back to `semana`;
  - `GritAlert` success / danger (dismissible);
  - the KPI row;
  - the workspace grid `lg:grid-cols-[minmax(0,1fr)_340px]` (Lista full width);
  - period-change default selected day;
  - the `listaDiaFiltro` state for "Ver detalle del día";
  - `onOpenTraining` → action modal, and `onReservar` → `ReservasPanel` auto-book;
  - `GritEmptyState` loading / error with "Reintentar".

  Remove the v2 `LoadingState` and the hand-rolled banners. Verify each spec scenario of "Switchable training views" and "Trainings page loading and error states" via Playwright
- [x] 9.3 `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx`: wrap `EntrenamientosPage` in `<Suspense>` (needed by `useSearchParams`, as in `gestion-eventos`). Verify that a direct load of `?vista=lista` renders without a console error
- [x] 9.4 Update `src/components/portal/entrenamientos/index.ts` exports, and the page / component entries in `projectspec/03-project-structure.md`. Verify with `tsc`

## 10. Integration verification

- [x] 10.1 Compare against `p5Ms22` at 1440: header, segmented, KPI row, week card, agenda. Check stacking at 768 and 375 with no page horizontal scroll and exactly one `h1` (`document.querySelectorAll('h1').length === 1`). Save the "after" screenshots in the scratchpad
- [x] 10.2 Role pass:
  - administrador and entrenador: create, edit (single / series scope), delete, publish to events (admin only), "Ver reservas" — the calendar refreshes after each;
  - usuario: no CTA; "Reservar" auto-book from an agenda card and from a Lista row; "Cupo lleno" disabled; no button on past or cancelled sessions.

  Verify each against the spec scenarios
- [x] 10.3 Keyboard pass: Tab through the segmented control, chevrons, "Hoy", day tiles, band toggles, blocks, agenda cards, month cells and list actions. Focus rings must be visible, and Enter / Space must activate. The modal traps focus and Escape closes it
- [x] 10.4 Run both `DESIGN.md` §11 greps on the files this change migrated (`EntrenamientosPage`, `EntrenamientosCalendar`, `EntrenamientosList`, `EntrenamientosSemana`, `EntrenamientosAgendaDia`, `EntrenamientosKpis`, `EntrenamientosHeaderTools`, `EntrenamientosPeriodoHeader`, `EntrenamientoBloque`, `EntrenamientoAgendaItem`, `EntrenamientoActionModal`; the out-of-scope form / wizard / detail / template modals keep v2 leftovers), and `grep -nE "bg-(emerald|amber|rose|cyan|sky|lime|fuchsia|violet)-[0-9]|text-grit-bg"` on the same files. Verify that all three return nothing
- [x] 10.5 Update `DESIGN.md` §1: mark `p5Ms22` as migrated and list the deviations:
  - KPI sub-lines are derived (no previous-period comparison, no occupancy goal);
  - Mes and Lista are composed from the kit;
  - discipline tones are index-based;
  - the modals, apart from the action modal, are not restyled.

  Verify that the row is updated
- [x] 10.6 Run `npx tsc --noEmit` and `npm run lint`. Verify that both pass with no new errors (never `npm run build`)
- [x] 10.7 Write the commit message (Conventional Commits, `feat(entrenamientos): …`) and the PR description in `openspec/changes/grit-arena-v3-entrenamientos-calendario/pr.md`. Include: summary, screenshots before / after, BREAKING (UX) list, verification checklist, and non-goals / follow-ups (batch capacity query, restyle of the form / wizard / detail modals, `kPW3x` Reservas). Verify that the file exists

## Workflow follow-up

- Run `/opsx:verify` before archiving.
- Archive the change with `/opsx:archive` after the PR is merged into `develop`.
