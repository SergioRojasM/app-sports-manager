## Why

Plans currently use a generic `clases_incluidas` integer on `plan_tipos` to communicate bundled sessions, with no link to a structured catalog of what those sessions represent. This prevents admins from defining specific services (e.g., "Clases de Natación", "Entrenamiento Personal") and associating exact unit quantities per plan subtype, which is a prerequisite for future per-service subscription tracking and deduction.

## What Changes

- New `servicios` table: tenant-scoped catalog of services (nombre, descripcion, activo).
- New `plan_tipos_servicios` join table: links plan subtypes to services with a `unidades` (integer ≥ 1) count.
- `clases_incluidas` on `plan_tipos` is **not removed** in this US — deduction migration is deferred to a subsequent US.
- New admin page `/gestion-servicios` replaces the current empty placeholder, providing full CRUD for services.
- `PlanFormModal` gains a **Services section** below the existing `clases_incluidas` input, allowing admins to attach one or more services (with unit quantities) to each plan subtype.
- No changes to booking-deduction logic (`deduct_classes_on_booking` / `reservas.service.ts`).

## Capabilities

### New Capabilities

- `services-management`: CRUD management of the tenant services catalog (`servicios` table) via a dedicated admin page.
- `plan-tipo-services`: Association of services with unit quantities to plan subtypes (`plan_tipos_servicios` table), managed from within the Plan Form Modal.

### Modified Capabilities

- `plan-subtypes`: The plan subtype form gains a new Services section. The existing `clases_incluidas` field is kept; no behavioral requirement changes to the existing field.
- `plan-management`: The plan form modal integrates the new Services section for subtypes.

## Non-goals

- Data migration of existing `clases_incluidas` values into `plan_tipos_servicios` — deferred to next US.
- Dropping `clases_incluidas` from `plan_tipos` — deferred.
- Updating `deduct_classes_on_booking` RPC or any booking-deduction flow — deferred.
- Subscription-level service tracking or per-service deduction — deferred.

## Impact

**Database**: Two new tables (`servicios`, `plan_tipos_servicios`) with RLS, indexes, and `set_updated_at` triggers.

**Types**: New `src/types/portal/servicios.types.ts`; minor addition to `src/types/portal/planes.types.ts` (`servicios?: PlanTipoServicioRow[]` on `PlanTipo`).

**Services**: New `src/services/supabase/portal/servicios.service.ts` (CRUD for `servicios` + `syncPlanTipoServicios` / `getPlanTipoServicios`); update to `src/services/supabase/portal/planes.service.ts` to wire service sync on plan tipo save.

**Hooks**: New `src/hooks/portal/servicios/useServicios.ts`, `useServicioForm.ts`; new `src/hooks/portal/planes/usePlanTipoServicios.ts`; update `usePlanForm.ts`.

**Components**: New `src/components/portal/servicios/` slice (`ServiciosPage`, `ServiciosTable`, `ServicioFormModal`, `index.ts`); new `src/components/portal/planes/PlanTipoServiciosSection.tsx`; update `PlanFormModal.tsx`.

**Pages**: `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-servicios/page.tsx` replaces empty placeholder.

**No impact** on: authentication, booking, subscription deduction, attendance, or any other feature.
