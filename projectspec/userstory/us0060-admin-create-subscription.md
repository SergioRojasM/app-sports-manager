# US-0060 — Admin Create Subscription on Behalf of Athlete

## ID
US-0060

## Name
Admin Create Subscription on Behalf of Athlete with Searchable Athlete Picker

## As a
Tenant administrator (administrador)

## I Want
To create a subscription for any athlete in the team directly from the subscription management panel (`gestion-suscripciones`), with a searchable athlete picker and the ability to configure subscription state, dates, classes, and optionally register a payment in the same action.

## So That
I can register a subscription for an athlete without requiring them to do it themselves — useful for in-person enrollments, walk-in payments, telephone registrations, or bulk activations where the athlete has already paid.

---

## Description

### Current State

The `GestionSuscripcionesPage` in `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` displays a table of all subscriptions for the tenant with modals for:
- Validating payments (`ValidarPagoModal`)
- Approving/rejecting subscriptions (`ValidarSuscripcionModal`)
- Editing existing subscriptions (`EditarSuscripcionModal`)
- Deleting subscriptions (`EliminarSuscripcionModal`)
- Viewing payment details (`VerDetallePagoModal`)

There is **no way for an admin to create a new subscription** from this panel. Athletes can self-enroll via the `SuscripcionModal` in the plans page, but this requires them to select a plan, pick a subtype, and submit a payment proof. Admins have no equivalent "Nueva suscripción" action.

**Gaps:**
1. No "Nueva suscripción" button exists in `GestionSuscripcionesPage` or `SuscripcionesHeaderFilters`.
2. No admin INSERT RLS policy exists on `public.suscripciones` — only the `suscripciones_insert_own` policy (`atleta_id = auth.uid()`) is defined, which prevents admins from inserting subscriptions on behalf of other athletes.
3. No admin INSERT RLS policy exists on `public.pagos` for subscriptions belonging to other athletes.
4. No `CrearSuscripcionModal` component or `useCrearSuscripcion` hook exists.

### Proposed Changes

#### 1. New Migration — Admin INSERT policies

Add RLS policies to allow admins to insert `suscripciones` and `pagos` records for any athlete in their tenant.

#### 2. `GestionSuscripcionesPage.tsx` — Add "Nueva suscripción" button

Add a **"Nueva suscripción"** button in the page header (beside the stats or in the header row) that opens the new `CrearSuscripcionModal`.

#### 3. New `CrearSuscripcionModal.tsx` — 3-step slide-in modal

A right-side or centered slide-in form modal with three steps:

**Step 1 — Athlete Selection**
- A searchable combobox identical in design to the one introduced in US-0058 for bookings.
- Loads all **active** `atleta`-role members from the tenant via `miembros_tenant` joined to `usuarios`.
- Search filters by full name (case-insensitive) **or** `numero_identificacion`.
- Each dropdown item shows `{nombre} {apellido}` on the primary line and `{tipo_identificacion}: {numero_identificacion}` as secondary text when available.
- Keyboard accessible: `↑`/`↓` navigate, `Enter` selects, `Escape` closes dropdown.
- Empty state: "Sin resultados".
- Loading state: input disabled with placeholder "Cargando atletas…".

**Step 2 — Plan & Subtype Selection**
- Dropdown to pick an **active** plan from the tenant (loaded via `planesService.getPlanes`, filtered `activo: true`).
- If the selected plan has active `plan_tipos`, displays a radio-button group for subtype selection (same design as `SuscripcionModal` step 1).
- A plan with no active subtypes skips the radio group (subtype is `null`).
- Displays plan description and a preview of the selected subtype's `vigencia_dias` and `clases_incluidas`.

**Step 3 — Subscription & Optional Payment Configuration**
- **estado**: radio group — `pendiente` | `activa` (default: `activa`).
- **fecha_inicio**: date input. Required when `estado = 'activa'`. Defaults to today.
- **fecha_fin**: date input. Required when `estado = 'activa'`. Auto-filled from `plan_tipo.vigencia_dias` when a subtype with `vigencia_dias` is selected (`fecha_inicio + vigencia_dias days`). Editable.
- **clases_restantes**: number input. Only shown when the plan/subtype has `clases_incluidas`. Auto-filled from `plan_tipo.clases_incluidas`. Editable. Minimum value: 0.
- **comentarios**: optional textarea.
- **Pago (optional section)** — collapsible panel toggled by a checkbox "Registrar pago":
  - **monto**: number input (required if payment section is open). Minimum: 0.
  - **metodo_pago_id**: dropdown of active `tenant_metodos_pago` (required if payment section is open). Loaded from `metodosPagoService.getMetodosPago`.
  - **estado_pago**: radio group — `pendiente` | `validado` (default: `validado`).

