# Proposal

> Source: user request (2026-11-24) — "migrar el home al de Node ID `lhbhK` del archivo `projectspec/designs/pencil/grit-arena-v3.pen`, respeta el nuevo diseño". Frame `lhbhK` is "App · Inicio v9 (bento con tarjetas v6)", which `DESIGN.md` §1 maps to `/portal/inicio` (confirmed with the user). Reference for the populated agenda row: node `dBJ8K` in `p5Ms22` (Admin · Entrenamientos). Migration contract: `DESIGN.md` §10 and §12.

## Why

US-0141 gave the Portal the v3 tokens, kit and shell, but `/portal/inicio` (the first screen every user sees after login) still uses v2 markup: hand-rolled stat tiles, `rounded-md` buttons, `border-grit-glass-border` boxes, emerald/amber badges and a "featured training" hero that the v3 design no longer has. The v3 frame `lhbhK` redesigns the page as a bento grid: a personal welcome, four tall KPI cards with a contextual hint and a shortcut, a 7-day training agenda, subscriptions with segmented tabs and an organizations list. Migrating it now makes the landing screen of the app match the shell around it and gives the first page story that follows `DESIGN.md` §10.

## What Changes

- **Welcome header**: "Bienvenido, **{nombre}**" (accent on the first name, Exo 2 300) plus the existing subtitle. The eyebrow "Inicio" and the title "Tu resumen" are dropped. The first name comes from the `portal_profile` cookie the layout already reads (no extra query).
- **KPI row**: four tall KPI cards (icon chip, round arrow shortcut, 56px value, label and a contextual hint). "Pagos pendientes" uses the highlight surface. Hints: "Sin planes activos" / soonest expiry; "Esta semana"; "Estás al día" (cyan) / "{n} por validar"; organization name / "{org} y {n} más" / "Sin organizaciones". Each shortcut links to the related page.
- **BREAKING (UX)**: the "Próximos entrenamientos" KPI and panel now cover the **7-day window** that starts today (Bogotá), instead of every upcoming booking and a top-5 list. The panel shows a range label ("15 – 21 nov"), a week strip of 7 day buttons (today selected) and the selected day's sessions as agenda rows (time, discipline bar, name, venue / meeting point, organization, status tag). When the selected day has no sessions it shows the hour grid with an empty-state overlay and a "Reservar sesión" action.
- **BREAKING (UX)**: the "featured next training" hero card (`InicioFeaturedTraining`) is removed. The v3 frame has no featured card; the agenda replaces it.
- **Mis suscripciones**: `GritSegmented` tabs (Todas / Activas / Pendientes), v3 list rows with `GritTag` status and payment pills and service units, and the v3 empty state "No tienes suscripciones activas · Únete a un plan de tu club para empezar."
- **Mis organizaciones**: "Ver todas" pill, rows with a 42px logo tile (initial fallback), name and a role `GritTag` with display labels ("Administrador", "Entrenador", "Atleta").
- **Kit**: `GritKpiCard` gains a `stacked` layout (tall card from `lhbhK`) with `hint`, `hintTone` and `href` props. The existing horizontal layout stays the default.
- **Loading**: `loading.tsx` skeleton redrawn with v3 surfaces that match the new layout.
- Unused v2 components removed: `InicioFeaturedTraining`, `InicioQuickActions`, `InicioPagosPendientesAlert` (the last two are already commented out of the page).

## Non-goals

- Navigating to other weeks (the range label is static; the agenda always starts today).
- An hour-positioned calendar with blocks sized by duration. Sessions are listed per day in time order; the hour lines are decorative and shown only in the empty state.
- The collapsed sidebar of frame `V2eGcp` (tracked in `DESIGN.md` §9).
- Organization type/city meta line ("Club deportivo · Medellín"): no such data exists in `tenants`; the row shows name and role only.
- Coach and capacity in agenda rows (shown in `dBJ8K`, not available to athletes in the current queries).
- Changes to any other Portal page, the shell, tokens, RLS or the database schema.
- Booking from the home (the "Reservar sesión" action navigates; it does not book).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `user-home-dashboard`: the dashboard layout and visual requirements change to the v3 frame. These requirements are replaced: stats row → KPI cards with hints and shortcuts, featured training card → removed, upcoming trainings list → 7-day agenda, subscriptions card → segmented tabs and v3 rows, organizations card → v3 rows with role labels. The parallel-fetch requirement changes its training query to the 7-day window. A welcome header requirement is added.
- `grit-design-system`: `GritKpiCard` gains the stacked layout with hint and shortcut.

