# Design

## Context

- The five routes are thin server entries. Four render one client feature component (`ScenariosPage`, `DisciplinesPage`, `ServiciosPage`, `PlanesRolePage`). `gestion-organizacion/page.tsx` composes four client cards itself (`TenantInfoCards`, `TenantPaymentMethodsCard`, `TenantReglasSuspensionCard`, `TenantReglasNotificacionCard`), each with its own hook and states.
- Data already loaded today, and what can be derived from it:
  - `scenariosService.listScenariosByTenant` returns every scenario with its `schedules` and `availability`. The tipo filter, the summary (capacity, available schedules) and the card stats are client-side derivations.
  - `planesService.getPlanes` embeds `planes_disciplina`, `plan_tipos` and each tipo's `plan_tipos_servicios(servicio_id, unidades, servicios(nombre))`. The plan card (price, subtypes, INCLUYE) **and** the services page's "PLANES" count come from this one query.
  - `useNivelesDisciplina` loads levels for one discipline; `usuario_nivel_disciplina` is readable by any tenant member (RLS `usuario_nivel_select_authenticated`), so athletes per level are one `select disciplina_id, nivel_id` per tenant.
  - Members: `miembros_tenant` is readable by the tenant's administrators; a `count: 'exact', head: true` query gives "Miembros".
- `nivel_disciplina` has `unique (tenant_id, disciplina_id, orden)` (not deferrable) and `check (orden > 0)`. A swap needs a temporary position.
- `scenariosService.deleteScenario` throws a generic error; FK violations (`23503`) from trainings/events are not distinguished.
- `useTenantView` is shared with the organizations marketplace (`mode: 'directory'`), so page-specific data must not be added to it.
- Six hand-rolled right-side drawers exist (`ScenarioFormModal`, `DisciplineFormModal`, `NivelDisciplinaFormModal`, `ServicioFormModal`, `PlanFormModal`, `EditTenantDrawer`) plus three form modals in `tenant/` (`MetodoPagoFormModal`, `ReglaSuspensionFormModal`, `ReglaNotificacionFormModal`) and three hand-rolled confirm dialogs (`TenantPaymentMethodsCard`, `TenantReglasSuspensionCard`, `TenantReglasNotificacionCard`) plus `window.confirm` in `usePlanes`. Each repeats backdrop, Escape and focus code with slightly different bugs (e.g. no focus return).
- `MetodoPagoQrImage` and the payment-method pieces are imported by `SuscripcionModal` and `EventoMetodoPagoCard`; their APIs must not change.
- Design source: `projectspec/designs/pencil/grit-arena-v3.pen` (read only through the pencil MCP). The content area is 1120 wide, `Content` vertical, gap 20, padding 12/32/32/32 (provided by the shell). Measurements read from the file:

