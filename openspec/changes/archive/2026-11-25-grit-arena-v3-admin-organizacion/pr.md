# Commit message

```
feat(admin): migrate organization settings, scenarios, disciplines, services and plans to grit-arena-v3

- gestion-organizacion (aYwNn): "Tu organización." header; identity card
  (banner cover, logo, Pública/Privada, Fundada, Miembros) and contact card
  (copy / open actions, "Conectar"); payment methods, suspension rules (with a
  suggested rule) and automatic notifications as settings sections; the
  notification rules become a timeline of tiles with an inline switch.
- gestion-escenarios (qG0T5): photo cards with tipo / status pills, type filter
  with counts, capacity / schedules summary, map action, "Agregar escenario"
  tile, delete with confirmation ("in use" explained).
- gestion-disciplinas (fXuVP): list + detail workspace with ?disciplina=,
  stats, athletes-per-level bar and a level ladder reordered with buttons.
- gestion-servicios (v8mqZG): status filter with counts, plan usage per
  service and an inline active switch.
- gestion-planes (J7Lw7d): plan cards for the admin and read-only views
  (modality, visibility, discipline chips, price from the cheapest active
  subtype, subtypes, services and benefits).
- Kit: GritSwitch, GritDrawer, GritConfirmDialog, GritAddTile, GritField
  (+ invalid input classes); GritSectionHeading icon, GritAvatar rounded,
  GritIconButton external, GritButton ref, GritCard HTML attributes.
- Every form of the module opens in GritDrawer; window.confirm and hand-rolled
  dialogs are replaced by GritConfirmDialog.
- Main specs of the touched capabilities normalised to a single Requirements
  section (no requirement text changed).
- Long requirement descriptions in this change's deltas split into
  single-behavior requirements (scenarios kept).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

# Pull request

**Title:** feat(admin): migrate the organization admin module to grit-arena-v3

## Summary

The five screens an administrator uses to set up the organization now follow their frames in `grit-arena-v3.pen`. The OpenSpec change `grit-arena-v3-admin-organizacion` has the full contract: proposal, design, and deltas for `services-management` (new), `organization-view`, `payment-methods-management`, `tenant-suspension-rules`, `tenant-notification-rules`, `scenario-management`, `disciplines-management`, `discipline-levels-management`, `plan-management`, `plan-duplication`, `plan-hidden-status` and `grit-design-system`.

Scope agreed for this change:
- **Front-end plus derived data only.** There are no migrations, RPCs or RLS changes. Frame elements without data are left out and listed under Follow-ups.
- **No analytics.** The Planes KPIs, revenue and sparkline, and the Servicios bottom panels are deferred.

### Configuración — `/portal/orgs/[tenant]/gestion-organizacion` (frame `aYwNn`)
- **Header**: "Tu *organización.*" with "Editar organización".
- **Identity card**:
  - banner cover and logo (an 18px-radius mark);
  - name and a Pública / Privada tag;
  - description;
  - "Fundada" and "Miembros" tiles. Miembros is a new head-count query; it shows "—" if the count fails.
- **Contact & social card**:
  - correo, teléfono and web in one column; Instagram, Facebook and X in the other;
  - copy actions for correo and teléfono, announced to screen readers;
  - open actions for web and social links, in a new tab with `noopener`;
  - empty items show "Conectar", which opens the edit drawer.
- **Settings sections**:
  - **Métodos de pago**: rows with a type tile and type / Activo·Pausado / QR tags.
  - **Reglas de suspensión**: with no rules, an empty state suggests "suspender tras 3 inasistencias" with "Usar", which prefills the create drawer.
  - **Notificaciones automáticas**: a chronological timeline of rule tiles, each with an inline `GritSwitch`. The switch is optimistic and rolls back if the save fails.
- Each section loads and fails on its own, with "Reintentar".

### Escenarios — `/gestion-escenarios` (frame `qG0T5`)
- **Header**: "Tus *escenarios.*" with search and "Crear escenario".
- **Filter row**: a type filter with counts, built from the free-text `tipo` and grouped ignoring case and accents. Above 5 types it becomes a dropdown. Next to it, the "N cupos totales" and "N horarios activos" summary.
- **Cards**:
  - 150px photo with tipo and status pills;
  - name, location, description;
  - capacity and "N horarios";
  - map, edit and delete actions. The map action opens a stored Waze/Maps link as-is, otherwise a Google Maps search.
- The grid ends with an "Agregar escenario" tile.
- **Delete** goes through a confirmation dialog. Foreign-key violations now map to "tiene entrenamientos o eventos asociados".

### Disciplinas — `/gestion-disciplinas` (frame `fXuVP`)
- **List** (left): "N DISCIPLINAS" with an Activas / Todas filter. Each item shows its icon, name and "N niveles · N atletas".
- **Detail** (right):
  - name, status tag, description, Editar and delete;
  - "Atletas con nivel" and "Niveles activos".
- **Ladder**: a distribution bar, tiles "01…" with athletes per level, "Mover antes / después" buttons (keyboard-accessible, keeping focus), and a "Nivel 0N" add tile.
- The selection lives in `?disciplina=`. Levels are cached per discipline, so returning to one does not query again.
- On narrow screens the list and detail stack, and selecting a discipline focuses its detail heading.
- Deleting a discipline with dependencies now explains why. Before, any FK other than trainings fell into a generic error.

### Servicios — `/gestion-servicios` (frame `v8mqZG`)
- **Header**: "Tus *servicios.*" with search and "Nuevo servicio".
- **Filter**: Todos / Activos / Inactivos with counts.
- **Table**: SERVICIO · PLANES · ACTIVO · actions.
  - PLANES counts distinct plans, derived from `getPlanes`.
  - ACTIVO is an inline switch with rollback.
  - Delete keeps the "used by plans" guard.

### Planes — `/gestion-planes` (frame `J7Lw7d`)
- **Admin**: cards showing:
  - modality, visibility (Público / Privado / Oculto) and Activo / Inactivo;
  - discipline chips;
  - price from the cheapest active subtype ("Sin precio" when there is none);
  - subtype rows;
  - INCLUYE: services and benefits;
  - edit / duplicate / delete.
- **Usuario / entrenador**: the same cards without admin actions. "Adquirir" (usuario only) opens the existing `SuscripcionModal`.
- Delete uses `GritConfirmDialog` instead of `window.confirm`.

### Kit (`src/components/ui/grit`)
- **New**:
  - `GritSwitch`;
  - `GritDrawer` and `GritConfirmDialog`, which share `useGritDialogFocus` (focus in, Tab trap, Escape, focus return, busy);
  - `GritAddTile`;
  - `GritField` + `gritDescribedBy`;
  - `gritInputInvalidClass` / `gritSelectInvalidClass` / `gritFileInputClass`.
- **Extended** (additive):
  - `GritSectionHeading icon`;
  - `GritAvatar shape="rounded"` and size 56;
  - `GritIconButton external`;
  - `GritButton ref`;
  - `GritCard` HTML attributes.
- `DESIGN.md` §1/§4/§9 updated.

## UX changes to review
- Page titles are now in Spanish ("Tu organización.", "Tus escenarios.", …).
- Notification rules are tiles in a timeline, no longer grouped rows. The channel label is "Email".
- Disciplines: the table with expandable rows is replaced by the list + detail workspace.
- Plans: the table is replaced by cards in both the admin and the read-only views.
- Services: the frame's one-item "⋯" menu became a direct delete action.
- All forms open in the kit drawer. Booleans are switches instead of checkboxes.

## Follow-ups
- Analytics: Planes KPIs, revenue per plan with sparkline and subscribers; Servicios "Más usados este mes" and "Tiqueteras por agotarse".
- Data the model lacks:
  - service type, discipline, quota and price;
  - level descriptions and "Ascenso automático";
  - sessions per week and attendance;
  - scenario "Mantenimiento" status;
  - organization sede and category;
  - the WhatsApp channel;
  - a public organization page ("Ver perfil público").
- A counts view or RPC (members, athletes per level, plan usage) if tenants grow.
- Pre-existing lint errors outside this change (`set-state-in-effect` in `formularios`, `gestion-equipo`, `gestion-suscripciones`, `SuscripcionModal`, `usePlanTipoServicios`, `useTenantLogo`) and the `tsc` errors in `videos/rrss`.
- Pre-existing long requirement descriptions in the normalised main specs (strict-validation warnings).

## Test plan
- [x] `npx tsc --noEmit`: no errors in app code (2 pre-existing in `videos/rrss`).
- [x] `npm run lint`: no errors or warnings in the files of this change.
- [x] `openspec validate grit-arena-v3-admin-organizacion --strict`: valid, with no archive notices.
- [x] Pure helpers (`admin-catalogo.utils.ts`): 26 scratch checks covering timeline order, type grouping, summary, map URL, level helpers, plan counts and the plan card model.
- [x] Kit on a scratch page:
  - switch with Space / Enter / disabled;
  - drawer focus, Tab trap, busy and full width at 375;
  - confirm dialog initial focus and pending state.
- [x] Per page, in the browser against local Supabase (data restored):
  - Configuración: copy, open link, "Conectar", the edit drawer save and focus return, the payment-method delete dialog, the notification switch (persisted, restored, offline rollback), and the suggested suspension rule.
  - Escenarios: type counts and filter, summary, accent-insensitive search, map link, "in use" delete, successful delete, create with a schedule.
  - Disciplinas: order, meta counts, URL selection (reload, unknown id), no refetch on return, level move persisted and restored, next `orden`, blocked delete, mobile focus.
  - Servicios: counts, plan usage, filter + search, create, duplicate name, switch with offline rollback, "in use" delete.
  - Planes: card content, duplicate "Copia de", edit persisted and restored, blocked delete, the usuario "Adquirir" flow, and entrenador read-only.
- [x] 375 / 768 / 1440: one `h1` and no horizontal scroll on all five routes.
- [ ] Visual check of the discipline chips on plan cards. They were added after the dev server was stopped; type-checked and linted only.
