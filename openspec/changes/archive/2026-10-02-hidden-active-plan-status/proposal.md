## Why

Administrators need internal plans (courtesy, sponsorship, staff) that they assign to athletes themselves. Today every active plan is visible to and purchasable by every member of the tenant, and the only way to hide a plan (`activo = false`) also removes it from the admin "Crear suscripción" picker. Source: `projectspec/userstory/us0126-hidden-active-plan-status.md` (US-0126).

## What Changes

- Add a third plan status, **"Activo no visible"**: the plan is active and assignable by an administrator, but athletes cannot see or acquire it.
- New column `planes.visible_atletas boolean not null default true`; `activo` is kept. The UI status is derived: Activo (`activo`, visible), Activo no visible (`activo`, not visible), Inactivo (`!activo`).
- A hidden plan can never be public: check constraint `visible_atletas or not es_publico`, and the "Plan público" checkbox is disabled in the form.
- RLS: `planes_select_authenticated` and `can_read_plan` hide non-visible plans (and their subtypes, disciplines, plan-services) from athlete members and non-members; trainers, admins and existing subscription holders keep read access. `can_subscribe_to_plan` rejects self-service subscriptions to hidden plans.
- Plan form: the "Plan activo" checkbox is replaced by an "Estado" select with three options.
- Plans table: third badge variant "Activo no visible" (amber + `visibility_off` icon).
- Athlete/trainer plan catalog and the "Ver planes" organization modal exclude hidden plans.
- Admin "Crear suscripción" and "Editar suscripción" plan pickers include hidden plans, labelled "{nombre} (No visible)".

## Non-goals

- A dedicated "courtesy" subscription type, automatic payment validation or zero-price shortcuts — the existing admin creation flow is used unchanged.
- Hiding individual subtypes (`plan_tipos`).
- BI/analytics changes: subscriptions of hidden plans count like any other.
- Changing `entrenamientos.service.ts → listPlanOptions` (admin/trainer only).
- New pages or new components — only existing components are modified, so no new design file is required; the changes reuse the current form controls and badge styles.

## Capabilities

### New Capabilities
- `plan-hidden-status`: the "Activo no visible" plan status — data model, database-enforced visibility and purchase rules, admin form/table behavior, catalog exclusion, and admin-only assignment through subscription management.

### Modified Capabilities
<!-- None: existing plan-management / subscription-management requirements keep their behavior for visible plans; the new rules are additive and live in plan-hidden-status. -->

## Impact

**Database** (local only — never pushed to the remote Supabase project)
- `supabase/migrations/20261005120000_planes_visible_atletas.sql` — new: column, check constraint, `planes_select_authenticated`, `can_read_plan`, `can_subscribe_to_plan`.
- `supabase/seed.sql` — optional hidden "Cortesía" plan for local testing.

**Files to modify** (page → component → hook → service → types)
- Page: none (`gestion-planes/page.tsx` and `gestion-suscripciones/page.tsx` unchanged).
- Components:
  - `src/components/portal/planes/PlanFormModal.tsx` — "Estado" select, "Plan público" lock + helper texts.
  - `src/components/portal/planes/PlanesPage.tsx` — wire `setEstado`.
  - `src/components/portal/planes/PlanesTable.tsx` — three-variant status badge.
  - `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx` — "(No visible)" suffix.
  - `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` — suffixed label.
- Hooks:
  - `src/hooks/portal/planes/usePlanForm.ts` — `visible_atletas` default/load/duplicate, `setEstado`.
  - `src/hooks/portal/planes/usePlanes.ts` — `estado` in table item, payloads, expose `setEstado`.
  - `src/hooks/portal/planes/usePlanesView.ts` — filter `activo && visible_atletas`.
  - `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`, `useEditarSuscripcion.ts` — carry `visible_atletas` / label.
- Service: `src/services/supabase/portal/planes.service.ts` — columns, create/update, catalog filters, `23514` mapping.
- Types: `src/types/portal/planes.types.ts` — `visible_atletas`, `PlanEstado`, `getPlanEstado`, `PLAN_ESTADO_LABELS`.
- Docs: `projectspec/03-project-structure.md`.

**Implementation plan**
1. Branch `feat/hidden-active-plan-status` from `develop`.
2. Migration; apply locally; verify RLS per role with SQL.
3. Types → service → hooks → components.
4. Manual verification of the acceptance criteria in US-0126.
5. Type-check, lint, tests; update docs; commit message and PR description.

**Dependencies**: none new.
