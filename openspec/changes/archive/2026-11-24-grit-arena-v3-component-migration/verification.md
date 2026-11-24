# Verification log — grit-arena-v3-component-migration (US-0141)

## Scope check (task 9.1)

Every changed file sits in the allowed list (tokens, `src/components/ui/grit/*`, Portal shell, three notificaciones chrome files, `DESIGN.md`, `03-project-structure.md`, `public/logo-grit-arena-dark.png`, this change folder). `supabase/.temp/cli-latest` was rewritten by the Supabase CLI during local verification and restored with `git checkout`.

## Kit verification (task 5.10)

A temporary page outside `/portal` (deleted afterwards) rendered every kit component at 1440px and 375px. Measured with Playwright:

| Check | Result |
|---|---|
| `GritButton` heights sm / md / lg | 32 / 37 / 42px (spec 31 / 37 / 42 ±1) |
| `GritIconButton` sm / lg | 30 / 44px |
| `GritPageHeader` with `italic` | one `h1`, Exo 2, 40px, weight 300, accent italic + cyan, title upright |
| `GritSegmented` | correct `aria-pressed` on all options; at 375px the track scrolls internally (495px content in 311px) |
| `GritProgress` 140 / -5 | `aria-valuenow` 100 / 0 |
| `GritPagination` 15 pages, page 1 | `1 2 3 … 15`, previous disabled, `aria-current` on 1 |
| `GritKpiCard` value | 36px / 300 |
| `GritTag` | not uppercase |
| Icons | no Material ligature text leaking |
| Type-level | `GritIconButton` without `label` and `GritSearchField` without an accessible name fail `tsc` (`@ts-expect-error` probe) |
| `gritPillSelectClass` | chevron renders (moved to `.grit-select-chevron` in `globals.css`: an arbitrary background-image utility holding a quoted data URI is not picked up by the Tailwind scanner) |

## Regression sweep findings (task 9.3) — follow-ups for page stories, not fixed here

1. `src/components/portal/analitica/AnaliticaTabs.tsx:37`: the active tab used the cyan `border-grit-glass-border` as part of its emphasis. Now neutral, the tab is still distinguishable (cyan gradient + 600 + text colour) but weaker. **Fix in the analítica story**: replace with `GritSegmented`.
2. 73 usages of `font-grit-title` together with `font-bold` across features render Exo 2 Bold, heavier than v3 (light h1/KPIs, medium section titles). **Fix per page** using the DESIGN.md §10 find → replace table.
3. No small elements (≤56px) use `rounded-grit-2xl`; the grep hit was a large list section (false positive).
4. `EventoCompraPaso*`, `EventoEntrenadoresSelector` and `EventoBundleSelector` mark selection with `border-grit-cyan` / danger, so they are unaffected by the neutral hairline.
5. The DESIGN.md §11 **global** grep is not clean: `src/components/portal/eventos/ObtenerEntradaModal.tsx` (lines 52–101) still uses `landing-*` tokens and `rounded-lg`. This predates US-0141 (untouched here). **Fix in the eventos page story.**
6. `src/components/portal/analitica/chart-theme.ts` still carries v2 hex values (charts are the one hex exception). Update in the analítica story.

## Visual verification (tasks 2.1, 9.2 and the shell checks of groups 6–8)

**Setup.** The other local Supabase project occupied ports 54321/54322, so this project's stack was started temporarily from a scratch copy of `supabase/config.toml`. Its ports were shifted to 553xx and the `project_id` kept the same, so it reused this project's existing data volumes. The dev server ran with `NEXT_PUBLIC_SUPABASE_URL` overridden. Login used GoTrue admin magic links against tenant **Wolfpack** (admin, entrenador and atleta accounts). The "before" baseline came from a `develop` worktree on port 3001. Everything was stopped and removed afterwards.

### Before vs after — 13 routes × 375 / 768 / 1440 (39 captures each)

| Check | Result |
|---|---|
| Exactly one visible `h1` | ✅ all Portal and public routes, except `/auth/login` at 375px (0, **identical on develop**: pre-existing) |
| No horizontal overflow | ✅ except `gestion-equipo` and `gestion-organizacion` at 375px: **identical on develop** (feature markup: Equipo tab buttons, table headers, org contact rows; pre-existing, page-story follow-up) |
| One visible breadcrumb per Portal page | ✅ every Portal route at every width (topbar ≥1024px, inline row below) |
| `/auth/login` unchanged | ✅ pixel-identical at 375 / 768 / 1440 |
| `/` unchanged | ❌ **changed**: see "Open decision" below |
| `/eventos` | changes by design (grit tokens, 0.17% of pixels at 1440) |

