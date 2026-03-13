# US-0028 — Manage Payment Methods

| Field       | Value                                |
| ----------- | ------------------------------------ |
| **ID**      | US-0028                              |
| **Name**    | Manage Payment Methods               |
| **Status**  | Draft                                |
| **Created** | 2026-03-13                           |

---

## As a …

Organization administrator.

## I want …

To create, edit, and delete payment methods for my organization, and have those methods displayed to users when they subscribe to a plan.

## So that …

Users can see the available payment options (bank account, mobile payment, payment gateway URL, etc.) at the time of acquiring a plan, and know exactly where and how to make their payment.

---

## Description

Currently the subscription modal (`SuscripcionModal`) allows users to request a plan but does not present the organization's accepted payment methods. The `pagos` table has a `metodo_pago` column constrained to generic values (`transferencia`, `efectivo`, `tarjeta`) that do not reflect the real payment channels each organization uses.

This feature introduces a new `tenant_metodos_pago` table to store organization-specific payment methods—each with a name, value (account number, phone number, etc.), an optional redirect URL to the organization's payment gateway, and comments. A new card is added to the Organization Management page so admins can perform full CRUD on these records. Finally, the Subscription Modal is extended with a required dropdown showing the organization's active payment methods and the selected method is persisted when creating the `pagos` record.

---

## Database Changes

### New table: `tenant_metodos_pago`

| Column        | Type                        | Constraints / Default                                       |
| ------------- | --------------------------- | ----------------------------------------------------------- |
| `id`          | `uuid`                      | PK, `DEFAULT gen_random_uuid()`                             |
| `tenant_id`   | `uuid NOT NULL`             | FK → `tenants(id) ON DELETE CASCADE`                        |
| `nombre`      | `varchar(100) NOT NULL`     | Display name (e.g. "Nequi", "Bancolombia Ahorros")          |
| `tipo`        | `varchar(50) NOT NULL`      | CHECK `IN ('transferencia','efectivo','tarjeta','pasarela','otro')` |
| `valor`       | `varchar(255)`              | Account number, phone number, wallet address, etc.          |
| `url`         | `varchar(500)`              | Optional redirect URL to the payment gateway                |
| `comentarios` | `text`                      | Free-text instructions for the user                         |
| `activo`      | `boolean NOT NULL`          | `DEFAULT true`                                              |
| `orden`       | `integer NOT NULL`          | `DEFAULT 0` — display order                                 |
| `created_at`  | `timestamptz NOT NULL`      | `DEFAULT timezone('utc', now())`                            |
| `updated_at`  | `timestamptz NOT NULL`      | `DEFAULT timezone('utc', now())`                            |

**Indexes:**

- `idx_tenant_metodos_pago_tenant_id` on `(tenant_id)`
- UNIQUE constraint `tenant_metodos_pago_tenant_nombre_uk` on `(tenant_id, nombre)`

**Trigger:**

- `tenant_metodos_pago_set_updated_at` — reuse the existing `set_updated_at()` trigger function to auto-update `updated_at` before UPDATE.

### Updated table: `pagos`

- **Drop** the existing constraint `pagos_metodo_pago_ck`.
- **Add** column `metodo_pago_id uuid` — FK → `tenant_metodos_pago(id) ON DELETE SET NULL`.
- **Add** index `idx_pagos_metodo_pago_id` on `(metodo_pago_id)`.
- The legacy `metodo_pago varchar(50)` column is kept for backward compatibility but is no longer written to by new code.

### RLS Policies on `tenant_metodos_pago`

| Policy name                            | Operation | Who                          | Rule                                 |
| -------------------------------------- | --------- | ---------------------------- | ------------------------------------ |
| `tenant_metodos_pago_select_member`    | SELECT    | Authenticated users          | User is a member of the tenant (via `miembros_tenant`) |
| `tenant_metodos_pago_insert_admin`     | INSERT    | Authenticated admin          | User has `administrador` role in the tenant |
| `tenant_metodos_pago_update_admin`     | UPDATE    | Authenticated admin          | User has `administrador` role in the tenant |
| `tenant_metodos_pago_delete_admin`     | DELETE    | Authenticated admin          | User has `administrador` role in the tenant |

---

## Migration File

**Name:** `supabase/migrations/<timestamp>_tenant_metodos_pago.sql`

The migration must:

