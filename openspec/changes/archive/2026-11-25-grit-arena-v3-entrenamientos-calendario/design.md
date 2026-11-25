# Design

## Context

- See `proposal.md` (Why) and US-0142 for motivation, and `specs/training-management/spec.md` for the behaviour contract.
- The route `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx` renders `EntrenamientosPage`. That 513-line client component wires the `useEntrenamientos` façade hook (≈1170 lines: data, form, scope, categories, restrictions, templates, detail) into the calendar, the list and seven modals.
- `useEntrenamientosCalendar` holds a UTC month and exposes `range {from, to, label}`. `useEntrenamientos.loadAll` depends on `range`, so every month change refetches all catalogs plus the instances, then calls `reservasService.getCapacidad` once per instance.
- The v3 kit already provides everything the frame needs:
  - `GritPageHeader`, `GritSegmented`, `GritButton` (`lg`, `danger`), `GritIconButton`, `GritKpiCard`;
  - `GritCard` (`card` / `glass` / `inset`), `GritTag` (`dot`, tones incl. `violet` / `warning` / `danger`), `GritAvatar`, `GritProgress`, `GritChip`;
  - `GritPagination`, `gritTable*` classes, `GritEmptyState`, `GritAlert`, `useGritDialogFocus`.
  No kit component is added. `icon-map.ts` lacks only `gauge`.
- Reusable from earlier stories:
  - `buildCalendarCells` (`src/lib/portal/gestion-eventos-calendario.ts`): a 42-cell Monday-first grid;
  - the `EventosCalendar` / `EventosCalendarDayCell` markup (`ZYxt2`), as the reference for the month cells;
  - `InicioAgendaItem`, already "derived from `dBJ8K` in `p5Ms22`", as the visual reference for the agenda card;
  - `bogotaDayKey` and `formatRangoLabel` (`inicio-agenda.ts`), and `bogotaDayStartIso` / `bogotaDayEndIso`.
- No test runner exists in `package.json`. Verification is `tsc`, `eslint` and manual checks against the frame.

## Goals / Non-Goals

**Goals:**
- Pure, memoizable layout logic (week, hour rows, bands, lanes, tones, KPIs, agenda status) in one lib file, kept apart from React.
- Keep the `useEntrenamientos` public API backward compatible for the modals. Only the calendar-related fields change.
- Load catalogs once and fetch only instances on period change.
- Small, focused view components that receive plain props (items, tones, handlers), with no hook calls inside them.

**Non-Goals:**
- Breaking up `useEntrenamientos` beyond the loading split.
- Server-side KPI aggregation or batching the capacity lookup into one query.
- Virtualizing the week grid (a week rarely has more than ~60 sessions).

## Decisions

### D1. Component tree

```
EntrenamientosPage                       (state wiring, ?vista sync, modals)
├─ GritPageHeader  actions=<EntrenamientosHeaderTools/>
├─ GritAlert (success / submitError)
├─ EntrenamientosKpis                    (kpis, periodo)
└─ workspace  grid lg:[minmax(0,1fr)_340px]   (Lista = full width)
   ├─ GritCard
   │  ├─ EntrenamientosPeriodoHeader     (label, prev/next/today, legend)
   │  └─ one of:
   │     ├─ EntrenamientosSemana         (days, hourRows, positioned blocks)
   │     │   └─ EntrenamientoBloque ×n
   │     ├─ EntrenamientosCalendar (Mes) (42 cells, pills, +N)
   │     └─ EntrenamientosList (Lista)   (gritTable / stacked cards, pagination, day chip)
   └─ EntrenamientosAgendaDia            (Semana + Mes only)
       └─ EntrenamientoAgendaItem ×n
```

All view components receive `items: TrainingCalendarItem[]` already filtered to their period, plus lookup maps (`disciplineNameById`, `scenarioNameById`, `entrenadorNameById`, `tonoByDisciplinaId`), `canManage`, `now`, and handlers: `onOpenTraining(id)`, `onReservar(id)`, `onSelectDate(key)`.

*Alternative*: one big `EntrenamientosCalendar` with a `vista` prop. Rejected: the three layouts share almost no markup, and the file would grow past 600 lines.