#### 4. Validation
- **Step 1**: `atleta_id` must be selected before advancing.
- **Step 2**: `plan_id` must be selected. If plan has active subtypes, `plan_tipo_id` must also be selected.
- **Step 3**: If `estado = 'activa'`, both `fecha_inicio` and `fecha_fin` are required and `fecha_fin >= fecha_inicio`. If payment section is open, `monto >= 0` and `metodo_pago_id` are required.

#### 5. Submit Logic
1. `INSERT` into `suscripciones` with all configured fields plus `validado_por = auth.uid()` when `estado = 'activa'`.
2. If payment section is open, `INSERT` into `pagos` with `suscripcion_id` from step 1, `tenant_id`, `monto`, `metodo_pago_id`, and `estado`.
3. On success: close modal, call `refresh()` to reload the subscriptions list, show success toast.
4. On error: surface error inline within the modal (not via toast).

---

## Database Changes

### Migration: `supabase/migrations/20260605000100_suscripciones_admin_insert_rls.sql`

```sql
-- ============================================================
-- US-0060: Admin create subscription — INSERT RLS policies
-- Allows tenant admins to insert suscripciones and pagos
-- on behalf of any athlete in their tenant.
-- ============================================================

-- 1. Grant INSERT privilege (already granted for self-insert; idempotent re-grant)
grant insert on public.suscripciones to authenticated;
grant insert on public.pagos to authenticated;

-- 2. suscripciones — admin INSERT policy
drop policy if exists suscripciones_insert_admin on public.suscripciones;
create policy suscripciones_insert_admin on public.suscripciones
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 3. pagos — admin INSERT policy
drop policy if exists pagos_insert_admin on public.pagos;
create policy pagos_insert_admin on public.pagos
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );
```

**No new tables or columns are required.** All fields needed (`validado_por` on `suscripciones`, `metodo_pago_id` on `pagos`, etc.) already exist.

---

## API / Server Actions

No new API routes. All operations use the browser Supabase client with the existing RLS-aware service layer.

### `gestion-suscripciones.service.ts` — new function `crearSuscripcionAdmin`

- **File path**: `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Function**: `crearSuscripcionAdmin(payload: CrearSuscripcionAdminPayload): Promise<void>`
- **Input**:
  ```ts
  type CrearSuscripcionAdminPayload = {
    tenant_id: string;
    atleta_id: string;
    plan_id: string;
    plan_tipo_id: string | null;
    clases_plan: number | null;
    clases_restantes: number | null;
    estado: 'pendiente' | 'activa';
    fecha_inicio: string | null;   // ISO date string
    fecha_fin: string | null;      // ISO date string
    comentarios: string | null;
    validado_por: string | null;   // current admin's user id (set when estado='activa')
    pago: {
      monto: number;
      metodo_pago_id: string;
      estado: 'pendiente' | 'validado';
    } | null;
  };
  ```
- **Returns**: `Promise<void>` (throws `GestionSuscripcionesServiceError` on failure)
- **Logic**:
  1. `INSERT` into `suscripciones` → retrieves new `id`.
  2. If `payload.pago !== null`, `INSERT` into `pagos` using the new `suscripcion_id`.
- **Auth / RLS**: Requires the caller to be a tenant admin. Protected by `suscripciones_insert_admin` + `pagos_insert_admin` policies.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260605000100_suscripciones_admin_insert_rls.sql` | New file — admin INSERT policies for `suscripciones` and `pagos` |
| Types | `src/types/portal/gestion-suscripciones.types.ts` | Add `CrearSuscripcionAdminFormValues` and `CrearSuscripcionAdminPayload` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Add `crearSuscripcionAdmin` function |
| Hook | `src/hooks/portal/gestion-suscripciones/useCrearSuscripcion.ts` | New hook — form state, athlete list, plan list, metodos pago, submit logic |
| Component | `src/components/portal/gestion-suscripciones/CrearSuscripcionModal.tsx` | New 3-step modal component |
| Hook (update) | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Add `'crear'` to `ModalType`; add `openCrearModal: () => void` to result type and implementation |
| Component (update) | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Add "Nueva suscripción" button; wire `CrearSuscripcionModal` |
| Index (update) | `src/components/portal/gestion-suscripciones/index.ts` | Export `CrearSuscripcionModal` |

---

## Acceptance Criteria

