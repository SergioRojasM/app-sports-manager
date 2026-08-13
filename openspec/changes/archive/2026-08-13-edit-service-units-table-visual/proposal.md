## Why

Admins have no way to manually correct `suscripcion_servicios.unidades_restantes` when units are consumed outside the system or were misconfigured at subscription creation. Additionally, the subscription management table wastes horizontal space on low-information columns and buries service data behind non-interactive text, making it slow to scan.

## What Changes

- **New SECURITY DEFINER function** `admin_update_suscripcion_servicio_unidades` — allows admins to override `unidades_restantes` on any `suscripcion_servicios` row for their tenant (direct UPDATE is blocked by existing RLS).
- **Edit modal gains a "Servicios" section** — each service in a subscription is rendered with a read-only `unidades_incluidas` badge and an editable `unidades_restantes` field (number input + "Ilimitado" checkbox for null).
- **`EditarSuscripcionFormValues`** extended with `servicios: EditarServicioUnidades[]`.
- **`useEditarSuscripcion` hook** updated to pre-populate and diff service unit changes, calling the new RPC only for changed rows.
- **`SuscripcionesTable` column layout refactored** across 6 columns:
  - ATLETA and PLAN: reduced horizontal padding, max-width + text truncation.
  - INICIO/FIN: both dates same `text-xs` size (different colors preserved).
  - SERVICIOS: wider column, max 2 visible, finite-unit services sorted first, "+X más" becomes an interactive button.
  - VALIDACIÓN: both validator names same small size.
  - ACCIONES: text labels replaced with inline-SVG icon buttons + `title`/`aria-label` tooltips.
- **New `VerServiciosModal`** — read-only modal listing all services for a subscription, opened by the "+X más" button.
- **`useGestionSuscripciones`** and **`GestionSuscripcionesPage`** wired for new `'verServicios'` modal type.

## Capabilities

### New Capabilities

- `edit-subscription-service-units`: Admin can override `unidades_restantes` per service inside the subscription edit modal, backed by a new SECURITY DEFINER RPC.

### Modified Capabilities

- `subscription-management`: The admin subscription table columns are visually refactored; a new read-only "Ver servicios" modal is added; the edit modal gains a service units section.

## Impact

- **Database**: One new migration adding the `admin_update_suscripcion_servicio_unidades` SECURITY DEFINER function. No new tables or columns.
- **Service layer**: `gestion-suscripciones.service.ts` — new method `adminUpdateServicioUnidades`.
- **Types**: `gestion-suscripciones.types.ts` — new `EditarServicioUnidades` interface, `servicios` field on `EditarSuscripcionFormValues`.
- **Hooks**: `useEditarSuscripcion.ts`, `useGestionSuscripciones.ts`.
- **Components**: `EditarSuscripcionModal.tsx`, `SuscripcionesTable.tsx` (modified); `VerServiciosModal.tsx` (new).
- **Page**: `GestionSuscripcionesPage.tsx`.
- **No breaking changes** to existing APIs, RLS policies, or other feature slices.

## Non-goals

- Resetting all service units to the plan's original values (bulk reset).
- Editing `unidades_incluidas` (snapshot of plan entitlement — read-only by design).
- Adding or removing service rows from a subscription (i.e., changing which services are assigned).
- Visual changes to any view other than `gestion-suscripciones` (athlete card, dashboard, plan modal are out of scope).

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_admin_update_suscripcion_servicio_unidades.sql` | New SECURITY DEFINER function + grant |
| Types | `src/types/portal/gestion-suscripciones.types.ts` | Add `EditarServicioUnidades`; extend `EditarSuscripcionFormValues` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Add `adminUpdateServicioUnidades` |
| Hook | `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` | Servicios state, `setServicioUnidades`, submit diff loop |
| Hook | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Add `'verServicios'` modal type + `openVerServiciosModal` |
| Component | `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` | Add Servicios edit section |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | 6 visual column changes + `onVerServicios` prop |
| Component | `src/components/portal/gestion-suscripciones/VerServiciosModal.tsx` | New read-only modal |
| Page | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Mount `VerServiciosModal`, pass `onVerServicios` |

## Step-by-step Implementation Plan

1. Create and apply migration for `admin_update_suscripcion_servicio_unidades`.
2. Add `EditarServicioUnidades` interface and extend `EditarSuscripcionFormValues` in types.
3. Add `adminUpdateServicioUnidades` method to `gestion-suscripciones.service.ts`.
4. Update `useEditarSuscripcion.ts` (pre-populate servicios, `setServicioUnidades`, submit loop).
5. Add Servicios section to `EditarSuscripcionModal.tsx`.
6. Create `VerServiciosModal.tsx`.
7. Add `'verServicios'` to `ModalType` and expose `openVerServiciosModal` in `useGestionSuscripciones.ts`.
8. Apply all 6 visual changes to `SuscripcionesTable.tsx` + add `onVerServicios` prop.
9. Wire `VerServiciosModal` and `onVerServicios` in `GestionSuscripcionesPage.tsx`.
10. Run `get_errors` on all modified files; fix TypeScript issues.
11. Test: edit modal with 0/1/3+ services; unit changes; "+X más" button; icon tooltips; column truncation.
