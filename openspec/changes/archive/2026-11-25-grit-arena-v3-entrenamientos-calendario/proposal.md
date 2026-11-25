# Proposal

> Source: User Story `projectspec/userstory/us0142-grit-arena-v3-entrenamientos-calendario.md` (US-0142), created from the user request (2026-11-25): "Crea una historia de usuario para migrar la visual de la vista de entrenamientos Node ID: p5Ms22". `DESIGN.md` §1 maps frame `p5Ms22` ("Admin · Entrenamientos (calendario)") to `orgs/[tenant_id]/gestion-entrenamientos`. The migration contract is `DESIGN.md` §10 and §12. The archived changes `2026-11-24-grit-arena-v3-eventos-checkin` (calendar card, KPI row, header tools) and `2026-11-25-grit-arena-v3-admin-organizacion` are the reference for scope and conventions.
>
> Scope decisions (US-0142 "Scope decisions"):
> - **Front-end + derived data only.** No migrations, RPCs, columns or RLS changes. Every number is derived from the instances already loaded for the visible period.
> - KPI sub-lines without data ("+9 % vs. semana pasada", "meta 75 %") are replaced by derived sub-lines, not invented.
> - The week view is the frame; Mes and Lista have no frame and are composed from the kit and the `ZYxt2` calendar pattern.
> - Of the modals, only `EntrenamientoActionModal` moves to the v3 modal pattern. The form, wizard, detail, scope, template modals and `ReservasPanel` keep their layout.

## Why

`gestion-entrenamientos` is the main screen of the "Entrenamientos" menu group, and it still uses v2 markup:
- a bold title "Gestión de Entrenamientos", a `rounded-grit-md` CTA with `text-grit-bg`, emerald success banners and a hand-rolled error box;
- a month grid where each session is a 10px dot coloured with raw Tailwind colours (`bg-cyan-400`, `bg-emerald-400`, …), so staff must hover or open each day to know what's scheduled;
- a sticky list of v2 cards with emerald / amber / rose capacity pills.

The v3 frame `p5Ms22` redesigns it as a planning workspace: a weekly time grid (sessions by day and hour, sized by duration and coloured by discipline), a "day agenda" panel with occupancy and coach, and a KPI row. That makes gaps, overlaps and full sessions visible at a glance. The calendar hook also reloads every catalog on each month change, which the period refactor fixes.

## What Changes

### `/gestion-entrenamientos` (frame `p5Ms22`)
- **Header**: `GritPageHeader` "Gestiona tus **entrenamientos.**" ("Calendario de **entrenamientos.**" for `usuario`). Its tools are a `GritSegmented` view switch (Mes / Semana / Lista, default Semana, kept in `?vista=`) and "Crear entrenamiento" as `GritButton size="lg"` (managers only).
- **KPI row**: four `GritKpiCard`, computed for the visible period (week or month):
  - Sesiones · N disciplinas;
  - Reservas · N sesiones llenas;
  - Ocupación % · sobre N cupos;
  - Entrenadores · activos.
- **Period header** shared by the three views:
  - chevrons and the label ("16 – 22 nov 2026" / "Noviembre 2026");
  - a "Hoy" pill;
  - the discipline legend.
- **Semana** (frame): day header tiles (today solid cyan; the selected day is tinted) and an hourly grid, 64px per hour:
  - empty runs of 3 or more hours collapse into expandable bands;
  - session blocks are placed by start time and sized by duration, with overlapping sessions in lanes;
  - each block has a discipline-tone gradient, the name, and the time + "reservas/cupo" in mono;
  - cancelled sessions are struck through; full sessions show their capacity in the warning tone.
- **Agenda del día** panel (340px, next to Semana and Mes): a big date tile, "N sesiones · M reservas", and timeline cards. Each card shows:
  - the time, a discipline bar and the name;
  - a status tag: Próxima / Lleno / Cancelado / Finalizado;
  - the venue, the coach avatar and short name, and a capacity track.
  - "Ver detalle del día" opens Lista filtered to that day.
- **Mes** (no frame; `ZYxt2` pattern): a 42-cell grid with weekend shading, muted adjacent-month days, today ringed, and at most 2 tone pills per cell + "+N". Clicking a day selects it for the agenda.
- **Lista** (no frame): a week table on the `gritTable*` classes + `GritPagination` (20 per page), with a removable day-filter chip. Its columns are Fecha, Entrenamiento (+ the "Formulario externo" link), Disciplina, Escenario, Entrenador, Cupo, Estado and Acciones. Below `md`, rows become stacked cards.
- **Discipline tones**: a stable palette taken from each discipline's position in the tenant's sorted options (cyan → violet → warning → danger → success → teal). It replaces the raw Tailwind palette.
- **Action modal**: `EntrenamientoActionModal` moves to the v3 modal pattern (glass card, kit buttons, focus trap). Its props and its enable / disable rules don't change.
- **States**: alerts become `GritAlert`. Loading, empty and error states use `GritEmptyState`, and errors offer "Reintentar".
- **Data loading**: catalogs (groups, disciplines, scenarios, trainers, services, form templates) load once per tenant. Changing the period only reloads instances and their capacities, for a week range or the 42-cell month range.
- **BREAKING (UX)**:
  - The default view is a week, not a month.
  - The month/day dots and the sticky "Lista de entrenamientos" side column are replaced by the week grid + agenda panel and the Lista view.
  - The "Mes anterior / Mes siguiente" footer buttons become chevrons in the period header.
  - The capacity colour signal changes from green / yellow / red to cyan, with warning when full.
  - "Opciones" / "Ver" text buttons become a click on the session, or the `more_horiz` row action in Lista.