### D2. Period state in `useEntrenamientosCalendar`

```ts
type EntrenamientosVista = 'semana' | 'mes' | 'lista';
useEntrenamientosCalendar({ initialVista }) → {
  vista, setVista,
  anchorKey,            // 'YYYY-MM-DD' Bogotá day the period is built around
  selectedDateKey, selectDate, clearSelectedDate,
  periodo: { from, to, label, dias: DiaSemana[] | null, monthStartDate | null },
  goPrevious, goNext, goToday,
}
```
- `semana` / `lista`: `from` = Monday of `anchorKey`, `to` = from + 6, `label` = `formatSemanaLabel(from, to)`.
- `mes`: `monthStartDate` = 1st of the anchor month, and `from` / `to` = first / last cell of `buildCalendarCells(monthStartDate)`. The 42-cell range lets adjacent days be counted without a refetch on selection. `label` = "Noviembre 2026".
- `goPrevious` / `goNext` move the anchor ±7 days or ±1 month. `goToday` sets the anchor to `bogotaDayKey(new Date())`.
- `setVista` keeps `anchorKey`. When going to `semana` / `lista` from `mes`, the anchor becomes `selectedDateKey ?? monthStartDate`, so the week shown is the week of the day the user was looking at.
- `selectedDateKey` is recomputed when the period changes (effect keyed on `from`):
  - today if it is inside the period;
  - else the first day with sessions — the page passes `firstDayWithSessions` once instances load;
  - else `from` (`mes`: the 1st of the month).
  The page owns that last step, because the hook does not see the instances.
- All date maths use `YYYY-MM-DD` keys with UTC arithmetic, as in `inicio-agenda.ts`. That way the browser's time zone never leaks in.

The view is mirrored to the URL by the page: `useSearchParams` sets the initial value, and `router.replace(?vista=…, { scroll: false })` runs on change. The page is already rendered inside the portal's client tree; if `useSearchParams` requires it, wrap `EntrenamientosPage` in `Suspense` in `page.tsx`, as `gestion-eventos` does. *Alternative*: keep the view in `localStorage`. Rejected: the spec requires shareable URLs, which is consistent with `gestion-eventos`.

### D3. Split loading in `useEntrenamientos`

- `loadCatalogos()` covers groups, disciplinas, escenarios, entrenadores, servicios and plantillas de formulario. It runs in an effect keyed on `tenantId` and sets `loading` (first paint) and `error`.
- `loadInstancias(from, to)` covers instances + `getCapacidad` per instance. It runs in an effect keyed on `[tenantId, periodo.from, periodo.to]`, sets `instancesLoading` and `instancesError`, and uses a request counter (`useRef`) to drop stale responses when the user clicks chevrons quickly.
- `refresh()` (used after mutations and by "Reintentar") reloads the instances, plus the catalogs when they failed. Mutations that change series reload groups too (`listTrainingGroupsByTenant`), because `groupName` depends on them. In practice, `refresh` = `Promise.all([loadGroups(), loadInstancias()])`.
- The hook returns `calendar` (D2) instead of `monthLabel`, `monthStartDate`, `goToNextMonth` and `goToPreviousMonth`. Those fields are only used by `EntrenamientosPage`, so the rename is local.

*Alternative*: keep `loadAll` and memoize the catalogs. Rejected: the effect dependency on `range` is the root cause, and splitting is simpler.

### D4. Lib `src/lib/portal/entrenamientos-calendario.ts`

Pure functions, no React:

