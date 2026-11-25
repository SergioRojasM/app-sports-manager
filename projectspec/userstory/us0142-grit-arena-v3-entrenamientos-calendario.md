# US-0142 — Migrate the Trainings Calendar Page to the GRIT Arena v3 Design

## ID
US-0142

## Name
Rebuild `orgs/[tenant_id]/gestion-entrenamientos` on the v3 frame `p5Ms22` ("Admin · Entrenamientos (calendario)"): v3 header with a view switch, a KPI row, a weekly time-grid calendar, a "day agenda" panel, and v3 month and list views composed from the kit

## As a
Administrador or entrenador who plans the organization's training sessions (and, read-only, a `usuario`/atleta who opens the same shared route to browse and book sessions)

## I Want
To see the week's sessions laid out by day and hour, the selected day's agenda with occupancy and coach at a glance, and the key numbers of the period, with the same v3 look as the rest of the migrated Portal

## So That
Planning the schedule (spotting gaps, overlaps and full sessions) takes one glance instead of opening each dot of a month grid, and the trainings module stops being the last admin screen with v2 markup in the "Entrenamientos" menu group

---

## Description

### Current State
- Route: `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` → `EntrenamientosPage` (`src/components/portal/entrenamientos/`). The route is shared: `administrador` and `entrenador` manage (`canManage`), `usuario` only views and books.
- v2 markup: an English-style bold title "Gestión de Entrenamientos" (`font-grit-title font-bold`), a `rounded-grit-md` "Crear entrenamiento" button with `text-grit-bg`, emerald success banners and a hand-rolled error box.
- `EntrenamientosCalendar` is a month grid where each session is a 10px coloured dot (Tailwind `bg-cyan-400`, `bg-emerald-400`, … palette), with "Mes anterior / Mes siguiente" buttons at the bottom and an uppercase legend.
- `EntrenamientosList` is a sticky side column of `rounded-grit-lg` cards with a capacity pill in emerald / amber / rose, "Opciones" (managers) or "Ver" + "Reservar" (usuario) buttons.
- `useEntrenamientosCalendar` only knows months; `useEntrenamientos.loadAll` reloads **everything** (groups, disciplines, scenarios, trainers, services, form templates and instances) whenever the month changes.
- There are no KPIs, no week view and no per-day agenda.

### Design Reference
Source of truth: `projectspec/designs/pencil/grit-arena-v3.pen`, frame **`p5Ms22`** "Admin · Entrenamientos (calendario)" (open with the pencil MCP tools). `DESIGN.md` §1 maps it to `orgs/[tenant_id]/gestion-entrenamientos`. Migration contract: `DESIGN.md` §10 and §12.

| Frame node | Element | Build with |
|---|---|---|
| `VE2IC` Header | "Gestiona tus *entrenamientos.*" + tools | `GritPageHeader` (`titleAccent`) |
| `n9y71k` Segmented | Mes / Semana / Lista (Semana active) | `GritSegmented variant="soft"` |
| `q1EISF` Btn Crear entrenamiento | Primary CTA with `plus` | `GritButton size="lg"` icon `add` |
| `oYM0c` KPIs | 4 cards: `calendar-days`, `calendar-check`, `gauge`, `dumbbell` | `GritKpiCard` ×4 |
| `A5VHvt` Calendario semanal (760) | Card: period header, day headers, hour grid, session blocks | `GritCard variant="card"` + new components |
| `gRDaD` Cal Header | chevrons, "16 – 22 nov 2026" (Exo 2 20/500), "Hoy" pill, discipline legend dots | `GritIconButton` ×2, `GritChip`/pill, legend |
| `S6daU` Day Headers | 7 tiles "LUN 16"; today = solid cyan tile with glow (`I53G9`) | new day header tile |
| `CBZLO` Week Body | 44px hour gutter ("5 am"…"8 pm"), hour lines, collapsed band `e6mfu` (`chevrons-up-down`) for 10 am – 3 pm | new week grid |
| `np1YZ` Session block | Discipline-tone gradient, 3px accent bar, name Montserrat 10/600, meta "6:30" + "26/30" JetBrains Mono 8 | new session block |
| `FWuM3` Agenda del día (340) | Big date tile, "Viernes 20 de noviembre", "3 sesiones · 64 reservas", timeline cards, "Ver detalle del día" | `GritCard` + new agenda item |
| `dBJ8K` / `Dx343` / `u7ddwV` | Agenda card: time column, discipline bar, name, status pill (Próxima / Lleno), venue (`map-pin`), coach avatar + name, capacity track + "18/24" | `GritCard variant="inset"`, `GritTag dot`, `GritAvatar`, `GritProgress` |

