## 1. Branch Setup

- [x] 1.1 Create branch `feat/hidden-active-plan-status` from `develop`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop`

## 2. Database (local only — never push to remote Supabase)

- [x] 2.1 Create `supabase/migrations/20261005120000_planes_visible_atletas.sql` with `planes.visible_atletas boolean not null default true`, its column comment and check constraint `planes_no_visible_no_publico_ck` (`visible_atletas or not es_publico`)
- [x] 2.2 Confirm the output column name of `get_trainer_or_admin_tenants_for_authenticated_user()` in `20260916120200_miembros_pendiente_activacion.sql`
- [x] 2.3 Replace `planes_select_authenticated` (own-column predicate: public+active+visible, trainer/admin of tenant, member AND visible, already subscribed)
- [x] 2.4 `create or replace` `can_read_plan` with the same four branches (keep `stable security definer set search_path = public`)
- [x] 2.5 `create or replace` `can_subscribe_to_plan` adding `and p.visible_atletas`
- [x] 2.6 Apply the migration locally and verify with SQL per role: athlete member / non-member get 0 rows for a hidden plan and its `plan_tipos`, `planes_disciplina`, `plan_tipos_servicios`; athlete self-insert into `suscripciones` fails with `42501`; admin `insert … returning` on `planes` succeeds; setting `es_publico = true` on a hidden plan fails
- [x] 2.7 (Optional) Add a hidden "Cortesía" plan to `supabase/seed.sql` — skipped: `seed.sql` is git-ignored

## 3. Components

- [x] 3.1 `PlanFormModal.tsx`: replace the "Plan activo" checkbox with labelled `<select id="plan-estado">` (Activo / Activo no visible / Inactivo) calling `onChangeEstado`; helper text for the hidden status linked via `aria-describedby`
- [x] 3.2 `PlanFormModal.tsx`: disable and uncheck "Plan público" when hidden, with "Un plan no visible no puede ser público."
- [x] 3.3 `PlanesPage.tsx`: pass `setEstado` from `usePlanes` to the modal
- [x] 3.4 `PlanesTable.tsx`: three-variant status badge from `row.estado` (amber + `visibility_off` icon for "Activo no visible")
- [x] 3.5 `CrearSuscripcionModal.tsx`: suffix hidden plans with " (No visible)" in the plan picker
- [x] 3.6 `EditarSuscripcionModal.tsx`: render the suffixed plan label

## 4. Hooks

- [x] 4.1 `usePlanForm.ts`: default `visible_atletas: true`; load it in `setFormFromPlan` and `setFormForDuplicate`; add `setEstado(estado)` (hidden clears `es_publico`; inactivo leaves `visible_atletas` untouched)
- [x] 4.2 `usePlanes.ts`: `toTableItem` sets `estado` and `statusLabel` from `PLAN_ESTADO_LABELS`; send `visibleAtletas` in create/update payloads; expose `setEstado`
- [x] 4.3 `usePlanesView.ts`: filter `p.activo && p.visible_atletas`; status label from the shared helper
- [x] 4.4 `useCrearSuscripcion.ts`: keep the `activo` filter and carry `visible_atletas` to picker options
- [x] 4.5 `useEditarSuscripcion.ts`: keep the `activo` filter and build the " (No visible)" label

## 5. Service

- [x] 5.1 `planes.service.ts`: add `visible_atletas` to the column list, `PlanRow` and `mapPlanRow`
- [x] 5.2 `planes.service.ts`: `createPlan` / `updatePlan` persist `visible_atletas` and force `es_publico: false` when hidden; map `23514` on `planes_no_visible_no_publico_ck` to "Un plan no visible no puede ser público."
- [x] 5.3 `planes.service.ts`: add `.eq('visible_atletas', true)` to `getPlanesPublicos` and `getPlanesMiembro`

## 6. Types

- [x] 6.1 `planes.types.ts`: `Plan.visible_atletas`, `CreatePlanInput.visibleAtletas?`, `PlanFormValues.visible_atletas`, `PlanTableItem.estado`
- [x] 6.2 `planes.types.ts`: `PlanEstado`, `getPlanEstado(plan)`, `PLAN_ESTADO_LABELS`

## 7. Verification

- [x] 7.1 Admin: create, edit, inactivate/reactivate and duplicate a hidden plan; badge and form behave per spec
- [x] 7.2 Athlete, trainer and non-member: hidden plan absent from `gestion-planes` and the "Ver planes" modal; empty state when only hidden plans exist
- [x] 7.3 Admin: assign a hidden plan via "Crear suscripción" and switch to one via "Editar suscripción"; inactive plans absent from both pickers
- [x] 7.4 Assigned athlete: plan visible in "Mis Suscripciones" and Inicio, booking deducts units, plan still absent from catalogs
- [x] 7.5 Trainer: hidden plan name shown in `gestion-reservas` and its CSV export
- [x] 7.6 Switch a plan with existing subscriptions to hidden; existing subscriptions unaffected

## 8. Documentation and Delivery

- [x] 8.1 Update `projectspec/03-project-structure.md` (`planes.types.ts`, `planes.service.ts`, `PlanesTable`, `PlanFormModal`, `can_read_plan`, `can_subscribe_to_plan` entries)
- [x] 8.2 Run type-check, lint and tests (do not build)
- [x] 8.3 Write the commit message and pull request description for the implementation
