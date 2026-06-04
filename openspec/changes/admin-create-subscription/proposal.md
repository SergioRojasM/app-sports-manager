## Why

Administrators currently have no way to enroll an athlete in a subscription from the admin panel (`gestion-suscripciones`). Athletes must self-enroll, which is impractical for walk-in payments, telephone registrations, and bulk activations where the admin already has the payment in hand.

## What Changes

- Add a **"Nueva suscripción"** action button to the `GestionSuscripcionesPage` header.
- Introduce a new 3-step `CrearSuscripcionModal` that lets admins:
  1. **Pick an athlete** — searchable combobox filtering by name or `numero_identificacion`.
  2. **Select a plan and subtype** — dropdown of active tenant plans with optional subtype radio group.
  3. **Configure the subscription** — set estado, dates, and class count; optionally register a payment in the same action.
- Add a `crearSuscripcionAdmin` function to `gestion-suscripciones.service.ts` that atomically inserts `suscripciones` and optionally `pagos`.
- Add a `useCrearSuscripcion` hook to manage the 3-step form state, data loading, validation, and submission.
- Add RLS INSERT policies so admins can insert `suscripciones` and `pagos` on behalf of any athlete in their tenant.

## Non-goals

- Admins cannot upload a payment `comprobante` (proof-of-payment file) in this flow — only the payment metadata (amount, method, status).
- This does not change the existing athlete self-enrollment flow (`SuscripcionModal` in the plans page).
- No email notification is triggered when an admin creates a subscription on behalf of an athlete.

## Capabilities

### New Capabilities

- `admin-create-subscription`: Admin can create a subscription for any active athlete from the `gestion-suscripciones` panel, selecting plan/subtype, setting dates and class count, and optionally registering a payment record.

### Modified Capabilities

- `subscription-management`: The admin subscription management panel gains a new primary action ("Nueva suscripción") and must wire the new modal and hook into the existing page/hook composition. The RLS layer for `suscripciones` and `pagos` gains INSERT policies for admins.

## Impact

- **New migration**: `supabase/migrations/20260605000100_suscripciones_admin_insert_rls.sql`
- **New types**: `CrearSuscripcionAdminFormValues`, `CrearSuscripcionAdminPayload` in `gestion-suscripciones.types.ts`
- **New service function**: `crearSuscripcionAdmin` in `gestion-suscripciones.service.ts`
- **New hook**: `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts`
- **New component**: `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx`
- **Updated hook**: `useGestionSuscripciones.ts` — new `'crear'` modal type + `openCrearModal` action
- **Updated component**: `GestionSuscripcionesPage.tsx` — wire button + modal
- **Updated index**: `src/components/portal/gestion-suscripciones/index.ts` — export new modal
- **Depends on**: `planesService.getPlanes`, `metodosPagoService.getMetodosPago`, `equipo.service.ts` athlete query pattern, `ReservaFormModal` combobox pattern (US-0058)
