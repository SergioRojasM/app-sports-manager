# US-0067 — Edit Subscription Service Units and Improve Subscription Table Visuals

## ID
US-0067

## Name
Allow Admin to Edit Service Unit Balances on a Subscription and Refactor the Subscription Management Table Column Layout

## As a
Tenant administrator

## I Want
To be able to manually adjust the remaining service units (`unidades_restantes`) for each service in a subscription from the edit modal, and to see the subscription management table with improved column layout: narrower athlete and plan columns, same-size dates, a wider services column that shows at most two services (finite-unit ones first) with a button to see all, uniform-size validation names, and icon-based action buttons with hover tooltips

## So That
I can correct unit balances when a service was consumed outside the system or was misconfigured at subscription creation, and I can scan the subscription table more efficiently thanks to a denser, better-organised layout

---

## Description

### Current State

**Edit modal — service units are read-only**
`EditarSuscripcionModal` exposes five editable fields: `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, and `comentarios`. The `servicios` array on `SuscripcionAdminRow` is already fetched and mapped from `suscripcion_servicios` (via the join in `fetchSuscripcionesAdmin`) but the edit modal never renders it. There is no way for an admin to manually correct `unidades_restantes` after creation.

The `suscripcion_servicios` table has RLS configured with only a `SELECT` policy and only `GRANT SELECT` to the `authenticated` role. Direct `UPDATE` via the Supabase client is blocked. All writes to this table currently go through SECURITY DEFINER functions (`populate_suscripcion_servicios`, `book_and_deduct_service_units`, `cancel_and_restore_service_units`). A new SECURITY DEFINER function is therefore required for admin overrides.

**Table column layout — specific issues**
`SuscripcionesTable` has the following problems:
1. **ATLETA** — wide padding (`px-4`), no horizontal truncation: takes excessive horizontal space for common short names.
2. **PLAN** — same wide padding, no truncation: plan names can be long and push other columns.
3. **INICIO / FIN** — `fecha_inicio` is rendered at normal `text-sm` size in `text-slate-300`; `fecha_fin` is rendered at `text-xs` in `text-slate-400`. The size mismatch makes the cell taller and the information hierarchy inconsistent.
4. **SERVICIOS** — shows up to 3 services; the "+X más" overflow indicator is a plain `<li>` text node with no interactivity; non-unlimited services are shown in insertion order rather than prioritised first; the column width is not differentiated from the others.
5. **VALIDACIÓN** — `validado_por_nombre` (subscription validator) is full-size `text-sm`; `pago.validado_por_nombre` (payment validator) is `text-xs`. Two validators at different sizes feels unbalanced.
6. **ACCIONES** — action buttons are text labels (`"Ver Pago"`, `"Validar Pago"`, `"Validar Suscripción"`, `"Cancelar"`, `"Editar"`, `"Eliminar"`). They are wide and make the column very large. No icon library is installed in the project.

### Proposed Changes

#### A. New SECURITY DEFINER function for admin unit override

A new Postgres function `admin_update_suscripcion_servicio_unidades` accepts a suscripcion id, a service id, and the new `unidades_restantes` value (nullable integer). The function validates that the calling user is an administrator for the subscription's tenant (using `get_admin_tenants_for_authenticated_user()`) and then performs the update. If the caller is not an admin the function raises an exception with code `42501`.

#### B. Service layer — new `adminUpdateServicioUnidades` method

A new method on `gestionSuscripcionesService` calls the RPC above. Accepts `suscripcionId`, `servicioId`, and `unidadesRestantes: number | null`.

#### C. Type extension — `EditarSuscripcionFormValues`

Add `servicios: EditarServicioUnidades[]` to `EditarSuscripcionFormValues` where:

```ts
export interface EditarServicioUnidades {
  servicio_id: string;
  servicio_nombre: string;
  unidades_incluidas: number | null;   // read-only snapshot; null = unlimited
  unidades_restantes: number | null;   // editable; null = unlimited
}
```

#### D. Hook — `useEditarSuscripcion` extension

- Pre-populate `formValues.servicios` from `row.servicios` on `row` change.
- Add `setServicioUnidades(servicioId: string, value: number | null)` helper (immutable update).
- In `submit()`: after updating the subscription row, iterate `formValues.servicios`. For each entry where `unidades_restantes` differs from the original `row.servicios` entry, call `adminUpdateServicioUnidades`. If any call fails, set error and stop (partial success is acceptable — the subscription fields were already saved).

#### E. Edit modal — Servicios section

Add a new section below "Comentarios" in `EditarSuscripcionModal`:
- Rendered only when `formValues.servicios.length > 0`.
- Section header: "Unidades por Servicio".
- Each service rendered as a horizontal row:
  - Service name (read-only, `text-slate-200`).
  - Included units badge: `unidades_incluidas ?? '∞'` (read-only, `text-slate-400 text-xs`).
  - "Ilimitado" checkbox: checked when `unidades_restantes === null`; toggling it sets `unidades_restantes` to `null` or to the current `unidades_incluidas ?? 0`.
  - Number input for `unidades_restantes`: visible and enabled when not unlimited; type `number`, min `0`, integer only.
- Disabled state follows `isSubmitting`.

#### F. Table visual changes (SuscripcionesTable)

| Column | Current | Target |
|--------|---------|--------|
| ATLETA | `px-4`, no truncation | `px-2`, `max-w-[130px]`, both name and email lines `truncate` |
| PLAN | `px-4`, no truncation | `px-2`, `max-w-[110px]`, cell text `truncate` |
| INICIO / FIN | inicio: `text-sm text-slate-300` / fin: `text-xs text-slate-400` | both `text-xs`; inicio: `text-slate-300`; fin: `text-slate-400` |
| SERVICIOS | max 3, plain "+X más" text | `min-w-[180px]`, max 2, finite-unit services first (sort: `unidades_incluidas !== null` before `null`), "+X más" as `<button>` that triggers `onVerServicios(row)` |
| VALIDACIÓN | suscripcion validator `text-sm`, pago validator `text-xs` | both `text-xs text-slate-400` |
| ACCIONES | text label buttons | icon buttons (inline SVG, 16×16 px), `title` attribute for hover tooltip, same conditional rendering and click handlers |

**Action icon mapping** (inline SVGs, no external library):

| Action | Icon concept | Color class |
|--------|-------------|-------------|
| Ver Pago | receipt / eye icon | `text-slate-300` |
| Validar Pago | checkmark circle | `text-sky-300` |
| Validar Suscripción | check badge | `text-emerald-300` |
| Cancelar | x circle | `text-rose-300` |
| Editar | pencil | `text-amber-300` |
| Eliminar | trash | `text-rose-400` |

#### G. New VerServiciosModal component

A lightweight read-only modal following the same pattern as `VerDetallePagoModal`:
- Props: `row: SuscripcionAdminRow`, `onClose: () => void`.
- Renders athlete name + plan name in the header.
- Lists all `row.servicios` sorted non-unlimited first.
- Each row: service name, `unidades_restantes ?? '∞'`, `unidades_incluidas ?? '∞'`.
- Dismiss on Escape key or backdrop click.

#### H. Hook and page wiring

- Add `'verServicios'` to `ModalType` union in `useGestionSuscripciones`.
- Expose `openVerServiciosModal(row)` callback.
- Mount `VerServiciosModal` in `GestionSuscripcionesPage` when `modalType === 'verServicios'`.
- Pass `onVerServicios` prop down to `SuscripcionesTable`.

---

## Database Changes

### New migration: `{timestamp}_admin_update_suscripcion_servicio_unidades.sql`

```sql
-- US-0067: Admin override function for suscripcion_servicios.unidades_restantes
-- Direct UPDATE is blocked by RLS (SELECT-only policy). This SECURITY DEFINER
-- function validates that the caller is an admin for the subscription's tenant
-- before performing the update.

