# Commit message

```
feat(inicio): migrate /portal/inicio to grit-arena-v3 frame lhbhK

Rebuild the user home dashboard on the v3 kit following DESIGN.md §10,
matching frame lhbhK ("App · Inicio v9") of grit-arena-v3.pen.

- Welcome header "Bienvenido, {nombre}" (first name from the portal_profile
  cookie, no extra query).
- KPI row: 4 tall GritKpiCard cards with contextual hints and shortcuts;
  "Pagos pendientes" uses the highlight surface.
- New 7-day agenda (today + 6, Bogotá): range label, week strip with session
  markers, per-day rows (time, discipline bar, venue, org, status pill) and
  an empty overlay with "Reservar sesión". The upcoming-trainings KPI counts
  the same window.
- Mis suscripciones: GritSegmented filter, v3 list rows, status/payment
  GritTag, date-only formatting. Mis organizaciones: logo tile with initial
  fallback and role labels.
- Removed the featured-training card, quick actions and pending-payments
  alert (not in the v3 frame).
- Kit: GritKpiCard gains layout="stacked" with hint, hintTone and an
  href/hrefLabel shortcut; the inline default is unchanged.
- Services: fetchInicioStats / fetchProximosEntrenamientos take the agenda
  window instead of "all upcoming" / top 5.
- Docs: DESIGN.md (kit table, frame map), 03-project-structure.md; the
  user-home-dashboard spec header normalised so its deltas apply.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

# Pull request

**Title:** feat(inicio): migrate /portal/inicio to grit-arena-v3 (frame `lhbhK`)

## Summary

`/portal/inicio` is the first screen after login and was still v2 markup inside the v3 shell. This PR rebuilds it from frame `lhbhK` of `projectspec/designs/pencil/grit-arena-v3.pen` using only kit components, following the `DESIGN.md` §10 migration checklist.

- **Welcome**: "Bienvenido, {nombre}" (Exo 2 300, accent name).
- **KPI row**: 4 stacked `GritKpiCard`s with hints and round shortcuts:
  - Suscripciones → `/portal/mis-suscripciones`
  - Próximos entrenamientos → `/portal/mis-reservas`
  - Pagos pendientes (highlight) → `/portal/mis-suscripciones`
  - Organizaciones → `/portal/orgs`
- **Weekly agenda**:
  - range pill and a 7-day strip; days are `aria-pressed` buttons, and days with sessions show a dot and say "N sesiones" in their name;
  - rows for the selected day;
  - an empty overlay with decorative hour lines and "Reservar sesión".
- **Mis suscripciones / Mis organizaciones**: v3 rows, `GritSegmented`, `GritTag` status/role pills, in-panel empty states.
- **Kit**: `GritKpiCard layout="stacked"` (additive; existing callers unchanged).
- **Removed**: `InicioFeaturedTraining`, `InicioProximosEntrenamientos`, `InicioQuickActions`, `InicioPagosPendientesAlert`.

### Behavior changes to review

- **The "Próximos entrenamientos" KPI and the agenda now cover the 7-day window that starts today (Bogotá)**, not every future booking. The hint "Esta semana" says so, and the shortcut opens the full list in Mis reservas.
- **The populated agenda row is derived**: `lhbhK` only draws the empty state, so the row is adapted from the agenda session row `dBJ8K` (frame `p5Ms22`), without coach and capacity. Flagged for design review.
- **"Reservar sesión"** goes to the single org's `entrenamientos-disponibles` when the user has exactly one organization, otherwise to `/portal/orgs`.
- **All-caps first names** in profiles are title-cased in the greeting ("RODOLFO" → "Rodolfo").

## Screenshots

Before / after at 1440 and 375px, for a user with data (seeded local bookings) and a user with none: _attach from the local captures_.

## Test plan

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint`: no errors in the changed files (the 16 remaining errors are pre-existing, in modals and hooks this PR doesn't touch)
- [x] `DESIGN.md` §11 global and v3 greps return nothing on `src/components/portal/inicio`, `src/app/portal/inicio` and `src/components/ui/grit`
- [x] Agenda window: with seeded local bookings (one that already started today, today 23:30, day 3 × 2, day 7, day 8), the KPI shows 4, the started and day-8 sessions are excluded, and dots appear on days 1, 3 and 7
- [x] Day selection: pressing "Jueves 26" lists its 2 rows ("Confirmada" / "Pendiente"); an empty day shows "Sin entrenamientos este día"; a user with no bookings sees "No tienes entrenamientos próximos"
- [x] Subscriptions filter "Pendientes" with none → "No tienes suscripciones pendientes"; empty user → "Únete a un plan de tu club para empezar."
- [x] Lib checks: Bogotá day keys across UTC midnight (`2026-11-28T04:30Z` → 27 nov), cross-month label "28 nov – 4 dic", date-only `2026-11-30` → "30 nov 2026"
- [x] One `h1`, no horizontal scroll at 375 / 768 / 1440
- [x] Keyboard: logical Tab order through the KPI shortcuts, agenda shortcut, days, rows, filter, "Ver todas" and the org rows, all with focus rings
- [ ] Design review of the derived agenda row
- [x] Throttled-network check of the new `loading.tsx` skeleton, including `prefers-reduced-motion: reduce` (checked manually in DevTools)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
