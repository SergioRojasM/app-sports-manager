# Commit message

```
feat(entrenamientos): migrate gestion-entrenamientos to grit-arena-v3 (p5Ms22)

Rebuild the trainings page on frame p5Ms22 (US-0142):
- v3 header "Gestiona tus entrenamientos." with a Mes / Semana / Lista
  switch synced to ?vista= and the "Crear entrenamiento" CTA
- KPI row derived from the visible period (sesiones, reservas,
  ocupación, entrenadores)
- weekly time grid: sessions placed by Bogotá start time and sized by
  duration, lanes for overlaps, discipline tones + legend, collapsible
  runs of 3+ empty hours
- "Agenda del día" panel with status tags, coach and capacity
- month and list views composed from the kit (ZYxt2 pattern, gritTable)
- v3 action modal (same props), GritAlert feedback, GritEmptyState errors
- catalogs load once per tenant; period changes only reload instances

Kit: icon-map gauge → speed; GritProgress gains an additive trackClassName.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

# Pull request

**Title:** feat(entrenamientos): migrate gestion-entrenamientos to grit-arena-v3 (p5Ms22)

## Summary

Migrates `orgs/[tenant_id]/gestion-entrenamientos` to the v3 frame **`p5Ms22`** ("Admin · Entrenamientos (calendario)"), following US-0142 and the OpenSpec change `grit-arena-v3-entrenamientos-calendario`.

- **Header**: "Gestiona tus *entrenamientos.*" ("Calendario de *entrenamientos.*" for `usuario`), with a `GritSegmented` **Mes / Semana / Lista** switch kept in `?vista=` (default `semana`; unknown values fall back) and a large "Crear entrenamiento" (managers only).
- **KPIs** for the visible period (week, or month without the padding days):
  - sesiones · disciplinas;
  - reservas · sesiones llenas;
  - ocupación % · cupos;
  - entrenadores.
- **Semana** (frame):
  - day tiles (today solid cyan; the selected day tinted, `aria-pressed`) and a 64px-per-hour grid (5 am – 9 pm, extended to fit);
  - runs of 3 or more empty hours collapse into bands (`aria-expanded` toggles);
  - session blocks are placed and sized in Bogotá time, with side-by-side lanes for overlaps and discipline-tone gradients;
  - cancelled blocks are struck through, past ones dimmed, and full ones show their capacity in warning.
- **Agenda del día** (340px):
  - date tile, "N sesiones · M reservas";
  - cards with a Próxima / Lleno / Cancelado / Finalizado tag, venue, coach and a capacity track;
  - "Reservar" for `usuario` (US-0127 behaviour kept);
  - "Ver detalle del día" → Lista filtered to that day.
- **Mes**: 42-cell grid after `ZYxt2`, up to 2 tone pills + "+N". The cell selects the day; a pill opens the session.
- **Lista**: compact `gritTable*` table with 20 rows per page and a removable day chip. Rows become stacked cards below `md`.
- **Action modal**: v3 pattern (glass card, kit buttons, focus trap, Escape, focus return). Props and enable rules are unchanged.
- **Data**:
  - catalogs load once per tenant;
  - changing the period only reloads `entrenamientos` + capacities (stale responses dropped);
  - the previous period's sessions aren't shown while the next one loads.

New pure lib `src/lib/portal/entrenamientos-calendario.ts`: week/day keys and labels, hour grid + bands, lanes, tones, KPIs, agenda status.

## Screenshots

Before / after captures at 375 / 768 / 1440 were taken locally (admin and usuario, Wolfpack tenant, week of 21–27 Sep 2026). Attach them here:
- before: month dots + side list;
- after: Semana, Mes, Lista, the action modal, the empty week, and the usuario view.

## BREAKING (UX)

- The default view is the **week**, not the month.
- The month dots and the sticky "Lista de entrenamientos" column are replaced by the week grid + agenda panel and the **Lista** view.
- "Mes anterior / Mes siguiente" footer buttons → chevrons + "Hoy" in the period header.
- The capacity colour changes from green / yellow / red to cyan, with warning + "Lleno" when full.
- The "Opciones" / "Ver" text buttons → clicking the session (block, agenda card, month pill) or the `more_horiz` row action in Lista.

## Verification

- [x] `npx tsc --noEmit`: no errors in `src/` (the 2 existing errors are in `videos/`).
- [x] `npm run lint`: no new problems. The 11 existing errors are in untouched `formularios` / `gestion-equipo` / `planes` / `suscripciones` files.
- [x] Lib assertions (scratch `tsx` script):
  - labels (cross-month / cross-year);
  - Monday computation and 24 h Bogotá times;
  - bands (incl. expanded runs and empty weeks);
  - lanes;
  - KPI example (64 reservas, 82 %, 78 cupos);
  - agenda status precedence.
- [x] Playwright as admin:
  - one `h1`, no horizontal scroll at 375 / 768 / 1440;
  - week navigation requests only `entrenamientos` + `reservas`;
  - `?vista=mes` / `?vista=lista` URLs;
  - "Ver detalle del día" chip;
  - modal opens from a block, Escape closes it and returns focus;
  - band expand / collapse.
- [x] Keyboard pass: view switch → CTA → chevrons / Hoy → day tiles → band toggle → session blocks → agenda cards → "Ver detalle del día", all with focus rings. Enter and Space activate.
- [x] Usuario: "Calendario de entrenamientos.", no CTA, `?vista=foo` → Semana.
- [x] `DESIGN.md` §11 greps return nothing on the migrated files.
- [ ] Not exercised against live data: create / edit (scopes) / delete / "Publicar en eventos", and the usuario "Reservar" auto-book. The local dataset has no future trainings, and these flows mutate data. The code paths are unchanged (same hook handlers and modal props).

## Non-goals / follow-ups

- Restyle `EntrenamientoFormModal`, `EntrenamientoWizard`, `EntrenamientoDetalleModal`, `EntrenamientoScopeModal`, `PlantillasListModal`, `GuardarPlantillaModal` (they still carry v2 classes).
- `ReservasPanel` and the Reservas page → frame `kPW3x`.
- Batch the per-instance `getCapacidad` calls into one query.
- KPI comparison with the previous period and an occupancy goal (need data).
- Drag-and-drop rescheduling and click-to-create on empty slots.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