Discipline tones seen in the frame: cyan (`$brand`), violet (`#B9A3FF`), warning (`#FFC46B`), danger (`#FF8A80`). Block fill: linear gradient tone/22% → tone/8%, stroke tone/35%, radius 8. Today's day tile: `bg-grit-cyan text-grit-on-brand` + `shadow-[0_8px_20px_rgba(20,219,196,0.25)]`, radius 12; other tiles `bg-white/[0.02] border-white/[0.05]`.

### Scope decisions
- **Front-end + derived data only.** No migrations, RPCs, columns or RLS changes. Every number on the page is derived from the instances already loaded for the visible period.
- **KPI sub-lines without data are replaced**, not invented: "+9 % vs. semana pasada" (needs the previous period) and "meta 75 %" (no occupancy goal is stored) are not built. See the KPI table.
- **Week view is the frame; Month and List have no frame** and are composed from the kit and the `ZYxt2` calendar pattern (`DESIGN.md` §9).
- **Modals keep their v2 layout** (they already inherit the v3 tokens): `EntrenamientoFormModal`, `EntrenamientoWizard`, `EntrenamientoDetalleModal`, `EntrenamientoScopeModal`, `PlantillasListModal`, `GuardarPlantillaModal` and `ReservasPanel` (that one belongs to frame `kPW3x`). Only `EntrenamientoActionModal`, which every session click opens, moves to the v3 modal pattern, with the same props.

### Proposed Changes

#### 1. Header (`VE2IC`)
- `GritPageHeader` with `title="Gestiona tus"` and `titleAccent="entrenamientos."` for managers; `title="Calendario de"` and `titleAccent="entrenamientos."` for `usuario`. Exactly one `h1`.
- Tools (`actions`):
  - `GritSegmented` with `Mes` / `Semana` / `Lista`, `ariaLabel="Vista del calendario"`. Default **Semana**. The chosen view is kept in the URL query (`?vista=semana|mes|lista`) via `router.replace` so refresh and back keep it; an unknown value falls back to `semana`.
  - `GritButton size="lg" icon="add"` "Crear entrenamiento" (managers only) → `openCreateModal`.
- `successMessage` → `GritAlert tone="success"` dismissible; `submitError` (when the form is closed) → `GritAlert tone="danger"`.

#### 2. Period model
- **Semana** and **Lista** show a Monday–Sunday week; **Mes** shows the 6-week (42-cell) grid of a month.
- Period header (shared by the three views, `gRDaD`): previous / next `GritIconButton` (`chevron_left` / `chevron_right`, labels "Semana anterior" / "Semana siguiente" or "Mes anterior" / "Mes siguiente"), the period label in Exo 2 20/500 (week: "16 – 22 nov 2026", "28 nov – 4 dic 2026", "29 dic 2026 – 4 ene 2027"; month: "Noviembre 2026"), a "Hoy" pill (accent, `aria-label="Ir a hoy"`) that jumps to the period containing today (Bogotá), and the discipline legend.
- Switching view keeps the anchor date: going from Semana (week of 16 nov) to Mes shows November; from Mes to Semana shows the week that contains the selected day (or the 1st of the month).
- Data range: Semana/Lista load `[monday, sunday]`; Mes loads the 42-cell grid range (so adjacent-month days are known but rendered muted and inert, as in `ZYxt2`). Dates are Bogotá calendar days (`bogotaDayStartIso` / `bogotaDayEndIso` in the service, unchanged).

#### 3. KPI row (`oYM0c`)
Four `GritKpiCard` (`layout="inline"`), computed over the non-cancelled instances of the visible period. Label suffix: "de la semana" (Semana/Lista) or "del mes" (Mes).

| Card | Icon | Value | Label | Detail |
|---|---|---|---|---|
| Sesiones | `calendar_month` | count of sessions | "Sesiones de la semana" | "N disciplinas" (distinct `disciplina_id`) |
| Reservas | `event_available` | Σ `reservas_activas` | "Reservas de la semana" | "N sesiones llenas" (or "Ninguna sesión llena") |
| Ocupación | `speed` | Σ reservas / Σ `cupo_maximo` of sessions with `cupo_maximo`, rounded % | "Ocupación de la semana" | "sobre N cupos"; "—" + "Sin cupos definidos" when no session has a cupo |
| Entrenadores | `fitness_center` | distinct non-null `entrenador_id` | "Entrenadores" | "activos esta semana" / "activos este mes" |