| Function | Purpose |
|---|---|
| `startOfWeekKey(key)`, `addDaysKey(key, n)`, `addMonthsKey(key, n)` | UTC key arithmetic |
| `buildSemana(fromKey, hoyKey)` → `DiaSemana[]` | `{ key, dow: 'LUN', dia: 16, nombreLargo: 'Lunes 16 de noviembre', esHoy }` |
| `formatSemanaLabel(from, to)` | "16 – 22 nov 2026", "28 nov – 4 dic 2026", "29 dic 2026 – 4 ene 2027" |
| `formatMesLabel(monthStart)` | "Noviembre 2026" |
| `bogotaMinutosDelDia(iso)` | Minutes since midnight in Bogotá (via `Intl.DateTimeFormat` hour / minute parts) |
| `buildFilasHorarias(items, expandidas)` → `FilaHoraria[]` | Rows `{ tipo: 'hora', hora }` or `{ tipo: 'banda', desde, hasta, id }`, plus `offsetPx(minutos)` |
| `asignarCarriles(items)` → `Map<id, { carril, totalCarriles }>` | Greedy lane assignment per overlap cluster |
| `getDisciplinaTono(disciplinaId, disciplinasOrdenadas)` → `DisciplinaTono` | Palette by index |
| `calcularKpis(items)` → `EntrenamientosKpis` | Spec formulas |
| `getEstadoAgenda(instance, now, proximaId)` → `'proxima' \| 'lleno' \| 'cancelado' \| 'finalizado' \| null` | Precedence: cancelado > finalizado > lleno > proxima |
| `findProximaId(itemsDelDia, now)` | First non-cancelled item with start > now, when the day is today |
| `nombreCorto(nombre)` | "Camilo Hernández" → "Camilo H." |
| `formatHoraCorta(iso)` | 24-hour "6:30" / "18:00" (Bogotá) |

