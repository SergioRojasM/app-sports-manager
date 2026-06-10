## 1. Branch Setup

- [x] 1.1 Create a new git branch `feat/services-catalog-plan-services`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260610000100_servicios_plan_tipos_servicios.sql`
- [x] 2.2 Add `servicios` table: id, tenant_id (FK → tenants ON DELETE CASCADE), nombre, descripcion, activo, created_at, updated_at; unique `(tenant_id, nombre)`
- [x] 2.3 Add RLS on `servicios`: enable RLS, SELECT for all authenticated, INSERT/UPDATE/DELETE for tenant admins via `get_admin_tenants_for_authenticated_user()`
- [x] 2.4 Attach `set_updated_at` trigger to `servicios`
- [x] 2.5 Add `plan_tipos_servicios` table: id, plan_tipo_id (FK → plan_tipos ON DELETE CASCADE), servicio_id (FK → servicios ON DELETE RESTRICT), unidades (integer ≥ 1), created_at, updated_at; unique `(plan_tipo_id, servicio_id)`
- [x] 2.6 Add RLS on `plan_tipos_servicios`: enable RLS, SELECT for all authenticated, INSERT/UPDATE/DELETE for tenant admins
- [x] 2.7 Add indexes: `idx_servicios_tenant_id`, `idx_plan_tipos_servicios_plan_tipo_id`, `idx_plan_tipos_servicios_servicio_id`
- [x] 2.8 Apply migration locally (`npx supabase db push` or via Supabase Studio)
- [x] 2.9 Verify both tables appear in local Supabase with correct constraints and RLS policies

## 3. TypeScript Types

- [x] 3.1 Create `src/types/portal/servicios.types.ts` with: `Servicio`, `CreateServicioInput`, `UpdateServicioInput`, `ServicioFormValues`, `ServicioServiceError` (codes: `duplicate_nombre`, `referenced_by_plan_tipos`)
- [x] 3.2 Add `PlanTipoServicio`, `PlanTipoServicioRow`, `SyncPlanTipoServiciosInput` to `src/types/portal/servicios.types.ts`
- [x] 3.3 Add optional `servicios?: PlanTipoServicioRow[]` field to `PlanTipo` interface in `src/types/portal/planes.types.ts` (no other changes)

## 4. Service Layer

- [x] 4.1 Create `src/services/supabase/portal/servicios.service.ts` with `getServiciosByTenant`, `getServiciosActivosByTenant`, `createServicio` (catches `23505` → `duplicate_nombre`), `updateServicio`, `deleteServicio` (catches `23503` → `referenced_by_plan_tipos`)
- [x] 4.2 Add `getPlanTipoServicios` to `servicios.service.ts`: SELECT `plan_tipos_servicios` joined with `servicios.nombre` as `servicio_nombre`, ordered by `servicio_nombre`
- [x] 4.3 Add `syncPlanTipoServicios` to `servicios.service.ts`: DELETE all rows for `planTipoId`, then INSERT new set
- [x] 4.4 Update `src/services/supabase/portal/planes.service.ts` `getPlanTiposByPlan` to call `getPlanTipoServicios` per plan tipo and populate `servicios` field (empty array if none)
- [x] 4.5 Update `createPlanTipo` in `planes.service.ts` to accept optional `servicios?: PlanTipoServicioRow[]` and call `syncPlanTipoServicios` after insert
- [x] 4.6 Update `updatePlanTipo` in `planes.service.ts` to accept optional `servicios?: PlanTipoServicioRow[]` and call `syncPlanTipoServicios` after update

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/servicios/useServicios.ts`: fetch list, expose CRUD actions with list refresh, manage modal open/close state (`isModalOpen`, `editingServicio`, `openCreateModal`, `openEditModal`, `closeModal`)
- [x] 5.2 Create `src/hooks/portal/servicios/useServicioForm.ts`: controlled `ServicioFormValues` state, `initialValues` pre-fill for edit mode, `nombre` required validation, `isSubmitting`, `fieldError`, `reset`
- [x] 5.3 Create `src/hooks/portal/planes/usePlanTipoServicios.ts`: fetch active services for dropdown, manage `serviceRows` array, expose `loadForPlanTipo`, `addServiceRow`, `updateServiceRow`, `removeServiceRow`, `syncToDb`; client-side guard against duplicate `servicioId`
- [x] 5.4 Update `src/hooks/portal/planes/usePlanForm.ts` to instantiate and expose `usePlanTipoServicios` state; call `loadForPlanTipo` when opening edit mode; call `syncToDb` on plan tipo save

