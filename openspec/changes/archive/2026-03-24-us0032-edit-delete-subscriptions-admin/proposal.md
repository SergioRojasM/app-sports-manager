## Why

The `gestion-suscripciones` page currently only allows validating (approving/cancelling) subscriptions and validating payments. Administrators have no way to correct data entry errors, adjust subscription terms on existing records, or permanently remove invalid or test subscriptions — forcing workarounds or direct database intervention.

## What Changes

- Add an **"Editar"** action button to each row in `SuscripcionesTable` that opens a new `EditarSuscripcionModal` pre-populated with the current subscription values, allowing the administrator to modify `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `clases_plan`, and `comentarios`.
- Add an **"Eliminar"** action button to each row in `SuscripcionesTable` that opens a new `EliminarSuscripcionModal` confirmation dialog; confirming permanently deletes the subscription and cascades to its `pagos` records.
- Extend `gestionSuscripcionesService` with two new methods: `editarSuscripcion` and `eliminarSuscripcion`.
- Add two new hooks: `useEditarSuscripcion` and `useEliminarSuscripcion` following the existing `useValidarPago` / `useValidarSuscripcion` pattern.
- Add a new database migration granting `DELETE` on `public.suscripciones` to the `authenticated` role and creating a tenant-scoped `suscripciones_delete_admin` RLS policy.
- Extend the `subscription-management` spec with DELETE RLS requirements and the new edit/delete action requirements.

## Capabilities

### New Capabilities

_(None — all changes extend the existing `subscription-management` capability.)_

### Modified Capabilities

- `subscription-management`: Adds two new action requirements (edit all fields, delete with cascade) and a new RLS DELETE policy to the existing subscription management spec. The `SuscripcionesTable` Actions column gains two new buttons; service and hook layers gain the corresponding mutations.

## Impact

**Components (modified):**
- `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` — add "Editar" and "Eliminar" action buttons and wire their `onEdit` / `onDelete` callbacks
- `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` — mount new modals, pass handlers down

**Components (new):**
- `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` — right-side modal form following the `ValidarSuscripcionModal` visual pattern
- `src/components/portal/gestion-suscripciones/EliminarSuscripcionModal.tsx` — confirmation dialog following the `ValidarPagoModal` visual pattern

**Hooks (new):**
- `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts`
- `src/hooks/portal/gestion-suscripciones/useEliminarSuscripcion.ts`

**Hooks (modified):**
- `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` — integrate new hooks and expose state/handlers to the page component

**Service (modified):**
- `src/services/supabase/portal/gestion-suscripciones.service.ts` — add `editarSuscripcion` and `eliminarSuscripcion` methods

**Types (modified):**
- `src/types/portal/gestion-suscripciones.types.ts` — add `EditarSuscripcionFormValues` type

**Database (new migration):**
- `supabase/migrations/YYYYMMDD000100_suscripciones_admin_delete_rls.sql` — `GRANT DELETE` + `suscripciones_delete_admin` RLS policy

**Specs (modified):**
- `openspec/specs/subscription-management/spec.md` — add edit-all-fields and delete action requirements; add DELETE RLS scenarios

## Non-goals

- No changes to the athlete-facing subscription view or athlete RLS policies.
- No changes to the `pagos` RLS policies (cascade delete is handled by the existing FK constraint, not a new policy).
- No bulk edit or bulk delete functionality.
- No soft-delete / audit trail — deletion is permanent and intentional (admin action).
- No changes to the subscription creation flow or the plan subscription modal (`SuscripcionModal.tsx`).