| Frame / node | Element | Measurements |
|---|---|---|
| all `Header` | Title | L1 Exo 2 40/300 `ink` + accent Exo 2 40/300 italic `brand`, gap 12 = `GritPageHeader title titleAccent italic`. Tools gap 10: search 220–260×37 (`GritSearchField size="md"`), CTA padding 11/18, 15px icon, 12/600 (`GritButton size="md"` primary; the frames use the 37px size, not `lg`) |
| `aYwNn` `MhFv0` | Identity card | 380×262, radius 22. Cover 104 + shade. Body padding 0/22/20/22, gap 14: logo 56 (radius 18, Exo 2 28/700 italic mark) overlapping the cover, name Exo 2 24/500, pill padding 4/10 11/600; meta tiles 105×52, radius 14, padding 10/12, gap 4: label 9/600 tracking + 12px icon (`calendar`, `map-pin`, `users`), value 13/600 |
| `aYwNn` `ONRJQ` | Contact card | 720, padding 22, gap 18, radius 22. Header: 36px icon chip (`contact`), title Exo 2 18/500, subtitle 12px, right pill with dot. Grid 2 cols, gap 12/8: items 332×48, radius 14, padding 0/14, gap 12: 30px round icon (`mail`, `phone`, `globe`, `instagram`, `facebook`, `at-sign`), label 9/600 tracking, value 13/500, trailing 14px action (`copy` / `external-link`); empty: `plus` 12px + "Conectar" 12/600 `brand` |
| `aYwNn` `qS2AM` · `GFsAW` | Settings sections | 550 each, gap 20, padding 22, gap 18, radius 22. Header 40: chip 36 (`wallet` / `gavel` / `bell-ring`), title Exo 2 18/500, subtitle 12px, "Agregar" padding 8/14 14px `plus` 12/600 (= `GritButton size="sm" variant="outline-accent"`) |
| `aYwNn` `RU3M6` | Method row | radius 16, padding 12/14, gap 12: tile 34 radius 12 (`link` / `smartphone`), name 13/600, tags gap 6 (11/600 pills), actions gap 4: 30px round (`external-link`, `pencil`, `trash-2`) |
| `aYwNn` `M0Fmm7` | Rules empty | radius 16, gap 12, centered: 16px `list-x` + 13/500; suggestion pill padding 8/8/8/14 (14px `sparkles`, 12px text, "Usar" small primary) |
| `aYwNn` `vR0ZM` | Notifications | full width, padding 22, gap 18. Timeline gap 12, 16px `chevron-right` between tiles; tile 332, radius 18, padding 14/16, gap 14: big Exo 2 24/300 + caption 10px; 1×40 divider; title 13/600 + channel pills; switch 36×20 padding 2, knob 16 |
| `qG0T5` `gsHK1` | Filter row | segmented padding 4, gap 2, options padding 7/14, 12px label, count bubble padding 1/7 10/700 (= `GritSegmented` with `count`); summary gap 18: 14px icon (`users`, `alarm-clock`) + 12px |
| `qG0T5` `mEIoa` | Scenario card | 360×362, radius 22. Photo 150 + shade, tags top-left (tipo pill, status pill with dot). Body padding 4/18/16/18, gap 10: name Exo 2 19/500, location 13px `map-pin` + 12px, description 12px (2 lines), flex spacer, footer: stats gap 14 (13px `users` / `alarm-clock` + 12/600), actions 30px (`map`, `pencil`, `trash-2`) |
| `qG0T5` `SmgQv` | Add tile | 360×362, radius 22, dashed stroke, gap 12 centered: ring 56 (22px `plus`), title Exo 2 19/500, subtitle 12px |
| `fXuVP` `INksa` | Discipline list | 380, padding 14, gap 6, radius 22. Header padding 6/8/10/8: overline 10/600 + segmented (Activas / Todas). Items radius 16, padding 11/12, gap 12: tile 36 radius 12 (discipline icon), name 13/600, meta 11px, 14px `chevron-right`; selected = cyan tint + stroke. Tip padding 12/14 radius 14 (`info` 14px + 11px) at the bottom |
| `fXuVP` `Ln3Be` | Detail | 720, padding 26, gap 22, radius 22. Header gap 16: icon 60 radius 20 (26px), name Exo 2 30/300 + status pill, description 12px, "Editar" secondary md, delete 30px. Stats 4×158×78, radius 16, padding 14/16 (12px icon + 11px label, Exo 2 26/300 value) — 2 used here |
| `fXuVP` `ngPAB` | Ladder | gap 12, tiles 161 wide, ascending heights 210 / 250 / 290 (bottom-aligned), radius 18, padding 16, gap 8: "01" Exo 2 26/300, actions 13px (`pencil`, `grip-vertical`), name 14/600, athletes 12px `users` + 11/600. Add tile 150 dashed (18px `plus`, "Nivel 04" 12/600). Distribution bar above: 8px segments, gap 4, radius 999 |
| `v8mqZG` `cBqMX` | Services table | radius 22. Head padding 14/22, gap 16, 10/600 tracking. Rows padding 14/22, gap 16: tile 36 radius 12 + name 13/600 + desc 11px (col 210); planes count bubble 24 round 11/700 + 11px "planes"; switch 36×20; actions 30px (`pencil`, `ellipsis`) |
| `J7Lw7d` `vn0ug` | Plan card | 268 (4 cols, gap 16), padding 20, gap 14, radius 22. Top: modality pill + visibility chip (padding 4/8, 11px icon `lock` / `globe` / `eye-off`, 10/600) left, status pill right. Name Exo 2 22/500; price Exo 2 34/300 + "/ mes" 12px; subtypes radius 10, padding 7/10, 12px `repeat` + 11/500; divider; "INCLUYE" 9/600; items 14px `circle-check` `brand` / `gift` `#B9A3FF` (violet token) + 12px; flex; footer actions 30px (`pencil`, `copy`, `trash-2`) |
| `J7Lw7d` `O5g7x` | Toast | 1120×48, radius 16, padding 12/16, gap 12: 24px round check + 13/500 text + dismiss = `GritAlert tone="success" onDismiss` |