1. A **"Nueva suscripción"** button is visible in `GestionSuscripcionesPage` for the admin role and opens the `CrearSuscripcionModal`.
2. **Step 1**: The athlete picker is a searchable combobox; typing filters by name or `numero_identificacion` (case-insensitive); selecting a result advances to step 2.
3. **Step 2**: The plan dropdown lists only **active** plans for the tenant; selecting a plan with active subtypes shows a radio group; selecting a plan without subtypes allows advancing immediately.
4. **Step 3**: When `estado = 'activa'`, `fecha_inicio` and `fecha_fin` fields are required and validated (`fecha_fin >= fecha_inicio`); the form cannot be submitted while these are empty.
5. When a subtype with `vigencia_dias` is selected, `fecha_fin` is auto-filled as `fecha_inicio + vigencia_dias days`, but remains editable.
6. When a subtype with `clases_incluidas` is selected, `clases_restantes` is auto-filled with that value, but remains editable.
7. The optional **"Registrar pago"** toggle reveals `monto`, `metodo_pago_id`, and `estado_pago` fields; when open, `monto` and `metodo_pago_id` are required.
8. Submitting the form inserts a new row into `suscripciones` with `atleta_id` set to the selected athlete (not the current admin's ID).
9. When the payment section is open, a corresponding row is also inserted into `pagos` linked to the new `suscripcion_id`.
10. After successful submission the modal closes, the subscriptions table refreshes, and the new subscription appears in the list.
11. If the INSERT fails due to RLS (e.g., trying to create a subscription for an athlete outside the tenant), an inline error is shown inside the modal.
12. An `atleta`-role user cannot see or trigger the "Nueva suscripción" button — the feature is strictly admin-only.
13. The athlete list in the picker includes only members with role `atleta` and `activo = true` in the tenant.
14. Navigating back (via "Anterior" button) on steps 2 and 3 preserves the previously entered values.

---

## Implementation Steps

- [ ] Create migration `20260605000100_suscripciones_admin_insert_rls.sql` and apply locally (`npx supabase db push`)
- [ ] Add `CrearSuscripcionAdminFormValues` and `CrearSuscripcionAdminPayload` to `gestion-suscripciones.types.ts`
- [ ] Add `crearSuscripcionAdmin` to `gestion-suscripciones.service.ts` (insert suscripcion → optionally insert pago)
- [ ] Create `useCrearSuscripcion.ts`:
  - Load athletes from `miembros_tenant` (role `atleta`, `activo = true`) joined to `usuarios` (including `numero_identificacion`, `tipo_identificacion`)
  - Load active plans from `planesService.getPlanes` filtered `activo = true`
  - Load active `metodos_pago` from `metodosPagoService.getMetodosPago`
  - Manage 3-step form state: `step`, `atleta_id`, `plan_id`, `plan_tipo_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `comentarios`, `crearPago`, `monto`, `metodo_pago_id`, `estado_pago`
  - Implement `submit()` calling `gestionSuscripcionesService.crearSuscripcionAdmin`
  - Implement `validateStep(step)` returning `string | null` for per-step validation
  - Implement auto-fill side-effects: when `plan_tipo_id` changes, update `fecha_fin` and `clases_restantes`
- [ ] Create `CrearSuscripcionModal.tsx`:
  - Use the searchable combobox pattern from US-0058 (`ReservaFormModal`) for athlete picker
  - Step indicator (1/2/3) in modal header
  - "Siguiente" / "Anterior" / "Crear suscripción" buttons
  - Keyboard accessibility on athlete combobox (ArrowUp/Down, Enter, Escape)
  - Collapsible payment section with toggle checkbox
- [ ] Update `useGestionSuscripciones.ts`: add `'crear'` to `ModalType`; add `openCrearModal` action
- [ ] Update `GestionSuscripcionesPage.tsx`: add "Nueva suscripción" button in header; render `CrearSuscripcionModal` with `onSuccess={handleModalSuccess}`
- [ ] Update `index.ts` to export `CrearSuscripcionModal`
- [ ] Apply migration locally and test RLS: verify admin can insert, athlete cannot insert for another user
- [ ] Test manually: happy path (step 1 → 2 → 3 → submit with and without payment), back navigation, validation errors, empty athlete list, plan without subtypes, plan with subtypes
- [ ] Test edge cases: `fecha_fin` auto-fill, `clases_restantes` auto-fill, form reset on modal close

---

## Non-Functional Requirements

- **Security**: The new `suscripciones_insert_admin` policy uses `get_admin_tenants_for_authenticated_user()` (SECURITY DEFINER function) — consistent with all other admin policies in the codebase. Athletes cannot insert subscriptions for other users because the existing `suscripciones_insert_own` policy enforces `atleta_id = auth.uid()`, and the new admin policy is scoped to `tenant_id IN (admin_tenants)`. An athlete cannot satisfy the admin policy because the function returns an empty set for non-admin roles. The `pagos_insert_admin` policy is similarly scoped to tenant ownership.
- **Performance**: Athlete list and plan list are fetched once when the modal opens and filtered client-side. For typical tenant sizes this is acceptable; no pagination is required.
- **Accessibility**: The athlete combobox must use `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`, and `role="option"` — consistent with the US-0058 athlete picker pattern.
- **Error handling**: Service errors surface as inline error messages within the current step of the modal (not as toasts). Step-level validation errors are shown below the relevant field. A general error fallback is shown at the bottom of step 3 for unexpected server errors.
- **UX consistency**: The modal layout, button styles, and typography follow the same glass/dark theme used in `EditarSuscripcionModal` and `ValidarSuscripcionModal`. Step navigation uses "Siguiente" / "Anterior" button labels consistent with the existing `SuscripcionModal`.
