# US-0126 — "Activo no visible" Plan Status for Courtesy Subscriptions

## ID
US-0126

## Name
Add an "Activo no visible" plan status — an active plan that athletes can neither see nor acquire, and that only an administrator can assign through "Crear suscripción".

## As a
Tenant administrator

## I Want
To mark a plan as "Activo no visible"

## So That
I can keep internal plans (courtesy, sponsorship, staff) that I assign to athletes myself, without those plans showing up in any catalog or being purchasable by athletes.

---

## Description

### Current State
- `planes` has two independent flags: `activo boolean` (shown as the "Plan activo" checkbox and the Activo / Inactivo badge) and `es_publico boolean` (US-0093, "Plan público" checkbox).
- Every active plan of a tenant is visible to and purchasable by every member of that tenant:
  - `planes_select_authenticated` lets any member read all plans of the tenant.
  - `can_subscribe_to_plan` lets any member subscribe to any `activo` plan of the tenant.
  - The athlete/trainer catalog (`usePlanesView`) and the organization catalog modal (`planesService.getPlanesMiembro`) filter only by `activo`.
- An administrator who wants a courtesy plan has no way to keep it out of the athletes' catalog: the only alternative is `activo = false`, which also removes it from the "Crear suscripción" plan picker.

### Proposed Changes

#### Status model
The plan status shown in the UI becomes a three-value state derived from two columns. `activo` is kept as is (many SQL functions, BI facts and queries depend on it); a new column `visible_atletas` is added.

| UI status | `activo` | `visible_atletas` | Athletes see / acquire | Admin can assign |
|-----------|----------|-------------------|------------------------|------------------|
| Activo | `true` | `true` | Yes | Yes |
| Activo no visible | `true` | `false` | No | Yes |
| Inactivo | `false` | unchanged | No | No |

Rules:
- A plan with `visible_atletas = false` cannot be public: `es_publico` is forced to `false` (UI) and rejected by a check constraint (DB).
- Setting a plan to Inactivo does not modify `visible_atletas`. When an inactive plan is edited, the admin explicitly picks Activo or Activo no visible to reactivate it.
- Existing plans are migrated to `visible_atletas = true` (no behavior change).
- Duplicating a plan copies its status, including "Activo no visible".

#### Who can see a hidden plan
| Actor | Hidden plan (`visible_atletas = false`) |
|-------|------------------------------------------|
| Administrator of the tenant | Full read/write in `gestion-planes`; selectable in "Crear suscripción" and "Editar suscripción" |
| Trainer of the tenant | Readable at RLS level (so the plan name still resolves in `gestion-reservas` and reports), but NOT listed in the trainer's read-only plans catalog |
| Athlete (`usuario`) member | Not readable, not purchasable — unless they hold a subscription to it (next row) |
| Any user holding a subscription to the plan | Plan, subtypes and services stay readable through the existing "already subscribed" RLS branch, so "Mis Suscripciones", Inicio and bookings keep showing the plan name and service balances. They still cannot acquire it again themselves |
| Non-member | Not readable (it can never be public) |

#### UI — Plan form (`PlanFormModal`)
- Replace the "Plan activo" checkbox with a labelled `<select id="plan-estado">` "Estado" with options: `Activo`, `Activo no visible`, `Inactivo`.
- Helper text under the select when "Activo no visible" is selected: "Los atletas no pueden ver ni adquirir este plan. Solo un administrador puede asignarlo desde Gestión de suscripciones."
- When "Activo no visible" is selected: uncheck and disable the "Plan público" checkbox and show "Un plan no visible no puede ser público." below it. Switching back to Activo re-enables the checkbox (it stays unchecked).
- Default for a new plan: `Activo`.

#### UI — Plans table (`PlanesTable`)
- Status badge gets a third variant: label "Activo no visible", amber styling (`border-amber-400/40 bg-amber-900/25 text-amber-200`) with the `visibility_off` Material Symbol (`aria-hidden`), so the state is not conveyed by color alone.
- Visibilidad column (admin only) keeps showing "Privado" for hidden plans.