### Shell behaviour (desktop 1440, admin on `gestion-equipo`)

| Check | Result |
|---|---|
| Floating sidebar | ✅ x 16, y 16, 240 × 868 (viewport 900 − 32), radius 28px |
| Topbar | ✅ 56px, no bottom border, breadcrumb inside the header, last crumb "Equipo" |
| "Mi cuenta" toggle | ✅ Enter → `aria-expanded=false`, Space → `true`, focus ring visible |
| Group toggle (Eventos) | ✅ Enter: `false` → `true` |
| Tenant logo requests from the menu | ✅ none |
| Avatar menu | ✅ 38px trigger; opens; Escape closes and returns focus |
| Notifications | ✅ 38px bell; 410px panel showing the list state (4 items); Escape closes and returns focus |
| Org Switcher | ✅ label "Cambiar de organización (actual: Wolfpack)", initial "W", navigates to `/portal/orgs` |
| Entrenador on `gestion-reservas` | ✅ one active row ("Reservas") with one live dot; only Entrenamientos expanded; trainer tree = Administración, Equipo, Entrenamientos, Eventos; user card role "Entrenador" |
| Admin on `gestion-equipo` (screenshot) | ✅ Equipo expanded, Miembros active (pill + dot), role "Administrador" in cyan |

### Not verified (machine out of memory)

The OOM killer stopped `next-server` twice (≈1.5–1.9 GB resident) while VS Code, Docker and Chromium were also running. Still pending:

- Atleta tree on `gestion-entrenamientos` (the page took 13 minutes to render under swapping, then the server was killed).
- Mobile drawer behaviour at 390×844: focus on open, focus trap, Escape and focus return, rows ≥40px, scroll lock, close-on-navigate/resize, reduced motion. The 375px screenshots show the closed state only.
- Notification badge states 0 / 4 / 12 (only the list state with 4 items was seen) and the empty/error states of the panel.

### Decision — the public app home `/` (resolved 2026-11-23)

Since US-0140, `/` is the **public app home** (`src/components/home/`), built on `grit-*` tokens (27× `font-grit-title`, ~200 grit classes), not the old marketing landing. Retuning the token values therefore restyles it, like `/eventos`: Exo 2 instead of Rajdhani, v3 ink colours, neutral hairlines. **Decision (user): accept the v3 look on `/`.** The spec delta (`grit-design-system`), proposal, design, story and `DESIGN.md` now say that only `/auth/*`, which uses `landing-*` tokens, must stay unchanged. Verified: `/auth/login` is pixel-identical at 375/768/1440.

### Manual checklist (user, logged in to `/portal`) — closes tasks 7.3, 8.1, 8.3, 8.4

Run `npm run dev` against this project's local Supabase.

1. **Atleta menu (7.3)**: log in as an atleta of a tenant and open `orgs/{tenant}/gestion-entrenamientos`. The ORGANIZACIÓN tree shows only *Entrenamientos* (child "Entrenamientos disponibles") and the leaf *Planes*. Exactly one row has the cyan pill + dot, and the User Card says "Atleta".
2. **Mobile drawer (8.1)**: at about 390px wide, tap the hamburger.
   - The panel slides in from the right with rounded left corners and the dark gradient surface.
   - Focus lands on the close (X) button; Tab and Shift+Tab stay inside the drawer.
   - Every row is at least 40px tall and the page behind does not scroll.
   - Escape closes the drawer and returns focus to the hamburger (`aria-expanded=false`).
   - Tapping a link navigates and closes it; resizing to ≥1024px closes it and shows the sidebar.
   - With "reduce motion" on, there is no slide.
3. **Bell badge (8.3)**: with 0, 4 and 12 unread notifications the badge is hidden, shows `4`, and shows `9+`. Dark text on cyan. A new notification arrives without reloading.
4. **Notifications panel (8.4)**: check the empty state ("No tienes notificaciones"), the error state (stop Supabase briefly → red text + "Reintentar") and the list state.
   - Unread rows have the cyan wash and the word "Nueva".
   - Clicking an item marks it read and navigates; "Marcar todas como leídas" clears the badge; "Ver todas" opens `/portal/notificaciones`.

### Lint

`npm run lint` reports 16 errors and 19 warnings, all in files outside this change (feature modals, hooks, services, scripts under `videos/`). Every file changed here lints clean (`npx eslint <changed files>`). Type-check (`npx tsc --noEmit`) passes.