1. Create `tenant_metodos_pago` table with all columns, constraints, and indexes above.
2. Attach `set_updated_at()` trigger.
3. Enable RLS on `tenant_metodos_pago`.
4. Create the four RLS policies listed above.
5. Add `metodo_pago_id` column to `pagos`.
6. Drop `pagos_metodo_pago_ck` constraint.
7. Add FK and index for `pagos.metodo_pago_id`.

---

## Feature 1 — Payment Methods Card (Organization Management Page)

### Route

`/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion`

The existing page renders `<TenantInfoCards>`. A new card component `<TenantPaymentMethodsCard>` is added below the existing cards in the same page.

### UI Behavior

- **Card title:** "Métodos de Pago"
- **Empty state:** "No hay métodos de pago configurados. Agrega uno para que tus usuarios puedan realizar pagos."
- **List view:** Display each payment method as a row or card item showing: name, type badge, value (masked if needed), URL (as a link icon), status badge (activo/inactivo), and action buttons (edit, delete).
- **Add button:** Opens a form modal/drawer to create a new payment method.
- **Edit button:** Opens the same modal/drawer pre-populated with the existing data.
- **Delete button:** Confirmation dialog → soft or hard delete. Since this uses RLS cascade, hard delete is acceptable. If the method is referenced in `pagos.metodo_pago_id`, the FK is `ON DELETE SET NULL` so the payment record remains intact.
- **Order:** Items displayed sorted by `orden ASC, nombre ASC`.

### Form Fields

| Field          | Type       | Required | Validation                                  |
| -------------- | ---------- | -------- | ------------------------------------------- |
| `nombre`       | text input | Yes      | 1–100 chars, unique per tenant              |
| `tipo`         | select     | Yes      | Options: `transferencia`, `efectivo`, `tarjeta`, `pasarela`, `otro` |
| `valor`        | text input | No       | Max 255 chars                               |
| `url`          | text input | No       | Max 500 chars, must be valid URL if provided |
| `comentarios`  | textarea   | No       | Free text                                   |
| `activo`       | toggle     | No       | Default `true`                              |

---

## Feature 2 — Payment Method Selection in Subscription Modal

### Component

`src/components/portal/planes/SuscripcionModal.tsx`

### Changes

- Add a **dropdown** (`<select>`) labeled "Método de Pago" between the plan summary and the Comentarios textarea.
- Populate the dropdown with the tenant's **active** (`activo = true`) payment methods, ordered by `orden ASC, nombre ASC`.
- Each option displays: `{nombre}` — and below the dropdown, show the selected method's `valor`, `url` (as clickable link opening in new tab), and `comentarios` as helper text.
- The dropdown is **required** — the Confirm button stays disabled until a method is selected.
- On submit, `metodo_pago_id` is passed alongside the existing payload.

### Hook Change

`src/hooks/portal/planes/useSuscripcion.ts`

- Accept `metodo_pago_id` in the submit data type.
- Fetch active payment methods when the modal opens using the new service.
- Pass `metodo_pago_id` to `pagosService.createPago()`.

---

## Files to Create

| Layer        | Path                                                                    | Purpose                                                         |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Migration    | `supabase/migrations/<ts>_tenant_metodos_pago.sql`                      | DDL for new table, RLS, pagos FK                                |
| Type         | `src/types/portal/metodos-pago.types.ts`                                | Domain types for `MetodoPago` entity                            |
| Service      | `src/services/supabase/portal/metodos-pago.service.ts`                  | CRUD operations for `tenant_metodos_pago`                       |
| Hook         | `src/hooks/portal/tenant/useMetodosPago.ts`                             | Orchestrates list + CRUD state for the admin card               |
| Component    | `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`             | Card listing payment methods with add/edit/delete               |
| Component    | `src/components/portal/tenant/MetodoPagoFormModal.tsx`                  | Form modal for create/edit payment method                       |

## Files to Modify

| Path                                                                                           | Change                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`                | Import and render `<TenantPaymentMethodsCard>`                |
| `src/components/portal/planes/SuscripcionModal.tsx`                                            | Add payment method dropdown + detail display                  |
| `src/hooks/portal/planes/useSuscripcion.ts`                                                    | Fetch active methods on open, pass `metodo_pago_id` on submit |
| `src/services/supabase/portal/pagos.service.ts`                                                | Accept optional `metodo_pago_id` in `createPago` payload      |
| `src/types/portal/pagos.types.ts`                                                              | Add `metodo_pago_id` field to `CreatePagoInput`               |

---

## Type Definitions

### `src/types/portal/metodos-pago.types.ts`

```ts
export type MetodoPagoTipo = 'transferencia' | 'efectivo' | 'tarjeta' | 'pasarela' | 'otro';

