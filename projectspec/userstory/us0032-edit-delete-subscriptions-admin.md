# US0032 — Edit and Delete Subscriptions (Admin)

| Field       | Value                                                  |
|-------------|--------------------------------------------------------|
| **ID**      | US0032                                                 |
| **Name**    | Edit and Delete Subscriptions (Admin)                  |
| **Module**  | Subscription Management (gestion-suscripciones)        |
| **Priority**| High                                                   |

---

## User Story

**As an** organization administrator,
**I want** to edit any field of an existing subscription and permanently delete subscriptions,
**So that** I can correct data entry errors, adjust subscription terms, and remove invalid or test records without having to create new subscriptions.

---

## Description

The current `gestion-suscripciones` page only allows validating (approving/cancelling) subscriptions and validating payments. Administrators need the ability to:

1. **Edit** any field of an existing subscription — including plan, status, dates, class counts, and comments — through a modal form that follows the same visual pattern as `ValidarSuscripcionModal` and `ValidarPagoModal`.
2. **Delete** a subscription record through a confirmation dialog, which also cascades to its associated `pagos` records.

Both actions are added as new buttons in the **Actions** column of `SuscripcionesTable`. All existing action buttons (Validar Pago, Validar Suscripción, Cancelar) remain unchanged.

---

## Acceptance Criteria

1. The actions column in `SuscripcionesTable` shows an **"Editar"** button for every row regardless of status.
2. Clicking "Editar" opens `EditarSuscripcionModal` pre-populated with the current subscription values.
3. The edit modal allows modifying: `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `clases_plan`, and `comentarios`.
4. On successful save, the modal closes and the table refreshes (consistent with existing modal pattern).
5. The actions column shows a **"Eliminar"** button for every row.
6. Clicking "Eliminar" opens `EliminarSuscripcionModal` — a confirmation dialog showing the athlete name and plan name.
7. Confirming deletion permanently removes the subscription (and cascades to its `pagos`) and refreshes the table.
8. Both operations are protected by tenant-scoped RLS: only admins of the tenant can UPDATE or DELETE subscriptions of that tenant.
9. All buttons are disabled while a submission is in progress (no double-submit).
10. Errors from the service layer are displayed inline in the modal.

---

## Database Changes

### Migration: `YYYYMMDD000100_suscripciones_admin_delete_rls.sql`

```sql
-- Grant DELETE on suscripciones to authenticated role
GRANT DELETE ON public.suscripciones TO authenticated;

-- Admin DELETE policy scoped to their tenants
DROP POLICY IF EXISTS suscripciones_delete_admin ON public.suscripciones;
CREATE POLICY suscripciones_delete_admin ON public.suscripciones
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT admin_tenants.id
      FROM public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );
```

> **Note:** The `pagos` table already has `ON DELETE CASCADE` via `pagos.suscripcion_id → suscripciones.id`, so payment records are removed automatically when a subscription is deleted.

---

## Fields Editable in the Edit Modal

| Field             | Type                                         | Constraint                                      |
|-------------------|----------------------------------------------|-------------------------------------------------|
| `plan_id`         | `uuid` (select from plans of the tenant)     | Required; FK → `planes.id`                      |
| `estado`          | `'pendiente' \| 'activa' \| 'vencida' \| 'cancelada'` | Required                                |
| `fecha_inicio`    | `date` (nullable)                            | Must be before `fecha_fin` if both are set       |
| `fecha_fin`       | `date` (nullable)                            | Must be after `fecha_inicio` if both are set     |
| `clases_restantes`| `integer` (nullable, ≥ 0)                   | Optional                                        |
| `clases_plan`     | `integer` (nullable, ≥ 0)                   | Optional; snapshot of plan classes at subscription time |
| `comentarios`     | `text` (nullable)                            | Optional; free-text field                        |

The `plan_id` selector must load the list of active plans for the tenant at modal open time, using the existing plans service or a lightweight query.

---

## API / Service Changes

### File: `src/services/supabase/portal/gestion-suscripciones.service.ts`

Add two new methods to `gestionSuscripcionesService`:

```ts
editarSuscripcion(suscripcionId: string, values: EditarSuscripcionFormValues): Promise<void>
eliminarSuscripcion(suscripcionId: string): Promise<void>
```

**`editarSuscripcion`** — issues a `supabase.from('suscripciones').update(payload).eq('id', suscripcionId)` call. Throws `GestionSuscripcionesServiceError` on failure.

**`eliminarSuscripcion`** — issues a `supabase.from('suscripciones').delete().eq('id', suscripcionId)` call. Throws `GestionSuscripcionesServiceError` on failure.

For the plan selector inside the modal, add an additional lightweight method:

```ts
fetchPlanesParaTenant(tenantId: string): Promise<Array<{ id: string; nombre: string }>>
```

This queries `planes` filtered by `tenant_id` and `activo = true`, returning only `id` and `nombre`.

---

## Type Changes

### File: `src/types/portal/gestion-suscripciones.types.ts`

Add the following interface:

```ts
/** Form values for the edit subscription modal. */
export interface EditarSuscripcionFormValues {
  plan_id: string;
  estado: SuscripcionEstado;
  fecha_inicio: string;   // ISO date string 'YYYY-MM-DD' or ''
  fecha_fin: string;      // ISO date string 'YYYY-MM-DD' or ''
  clases_restantes: number | null;
  clases_plan: number | null;
  comentarios: string;
}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/portal/gestion-suscripciones/EditarSuscripcionModal.tsx` | Edit modal for any field of a subscription |
| `src/components/portal/gestion-suscripciones/EliminarSuscripcionModal.tsx` | Confirmation dialog to permanently delete a subscription |
| `src/hooks/portal/gestion-suscripciones/useEditarSuscripcion.ts` | Hook encapsulating edit form state, validation, and submission |
| `src/hooks/portal/gestion-suscripciones/useEliminarSuscripcion.ts` | Hook encapsulating delete confirmation state and submission |
| `supabase/migrations/YYYYMMDD000100_suscripciones_admin_delete_rls.sql` | Adds DELETE grant and RLS policy for admins |

---

## Files to Modify

### `src/types/portal/gestion-suscripciones.types.ts`
- Add `EditarSuscripcionFormValues` interface.

### `src/services/supabase/portal/gestion-suscripciones.service.ts`
- Add `editarSuscripcion(suscripcionId, values)` method.
- Add `eliminarSuscripcion(suscripcionId)` method.
- Add `fetchPlanesParaTenant(tenantId)` method.

### `src/hooks/portal/gestion-suscripciones/useGestionSuscripciones.ts`
- Extend `ModalType` to `'pago' | 'suscripcion' | 'editar' | 'eliminar' | null`.
- Add `openEditarModal(row: SuscripcionAdminRow): void` and `openEliminarModal(row: SuscripcionAdminRow): void` to the hook result type and implementation.

### `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`
- Add `onEditar: (row: SuscripcionAdminRow) => void` to `SuscripcionesTableProps`.
- Add `onEliminar: (row: SuscripcionAdminRow) => void` to `SuscripcionesTableProps`.
- In the actions `<td>`, add two new buttons after the existing ones:
  - **"Editar"** — always visible, neutral/gray style (`border-slate-400/30 text-slate-300`).
  - **"Eliminar"** — always visible, danger/red style (`border-rose-400/30 text-rose-300`).

### `src/components/portal/gestion-suscripciones/GestionSuscripcionesPage.tsx`
- Import `EditarSuscripcionModal`, `EliminarSuscripcionModal` from the feature slice.
- Destructure `openEditarModal`, `openEliminarModal` from `useGestionSuscripciones`.
- Pass `onEditar={openEditarModal}` and `onEliminar={openEliminarModal}` to `<SuscripcionesTable>`.
- Render `<EditarSuscripcionModal>` when `selectedRow && modalType === 'editar'`.
- Render `<EliminarSuscripcionModal>` when `selectedRow && modalType === 'eliminar'`.

### `src/components/portal/gestion-suscripciones/index.ts`
- Export `EditarSuscripcionModal` and `EliminarSuscripcionModal`.

---

## Component Details

### `EditarSuscripcionModal`

```
Props:
  row: SuscripcionAdminRow
  tenantId: string
  onClose: () => void
  onSuccess: () => void