Instances whose `reservas_activas` failed to load (undefined) count as 0. The KPIs render for every role.

#### 4. Discipline tones and legend
- New lib `getDisciplinaTono(disciplinaId, disciplinas)`: tone by the discipline's index in the tenant's sorted `disciplinas` options, cycling through `cyan → violet → warning → danger → success → teal`. Stable across periods and views; replaces the Tailwind `bg-cyan-400…` palette.
- Each tone exposes the classes for the block gradient, stroke, accent bar, the capacity text, and the legend dot (only `grit-*` tokens).
- Legend: one dot + name (Montserrat 11, `text-grit-subtext`) per discipline that has sessions in the period, wrapping under the period controls below `lg`.

#### 5. Week view — Semana (`A5VHvt`, `S6daU`, `CBZLO`)
- **Day headers**: 44px gutter + 7 tiles "LUN" (9/700 muted) / "16" (Exo 2 20/600). Today → solid cyan tile with glow; selected day (≠ today) → `bg-grit-cyan/[0.12] border-grit-cyan/35`. Each tile is a `button` (`aria-pressed` = selected, `aria-label="Viernes 20 de noviembre, 3 sesiones"`) that selects the day for the agenda panel.
- **Hour range**: from `min(5, earliest start hour)` to `max(21, latest end hour rounded up)`; one row per hour, **64px** per hour (the frame's line pitch), hour labels "5 am" … "8 pm" (`font-grit-mono text-[10px] text-grit-muted`), hour lines `border-white/[0.05]`.
- **Collapsed bands**: every run of **≥ 3 consecutive empty hours** across the whole week (no session overlaps them) collapses into a 30px band row with a diagonal subtle fill and, in the gutter, a `GritIconButton size="sm" variant="ghost" icon="unfold_more"` labelled "Mostrar 10 am – 3 pm" (`aria-expanded`). Expanding restores the hourly rows; the state resets when the week changes.
- **Session blocks** (`np1YZ`), positioned absolutely in their day column:
  - `top` = minutes since range start × 64/60 (bands shift it), `height` = `max(duracion_minutos ?? 60, 30)` × 64/60 − 4px gap (a 60-minute session is 60px, as in `np1YZ`).
  - Overlapping sessions in the same day are split into side-by-side lanes (greedy lane assignment; each block width = column / lanes in its overlap cluster).
  - Content: 3px accent bar, name (Montserrat 10/600, `line-clamp-2`), meta row: start time "6:30" (`font-grit-mono text-[8px]` subtext) and "26/30" (mono 8/700 in tone colour; just "26" when `cupo_maximo` is null). When the block is shorter than 45px only the name + time render.
  - Cancelled instance (`estado = 'cancelado'`): neutral tone, `line-through` name, `opacity-60`.
  - Past instance: `opacity-70`.
  - Full instance: capacity text in `text-grit-warning`.
  - Each block is a `button` with `aria-label="Running Pista, viernes 20 de noviembre 6:30 a. m., 26 de 30 reservas"`; activating it opens `EntrenamientoActionModal` (same flow as today's "Opciones" / "Ver") and also selects that day.
- **Responsive**: from `lg` the workspace is `grid-cols-[minmax(0,1fr)_340px]`; below `lg` the agenda stacks under the calendar. Below `md`, the week grid scrolls horizontally **inside the card** (`overflow-x-auto`, inner `min-w-[680px]`) with the hour gutter sticky-left; the page itself never scrolls horizontally.
- Empty week: the grid still renders the full default 5–21 range (no bands) plus a centered `GritEmptyState` overlay text "Sin entrenamientos esta semana" and, for managers, "Crear entrenamiento".

#### 6. Day agenda panel — Agenda del día (`FWuM3`)
- `GritCard variant="card"`, 340px from `lg`, shown next to Semana **and** Mes.
- Selected day default: today if it is inside the period, otherwise the first day of the period that has sessions, otherwise the first day of the period. It resets when the period changes.
- Header (`M0FCD0`): date tile 58×62 (today → solid cyan; else `GritDateTile`-like neutral), title "Viernes 20 de noviembre" (Exo 2 17/500) and subtitle "3 sesiones · 64 reservas" (12, muted).
- Timeline: one `EntrenamientoAgendaItem` per instance of the day in start order (`dBJ8K`):
  - time column 42px "5:30" (`font-grit-mono text-[11px] font-semibold`, 24-hour H:mm Bogotá) + 1px line;
  - `GritCard variant="inset"` card with: discipline bar (tone), name (13/600), status `GritTag dot`: **Próxima** (accent; the first not-yet-started, non-cancelled session when the day is today; the card also gets `bg-grit-cyan/[0.05] border-grit-cyan/30`), **Lleno** (warning; `reservas_activas ≥ cupo_maximo`), **Cancelado** (danger), **Finalizado** (neutral; start + duration < now);
  - venue row: `location_on` + scenario name (muted 11), plus `pin_drop` + `punto_encuentro` when present;
  - capacity row: `GritAvatar size={22}` with the coach initials + abbreviated coach name ("Camilo H."; "Sin entrenador" when null), a capacity track (`GritProgress`, `tone="warning"` when full, else `accent`, `showValue={false}`) and "18/24" (mono 10/600). `cupo_maximo` null → no track, "18 reservas".
  - The card is a `button` that opens `EntrenamientoActionModal`. For `usuario` on a non-historical, non-cancelled session, a `GritButton size="sm"` "Reservar" ("Cupo lleno" disabled when full) is rendered next to it (keeps US-0127 behaviour; accessible name includes the training name).
  - The panel body scrolls inside the card from `lg` (`grit-scrollbar`).
- Empty day: `GritEmptyState icon="event_busy"` "Sin sesiones este día" (+ "Crear entrenamiento" for managers).
- Footer: `GritButton variant="secondary" icon="list"` "Ver detalle del día" → switches to **Lista** filtered to that day.

#### 7. Month view — Mes (no frame; `ZYxt2` pattern)
- Same `GritCard`, same period header. 7-column day headers ("LUN"…"DOM", 11/600 muted, no uppercase tracking leftovers), 42 cells (reuse `buildCalendarCells` from `src/lib/portal/gestion-eventos-calendario.ts`).
- Cell: radius 14, `min-h-[95px]`, day number top-left; weekend cells `bg-black/[0.12]`; adjacent-month cells muted and inert; today ringed in cyan; selected day `bg-grit-cyan/[0.08] border-grit-cyan/35`.
- Up to **2** session pills per cell (tone background 14%, accent bar, "6:30 Running Pista" truncated), then "+N" (11, subtext). Cancelled pills struck-through.
- Clicking a cell selects the day for the agenda panel (cell is a `button`, `aria-pressed`, label "20 de noviembre, 3 sesiones"); clicking a pill opens the action modal.

#### 8. List view — Lista (no frame; kit table)
- `GritCard` with the period header (week navigation) and, when a day filter is set, a removable `GritChip` "Viernes 20 nov ✕" ("Quitar filtro de día").
- Table on `gritTable*` classes, columns: **Fecha** (day + "6:30 a. m."), **Entrenamiento** (name, "Serie: …" muted, and the "Formulario externo" link when `formulario_externo` is set — `target="_blank" rel="noopener noreferrer"`), **Disciplina** (tone dot + name), **Escenario**, **Entrenador**, **Cupo** (`GritProgress` + "18/24"), **Estado** (`GritTag dot`, same rules as the agenda), and **Acciones**: `GritIconButton variant="ghost" icon="more_horiz"` "Opciones de {nombre}" → action modal; for `usuario` the "Reservar" `GritButton size="sm"` too.
- `GritPagination`, 20 rows per page, reset to page 1 when the period or the day filter changes.
- Below `md` rows render as stacked inset cards (same data), no horizontal scroll.
- Empty: `GritEmptyState` "No hay entrenamientos programados para esta semana" / "… para este día".

#### 9. Action modal (`EntrenamientoActionModal`)
- v3 modal pattern (as `EventoModalShell` / `GritConfirmDialog`): `GritCard variant="glass"`, Exo 2 500 title = training name, options as full-width `GritButton variant="secondary"` rows with icons (`visibility` Ver detalle, `group` Ver reservas, `edit` Editar, `delete` Eliminar as `variant="danger"`, `campaign` Publicar en eventos), disabled reasons as muted 12px lines, focus trap via `useGritDialogFocus`, Escape closes. **Props unchanged.**

#### 10. Loading and errors
- Loading → `GritEmptyState icon="progress_activity"` "Cargando entrenamientos…" inside the workspace (header + tools stay visible; KPIs show "—").
- Load error → `GritEmptyState icon="error" tone danger` with the message and a `GritButton variant="secondary"` "Reintentar" → `refresh()`.
- Period change shows the loading state only inside the calendar card and the agenda (catalog data stays).

---

## Database Changes
None. No migrations, RPCs, columns, indexes or RLS changes.

---

## API / Server Actions
No new service functions. Reused unchanged:
- `entrenamientosService.listTrainingInstancesByTenantAndRange(tenantId, from, to)` — called with the week or 42-cell range.
- `entrenamientosService.listTrainingGroupsByTenant / listDisciplineOptions / listScenarioOptions / listTrainerOptions / listServicioOptions`, `formulariosService.getPlantillasByTenant` — now loaded **once** per tenant instead of on every period change.
- `reservasService.getCapacidad(tenantId, instanceId)` — still used for `reservas_activas` (fewer calls per load with a week range).

Auth / RLS: unchanged (route guard `(shared)`; writes still limited to administrador / entrenador by existing RLS).

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` | Unchanged |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | v3 header + tools, alerts, KPI row, view routing, workspace (calendar + agenda), loading/error states |
| Component | `src/components/portal/entrenamientos/EntrenamientosHeaderTools.tsx` | New: view `GritSegmented` + "Crear entrenamiento" |
| Component | `src/components/portal/entrenamientos/EntrenamientosKpis.tsx` | New: 4 × `GritKpiCard` |
| Component | `src/components/portal/entrenamientos/EntrenamientosPeriodoHeader.tsx` | New: chevrons, label, "Hoy", legend |
| Component | `src/components/portal/entrenamientos/EntrenamientosSemana.tsx` | New: day headers, hour gutter, bands, columns |
| Component | `src/components/portal/entrenamientos/EntrenamientoBloque.tsx` | New: session block |
| Component | `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` | Rewrite as the v3 month view (Mes) |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Rewrite as the v3 table list view (Lista) |
| Component | `src/components/portal/entrenamientos/EntrenamientosAgendaDia.tsx` | New: day agenda panel |
| Component | `src/components/portal/entrenamientos/EntrenamientoAgendaItem.tsx` | New: agenda card |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | v3 modal pattern, same props |
| Component | `src/components/portal/entrenamientos/index.ts` | Export new components |
| Component (kit) | `src/components/ui/grit/icon-map.ts` | Add `gauge → speed` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts` | `vista`, anchor date, week/month range, `goPrevious` / `goNext` / `goToday`, `selectedDateKey`, labels |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Split `loadCatalogos` (once) from `loadInstancias` (per range); expose `instancesLoading`, calendar API |
| Lib | `src/lib/portal/entrenamientos-calendario.ts` | New: week days, labels, hour rows + bands, lane layout, discipline tones, KPI computation, agenda status, coach short name |
| Types | `src/types/portal/entrenamientos.types.ts` | `EntrenamientosVista`, `EntrenamientosKpis`, `EntrenamientoAgendaEstado`, `DisciplinaTono` |
| Docs | `DESIGN.md` | §1 mark `p5Ms22` migrated (with deviations) |
| Docs | `projectspec/03-project-structure.md` | New components, hook and lib |

---

## Acceptance Criteria

1. At 1440px the page matches frame `p5Ms22`: header "Gestiona tus *entrenamientos.*" with the Mes/Semana/Lista switch and "Crear entrenamiento", a row of 4 KPI cards, the week calendar card and the 340px "Agenda del día" panel.
2. The page loads in **Semana** for the current week (Bogotá); `?vista=mes` and `?vista=lista` open those views; an invalid value falls back to Semana.
3. The week label reads like "16 – 22 nov 2026", including cross-month ("28 nov – 4 dic 2026") and cross-year weeks; chevrons move one week; "Hoy" returns to the current week.
4. Each session appears as a block in its Bogotá day column at its start time, with a height proportional to its duration (min 30px); overlapping sessions show side by side without overlapping text.
5. Runs of 3 or more empty hours collapse into a band whose button ("Mostrar …") expands them and reports `aria-expanded`.
6. Session block colours come from the discipline tone and match the legend; the same discipline keeps the same tone in every view and period.
7. Cancelled sessions render struck-through and muted; full sessions show their capacity in warning colour; sessions with null `cupo_maximo` show only the booking count.
8. Clicking a day header (or month cell) updates the agenda panel to that day; the selected day shows `aria-pressed="true"`.
9. The agenda shows "N sesiones · M reservas", one card per session in start order with time, discipline bar, status tag (Próxima / Lleno / Cancelado / Finalizado per the rules), venue, coach avatar + short name and capacity track; an empty day shows "Sin sesiones este día".
10. Clicking a session block, agenda card, month pill or list row action opens `EntrenamientoActionModal` with the existing actions (detail, reservas, edit, delete, publicar en eventos) and their existing enable/disable rules.
11. "Ver detalle del día" switches to Lista filtered to that day; removing the chip shows the whole week.
12. Lista shows the week's sessions in a paginated table (20 per page) with the "Formulario externo" link when present (new tab, `rel="noopener noreferrer"`); below `md` rows are stacked cards.
13. KPI values equal: count of non-cancelled sessions; Σ active bookings; Σ bookings / Σ cupo (or "—"); distinct trainers — for the visible period; labels switch between "de la semana" and "del mes".
14. A `usuario` sees no "Crear entrenamiento", sees "Reservar" on upcoming, non-cancelled sessions in the agenda and list ("Cupo lleno" disabled when full), and booking opens `ReservasPanel` in auto-book mode as before.
15. Managers never see the "Reservar" card button; create / edit / delete / scope flows work as before and refresh the calendar after saving.
16. Changing the period only reloads instances (network shows no new disciplines / scenarios / trainers / services / templates requests).
17. Loading, empty and error states are distinct; the error state's "Reintentar" reloads.
18. No horizontal page scroll at 375 / 768 / 1440px; below `md` the week grid scrolls inside its card; exactly one `h1`.
19. Keyboard: view switch, chevrons, "Hoy", day tiles, band toggles, session blocks and agenda cards are reachable with Tab, show focus rings and activate with Enter/Space; the action modal traps focus and closes with Escape.
20. Both `DESIGN.md` §11 greps return nothing for `src/components/portal/entrenamientos/*.tsx` (top-level files; `reservas/` excluded) and no `bg-emerald-*`, `bg-amber-*`, `bg-rose-*`, `bg-cyan-400` etc. remain there.
21. `npx tsc --noEmit` and `npm run lint` pass.

---

## Implementation Steps

- [ ] Branch `feat/grit-arena-v3-entrenamientos-calendario` from `develop`; take "before" screenshots at 375 / 768 / 1440
- [ ] Types + lib `entrenamientos-calendario.ts` (week, labels, hours/bands, lanes, tones, KPIs, agenda status)
- [ ] Refactor `useEntrenamientosCalendar` (vista, anchor, ranges, selected day) and split loading in `useEntrenamientos`
- [ ] Build `EntrenamientosPeriodoHeader`, `EntrenamientosKpis`, `EntrenamientosHeaderTools`
- [ ] Build `EntrenamientoBloque` + `EntrenamientosSemana`
- [ ] Build `EntrenamientoAgendaItem` + `EntrenamientosAgendaDia`
- [ ] Rewrite `EntrenamientosCalendar` (Mes) and `EntrenamientosList` (Lista)
- [ ] Restyle `EntrenamientoActionModal`
- [ ] Rewire `EntrenamientosPage` (URL view state, alerts, states, workspace)
- [ ] Verify against `p5Ms22` at 1440 / 768 / 375, keyboard pass, §11 greps
- [ ] Update `DESIGN.md` and `projectspec/03-project-structure.md`
- [ ] `npx tsc --noEmit`, `npm run lint`; write commit message and PR description

---

## Non-Functional Requirements

- **Security**: no change to RLS or role checks; `canManage` still derives from `useTenantAccess`; the external form link keeps `rel="noopener noreferrer"`.
- **Performance**: catalogs load once per tenant; period changes only fetch instances (+ capacities). Week ranges cut the per-instance capacity calls vs. a month. Layout helpers are pure and memoized.
- **Accessibility**: one `h1`; `aria-pressed` on view switch, day tiles and month cells; `aria-expanded` on bands; descriptive `aria-label`s on session blocks; colour is never the only signal (status tags carry text, capacity carries numbers); scan/motion-free UI.
- **Error handling**: load errors → `GritEmptyState` with "Reintentar"; mutation feedback → `GritAlert` (success / danger); a failed capacity lookup shows the session with 0 bookings and doesn't block the page.