export type MetodoPago = {
  id: string;
  tenant_id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor: string | null;
  url: string | null;
  comentarios: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type CreateMetodoPagoInput = {
  tenant_id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor?: string | null;
  url?: string | null;
  comentarios?: string | null;
  activo?: boolean;
  orden?: number;
};

export type UpdateMetodoPagoInput = Partial<Omit<CreateMetodoPagoInput, 'tenant_id'>>;

export type MetodoPagoFormValues = {
  nombre: string;
  tipo: MetodoPagoTipo | '';
  valor: string;
  url: string;
  comentarios: string;
  activo: boolean;
};

export type MetodoPagoFormField = 'nombre' | 'tipo' | 'valor' | 'url' | 'comentarios';
export type MetodoPagoFieldErrors = Partial<Record<MetodoPagoFormField, string>>;
```

---

## Service Layer

### `src/services/supabase/portal/metodos-pago.service.ts`

| Method                                                | Description                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `listByTenant(tenantId: string)`                      | SELECT all methods for the tenant ordered by `orden, nombre` |
| `listActiveByTenant(tenantId: string)`                | SELECT where `activo = true`, same order                    |
| `create(input: CreateMetodoPagoInput)`                | INSERT and return the created record                        |
| `update(id: string, input: UpdateMetodoPagoInput)`    | UPDATE and return the updated record                        |
| `remove(id: string)`                                  | DELETE the record                                           |

All methods use `createClient()` from `@/services/supabase/client` and operate on the `tenant_metodos_pago` table. RLS enforces authorization.

---

## Acceptance Criteria

### Admin — Payment Methods CRUD

1. [ ] Admin navigates to Organization Management and sees a "Métodos de Pago" card below the existing organization info cards.
2. [ ] If no payment methods exist, the card shows an appropriate empty state message.
3. [ ] Admin can click "Agregar método de pago" to open a form modal.
4. [ ] The form validates required fields (`nombre`, `tipo`) and shows inline errors.
5. [ ] The `url` field validates as a well-formed URL when a value is provided.
6. [ ] The `nombre` must be unique per tenant — a duplicate shows an error.
7. [ ] Admin can edit an existing payment method — pre-populated form, same validation.
8. [ ] Admin can delete a payment method — confirmation dialog appears before deletion.
9. [ ] Deleting a method referenced in `pagos.metodo_pago_id` sets the FK to NULL without error.
10. [ ] Payment methods display in order (`orden ASC, nombre ASC`).
11. [ ] Active/inactive status is clearly visible with a badge.

### User — Subscription Modal

12. [ ] When a user opens the "Adquirir Plan" modal, a "Método de Pago" dropdown is shown.
13. [ ] The dropdown is populated with only **active** payment methods for the tenant.
14. [ ] If no payment methods are configured, the dropdown shows a message "No hay métodos de pago disponibles" and the Confirm button is disabled.
15. [ ] Selecting a method shows its detail below: `valor`, clickable `url` (opens in new tab), and `comentarios` as helper text.
16. [ ] The Confirm button remains disabled until a payment method is selected.
17. [ ] On confirm, the `metodo_pago_id` of the selected method is stored in the `pagos` record.

### Database & Security

18. [ ] The `tenant_metodos_pago` table is created with all specified columns, constraints, indexes, and trigger.
19. [ ] RLS is enabled: only authenticated tenant members can SELECT; only admins can INSERT/UPDATE/DELETE.
20. [ ] The `pagos` table gains the `metodo_pago_id` FK column with `ON DELETE SET NULL`.
21. [ ] The legacy `pagos_metodo_pago_ck` constraint is dropped.

---

## Non-Functional Requirements

- **Security:** All operations go through Supabase RLS. No direct DB access from components. Service layer uses `createClient()`.
- **Performance:** Payment methods are fetched once when the card mounts (admin view) or when the subscription modal opens (user view). No unnecessary re-fetches.
- **Architecture:** Follow hexagonal architecture — Page → Component → Hook → Service → Types. Co-locate by feature slice.
- **TypeScript:** Strict types, no `any`. All new types in `src/types/portal/metodos-pago.types.ts`.
- **UI Consistency:** Match existing card and modal styling (glass, portal-border, navy-medium, turquoise accents). Use the same patterns as `TenantIdentityCard`, `TenantContactCard`, and `SuscripcionModal`.
- **Accessibility:** Labels on all form fields, proper `role` attributes on dialogs, keyboard-navigable dropdown, `aria-modal` on modals.