## Non-goals

- New data: comparisons with the previous period, occupancy goals, coach photos and attendance figures.
- Restyling `EntrenamientoFormModal`, `EntrenamientoWizard`, `EntrenamientoDetalleModal`, `EntrenamientoScopeModal`, `PlantillasListModal` and `GuardarPlantillaModal`. They inherit the v3 tokens only.
- `ReservasPanel` and the `reservas/` folder. They belong to frame `kPW3x` (`gestion-reservas`), which is a separate story.
- Drag-and-drop rescheduling, creating a session by clicking an empty slot, and filters by discipline / coach / scenario.
- Moving the `reservas_activas` count into the instances query: per-instance `getCapacidad` stays, with fewer calls thanks to the week range.
- The athlete route `entrenamientos-disponibles`, the shell and the sidebar.
- Migrations, RPCs, RLS or schema changes.

## Capabilities

### New Capabilities
- None. `training-management` already owns the trainings management page.

### Modified Capabilities
- `training-management`:
  - **Modified**: "Capacity indicator on training cards and calendar events" (v3 tones, "Lleno" tag), "External form link display in training list view" (Lista table row), "Direct 'Reservar' action on training cards" (agenda cards and Lista rows; session click replaces "Ver").
  - **Added**: page header and views, period navigation, KPI row, discipline tones and legend, week view, day agenda panel, month view, list view, action modal, loading / error states, and catalog loading separated from period loading.

## Impact

- **UI**:
  - `src/components/portal/entrenamientos/*.tsx` (top level; `reservas/` untouched);
  - `src/components/ui/grit/icon-map.ts` (`gauge → speed`) and `GritProgress` (additive `trackClassName`, so the agenda card's track can fill its row).
- **Hooks**:
  - `useEntrenamientosCalendar` is rewritten around view + anchor date + selected day;
  - `useEntrenamientos` splits catalog vs. instance loading.
- **Lib**: new `src/lib/portal/entrenamientos-calendario.ts` (pure helpers). It reuses `buildCalendarCells` from `gestion-eventos-calendario.ts`.
- **Types**: `EntrenamientosVista`, `EntrenamientosKpis`, `EntrenamientoAgendaEstado`, `DisciplinaTono`.
- **Services**: none changed.
- **Dependencies**: none new.
- **Docs**: `DESIGN.md` §1 (mark `p5Ms22` migrated + deviations) and `projectspec/03-project-structure.md`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` | Unchanged |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | v3 header + tools, alerts, KPI row, view routing (`?vista=`), workspace, states |
| Component | `src/components/portal/entrenamientos/EntrenamientosHeaderTools.tsx` | New: view `GritSegmented` + CTA |
| Component | `src/components/portal/entrenamientos/EntrenamientosKpis.tsx` | New: 4 × `GritKpiCard` |
| Component | `src/components/portal/entrenamientos/EntrenamientosPeriodoHeader.tsx` | New: chevrons, label, "Hoy", legend |
| Component | `src/components/portal/entrenamientos/EntrenamientosSemana.tsx` | New: week time grid |
| Component | `src/components/portal/entrenamientos/EntrenamientoBloque.tsx` | New: session block |
| Component | `src/components/portal/entrenamientos/EntrenamientosAgendaDia.tsx` | New: day agenda panel |
| Component | `src/components/portal/entrenamientos/EntrenamientoAgendaItem.tsx` | New: agenda card |
| Component | `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` | Rewrite: v3 month view |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Rewrite: v3 table list view |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | v3 modal pattern, same props |
| Component | `src/components/portal/entrenamientos/index.ts` | Exports |
| Component (kit) | `src/components/ui/grit/icon-map.ts` | `gauge → speed` |
| Component (kit) | `src/components/ui/grit/GritProgress.tsx` | Additive `trackClassName` (default `w-[100px] shrink-0`) |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts` | View, anchor, ranges, labels, navigation, selected day |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | `loadCatalogos` once + `loadInstancias(range)`; `instancesLoading` |
| Lib | `src/lib/portal/entrenamientos-calendario.ts` | New |
| Types | `src/types/portal/entrenamientos.types.ts` | New view types |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch `feat/grit-arena-v3-entrenamientos-calendario` from `develop`. Take "before" screenshots at 375 / 768 / 1440.
2. Types + the `entrenamientos-calendario.ts` lib: weeks and labels, hour rows + bands, lanes, tones, KPIs, agenda status.
3. Hooks: rewrite `useEntrenamientosCalendar`, and split loading in `useEntrenamientos`.
4. Shared pieces: `EntrenamientosPeriodoHeader`, `EntrenamientosKpis`, `EntrenamientosHeaderTools`, and the icon map.
5. Week view: `EntrenamientoBloque` + `EntrenamientosSemana`. Check them against `A5VHvt`.
6. Agenda: `EntrenamientoAgendaItem` + `EntrenamientosAgendaDia`. Check them against `FWuM3`.
7. Mes and Lista: rewrite `EntrenamientosCalendar` and `EntrenamientosList`.
8. Restyle `EntrenamientoActionModal`, then rewire `EntrenamientosPage`.
9. Verify:
   - `p5Ms22` at 1440, and stacking at 768 / 375;
   - a keyboard pass;
   - role checks (administrador, entrenador, usuario);
   - the §11 greps.
   Then run `npx tsc --noEmit` and `npm run lint`.
10. Update `DESIGN.md` and `03-project-structure.md`, then write the commit message and PR description.