## Goals / Non-Goals

**Goals:**
- Match `aYwNn`, `qG0T5`, `fXuVP`, `v8mqZG` and `J7Lw7d` at 1440px for the elements that have data, and stack cleanly at 768 and 375px, using kit components only (missing pieces go into the kit, `DESIGN.md` §5).
- One drawer shell, one confirm dialog and one switch for the whole module; no feature folder keeps its own backdrop/focus code.
- Keep every behavior the specs keep: validations, limits (3 suspension rules, 3 notification rules per type), the payment-method QR flow, plan duplication, hidden plans, the services delete guard, the role split of `gestion-planes`.
- Derived data never blocks a page: each derived query fails independently and renders "—".

**Non-Goals:**
- Server-side work: no migrations, RPCs, RLS or views. Nothing is pushed to the remote Supabase.
- Changing form validation rules or the shape of the form payloads.
- Restyling `SuscripcionModal`, `EventoMetodoPagoCard` or the marketplace cards (they keep using the shared pieces unchanged).

## Decisions

### 1. Architecture (page → component → hook → service → types)

```
/gestion-organizacion ─ page.tsx (server) → GestionOrganizacionPage ('use client')
   ├─ GritPageHeader "Tu" / "organización." · actions = GritButton "Editar organización" (opens EditTenantDrawer)
   ├─ row lg:[380px_1fr]: TenantIdentityCard ← useTenantView({tenantId}) + useTenantMiembrosCount(tenantId) → tenantService.countMiembros
   │                      TenantContactCard  (copy → clipboard + live region; "Conectar" → drawer)
   ├─ row lg:grid-cols-2: TenantPaymentMethodsCard ← useMetodosPago      │ TenantReglasSuspensionCard ← useReglasSuspension
   │                       settings section · MetodoPagoRow ×N            │ settings section · rows | empty + suggested rule
   └─ TenantReglasNotificacionCard ← useReglasNotificacion (+ toggleActivo)
         settings section · <ol> timeline: ReglaNotificacionTile ×N (GritSwitch) ← ordenarReglasTimeline()
   drawers: EditTenantDrawer · MetodoPagoFormModal · ReglaSuspensionFormModal · ReglaNotificacionFormModal → GritDrawer
   dialogs: GritConfirmDialog (delete method / suspension rule / notification rule)

/gestion-escenarios ─ ScenariosPage
   ├─ useScenarios (+ tipoFilter, tipoOptions, summary, deleteScenario)  ← lib agruparTiposEscenario(), resumenEscenarios()
   ├─ GritPageHeader + GritSearchField + GritButton
   ├─ ScenariosHeaderFilters: GritSegmented(count) | GritPillSelect (>5 types) · summary
   ├─ grid sm:2 xl:3: ScenarioCard (GritMediaCard + GritTag + actions) ×N · GritAddTile
   └─ ScenarioFormModal → GritDrawer · GritConfirmDialog

/gestion-disciplinas ─ page.tsx <Suspense> → DisciplinesPage
   ├─ useDisciplines (+ statusFilter, selectedId ⇄ ?disciplina=, conteos) ← usuarioNivelDisciplinaService.countAtletasPorNivel
   ├─ grid lg:[380px_1fr]: DisciplinesList (GritSegmented · items aria-current) │ DisciplineDetail
   │                                                                         ├─ header · stats
   │                                                                         └─ NivelesLadder ← useNivelesDisciplina(disciplinaId) (+ moveNivel, cache per id)
   └─ DisciplineFormModal · NivelDisciplinaFormModal → GritDrawer · GritConfirmDialog

/gestion-servicios ─ ServiciosPage
   ├─ useServicios (+ statusFilter, counts, planCounts ← planesService.getPlanes, toggleActivo)
   ├─ GritSegmented(count) · hint · table (gritTable*) rows: GritIconTile · count bubble · GritSwitch · GritIconButton + menu
   └─ ServicioFormModal → GritDrawer · GritConfirmDialog

/gestion-planes ─ PlanesRolePage
   ├─ admin  → PlanesPage    ← usePlanes (+ confirm-dialog delete)   grid sm:2 xl:4 PlanCard mode="admin"
   └─ others → PlanesViewPage ← usePlanesView                         grid       PlanCard mode="readonly" (+ Adquirir)
        PlanCard ← buildPlanCardModel(plan)  lib/portal/admin-catalogo.utils.ts
   PlanFormModal (+ PlanTipoServiciosSection) → GritDrawer · GritConfirmDialog
```

