## Why

Since US-0062 / US-0063, service-unit entitlement is tracked via `suscripcion_servicios.unidades_restantes`, and since US-0064, booking/cancellation RPCs no longer touch `clases_restantes`. The `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` fields are now dead in the application layer — the UI still displays them and the services still write them, causing confusion and unnecessary DB writes.

## What Changes

- Remove `clases_incluidas` from `plan_tipos` CRUD: type definitions, service layer, form hook, and `PlanFormModal` UI input.
- Remove `clases_restantes` and `clases_plan` from subscription management: all type definitions, DB select strings, mapper functions, write payloads, hooks, and all admin/athlete UI components that display or edit these values.
- No database migration — columns are intentionally preserved for historical data integrity.

## Capabilities

### New Capabilities
<!-- None — this change is entirely subtractive -->

### Modified Capabilities
- `plan-management`: Remove `clases_incluidas` field from plan-type create/edit form and service layer.
- `subscription-management`: Remove `clases_restantes` / `clases_plan` from subscription create, approve, and edit flows (admin) and from the subscription display (athlete).
- `user-subscriptions-and-payments-view`: Remove class-count display from the athlete's own subscription card.
- `user-home-dashboard`: Remove class count and progress bar from the home dashboard subscription widget.

## Impact

**Types** (5 files):
- `src/types/portal/planes.types.ts`
- `src/types/portal/gestion-suscripciones.types.ts`
- `src/types/portal/suscripciones.types.ts`
- `src/types/portal/mis-suscripciones-y-pagos.types.ts`
- `src/types/portal/inicio.types.ts`

**Services** (5 files):
- `src/services/supabase/portal/planes.service.ts`
- `src/services/supabase/portal/gestion-suscripciones.service.ts`
- `src/services/supabase/portal/suscripciones.service.ts`
- `src/services/supabase/portal/mis-suscripciones.service.ts`
- `src/services/supabase/portal/inicio.service.ts`

**Hooks** (5 files):
- `src/hooks/portal/planes/usePlanForm.ts`
- `src/hooks/portal/planes/useSuscripcion.ts`
- `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`
- `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`
- `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts`

**Components** (8 files):
- `src/components/portal/planes/PlanFormModal.tsx`
- `src/components/portal/planes/SuscripcionModal.tsx`
- `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`
- `src/components/portal/gestion-suscripciones/ValidarSuscripcionModal.tsx`
- `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx`
- `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`
- `src/components/portal/inicio/InicioSuscripciones.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`

**Non-goals**:
- No database migration — columns `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` are NOT dropped.
- No changes to `suscripcion_servicios` or `reserva_servicios` tables.
- No changes to booking or cancellation RPCs.
- No changes to the services catalog or plan-services assignment UI.
