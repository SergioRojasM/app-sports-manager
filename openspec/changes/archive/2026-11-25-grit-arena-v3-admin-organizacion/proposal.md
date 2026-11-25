# Proposal

> Source: user request (2026-11-25): "Crea un cambio para migrar el módulo de administración de la organización a la nueva visual. Administración-configuración (Node ID: aYwNn), administración escenarios (Node ID: qG0T5), administración-Disciplinas (Node ID: fXuVP), administración-Servicios (Node ID: v8mqZG) y administración-planes (Node ID: J7Lw7d)". `DESIGN.md` §1 maps these frames to `orgs/[tenant_id]/gestion-organizacion`, `gestion-escenarios`, `gestion-disciplinas`, `gestion-servicios` and `gestion-planes`. The migration contract is `DESIGN.md` §10 and §12. The archived change `2026-11-24-grit-arena-v3-eventos-checkin` is the reference for scope and conventions.
>
> Scope decisions taken with the user (2026-11-25):
> - **Front-end + derived data only.** No migrations, RPCs, columns or RLS changes. A frame element is built when its data already exists or can be derived with a read-only query of existing tables; otherwise it is omitted and listed as a follow-up.
> - **No analytics.** The Planes KPI row, the per-plan revenue / sparkline / subscriber stack, and the Servicios bottom panels ("Más usados este mes", "Tiqueteras por agotarse") are deferred.

## Why

The five screens an administrator uses to set up the organization still use v2 markup:
- English page titles ("Organization Management", "Sports Disciplines") and plain `GritPageHeader` titles without the v3 accent;
- `rounded-grit-md` buttons, `bg-grit-glass` boxes, emerald/amber success and status colours, and `uppercase tracking` table headers;
- hand-rolled loading / empty / error boxes and copy-pasted success banners;
- tables where the frames draw cards (Escenarios, Planes) or a master–detail workspace (Disciplinas);
- a different hand-rolled right-side drawer in every module (scenario, discipline, level, service, plan, organization edit).

The v3 frames redesign them as one coherent "settings" module:
- **Configuración** (`aYwNn`): an identity card with cover and logo, a contact & social card, and settings sections for payment methods, suspension rules and automatic notifications;
- **Escenarios** (`qG0T5`): photo cards with type and status pills, a type filter with counts, and an "Agregar escenario" tile;
- **Disciplinas** (`fXuVP`): a discipline list on the left and a detail panel on the right with stats and the level ladder;
- **Servicios** (`v8mqZG`): a v3 table with plan usage and an inline active switch;
- **Planes** (`J7Lw7d`): plan cards with modality / visibility / status tags, price, subtypes and included services.

Migrating them together finishes the administrator's setup flow in one release, and lets the module share one drawer, one switch and one "add" tile instead of six copies.

## What Changes

### Kit (`src/components/ui/grit`)
- **New** `GritSwitch`: 36×20 pill toggle (`role="switch"`, `aria-checked`, required `label`), as drawn in the notification rules (`aYwNn`), the service rows (`v8mqZG`) and the level rule (`fXuVP`).
- **New** `GritDrawer`: right-side panel shell following §9 "Modals and drawers": backdrop, `GritCard variant="glass"` panel, `GritSectionHeading` title with `aria-labelledby`, close `GritIconButton`, scrollable body, sticky footer, Escape / click-outside / focus capture and return, `busy` blocks closing. It replaces the six hand-rolled drawers.
- **New** `GritConfirmDialog`: small centered dialog (title, message, confirm `danger` button, cancel) on the same modal pattern. It replaces the `window.confirm` calls of the module.
- **New** `GritAddTile`: dashed "add" tile (round icon ring, title, subtitle) used by "Agregar escenario" (`SmgQv`) and "Nivel 0N" (`siF01`).
- `GritSectionHeading` gains `icon` (36px round chip with a 16px cyan icon), for the settings sections of `aYwNn`.
- `icon-map.ts` gains the design icons of these frames that are still missing (`gavel`, `list-x`, `sparkles`, `bell-ring`, `wallet`, `contact`, `at-sign`, `smartphone`, `alarm-clock`, `grip-vertical`, `signal`, `infinity`, `timer`, `clipboard-check`, `layers`, `repeat`, `gift`, `rocket`, `eye-off`, `lock`, `globe`, `waves`, `bike`, …).