```

- Uses hook `useEditarSuscripcion({ row, tenantId, onSuccess })`.
- Loads available plans via `gestionSuscripcionesService.fetchPlanesParaTenant(tenantId)` on mount.
- Shows a `<select>` for `plan_id` populated with the fetched plans.
- Shows a `<select>` for `estado` with options: `pendiente`, `activa`, `vencida`, `cancelada`.
- Shows `<input type="date">` controls for `fecha_inicio` and `fecha_fin`.
- Shows `<input type="number">` controls for `clases_restantes` and `clases_plan`.
- Shows `<textarea>` for `comentarios`.
- Validates that `fecha_fin >= fecha_inicio` when both are set, showing an inline error.
- Follows the same modal shell pattern as `ValidarSuscripcionModal`: `fixed inset-0 z-50 flex items-center justify-center bg-black/60`, glass card, Escape key dismiss, click-outside dismiss.

### `EliminarSuscripcionModal`

```
Props:
  row: SuscripcionAdminRow
  onClose: () => void
  onSuccess: () => void
```

- Uses hook `useEliminarSuscripcion({ row, onSuccess })`.
- Displays a warning message: _"¿Estás seguro de que deseas eliminar la suscripción de **{atleta_nombre}** al plan **{plan_nombre}**? Esta acción es irreversible."_
- Follows the same modal shell pattern as other modals.
- Footer has two buttons: "Cancelar" (calls `onClose`) and "Eliminar" (red, calls `confirmar()`).

### `useEditarSuscripcion`

```ts
type UseEditarSuscripcionOptions = {
  row: SuscripcionAdminRow;
  tenantId: string;
  onSuccess: () => void;
};
```

- Initializes `formValues: EditarSuscripcionFormValues` from `row`.
- Provides individual setters for each field plus a combined `submit()` async function.
- `submit()` calls `gestionSuscripcionesService.editarSuscripcion(row.id, formValues)`.
- Tracks `isSubmitting: boolean` and `error: string | null`.

### `useEliminarSuscripcion`

```ts
type UseEliminarSuscripcionOptions = {
  row: SuscripcionAdminRow;
  onSuccess: () => void;
};
```

- Provides `confirmar()` async function that calls `gestionSuscripcionesService.eliminarSuscripcion(row.id)`.
- Tracks `isSubmitting: boolean` and `error: string | null`.

---

## Steps to Complete

1. **Create migration** with the `DELETE` grant and the `suscripciones_delete_admin` RLS policy. Run `npx supabase db reset` (or `db push` in production) to apply.
2. **Update types** — add `EditarSuscripcionFormValues` to `gestion-suscripciones.types.ts`.
3. **Update service** — add `editarSuscripcion`, `eliminarSuscripcion`, `fetchPlanesParaTenant` to the service.
4. **Create `useEditarSuscripcion` hook**.
5. **Create `useEliminarSuscripcion` hook**.
6. **Update `useGestionSuscripciones` hook** — extend `ModalType` and expose `openEditarModal` / `openEliminarModal`.
7. **Create `EditarSuscripcionModal` component**.
8. **Create `EliminarSuscripcionModal` component**.
9. **Update `SuscripcionesTable`** — add `onEditar` / `onEliminar` props and render the new action buttons.
10. **Update `GestionSuscripcionesPage`** — wire new props, destructure new modal openers, render new modals.
11. **Update `index.ts`** — export the two new modal components.
12. **Manual QA** — on the local dev server, verify: editing each field saves correctly; the plan selector shows only active plans; deleting removes the row and its payments; existing actions (Validar Pago, Validar Suscripción, Cancelar) are unaffected.

---

## Non-Functional Requirements

### Security
- The `suscripciones_delete_admin` RLS policy must be in place before the client-side delete is enabled. Without it, Supabase will return a `403` error, but the policy prevents unauthorized deletes at the database level.
- The date validation (`fecha_fin >= fecha_inicio`) must be enforced both client-side (inline error in the modal) and is also covered by the existing DB constraint `suscripciones_fechas_ck`.
- No raw SQL is constructed client-side; all operations use the Supabase typed client to prevent injection.

### Performance
- The plans list for the `plan_id` selector is fetched once at modal open time and cached in local component state. The query selects only `id` and `nombre` columns, keeping the payload minimal.
- Both `editarSuscripcion` and `eliminarSuscripcion` target a single row by primary key (`eq('id', suscripcionId)`), ensuring O(1) database operations.

### Accessibility
- Both modals must use `role="dialog"`, `aria-modal="true"`, and `aria-label` attributes (matching the pattern in `ValidarSuscripcionModal`).
- Focus must be trapped inside the modal while it is open, and returned to the triggering button on close.
- Escape key must dismiss both modals when no submission is in progress.