create or replace function public.admin_update_suscripcion_servicio_unidades(
  p_suscripcion_id     uuid,
  p_servicio_id        uuid,
  p_unidades_restantes integer   -- NULL = unlimited
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  -- Resolve tenant for this subscription
  select tenant_id
    into v_tenant_id
    from public.suscripciones
   where id = p_suscripcion_id;

  if v_tenant_id is null then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  -- Verify caller is admin for that tenant
  if not exists (
    select 1
      from public.get_admin_tenants_for_authenticated_user() t
     where t.id = v_tenant_id
  ) then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  -- Check constraint: unidades_restantes >= 0
  if p_unidades_restantes is not null and p_unidades_restantes < 0 then
    raise exception 'unidades_restantes cannot be negative' using errcode = '23514';
  end if;

  update public.suscripcion_servicios
     set unidades_restantes = p_unidades_restantes,
         updated_at         = timezone('utc', now())
   where suscripcion_id = p_suscripcion_id
     and servicio_id    = p_servicio_id;
end;
$$;

grant execute on function public.admin_update_suscripcion_servicio_unidades(uuid, uuid, integer)
  to authenticated;
```

No new tables or columns. All other schema objects (`suscripcion_servicios`, `suscripciones`, `servicios`) already exist.

---

## API / Server Actions

### `adminUpdateServicioUnidades` (new service method)

- **File**: `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Function**: `gestionSuscripcionesService.adminUpdateServicioUnidades`
- **Input**:
  - `suscripcionId: string`
  - `servicioId: string`
  - `unidadesRestantes: number | null`
- **Return**: `Promise<void>`
- **Auth**: authenticated user; RPC enforces admin-for-tenant check internally
- **Error**: throws `GestionSuscripcionesServiceError('forbidden', ...)` on `42501`; `GestionSuscripcionesServiceError('unknown', ...)` on other errors

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_admin_update_suscripcion_servicio_unidades.sql` | New SECURITY DEFINER function + grant |
| Types | `src/types/portal/gestion-suscripciones.types.ts` | Add `EditarServicioUnidades` interface; add `servicios` field to `EditarSuscripcionFormValues` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Add `adminUpdateServicioUnidades` method |
| Hook | `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` | Pre-populate servicios; add `setServicioUnidades`; loop in `submit()` |
| Hook | `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts` | Add `'verServicios'` to `ModalType`; expose `openVerServiciosModal` |
| Component | `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` | Add Servicios section below Comentarios |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | All 6 visual column changes; add `onVerServicios` prop |
| Component | `src/components/portal/gestion-suscripciones/VerServiciosModal.tsx` | New read-only modal |
| Component | `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx` | Mount `VerServiciosModal`; pass `onVerServicios` to table |

---

## Acceptance Criteria

1. An admin opening the edit modal for a subscription that has no service assignments sees no "Unidades por Servicio" section — the section is completely absent.
2. An admin opening the edit modal for a subscription with services sees a "Unidades por Servicio" section listing each service with its `unidades_incluidas` (read-only) and an editable `unidades_restantes` field.
3. For a service with `unidades_incluidas = null` (unlimited), the "Ilimitado" checkbox is pre-checked and the number input is hidden.
4. An admin can uncheck "Ilimitado" for an unlimited service, enter a number, save, and the table refreshes showing the new finite unit count.
5. An admin can check "Ilimitado" on a finite service, save, and the database row for that service shows `unidades_restantes = null`.
6. The number input rejects negative values (min=0); submitting with a negative value shows a validation error without making a network call.
7. If no service unit values changed during an edit, no `adminUpdateServicioUnidades` RPC calls are made.
8. A non-admin user calling `admin_update_suscripcion_servicio_unidades` directly receives a `42501` error; the service layer surfaces it as "No tienes permisos para realizar esta acción."
9. In `SuscripcionesTable`, the ATLETA and PLAN columns are visually narrower; long names are truncated with an ellipsis and no horizontal overflow.
10. The INICIO / FIN dates are rendered at the same text size; `fecha_inicio` remains in `text-slate-300` and `fecha_fin` remains in `text-slate-400`.
11. The SERVICIOS cell shows at most 2 services; when a subscription has both finite-unit and unlimited services, finite-unit services appear first.
12. When a subscription has more than 2 services, a "+X más" button is rendered; clicking it opens `VerServiciosModal` with all services listed.
13. `VerServiciosModal` can be dismissed with the Escape key or by clicking the backdrop.
14. The VALIDACIÓN column shows both validator names at the same small text size.
15. All action buttons in the ACCIONES column are icon-only with an inline SVG; hovering each icon shows a tooltip via the `title` attribute describing the action.
16. All modified TypeScript files compile without errors (`get_errors` returns clean results).

---

## Implementation Steps

- [ ] Create migration file `supabase/migrations/{timestamp}_admin_update_suscripcion_servicio_unidades.sql` with the SECURITY DEFINER function and grant
- [ ] Apply migration locally: `npx supabase db reset` or `npx supabase migration up`
- [ ] Add `EditarServicioUnidades` interface and extend `EditarSuscripcionFormValues` in `gestion-suscripciones.types.ts`
- [ ] Add `adminUpdateServicioUnidades` method to `gestion-suscripciones.service.ts`
- [ ] Update `useEditarSuscripcion.ts`: pre-populate servicios, add `setServicioUnidades`, update `submit()` loop
- [ ] Add Servicios edit section to `EditarSuscripcionModal.tsx`
- [ ] Create `VerServiciosModal.tsx`
- [ ] Add `'verServicios'` to `ModalType` and expose `openVerServiciosModal` in `useGestionSuscripciones.ts`
- [ ] Apply all 6 visual changes to `SuscripcionesTable.tsx` and add `onVerServicios` prop
- [ ] Wire `VerServiciosModal` and `onVerServicios` in `GestionSuscripcionesPage.tsx`
- [ ] Run `get_errors` on all modified files and fix any TypeScript issues
- [ ] Test manually: edit modal with 0, 1, and 3+ services; change and revert unit values; verify "+X más" button and modal; verify icon tooltips; verify truncation on long names

---

## Non-Functional Requirements

- **Security**: The `admin_update_suscripcion_servicio_unidades` function validates admin membership for the subscription's tenant before writing. Non-admin callers receive a 42501 error. The service layer maps this to the `'forbidden'` error code with a user-facing message. No direct `UPDATE` is exposed to `authenticated` on `suscripcion_servicios`.
- **Performance**: `fetchSuscripcionesAdmin` already fetches service units in the same round-trip. The edit submit loop calls one RPC per changed service only (not per service in the list). An existing index on `suscripcion_servicios(suscripcion_id)` covers the update WHERE clause.
- **Accessibility**: Icon buttons must have `aria-label` attributes matching the `title` text so screen readers announce the action. The "Ilimitado" checkbox must have an associated `<label>`. Number inputs must have `aria-label` or a visible `<label>` with the service name.
- **Error handling**: Service unit save errors surface as an inline error message in `EditarSuscripcionModal` (same `error` state already used for subscription field errors). The subscription fields are saved first; if service unit updates partially fail, the user sees an error message indicating which step failed and can retry.