#### UI — Athlete / trainer catalogs
- `PlanesViewPage` (role `usuario` and `entrenador`): hidden plans are not listed.
- `PlanesPublicosModal` ("Ver planes" on organization cards, member and non-member): hidden plans are not listed.
- If the tenant only has hidden plans, the existing empty states are shown unchanged.

#### UI — Admin subscription management
- `CrearSuscripcionModal` plan picker: lists Activo and Activo no visible plans; hidden plans are suffixed with " (No visible)".
- `EditarSuscripcionModal` plan select: same list and suffix.
- No change to the payment step: a courtesy subscription is created with the existing flow (the admin picks the subtype, whose price may be 0). Changing payment handling for courtesy subscriptions is out of scope.

#### Out of scope
- A dedicated "courtesy" subscription type, automatic payment validation or zero-price shortcuts.
- Hiding individual subtypes (`plan_tipos`).
- Changes to BI/analytics: subscriptions of hidden plans count like any other.
- `entrenamientos.service.ts → listPlanOptions` (admin/trainer only, deprecated plan restriction) is left unchanged.

---

## Database Changes

One migration: `supabase/migrations/20261005120000_planes_visible_atletas.sql` (wrapped in `begin; … commit;`). No new tables.

### 1. Column + constraint
```sql
alter table public.planes
  add column if not exists visible_atletas boolean not null default true;

comment on column public.planes.visible_atletas is
  'When false and activo, the plan is "Activo no visible": athletes cannot read or acquire it; only tenant administrators assign it. US-0126.';

alter table public.planes
  add constraint planes_no_visible_no_publico_ck
  check (visible_atletas or not es_publico);
```
No index needed (plans per tenant are few; queries already filter by `tenant_id`).

### 2. `planes_select_authenticated` (replace)
Keep the predicate over the row's OWN columns — do not call `can_read_plan(id)` here (see `20260728000300_fix_select_policies_returning.sql`: `INSERT … RETURNING` breaks otherwise).
```sql
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (
    (es_publico and activo and visible_atletas)
    or tenant_id in (
      select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t
    )
    or (
      visible_atletas
      and tenant_id in (
        select mt.tenant_id from public.get_member_tenants_for_authenticated_user() mt
      )
    )
    or id in (
      select s.plan_id from public.suscripciones s where s.atleta_id = auth.uid()
    )
  );
```
Verify the output column name of `get_trainer_or_admin_tenants_for_authenticated_user()` in `20260916120200_miembros_pendiente_activacion.sql` before writing the subquery.

### 3. `can_read_plan(p_plan_id)` (create or replace)
Same four branches as above, expressed over `planes p where p.id = p_plan_id`. This automatically hides subtypes, disciplines and plan-services of hidden plans from athletes, because `plan_tipos_select_authenticated`, `planes_disciplina_select_authenticated` and `can_read_plan_tipo` (→ `plan_tipos_servicios`) all delegate to it. Keep `stable security definer set search_path = public`.

### 4. `can_subscribe_to_plan(p_plan_id, p_tenant_id)` (create or replace)
Add `and p.visible_atletas` next to `and p.activo`. This is the `WITH CHECK` of `suscripciones_insert_own`, so a self-service insert for a hidden plan fails with `42501` even with a forged request.

### 5. Unchanged (state explicitly in the migration header)
- `suscripciones_insert_admin`: admins keep inserting subscriptions for any plan of their tenant — this is the path used to assign hidden plans.
- `planes_insert_admin_only` / `planes_update_admin_only` / delete policies.
- `servicios_select_authenticated`: its public branch requires `es_publico and activo`, which the new check constraint makes impossible for hidden plans.

### 6. Types
Regenerate / update Supabase types if the project keeps generated types for `planes`.

---

## API / Server Actions

No new routes or RPCs. Changes to existing client services:

**`src/services/supabase/portal/planes.service.ts`**
- `PLAN_COLUMNS` / `PlanRow` / `mapPlanRow`: add `visible_atletas`.
- `createPlan(input: CreatePlanInput)` / `updatePlan(input: UpdatePlanInput)`: persist `visible_atletas: input.visibleAtletas ?? true`; when `visibleAtletas === false` always send `es_publico: false`.
- `getPlanesPublicos(tenantId)` and `getPlanesMiembro(tenantId)`: add `.eq('visible_atletas', true)`. Returns `PlanWithDisciplinas[]`. (RLS is the real gate; the filter keeps an admin/trainer browsing the catalog modal from seeing hidden plans there.)
- `getPlanes(tenantId)`: unchanged query; returns hidden plans only to callers allowed by RLS (admin, trainer).
- Map constraint violation `23514` on `planes_no_visible_no_publico_ck` to the message "Un plan no visible no puede ser público."

**`src/services/supabase/portal/suscripciones.service.ts`** — no change: `createSuscripcion` already maps `42501` to `SuscripcionServiceError('plan_unavailable')`.

**`src/services/supabase/portal/gestion-suscripciones.service.ts`** — no change: `crearSuscripcionAdmin` goes through `suscripciones_insert_admin`.

Auth: all calls use the user session client; authorization is enforced by the RLS changes above.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261005120000_planes_visible_atletas.sql` | Column, check constraint, `planes_select_authenticated`, `can_read_plan`, `can_subscribe_to_plan` |
| Seed | `supabase/seed.sql` | Optional: one "Cortesía" plan with `visible_atletas = false` for local testing |
| Types | `src/types/portal/planes.types.ts` | `Plan.visible_atletas: boolean`; `PlanEstado = 'activo' \| 'activo_no_visible' \| 'inactivo'`; `CreatePlanInput.visibleAtletas?: boolean`; `PlanFormValues.visible_atletas: boolean`; `PlanTableItem.estado: PlanEstado`; export `getPlanEstado(plan)` and `PLAN_ESTADO_LABELS` |
| Service | `src/services/supabase/portal/planes.service.ts` | See API section |
| Hook | `src/hooks/portal/planes/usePlanForm.ts` | Default `visible_atletas: true`; load it in `setFormFromPlan` / `setFormForDuplicate`; new `setEstado(estado: PlanEstado)` that sets `activo` + `visible_atletas` and clears `es_publico` when hidden (Inactivo leaves `visible_atletas` untouched) |
| Hook | `src/hooks/portal/planes/usePlanes.ts` | `toTableItem`: `estado` + `statusLabel` from `PLAN_ESTADO_LABELS`; send `visibleAtletas` in create/update payloads; expose `setEstado` |
| Hook | `src/hooks/portal/planes/usePlanesView.ts` | Filter `p.activo && p.visible_atletas` |
| Hook | `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts` | Keep `activo` filter (hidden plans included); carry `visible_atletas` to the picker options |
| Hook | `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` | Same; option label gets " (No visible)" suffix |
| Component | `src/components/portal/planes/PlanFormModal.tsx` | Replace "Plan activo" checkbox with "Estado" select; disable "Plan público" + helper texts |
| Component | `src/components/portal/planes/PlanesPage.tsx` | Pass `setEstado` to the modal |
| Component | `src/components/portal/planes/PlanesTable.tsx` | Three-variant status badge driven by `row.estado` |
| Component | `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx` | " (No visible)" suffix on hidden plans in the plan picker |
| Component | `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` | Render the suffixed label |
| Docs | `projectspec/03-project-structure.md` | Update `planes.types.ts`, `planes.service.ts`, `PlanesTable`, `can_read_plan`, `can_subscribe_to_plan` entries |

---

## Acceptance Criteria

1. The plan form shows an "Estado" select with exactly `Activo`, `Activo no visible`, `Inactivo`; a new plan defaults to `Activo`.
2. Saving a plan as "Activo no visible" stores `activo = true`, `visible_atletas = false`, `es_publico = false`.
3. Selecting "Activo no visible" unchecks and disables "Plan público" and shows "Un plan no visible no puede ser público."
4. A direct DB update setting `es_publico = true` on a plan with `visible_atletas = false` fails with a check-constraint violation.
5. After the migration every pre-existing plan has `visible_atletas = true` and behaves exactly as before.
6. The admin plans table shows the amber "Activo no visible" badge with the `visibility_off` icon for hidden plans.
7. An athlete member does not see a hidden plan in `gestion-planes` nor in the "Ver planes" modal of the organization.
8. A trainer does not see a hidden plan in their `gestion-planes` catalog.
9. A non-member does not see a hidden plan in the "Ver planes" modal.
10. As an athlete member without a subscription to it, `select * from planes where id = '<hidden plan>'` returns 0 rows; the same for its `plan_tipos`, `planes_disciplina` and `plan_tipos_servicios`.
11. As an athlete, inserting a `suscripciones` row for a hidden plan with `atleta_id = auth.uid()` is rejected with `42501`; through the UI service this surfaces as the existing "plan no disponible" error.
12. In "Crear suscripción", the administrator sees hidden plans in the plan picker labelled "{nombre} (No visible)" and can complete the flow; the subscription and its `suscripcion_servicios` are created.
13. In "Editar suscripción", the administrator can change a subscription to a hidden plan.
14. Inactive plans do not appear in either admin picker, regardless of `visible_atletas`.
15. An athlete who was assigned a hidden plan sees its name, subtype and service balances in "Mis Suscripciones" and Inicio, and can book trainings that consume those services.
16. That same athlete still does not see the plan in any catalog and cannot acquire it again by themselves.
17. A trainer sees the hidden plan's name for that athlete's bookings in `gestion-reservas` and its CSV export.
18. Switching a hidden plan to Inactivo and reopening the form shows "Inactivo"; reactivating requires choosing Activo or Activo no visible explicitly, and the stored `visible_atletas` was not changed by the inactivation.
19. Switching a plan with existing athlete subscriptions from Activo to Activo no visible does not alter those subscriptions; their holders keep reading the plan.
20. Duplicating a hidden plan opens the form pre-set to "Activo no visible".
21. When a tenant's only active plans are hidden, athlete catalogs show their existing empty state.

---

## Implementation Steps

- [ ] Create migration `20261005120000_planes_visible_atletas.sql` and apply locally (`supabase db reset` or `migration up`)
- [ ] Verify with SQL as admin / trainer / athlete / subscribed athlete / non-member: criteria 4, 10, 11
- [ ] Update `planes.types.ts` (`PlanEstado`, `getPlanEstado`, `PLAN_ESTADO_LABELS`, new fields)
- [ ] Update `planes.service.ts` (columns, create/update, catalog filters, `23514` mapping)
- [ ] Update `usePlanForm.ts` (`setEstado`, defaults, duplicate) and `usePlanes.ts` (table item, payloads)
- [ ] Update `PlanFormModal.tsx` (Estado select, "Plan público" lock) and `PlanesPage.tsx` wiring
- [ ] Update `PlanesTable.tsx` badge
- [ ] Update `usePlanesView.ts` filter
- [ ] Update `useCrearSuscripcion.ts` / `CrearSuscripcionModal.tsx` and `useEditarSuscripcion.ts` / `EditarSuscripcionModal.tsx` labels
- [ ] Optional seed plan in `supabase/seed.sql`
- [ ] Manual test: happy path (create hidden plan → assign → athlete sees it only in Mis Suscripciones) + edge cases (criteria 14, 18–21)
- [ ] `npm run lint` and type-check
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: Hiding is enforced in the database, not only in the UI — `planes_select_authenticated`, `can_read_plan` (cascades to `plan_tipos`, `planes_disciplina`, `plan_tipos_servicios`) and `can_subscribe_to_plan` (`suscripciones_insert_own`). Only `suscripciones_insert_admin` can create a subscription to a hidden plan. The check constraint prevents a hidden plan from ever being public. Functions stay `security definer` with `set search_path = public`.
- **Performance**: No new indexes or queries; one extra boolean predicate in existing policies. `planes_select_authenticated` must not self-query `planes` (INSERT … RETURNING regression from US-0093).
- **Accessibility**: The Estado select has an associated `<label>`; helper texts are linked with `aria-describedby`; the disabled "Plan público" checkbox keeps its explanation visible; the status badge conveys state with text + icon, not color alone.
- **Error handling**: Constraint violation on save → inline form error "Un plan no visible no puede ser público."; athlete self-subscribe rejection → existing `plan_unavailable` message in `SuscripcionModal`; picker load failures keep their current silent-fallback behavior.