### 2. Kit additions are generic shells
- `GritDrawer({ open, onClose, title, subtitle?, busy?, footer?, size: 'md' | 'lg' = 'md', children })`: portal to `document.body`; backdrop `fixed inset-0 z-50 bg-grit-bg/70 backdrop-blur-sm`; panel `GritCard variant="glass"` docked right, `max-w-xl` (md) / `max-w-3xl` (lg, for the plan form), `w-full` below `sm`. It stores `document.activeElement` on open, focuses the first focusable (or the panel), traps Tab, and restores focus on close. `busy` disables Escape / backdrop / close.
- `GritConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', tone = 'danger', pending, onConfirm, onCancel })`: same backdrop, centered `glass` panel 420 wide, `role="alertdialog"`, `aria-describedby` on the message, initial focus on Cancel.
- `GritSwitch({ checked, onChange, label, disabled, size = 'md' })`: a `<button role="switch">`; track `white/[0.08]` off / `grit-cyan` on, knob 16px (`grit-on-brand` when on). `label` is required by type (same rule as `GritIconButton`).
- `GritAddTile({ title, subtitle?, icon = 'add', onClick, className })`: dashed `border-white/[0.14]`, hover cyan stroke, ring 56. Used in a grid cell (`h-full`).
- `GritSectionHeading icon`: additive, renders `GritIconTile shape="circle"`-like chip (36px, 16px icon). Headings without `icon` keep their markup.

*Alternative*: keep each module's drawer and only restyle it. Rejected: nine copies would need the same focus fix, and §9 already defines one pattern.

### 3. Drawer forms keep their logic
Every form component keeps its props, validation and submit handler. Only the outer shell becomes `<GritDrawer>` and fields move to `gritInputClass` / `gritSelectClass`, labels 12/600 `grit-subtext`, helpers 11px `grit-muted`, errors 12px `grit-danger` with `aria-describedby`. The footer holds Cancel (`secondary`) and Save (`primary`, `loading`). Booleans inside forms (activo, público, requiere perfil completo) use `GritSwitch` with a visible label. This keeps the diff reviewable per form.

### 4. Optimistic switches with per-row pending state
`useServicios.toggleActivo(id, next)` and `useReglasNotificacion.toggleActivo(id, next)`:
1. add `id` to a `pendingIds` set and update the row locally;
2. call `serviciosService.updateServicio(id, { activo })` / `reglasNotificacionService.updateRegla(id, { ...currentFields, activo })` (the update payload requires the full rule, so the hook spreads the current row);
3. on failure, restore the row and set an error for the `GritAlert`;
4. remove `id` from `pendingIds`.