## Impact

- **UI**: `src/components/portal/inicio/**`, `src/app/portal/inicio/{page,loading}.tsx`, `src/components/ui/grit/GritKpiCard.tsx`.
- **Services/types**: `inicio.service.ts` (`fetchProximosEntrenamientos` takes a date window instead of a limit; the stats count uses the same window), `inicio.types.ts` (window and agenda-day types). No new tables, RPCs or RLS.
- **Lib**: new `src/lib/portal/inicio-agenda.ts` (Bogotá 7-day window, day keys, range label, grouping), reusing `bogota-date.ts`. Discipline colour of the agenda bar comes from the existing `getDisciplinaVisual` helper (no DB column).
- **Docs**: `DESIGN.md` (§4 KPI card stacked layout, §1 note that `lhbhK` is migrated), `projectspec/03-project-structure.md`.
- **Specs**: deltas to `user-home-dashboard` and `grit-design-system`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/portal/inicio/page.tsx` | Read first name from `portal_profile`, compute the 7-day window, pass it to the services |
| Page | `src/app/portal/inicio/loading.tsx` | v3 skeleton for the new layout |
| Component | `src/components/portal/inicio/InicioPage.tsx` | Bento layout: welcome, KPI row, agenda (2/3) + right column (1/3) |
| Component | `src/components/portal/inicio/InicioWelcome.tsx` | New: welcome header (`GritPageHeader` title + accent) |
| Component | `src/components/portal/inicio/InicioStatsCards.tsx` | Rewrite with `GritKpiCard layout="stacked"` + hint builders |
| Component | `src/components/portal/inicio/InicioAgendaSemanal.tsx` | New (client): header, range pill, week strip, day list, empty overlay |
| Component | `src/components/portal/inicio/InicioAgendaItem.tsx` | New: agenda row (time column + inset card) |
| Component | `src/components/portal/inicio/InicioSuscripciones.tsx` | v3: `GritSegmented`, list rows, `GritTag`, v3 empty state |
| Component | `src/components/portal/inicio/InicioOrganizaciones.tsx` | v3: pill "Ver todas", logo tile, role `GritTag` |
| Component (delete) | `InicioFeaturedTraining.tsx`, `InicioProximosEntrenamientos.tsx`, `InicioQuickActions.tsx`, `InicioPagosPendientesAlert.tsx` | Remove; update `index.ts` |
| Component (kit) | `src/components/ui/grit/GritKpiCard.tsx` | `layout="stacked"`, `hint`, `hintTone`, `href`, `hrefLabel` |
| Hook | `src/hooks/portal/inicio/useAgendaSemanal.ts` | New: selected-day state, sessions of the selected day |
| Lib | `src/lib/portal/inicio-agenda.ts` | New: window bounds, day list, range label, group by day |
| Service | `src/services/supabase/portal/inicio.service.ts` | Window-based training fetch and count |
| Types | `src/types/portal/inicio.types.ts` | `InicioAgendaDia`, `InicioVentana` |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch `feat/grit-arena-v3-portal-inicio` from `develop`. Take "before" screenshots of `/portal/inicio` at 375 / 768 / 1440.
2. Types and lib: window/day helpers with unit-level checks (Bogotá midnight, month boundary in the range label).
3. Service: window-based `fetchProximosEntrenamientos` and window-bounded count in `fetchInicioStats`.
4. Kit: `GritKpiCard` stacked layout, verified against `eiIt1` / `vBtNu`.
5. Components bottom-up: agenda item → agenda (with hook) → KPI row → subscriptions → organizations → welcome → `InicioPage`; delete the removed components.
6. Page wiring (`page.tsx`) and `loading.tsx`.
7. Verify: frame `lhbhK` at 1440, stacking at 768 / 375, no horizontal scroll, one `h1`, keyboard pass on tabs and day strip, §11 greps on `src/components/portal/inicio`. Run `npm run lint` and `npx tsc --noEmit`.
8. Update `DESIGN.md` and `03-project-structure.md`.