**Hour rows and bands.**
- Constants: `HORA_PX = 64` (the frame's line pitch in `CBZLO`), `BANDA_PX = 30`, `BLOQUE_GAP_PX = 4`, `HORA_MIN_DEFAULT = 5`, `HORA_MAX_DEFAULT = 21`, `MIN_HORAS_BANDA = 3`.
- Range: `[min(5, floor(minStart/60)), max(21, ceil(maxEnd/60))]`.
- An hour `h` is *occupied* if any session overlaps `[h*60, (h+1)*60)`.
- Maximal runs of ≥3 unoccupied hours that are not expanded become one band. Each band id is `${desde}-${hasta}`, and the expanded set is kept in component state and reset on `from` change.
- `offsetPx(min)` walks the rows: full hours add 64, bands add 30. Sessions never start inside a band, by construction. A week without sessions gets no bands, so the empty state sits on the full 5 am – 9 pm grid.
- Block height = `offsetPx(end) − offsetPx(start) − 4` with a 30-minute minimum (a 60-minute session is 60px, as in `np1YZ`).

**Lanes.**
- Sort the day's items by start.
- Build clusters of transitively overlapping items. Within a cluster, place each item in the first lane whose last end ≤ its start.
- `totalCarriles` = the lane count of the cluster. Width = `calc((100% - 4px) / total)`, left = `carril * width`.

**Tones.**
```ts
type DisciplinaTono = 'accent' | 'violet' | 'warning' | 'danger' | 'success' | 'teal';
const TONO_CLASES: Record<DisciplinaTono, { bloque, borde, barra, texto, punto, pill }> = {
  accent: { bloque: 'bg-gradient-to-b from-grit-cyan/[0.22] to-grit-cyan/[0.08]', borde: 'border-grit-cyan/35', barra: 'bg-grit-cyan', texto: 'text-grit-cyan', punto: 'bg-grit-cyan', pill: 'bg-grit-cyan/[0.14]' },
  violet: { …grit-violet }, warning: { …grit-warning }, danger: { …grit-danger },
  success: { …grit-success }, teal: { …grit-teal },
};
```
Full class strings must be written literally, so that Tailwind's scanner sees them. Interpolated colour names are not allowed. `disciplinasOrdenadas` comes from the `disciplinas` options (already labels), sorted with `localeCompare('es')`. A discipline that is missing from the options (it was deleted) falls back to `accent`.

*Alternative*: reuse `getDisciplinaVisual` (name regex → `grit-discipline-*`). Rejected: unknown names all collapse to cyan, and two "running" disciplines would share a tone. Index-based tones guarantee distinct colours for up to six disciplines, which matches the frame's legend. The calendar is a planning tool where telling disciplines apart matters more than semantic colour.

### D5. Week grid markup

- The outer `div` has `overflow-x-auto` below `md`, and the inner grid has `min-w-[680px]`.
- Grid template: `grid-cols-[44px_repeat(7,minmax(0,1fr))]`.
- The header row holds the 7 day tiles (buttons).
- The body is one row: a gutter column with the hour labels / band toggles (each row positioned with the same `offsetPx`), then 7 `relative` columns. In each column:
  - hour lines are drawn with a repeating background (or absolutely positioned 1px rules at each row's offset);
  - bands get the subtle diagonal fill (`bg-[linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]`);
  - blocks are `absolute` buttons.
- The gutter is `sticky left-0` with a canvas background, so the hours stay visible while scrolling on mobile.
- The column body height is the sum of the row heights, with no internal vertical scroll: the page scrolls. The design's 704px card is the result for a typical week with one band.

### D6. Agenda card vs. `InicioAgendaItem`

`EntrenamientoAgendaItem` is a new component that copies the visual structure of `InicioAgendaItem`: 42px time column + line, `GritCard variant="inset"`, 3px bar, `GritTag dot`. The two differ in data (instance vs. athlete booking), status rules, click target (modal vs. link) and extra rows (coach + capacity). Sharing one component would need a prop explosion. The card is a `<button>` wrapping the content. The "Reservar" `GritButton` sits **outside** that button (a sibling in a flex row) to avoid nested interactive elements.

### D7. Lista

- Rows are sorted by `fecha_hora`, filtered by `selectedDateKey` when the "day detail" filter is active. The page keeps a separate `listaDiaFiltro` state, so that selecting a day in Semana doesn't silently filter Lista.
- Pagination is client-side (20 per page) over the already-loaded week. The current page resets on `from` / filter change.
- Desktop (`md+`): a `<table>` with the `gritTable*` classes. Mobile: a `<ul>` of `GritCard variant="inset"` cards. Both render from the same row model, and `hidden md:table` / `md:hidden` switches between them.

### D8. Action modal

`EntrenamientoActionModal` keeps its props. The markup changes:
- an overlay `fixed inset-0 bg-black/60 backdrop-blur-sm`;
- a panel `GritCard variant="glass"` with max width 420;
- the title in Exo 2 500;
- the actions as a vertical stack of `GritButton variant="secondary"` (full width, left-aligned icon), with "Eliminar" as `variant="danger"`;
- disabled reasons as `text-xs text-grit-muted` under their button;
- `useGritDialogFocus` for the trap and focus return.

Focus return works because each opener is a real `button`.

### D9. KPIs and the "now" clock

`now` is computed once per render of the page (`Date.now()`, as today), and passed down so that status and KPI helpers are deterministic within a render. No interval refresh: statuses update on the next render or refresh, which is acceptable for a planning screen.

## Risks / Trade-offs

- [Per-instance `getCapacidad` calls (N requests)] → The week range cuts N by ~4× compared with the month. The Mes view's 42-cell range costs a little more than today's month. Batching stays a follow-up, noted in Non-goals.
- [Rapid period navigation races] → A request counter ignores stale responses, and `instancesLoading` drives a localized loading state, so the KPIs and header never flash.
- [Bands hide hours where the user may want to create a session] → Clicking a slot to create isn't supported anyway, and bands are one click to expand.
- [Index-based tones change when a discipline is added or renamed (the sort order shifts)] → Accepted: the tones are stable within a session and across views, which is what the spec requires. A persisted colour column would need a migration (out of scope).
- [Horizontal scroll inside the card on phones] → Allowed by `DESIGN.md` for segmented / track-like content. The gutter is sticky. The agenda below gives a phone-friendly reading of the selected day.
- [Removing the sticky side list changes muscle memory for "Opciones"] → The session click opens the same modal. The BREAKING (UX) items are listed in the PR description.
- [`useSearchParams` without Suspense can force client rendering errors in Next] → Wrap the client page in `Suspense` in `page.tsx`, as already done for `gestion-eventos`.

## Migration Plan

- Front-end only. Ship behind no flag: the route keeps its URL. Old links without `?vista` land on Semana.
- Rollback: revert the merge commit. No data or schema to roll back.

## Open Questions

- None that block implementation. The KPI comparison against the previous period and an occupancy goal can be added later without changing the layout, by filling `detail` on the existing cards.