The switch is `disabled` while its id is pending, so a double click can't race.

### 5. Derived counts are separate, failure-isolated queries
- `tenantService.countMiembros(tenantId)`: `from('miembros_tenant').select('usuario_id', { count: 'exact', head: true }).eq('tenant_id', tenantId)`, read through a new `useTenantMiembrosCount` hook (not `useTenantView`, which the marketplace shares).
- `usuarioNivelDisciplinaService.countAtletasPorNivel(tenantId)`: `select('disciplina_id, nivel_id').eq('tenant_id', tenantId)`, reduced client-side into `{ porDisciplina: Map<id, n>, porNivel: Map<id, n> }`. One query per page load serves the list meta, the detail stat and the ladder.
- Services plan usage: `useServicios` also calls `planesService.getPlanes(tenantId)` and builds `Map<servicioId, Set<planId>>` over **all** subtypes (active or not), which matches the delete guard (`referenced_by_plan_tipos`).

Each runs with `Promise.allSettled` next to the main load; a rejection sets the derived value to `null` and the UI renders "—" (spec scenarios). *Alternative*: a SQL view or RPC with counts. Rejected by the scope decision (no server changes).

### 6. Scenario types are grouped in a pure helper
`agruparTiposEscenario(scenarios)` keys by `tipo.trim()` normalised with `toLocaleLowerCase('es')` + NFD accent stripping, keeps the most frequent original spelling as label, and sorts by count desc then label. `ScenariosHeaderFilters` renders `GritSegmented` when ≤5 groups, otherwise a `GritPillSelect` labelled "Tipo de escenario". `resumenEscenarios(list)` sums `capacidad ?? 0` and counts `schedules.filter(s => s.disponible)`. The search uses the same normaliser (accent-insensitive, spec).

Map URL: `coordenadas` as-is when it is already an `http(s)` link (local data stores Waze links there), else `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordenadas ?? direccion)}`.

`deleteScenario` maps `23503` to `ScenarioServiceError('in_use', 'No puedes eliminar este escenario porque tiene entrenamientos o eventos asociados.')`; other errors keep the generic message.

### 7. Disciplinas: URL selection and a per-discipline levels cache
- `useDisciplines` reads `useSearchParams().get('disciplina')` and writes with `router.replace(`?disciplina=${id}`, { scroll: false })`. When the param is missing, invalid or filtered out, it selects the first listed id and replaces the URL (spec). The page wraps the feature in `Suspense` (required by `useSearchParams`).
- `useNivelesDisciplina` becomes keyed by `disciplinaId` with a `Map<disciplinaId, NivelDisciplina[]>` cache in a ref, so switching back to a discipline doesn't refetch (keeps the old "fetch on first expand only" guarantee).
- Below `lg`, selecting an item calls `detailHeadingRef.current?.focus()` + `scrollIntoView({ block: 'start' })` (spec "Mobile selection"). The detail heading is `h2` with `tabIndex={-1}`.
- The ladder's ascending heights (210 / 250 / 290…) are decorative: tiles use `min-h` steps of 40px capped at 5 steps, bottom-aligned with `items-end`, and wrap to a 2-column grid below `md`.

### 8. Level reorder without a server function
`moveNivel(id, 'antes' | 'despues')` swaps with the neighbour using three updates because `orden` is unique and `> 0`:
1. `A.orden = max(orden) + 1` (temporary, unique, positive);
2. `B.orden = a`;
3. `A.orden = b`.

On any failure it reloads the levels from the server and raises the alert. Focus stays on the moved tile's corresponding "Mover" button (by id) after re-render. *Alternative*: drag-and-drop with a batch RPC. Rejected (no server changes; keyboard parity is simpler with buttons).