## 6. Components — Servicios Feature Slice

- [x] 6.1 Create `src/components/portal/servicios/ServicioFormModal.tsx`: right-side slide modal, fields (Nombre required, Descripción optional, Activo toggle), create/edit modes, focus trap, Esc/backdrop close, loading state on submit, inline `nombre` field error
- [x] 6.2 Create `src/components/portal/servicios/ServiciosTable.tsx`: table with columns Nombre, Descripción, Estado (activo badge), Acciones (edit/delete buttons)
- [x] 6.3 Create `src/components/portal/servicios/ServiciosPage.tsx`: page header ("Servicios" title + "Nuevo servicio" button), render `ServiciosTable`, loading/empty/error states, wire `ServicioFormModal` for create and edit, wire delete with confirmation; show toast on `referenced_by_plan_tipos` error
- [x] 6.4 Create `src/components/portal/servicios/index.ts` barrel export for `ServiciosPage`

## 7. Components — Plan Form Services Section

- [x] 7.1 Create `src/components/portal/planes/PlanTipoServiciosSection.tsx`: renders service rows (service `<select>` from active services, `unidades` number input ≥ 1, remove button), "Agregar servicio" link (disabled when all services selected), informational note about coexistence with `clases_incluidas`; excludes already-selected services from other rows' dropdowns
- [x] 7.2 Update `src/components/portal/planes/PlanFormModal.tsx` to render `<PlanTipoServiciosSection />` below the existing `clases_incluidas` input inside the plan tipo sub-form; pass `serviceRows`, `availableServices`, `onAddRow`, `onUpdateRow`, `onRemoveRow` props

## 8. Page

- [x] 8.1 Replace the empty placeholder in `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-servicios/page.tsx` with a server component that extracts `tenant_id` from params and renders `<ServiciosPage tenantId={tenantId} />`

## 9. Verification

- [ ] 9.1 Verify RLS policies in local Supabase Studio for `servicios` and `plan_tipos_servicios`
- [ ] 9.2 Manual test: navigate to `/gestion-servicios` as admin → create a service → confirm it appears in the table
- [ ] 9.3 Manual test: edit a service → confirm changes saved
- [ ] 9.4 Manual test: attempt to delete a service referenced by a plan tipo → confirm error toast is shown
- [ ] 9.5 Manual test: delete an unreferenced service → confirm it is removed
- [ ] 9.6 Manual test: create a service with a duplicate name in the same tenant → confirm "Ya existe un servicio con este nombre." error
- [ ] 9.7 Manual test: open Plan Form Modal → add service rows to a plan tipo → save → confirm rows in `plan_tipos_servicios`
- [ ] 9.8 Manual test: reopen plan form in edit mode → confirm service rows are pre-filled
- [ ] 9.9 Manual test: remove all service rows from a plan tipo and save → confirm `plan_tipos_servicios` rows deleted
- [ ] 9.10 Manual test: `clases_incluidas` field still saves and loads correctly after all changes
- [x] 9.11 Check no TypeScript errors: `npx tsc --noEmit`

## 10. Documentation and Commit

- [x] 10.1 Update `projectspec/03-project-structure.md`: add `servicios/` feature slice under `components/portal/`, add `useServicios.ts`, `useServicioForm.ts`, `usePlanTipoServicios.ts` under hooks, add `servicios.service.ts` under services, add `servicios.types.ts` under types, add `gestion-servicios/` page under `(administrador)/`
- [x] 10.2 Create a commit with message: `feat: services catalog and plan tipo service assignments (US-0062)`
- [x] 10.3 Write pull request description:
  - **Title**: `feat: Services catalog and plan tipo service assignments`
  - **Summary**: Introduces `servicios` catalog table and `plan_tipos_servicios` join table; full CRUD admin page at `/gestion-servicios`; adds Services section to `PlanFormModal` plan tipo sub-form.
  - **Out of scope**: data migration of `clases_incluidas`, deduction logic update, subscription service tracking.
  - **Testing**: Manual tests per task 9.x checklist.