### `/gestion-organizacion` (frame `aYwNn`)
- Header "Tu **organización.**" with "Editar organización" (primary `GritButton`, 37px as drawn, opens the edit drawer). The page title moves to Spanish. The frame's "Ver perfil público" button is omitted: there is no per-organization public page yet.
- **Identity card** (380): `banner_url` cover with the v3 shade, logo as `GritAvatar tone="org"` (or the logo image), name (Exo 2 24/500), a "Pública" / "Privada" `GritTag` from `tenants.publico` (the frame's category pill has no data), and meta tiles "Fundada" (`fecha_creacion`, "Mes AAAA") and "Miembros" (derived count). "Sede" is omitted (no column).
- **Contact & social card** (720): `GritSectionHeading` with icon and a "Perfil público" pill; a two-column grid of items (correo, teléfono, sitio web, Instagram, Facebook, X). Each item has a copy (`copy`) or open (`external-link`) action. Empty social links show "Conectar", which opens the edit drawer.
- **Métodos de pago**, **Reglas de suspensión** and **Notificaciones automáticas** become settings sections (`GritCard card` + `GritSectionHeading icon` + "Agregar" `outline-accent sm`):
  - payment methods: list rows with a type icon tile, name, `GritTag`s (type, Activo / Pausado, QR), and `GritIconButton` actions (open URL, edit, delete);
  - suspension rules: list rows; the empty state gains the suggested rule "Sugerida: suspender tras 3 inasistencias seguidas" with "Usar", which opens the create drawer prefilled;
  - notifications: the two groups become a horizontal timeline of rule tiles ("3 días / antes del vencimiento", "Día 0", "2 días / después"), each with the recipients title, channel `GritTag`s ("Email", "En la plataforma") and an inline `GritSwitch` for `activo`. Edit / delete move to the tile's actions.
- `EditTenantDrawer` and the three rule/method form modals move onto `GritDrawer` with v3 fields (`gritInputClass`, §9 "Forms").
- **BREAKING (UX)**: the page title changes from "Organization Management" to "Tu organización."; rows lose their coloured text badges in favour of `GritTag`; the notification rules render as tiles instead of grouped rows.

### `/gestion-escenarios` (frame `qG0T5`)
- Header "Tus **escenarios.**" with a `GritSearchField` ("Buscar por nombre o ubicación…") and "Crear escenario" (primary `GritButton`, 37px as drawn; the same size is used by the CTAs of the other four frames).
- Filter row: `GritSegmented` with counts over the distinct `tipo` values (Todos + up to 5 most used; a `GritPillSelect` takes over above that), and a summary "N cupos totales" (sum of `capacidad`) · "N horarios activos" (count of `disponible` schedules).
- Cards in a 3-column grid (`GritMediaCard`, 150px photo from `image_url`): tipo and status `GritTag`s (Activo / Inactivo), name (Exo 2 19/500), location, description (2 lines), footer stats (capacity, "N horarios" / "Sin horarios") and actions: map (only when `coordenadas` or `direccion` exist, opens Google Maps in a new tab), edit, delete.
- **New**: delete with `GritConfirmDialog`, using the existing `scenariosService.deleteScenario`. The "Agregar escenario" tile closes the grid.
- `ScenarioFormModal` moves onto `GritDrawer`.

### `/gestion-disciplinas` (frame `fXuVP`)
- Header "Tus **disciplinas.**" with search and "Nueva disciplina".
- **Workspace**: a 380px list panel + a detail panel.
  - List: "N DISCIPLINAS" overline + `GritSegmented` (Activas / Todas); rows with the discipline icon tile (`disciplina-visual.ts`), name, meta "N niveles · N atletas", and a chevron. The selected row is tinted. A tip line closes the panel.
  - Detail: big icon, name (Exo 2 30/300) + Activa / Inactiva `GritTag`, description, "Editar" and delete; a stats row with "Atletas con nivel" and "Niveles activos" (derived); "Niveles de progresión" with "Agregar nivel"; a distribution bar of athletes per level; and the **level ladder**: ascending tiles ("01", name, "N atletas", edit and reorder controls) and a "Nivel 0N" `GritAddTile`.
  - Reordering uses the existing `orden` field through "Mover antes / después" buttons (keyboard-accessible). The frame's drag handle is shown as the control's icon only.
- Selection is kept in `?disciplina=` so it survives reloads. Below `lg` the list and the detail stack, and selecting a row scrolls to the detail.
- **BREAKING (UX)**: the table with an inline expandable levels panel is replaced by the list + detail workspace. Columns "Category" / "Status" become the list meta and the detail tag.

### `/gestion-servicios` (frame `v8mqZG`)
- Header "Tus **servicios.**" with search and "Nuevo servicio".
- Filter row: `GritSegmented` with counts (Todos / Activos / Inactivos; the frame's type tabs have no data) and the hint "Los servicios se agrupan dentro de tus planes".
- Table on `gritTable*` classes: SERVICIO (icon tile, name, description), PLANES (count bubble + "plan" / "planes", derived from the `plan_tipos_servicios` already embedded by `planesService.getPlanes`), ACTIVO (`GritSwitch`, updates `activo` inline with optimistic rollback) and actions (edit, delete — a direct ghost action instead of the frame's one-item `ellipsis` menu). Columns TIPO, DISCIPLINA, CUPO and PRECIO are omitted (no data).
- Delete keeps the existing `referenced_by_plan_tipos` guard, now through `GritConfirmDialog` and `GritAlert`.
- `ServicioFormModal` moves onto `GritDrawer`.

### `/gestion-planes` (frame `J7Lw7d`)
- **Administrator** (`PlanesPage`): header "Planes de **membresía.**" with search and "Nuevo plan"; a `GritAlert` toast for success messages; a 4-column grid of plan cards:
  - top: modality `GritTag` (Presencial / Virtual / Mixto), a visibility pill (`globe` Público, `lock` Privado, `eye-off` Oculto) and the estado `GritTag` (Activo / Inactivo);
  - name (Exo 2 22/500), discipline chips (kept from the old Disciplines column; not in the frame), price "desde" the cheapest active subtype (Exo 2 34/300) + "/ N d";
  - subtype rows ("Mensual · 30 d", "Trimestral · $330.000");
  - "INCLUYE": services of the active subtypes (`circle-check`) and `beneficios` (`gift`, violet);
  - footer actions: edit, duplicate, delete.
- **Usuario / entrenador** (`PlanesViewPage`): the same card in read-only mode, with "Adquirir" for `usuario` when the plan has active subtypes. Its page header becomes v3 as well.
- `PlanFormModal` moves onto `GritDrawer`; plan deletion uses `GritConfirmDialog` instead of `window.confirm`.
- **BREAKING (UX)**: the plans table (`PlanesTable`) is replaced by cards in both views.

### All five pages
- Exactly one `h1` per page, from `GritPageHeader` with the v3 accent title.
- Loading, empty and error states go through `GritEmptyState`; errors offer "Reintentar". Mutation feedback goes through `GritAlert`.
- The §11 v3 grep returns nothing on `src/components/portal/{tenant,scenarios,disciplines,servicios,planes}` (except `tenant/` files used only by the public org pages, listed in design.md).

## Non-goals

- **Analytics** (user decision): Planes KPI row (planes activos, suscriptores, ingreso mensual, ticket promedio), per-plan "Ingreso / mes" + sparkline + subscriber avatars, and the Servicios panels "Más usados este mes" and "Tiqueteras por agotarse" (+ "Notificar").
- **Data the model does not have** (follow-ups): service type / discipline / quota / price; level descriptions and the "Ascenso automático" rule; "Sesiones / semana" and "Asistencia promedio"; scenario "Mantenimiento" status; organization "Sede" and category; the "Ver perfil público" button (no public organization page); the WhatsApp channel and the "Deshacer" action of the plan toast.
- Drag-and-drop reordering of levels (buttons cover the behavior).
- Any migration, RPC, RLS or schema change. Nothing is pushed to the remote Supabase.
- The public organization pages (`orgs/[tenant_id]` landing, marketplace cards) and the subscription purchase modal (`SuscripcionModal`), except for shared pieces they already import.

## Capabilities

### New Capabilities
- `services-management`: the administrator services catalogue at `gestion-servicios` (list, filters, plan usage, inline active switch, create / edit / delete). No spec owns this screen today.

### Modified Capabilities
- `organization-view`: the management page layout (v3 header, identity card with derived member count, contact & social card) and the page composition requirement.
- `payment-methods-management`: the methods list becomes v3 list rows with `GritTag`s and icon actions.
- `tenant-suspension-rules`: the card becomes a settings section with the suggested-rule empty state.
- `tenant-notification-rules`: the "Notificaciones automáticas" card renders rules as a timeline of tiles with an inline active switch.
- `scenario-management`: v3 header, type filter with counts and summary, photo cards, map action, delete with confirmation, and the add tile.
- `disciplines-management`: the table + expandable row is replaced by the list + detail workspace with derived stats and `?disciplina=` selection.
- `discipline-levels-management`: the levels panel becomes the level ladder with athletes per level, distribution bar and button reordering.
- `plan-management`: the plans table is replaced by plan cards (admin and read-only views).
- `plan-duplication`: "Duplicar" moves from a table row to the plan card (absent in read-only cards).
- `plan-hidden-status`: the "Activo no visible" table badge becomes the card's "Oculto" visibility pill.
- `grit-design-system`: new switch, drawer, confirm dialog and add-tile primitives, and the section heading icon.

## Impact

- **UI**: `src/components/portal/{tenant,scenarios,disciplines,servicios,planes}/*` (management files) and `src/components/ui/grit/*` (new primitives, `GritSectionHeading`, `index.ts`, `icon-map.ts`).
- **Hooks**: new `useTenantMiembrosCount`, `useReglasNotificacion` (+ `toggleActivo`), `useScenarios` (+ tipo filter, summary, delete), `useDisciplines` (+ selection, counts), `useNivelesDisciplina` (+ athletes per level, `moveNivel`), `useServicios` (+ status filter, plan counts, `toggleActivo`), `usePlanes` / `usePlanesView` (+ card view model, confirm delete).
- **Services (read-only additions)**: `tenantService.countMiembros`, `usuarioNivelDisciplinaService.countAtletasPorNivel`. Plan usage per service reuses `planesService.getPlanes`. Error mapping: `scenariosService.deleteScenario` maps FK violations to an "in use" error. Mutations reuse existing functions (`deleteScenario`, `updateServicio`, `updateRegla`, `updateNivelDisciplina`).
- **Lib**: new `src/lib/portal/admin-catalogo.utils.ts` (tipo grouping, scenario summary, plan card model, price / vigencia labels).
- **Dependencies**: none new.
- **Docs**: `DESIGN.md` (§1 frames marked migrated with their omissions, §4 kit rows, §9 drawer/confirm notes) and `projectspec/03-project-structure.md`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` | Compose `GestionOrganizacionPage` (header + sections) |
| Page | `.../(administrador)/gestion-escenarios/page.tsx`, `gestion-disciplinas/page.tsx`, `gestion-servicios/page.tsx`, `(shared)/gestion-planes/page.tsx` | Unchanged (disciplinas wraps in `Suspense` for `?disciplina=`) |
| Component (kit) | `src/components/ui/grit/GritSwitch.tsx`, `GritDrawer.tsx`, `GritConfirmDialog.tsx`, `GritAddTile.tsx` | New |
| Component (kit) | `src/components/ui/grit/GritSectionHeading.tsx` | `icon` prop |
| Component (kit) | `src/components/ui/grit/index.ts`, `icon-map.ts` | Exports; new icons |
| Component | `src/components/portal/tenant/GestionOrganizacionPage.tsx` | New: v3 header + tools + rows |
| Component | `src/components/portal/tenant/TenantInfoCards.tsx`, `TenantIdentityCard.tsx`, `TenantContactCard.tsx` | v3 identity + contact cards |
| Component | `src/components/portal/tenant/EditTenantDrawer.tsx`, `EditTenantForm.tsx` | `GritDrawer` + v3 fields |
| Component | `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`, `MetodoPagoFormModal.tsx` | Settings section + list rows; `GritDrawer` |
| Component | `src/components/portal/tenant/TenantReglasSuspensionCard.tsx`, `ReglaSuspensionFormModal.tsx` | Settings section + suggested rule; `GritDrawer` |
| Component | `src/components/portal/tenant/TenantReglasNotificacionCard.tsx`, `ReglaNotificacionFormModal.tsx` | Timeline tiles + `GritSwitch`; `GritDrawer` |
| Component | `src/components/portal/scenarios/ScenariosPage.tsx`, `ScenariosHeaderFilters.tsx`, `ScenarioCard.tsx`, `ScenarioFormModal.tsx` | v3 header, filter row, media card, add tile, confirm; `GritDrawer` |
| Component | `src/components/portal/disciplines/DisciplinesPage.tsx` | Workspace (list + detail) |
| Component | `src/components/portal/disciplines/DisciplinesList.tsx`, `DisciplineDetail.tsx`, `NivelesLadder.tsx` | New (replace `DisciplinesTable`, `NivelesDisciplinaPanel`) |
| Component (delete) | `src/components/portal/disciplines/DisciplinesTable.tsx`, `NivelesDisciplinaPanel.tsx`, `DisciplinesHeaderFilters.tsx` | Remove |
| Component | `src/components/portal/disciplines/DisciplineFormModal.tsx`, `NivelDisciplinaFormModal.tsx` | `GritDrawer` |
| Component | `src/components/portal/servicios/ServiciosPage.tsx`, `ServiciosTable.tsx`, `ServicioFormModal.tsx` | v3 header, filters, table, switch; `GritDrawer` |
| Component | `src/components/portal/planes/PlanesPage.tsx`, `PlanesViewPage.tsx`, `PlanesRolePage.tsx` | v3 header, alerts, card grid, states |
| Component | `src/components/portal/planes/PlanCard.tsx` | New (admin + read-only modes) |
| Component (delete) | `src/components/portal/planes/PlanesTable.tsx`, `PlanesHeaderFilters.tsx` | Remove |
| Component | `src/components/portal/planes/PlanFormModal.tsx`, `PlanTipoServiciosSection.tsx` | `GritDrawer` + v3 fields |
| Hook | `src/hooks/portal/tenant/useTenantMiembrosCount.ts` (new), `useReglasNotificacion.ts` | Member count; `toggleActivo` |
| Hook | `src/hooks/portal/scenarios/useScenarios.ts` | Tipo filter + counts, summary, delete |
| Hook | `src/hooks/portal/disciplines/useDisciplines.ts` | Status filter, selection via URL, per-discipline counts |
| Hook | `src/hooks/portal/nivel-disciplina/useNivelesDisciplina.ts` | Athletes per level, `moveNivel` |
| Hook | `src/hooks/portal/servicios/useServicios.ts` | Status filter + counts, plan counts, `toggleActivo` |
| Hook | `src/hooks/portal/planes/usePlanes.ts`, `usePlanesView.ts` | Card view model, confirm-dialog delete |
| Service | `src/services/supabase/portal/tenant.service.ts` | `countMiembros(tenantId)` |
| Service | `src/services/supabase/portal/scenarios.service.ts` | `deleteScenario` maps `23503` to an "in use" error |
| Service | `src/services/supabase/portal/usuario-nivel-disciplina.service.ts` | `countAtletasPorNivel(tenantId)` |
| Lib | `src/lib/portal/admin-catalogo.utils.ts` | New |
| Types | `src/types/portal/{tenant,scenarios,disciplines,servicios,planes}.types.ts` | View-model types (`ScenarioTipoOption`, `ServicioRow`, `PlanCardModel`, …) |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch `feat/grit-arena-v3-admin-organizacion` from `develop`. Take "before" screenshots of the five routes at 375 / 768 / 1440 and export the five frames as PNG.
2. **Kit first**: `GritSwitch`, `GritDrawer`, `GritConfirmDialog`, `GritAddTile`, `GritSectionHeading icon`, icons. Check them on a scratch page.
3. **Configuración**: services/hooks (member count, `toggleActivo`), then the header, identity and contact cards, the three settings sections, and the four drawers.
4. **Escenarios**: lib helpers + hook (tipo filter, summary, delete), filter row, cards, add tile, confirm, drawer.
5. **Disciplinas**: count service + hooks (selection, athletes per level, `moveNivel`), list, detail, ladder, drawers; delete the table and panel.
6. **Servicios**: plan-count service + hook (filter, switch), table, confirm, drawer.
7. **Planes**: card model + `PlanCard`, admin and read-only pages, confirm, drawer; delete the table.
8. Verify each frame at 1440 and stacking at 768 / 375 (no horizontal scroll, one `h1`), keyboard pass (switches, drawers, dialogs, segmented, reorder), and the §11 greps. Run `npm run lint`, `npx tsc --noEmit` and the tests. Never `npm run build`.
9. Update `DESIGN.md` and `03-project-structure.md`, then write the commit message and PR description.