### 9. Plan card view model in a pure function
`buildPlanCardModel(plan)` (in `admin-catalogo.utils.ts`) returns:
- `modalidadLabel` (`Presencial` / `Virtual` / `Mixto` / `null`);
- `visibilidad`: `oculto` when `!visible_atletas` (wins), else `publico` / `privado` from `es_publico`;
- `estado`: from `getPlanEstado` → "Activo" (accent dot) for `activo` and `activo_no_visible`, "Inactivo" (neutral) for `inactivo`;
- `precio`: the cheapest active tipo → `{ valor: formatCop(precio), vigencia: '/ N d' }`, or `null` → "Sin precio";
- `subtipos`: active tipos sorted by precio: first as "Nombre · N d", others as "Nombre · $precio";
- `incluye`: distinct service names across active tipos (sorted) + `beneficios.split('|')` trimmed, non-empty.

`formatCop` from `eventos.utils.ts` is reused. The violet benefit icon uses the existing violet token (`text-grit-violet`), no hex.

### 10. Notifications timeline
`ordenarReglasTimeline(reglas)` → pre rules by `dias` desc, then pos rules by `dias` asc. Rendered as `<ol>` with tiles in a `grid sm:grid-cols-2 xl:grid-cols-3` (the frame's 3 tiles fit one row; up to 6 wrap). The chevrons between tiles are `aria-hidden` and only rendered at `xl` between tiles of the same row. Channel tags: "En la plataforma" (`canal_in_app`), "Email" (`canal_email`). Edit/delete become `GritIconButton size="sm" variant="ghost"` in the tile.

### 11. Configuración contact actions
Copy uses `navigator.clipboard.writeText` and writes "Correo copiado" / "Teléfono copiado" into a visually hidden `aria-live="polite"` region; if the Clipboard API is unavailable or rejects, the live region says "No se pudo copiar". Social and web values render the URL host+path (without protocol) as text, and `external-link` opens it. "Conectar" calls the same `openEdit` as the header CTA.

### 12. Settings rows and tags
All module statuses use `GritTag`:
- Activo / Activa: `accent dot`;
- Pausado / Inactivo / Inactiva: `neutral dot`;
- types / channels / tipo: `neutral` without dot.

Over photos (scenario cards) tags render as `GritOverlayPill` to stay legible. Row icon actions are `GritIconButton size="sm" variant="ghost"` with labels that include the record name.

## Risks / Trade-offs

- [Nine forms move to a new drawer shell at once] → The shell is built and checked first (task group 3). The forms keep their props and logic, and each module has a keyboard pass in its verification task.
- [The level swap is three requests and can fail halfway] → It reloads from the server on any error, so the UI never shows a state that isn't persisted. The temporary `max+1` can't collide with the unique index.
- [`getPlanes` on the services page is heavier than a count] → It's one query per page load, and the tenant plan count is small. It avoids a server change, and a count view stays a noted follow-up.
- [Frames show data we omit, so pages look emptier than the design] → Every omission is listed in the proposal Non-goals and in `DESIGN.md` §1, so the next story can pick them up.
- [Removing the plans table changes the read-only athlete view] → The card in read-only mode keeps "Adquirir" and the active-subtype rule. The `usuario` flow is checked end to end (open plan → Adquirir → modal).
- [Free-text `tipo` values could produce many filter options] → Above 5 groups the filter switches to a dropdown, so the row never overflows.
- [The athlete count includes inactive members] → The label says "Atletas con nivel", which is what the query measures.
- [Main specs `scenario-management`, `disciplines-management`, `discipline-levels-management`, `organization-view`, `payment-methods-management`, `plan-management` and `tenant-suspension-rules` use delta headers instead of `## Requirements`, so archive would refuse] → A task normalises their headers before archiving. That is a structural fix only, with no requirement text changed.

## Migration Plan

- Front-end only. Deploy with the usual Vercel flow; roll back by reverting the merge commit.
- No data migrations; nothing is pushed to the remote Supabase.
- After deploy, smoke-test with an administrator: edit the organization, toggle a notification rule, create and delete a scenario, select a discipline and move a level, toggle a service, duplicate and delete a plan. Then, as a `usuario`, open Planes and start "Adquirir".
- If `globals.css` is touched (not expected), run `rm -rf .next` before checking locally (Turbopack stale CSS).
