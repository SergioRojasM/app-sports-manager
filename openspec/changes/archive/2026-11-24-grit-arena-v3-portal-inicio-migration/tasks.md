# Tasks

Reference: `proposal.md`, `design.md` (decisions §1–§11 and the node measurement table), and the specs under `specs/`. Design source: frame `lhbhK` in `projectspec/designs/pencil/grit-arena-v3.pen`, with populated-row reference `dBJ8K` in `p5Ms22`. Read it only through the pencil MCP, because the file is encrypted. Migration contract: `DESIGN.md` §10 and §12. The project has no test runner, so checks use `npx tsc --noEmit`, `npm run lint`, scratch scripts in the session scratchpad (not committed) and Playwright MCP. Never run `npm run build`.

## 1. Branch setup

- [x] 1.1 Create branch `feat/grit-arena-v3-portal-inicio` from `develop` and verify with `git branch --show-current`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`); stop if it is

## 2. Baseline

- [x] 2.1 With the dev server running, capture "before" screenshots of `/portal/inicio` at 375/768/1440px via Playwright MCP, for one user with bookings and subscriptions and one with none. Save them in the session scratchpad and verify the files exist
- [x] 2.2 Open `grit-arena-v3.pen` in Pencil and keep frame `lhbhK` and node `dBJ8K` as the visual reference; verify `get_app_state` lists `lhbhK`

## 3. Page layer

- [x] 3.1 `src/lib/portal/portal-profile-cookie.ts`: add `readPortalProfileName()`, which decodes the `portal_profile` cookie (base64 JSON, same as `src/app/portal/layout.tsx`) and returns the first word of `nombre`, or `''` on a missing cookie or parse error. Verify with a scratch script: a valid cookie gives "Sergio" and a garbage value gives `''`
- [x] 3.2 `src/app/portal/inicio/page.tsx`: build `ventana = buildAgendaVentana(new Date())` (task 6.1), pass it to `fetchInicioStats` and `fetchProximosEntrenamientos` inside the existing `Promise.all`, read the name with `readPortalProfileName()`, and render `<InicioPage data nombre ventana />`. Keep the unauthenticated redirect. Verify `npx tsc --noEmit` passes after tasks 4–7
- [x] 3.3 `src/app/portal/inicio/loading.tsx`: rewrite the skeleton to mirror the new layout (welcome lines, `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` KPI blocks, `xl:grid-cols-[1fr_400px]` panels) with `GritCard variant="card"` + `rounded-grit-3xl` and `motion-safe:animate-pulse`. Verify that with throttled network the skeleton matches the final layout, and that it does not pulse under emulated `prefers-reduced-motion: reduce`

## 4. Kit component

- [x] 4.1 `src/components/ui/grit/GritKpiCard.tsx`: add `layout?: 'inline' | 'stacked'` (default `inline`), `hint`, `hintTone?: 'muted' | 'accent' | 'warning'`, and an `href` + `hrefLabel` discriminated union. Implement the stacked layout per `design.md` §5: 28px radius, 22px padding, 36px icon chip, `GritIconButton href icon="arrow_outward"`, 56px Exo 2 300 value, 13/500 label, 12px hint. Verify that existing `GritKpiCard` call sites render unchanged (grep usages; spot-check one analítica page) and that `npx tsc --noEmit` passes
- [x] 4.2 Update `DESIGN.md` §4 (kit table) with the `GritKpiCard` stacked layout and props, and add to §1 that `lhbhK` → `/portal/inicio` is migrated. Verify that every prop named exists in the component

## 5. Components (bottom-up)

- [x] 5.1 `src/components/portal/inicio/InicioAgendaItem.tsx`: a `Link` to `/portal/orgs/{tenant_id}/entrenamientos-disponibles` containing:
  - a time column (`font-grit-mono`, Bogotá `h:mm am`);
  - a `GritCard variant="inset"` with a discipline bar (`getDisciplinaVisual(...).colorClass` + `bg-current`), the name, venue/meeting point, organization and a `GritTag dot` ("Confirmada" accent, "Pendiente" warning).

  Verify against `dBJ8K` and the spec scenario "Row content"
- [x] 5.2 `src/components/portal/inicio/InicioAgendaSemanal.tsx` (client), using `useAgendaSemanal` (task 6.2):
  - header with title, subtitle, range pill (`calendar_today` icon, `ventana.rangoLabel`) and `GritIconButton href="/portal/mis-reservas" label="Ver mis reservas"`;
  - week strip `role="group"` of 7 `aria-pressed` buttons with session dots and accessible names ("Jueves 19, 2 sesiones");
  - a day list that scrolls inside the panel at ≥1280px;
  - the empty overlay (decorative hour lines `aria-hidden`, icon ring, copy by `ventanaVacia`, `GritButton icon="add"` "Reservar sesión" pointing to the single org's `entrenamientos-disponibles` or `/portal/orgs`).

  Verify the scenarios "Default selection", "Selecting another day", "Empty window" and "Empty day in a busy week" with seeded local data
- [x] 5.3 `src/components/portal/inicio/InicioStatsCards.tsx`: rewrite with 4 × `GritKpiCard layout="stacked"` in `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`, with the icons, shortcuts and hint builders from the "Stats cards row" spec:
  - soonest `fecha_fin` comes from `suscripciones`;
  - "Estás al día" uses `hintTone="accent"`, "{n} por validar" uses `warning`;
  - the org hint is built from `membresias`;
  - the "Pagos pendientes" card has `highlight`.

  Verify that the 0/1/3-organization hints and the payment hints match the spec scenarios
- [x] 5.4 `src/components/portal/inicio/InicioSuscripciones.tsx`: `GritSectionHeading` with a `GritSegmented variant="solid"` action (`ariaLabel="Filtrar suscripciones"`); list rows with `divide-y divide-white/[0.06]`, status `GritTag dot`, payment `GritTag`, service units, and date-only formatting (no `new Date('YYYY-MM-DD')`); a panel empty state (icon ring + "No tienes suscripciones activas" / "Únete a un plan de tu club para empezar.") and per-filter empty copy; internal scroll at ≥1280px. Verify that a `fecha_fin` of `2026-11-30` displays "30 nov 2026" and that the filter toggles `aria-pressed`
- [x] 5.5 `src/components/portal/inicio/InicioOrgLogo.tsx` (client) and `InicioOrganizaciones.tsx`: a header with a "Ver todas" pill (`GritButton size="sm" variant="secondary"` with `arrow_forward`, linking to `/portal/orgs`); `Link` rows with a 42px logo tile (`<img alt="Logo de {nombre}">`, falling back to the initial on `onError` or null), the name, and a role `GritTag` (Administrador / Entrenador / Atleta, other values capitalized); an empty state with "Explorar organizaciones". Verify that a broken logo URL shows the initial and that the role labels match
- [x] 5.6 `src/components/portal/inicio/InicioWelcome.tsx`: `GritPageHeader title="Bienvenido," titleAccent={nombre}` (no accent when `nombre` is empty) plus the subtitle. Verify there is exactly one `h1` on the page (`document.querySelectorAll('h1').length === 1`)
- [x] 5.7 `src/components/portal/inicio/InicioPage.tsx`: compose welcome → KPI row → `grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4` (agenda | right column with subscriptions above organizations). Props: `data`, `nombre`, `ventana`. Verify at 1440px against `lhbhK`
- [x] 5.8 Delete `InicioFeaturedTraining.tsx`, `InicioProximosEntrenamientos.tsx`, `InicioQuickActions.tsx` and `InicioPagosPendientesAlert.tsx`, and update `index.ts`. Verify that `grep -rn "InicioFeaturedTraining\|InicioQuickActions\|InicioPagosPendientesAlert\|InicioProximosEntrenamientos" src` returns nothing

## 6. Hook and lib

- [x] 6.1 `src/lib/portal/inicio-agenda.ts`: add `buildAgendaVentana(now)` (Bogotá day keys via `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })`, 7 days, `desde = now`, `hasta = bogotaDayEndIso(dias[6].key)`, DOW "DOM…SÁB", `nombreLargo`, `rangoLabel` "15 – 21 nov" / "28 nov – 4 dic"), `agruparPorDia(entrenamientos, dias)` and `formatAgendaHora(iso)`. Verify with a scratch script (`npx tsx`) on these cases:
  - `2026-11-15T14:00Z` gives keys 15…21 and the label "15 – 21 nov";
  - `2026-11-28T04:30Z` (still 27 nov in Bogotá) gives the first key `2026-11-27`;
  - `2026-11-28T15:00Z` gives the label "28 nov – 4 dic".
- [x] 6.2 `src/hooks/portal/inicio/useAgendaSemanal.ts`: hold `selectedKey` (initialised to `hoyKey` from the server) and return `{ selectedKey, select, sesionesDelDia, ventanaVacia, conteoPorDia }`. Verify through task 5.2's scenarios

## 7. Service and types

- [x] 7.1 `src/types/portal/inicio.types.ts`: add `InicioAgendaDia` (`key`, `dow`, `dia`, `nombreLargo`) and `InicioVentana` (`desde`, `hasta`, `hoyKey`, `dias`, `rangoLabel`), keeping the existing interfaces. Verify `npx tsc --noEmit`
- [x] 7.2 `src/services/supabase/portal/inicio.service.ts`:
  - `fetchProximosEntrenamientos(supabase, userId, ventana)` filters `.gte('entrenamientos.fecha_hora', ventana.desde).lte('entrenamientos.fecha_hora', ventana.hasta)`, has no limit, has a defensive `.limit(100)` with `console.warn` when hit, and keeps the ascending order;
  - the `fetchInicioStats` bookings count adds `.lte(..., ventana.hasta)`.

  Verify on local Supabase with seeded bookings today, on day 6 and on day 7: day 7 is excluded from both the KPI and the agenda, and a booking that already started earlier today is excluded

## 8. Integration verification

- [x] 8.1 Visual parity: Playwright "after" screenshots at 1440/768/375px next to `lhbhK`. Verify:
  - order, proportions, type scale and surfaces match;
  - no horizontal scroll at 375px (`document.documentElement.scrollWidth <= 375`);
  - the week strip fits without page scroll.
- [x] 8.2 Data edge cases on local data: a user with no data (all empty states), a user with 3 organizations, a pending payment (warning hint), and an active subscription with and without `fecha_fin`. Verify each against its spec scenario
- [x] 8.3 Keyboard and accessibility pass: Tab reaches the KPI shortcuts, range shortcut, day buttons (`aria-pressed`), agenda rows, segmented options, "Ver todas" and the org rows, all with visible focus rings; status pills carry text. Verify with Playwright `browser_press_key` and `browser_snapshot`
- [x] 8.4 Run both §11 greps from `DESIGN.md` on `src/components/portal/inicio src/app/portal/inicio` and verify they return nothing. Also verify that `grep -rnE "emerald-|amber-|rose-|yellow-|slate-|rounded-md" src/components/portal/inicio src/app/portal/inicio` returns nothing
- [x] 8.5 Run `npx tsc --noEmit` and `npm run lint` and verify both pass (no build)

## 9. Documentation and delivery

- [x] 9.1 Update `projectspec/03-project-structure.md`:
  - inicio components (new/removed files);
  - `src/hooks/portal/inicio/useAgendaSemanal.ts`;
  - `src/lib/portal/inicio-agenda.ts` and `portal-profile-cookie.ts`;
  - the `inicio.service.ts` window parameters;
  - the `GritKpiCard` stacked layout.

  Verify that every path listed exists
- [x] 9.2 Write the commit message (Conventional Commits, e.g. `feat(inicio): migrate /portal/inicio to grit-arena-v3 frame lhbhK`) and the PR description (summary, screenshots before/after, the 7-day KPI behavior change, the derived agenda row flagged for design review, the test plan), saved as `openspec/changes/grit-arena-v3-portal-inicio-migration/pr.md`. Verify that tasks 8.4 and 8.5 passed first

## Workflow follow-up

- Run `/opsx:verify` and then archive the change once reviewed. The archive merges the `user-home-dashboard` and `grit-design-system` deltas; `openspec/specs/user-home-dashboard/spec.md` had its header normalized in this change so that the deltas apply.
