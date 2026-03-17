## Context

The subscription flow in `SuscripcionModal` + `useSuscripcion` currently creates a `pagos` record with a generic, unconstrained `metodo_pago` string. Organizations use diverse local payment channels (mobile wallets like Nequi, bank transfers, payment gateway links), but the system has no model for them. The `pagos_metodo_pago_ck` constraint (`transferencia | efectivo | tarjeta`) is actively blocking these real-world values.

This design introduces the `tenant_metodos_pago` table, a full admin CRUD surface in the Organization Management page, and an extension to the subscription modal that requires users to select a payment method before confirming.

**Current state:**
- `SuscripcionModal` captures plan, comments, and submits without payment method data.
- `useSuscripcion` creates a `suscripcion` + `pago` record; `pago.metodo_pago` is never written.
- `gestion-organizacion` page renders only `<TenantInfoCards>` (identity + contact).
- `tenant` feature slice has established patterns: `useTenantView`, `useEditTenant`, `TenantIdentityCard`, `TenantContactCard`, `EditTenantDrawer`.

**Constraints:**
- No external payment processing. URL field is informational only.
- Legacy `pagos.metodo_pago varchar` column must remain (backward compatibility).
- RLS must allow members to read methods (they need them in the subscription modal) but only admins can write.

---

## Goals / Non-Goals

**Goals:**
- Introduce `tenant_metodos_pago` table with full CRUD for admins via a new card on `gestion-organizacion`.
- Extend `pagos` schema with a typed FK `metodo_pago_id` pointing to the new table.
- Require payment method selection in `SuscripcionModal`, persisting the FK on subscription creation.
- Stay consistent with the existing `tenant` feature slice patterns (service → hook → component).

**Non-Goals:**
- Processing or validating actual payments.
- Backfilling `metodo_pago_id` on existing `pagos` rows.
- Surfacing payment method details in `gestion-suscripciones`.
- Removing `pagos.metodo_pago varchar` or the `metodo_pago` column from the `Pago` type.

---

## Decisions

### 1. New table: `tenant_metodos_pago` with per-tenant scoping and `set_updated_at` trigger

**Decision:** Create a new standalone table `tenant_metodos_pago` with tenant-scoped RLS (member SELECT, admin INSERT/UPDATE/DELETE). Reuse the existing `set_updated_at()` trigger function.

**Rationale:** Payment methods are a tenant configuration resource. Reusing the existing trigger keeps migration surface small. An independent table — rather than a JSONB column on `tenants` — allows per-record ordering, activation flags, and FK references from `pagos`.

**Alternative considered:** Embed methods as JSONB on `tenants`. Rejected because it prevents FK integrity with `pagos.metodo_pago_id` and makes per-item ordering/activation awkward.

---

### 2. Drop `pagos_metodo_pago_ck`, add `metodo_pago_id` FK with ON DELETE SET NULL

**Decision:** Add `pagos.metodo_pago_id uuid FK → tenant_metodos_pago(id) ON DELETE SET NULL`. Drop the `pagos_metodo_pago_ck` constraint. Keep the legacy `metodo_pago varchar` column; new code never writes to it.

**Rationale:** `ON DELETE SET NULL` means deleting a payment method does not invalidate historical payment records. The legacy column is kept for data integrity of existing rows; removing it is a separate cleanup concern.

**Alternative considered:** Rename `metodo_pago` to `metodo_pago_nombre` and write both columns. Rejected for unnecessary complexity. The old column will simply be null for new records.

---

### 3. Load active payment methods in `useSuscripcion.openModal` — not as a separate hook

**Decision:** Extend `useSuscripcion` to fetch active payment methods inside `openModal` (alongside the existing duplicate-subscription check). Active methods are stored in a new state slice `metodosPago: MetodoPago[]`. The selected method ID is part of the submit payload.

**Rationale:** `useSuscripcion` already owns the modal lifecycle. Bundling the methods fetch keeps the modal's data dependencies in one place instead of forcing the parent render tree to coordinate two hooks. The fetch is lightweight (small per-tenant list) and can run concurrently with the duplicate check.

**Alternative considered:** A separate `useActiveMetodosPago` hook called in the parent or modal. Rejected because it would require the parent (currently stateless for this feature) to thread extra props down.

**`SuscripcionSubmitData` change:**
```ts
type SuscripcionSubmitData = {
  comentarios: string;
  metodo_pago_id: string;
};
```
The Confirm button is disabled if no method is selected, so `metodo_pago_id` can be typed non-optional.

---

### 4. Admin card follows the `TenantInfoCards` pattern — separate client component + dedicated hook

**Decision:** `TenantPaymentMethodsCard` is a `'use client'` component receiving only `tenantId`. It uses `useMetodosPago({ tenantId })` for all state. The form modal (`MetodoPagoFormModal`) is controlled by the card.

`gestion-organizacion/page.tsx` renders both `<TenantInfoCards>` and `<TenantPaymentMethodsCard>` side-by-side, keeping the page a composition-only Server Component.

**Rationale:** Mirrors the existing tenant card architecture. Server Component page with client-only state in leaf components — consistent with the project architecture.

**`useMetodosPago` interface:**
```ts
type UseMetodosPagoResult = {
  metodos: MetodoPago[];
  loading: boolean;
  error: string | null;
  // modal state
  formOpen: boolean;
  editTarget: MetodoPago | null;
  deleteTarget: MetodoPago | null;
  isSubmitting: boolean;
  // actions
  openCreate: () => void;
  openEdit: (m: MetodoPago) => void;
  closeForm: () => void;
  submitForm: (data: CreateMetodoPagoInput | UpdateMetodoPagoInput) => Promise<void>;
  openDelete: (m: MetodoPago) => void;
  closeDelete: () => void;
  confirmDelete: () => Promise<void>;
};
```

---

### 5. Service layer: `metodos-pago.service.ts` with four operations

**Decision:** Create `metodos-pago.service.ts` with:
- `getMetodosPago(tenantId, onlyActive?)` — returns list sorted by `orden ASC, nombre ASC`
- `createMetodoPago(payload)`, `updateMetodoPago(id, payload)`, `deleteMetodoPago(id)`

**Rationale:** Consistent with other portal services (thin Supabase wrappers, typed inputs). No business logic in the service layer.

---

### 6. Form validation — client-side only, field-level errors

**Decision:** `MetodoPagoFormModal` validates client-side before calling the hook's `submitForm`. Required fields: `nombre`, `tipo`. URL field must pass `isValidUrl()` when non-empty.

**Rationale:** Consistent with `EditTenantDrawer` — server errors in `useMetodosPago.error` are surfaced in the card. The unique constraint `(tenant_id, nombre)` will surface as a service-layer error if violated.

---

### 7. Layer order (page → component → hook → service → types)

Implementation proceeds:
1. Migration
2. Types (`metodos-pago.types.ts`, update `pagos.types.ts`)
3. Service (`metodos-pago.service.ts`, update `pagos.service.ts`)
4. Hook (`useMetodosPago.ts`, update `useSuscripcion.ts`)
5. Components (`MetodoPagoFormModal.tsx`, `TenantPaymentMethodsCard.tsx`, update `SuscripcionModal.tsx`)
6. Page (`gestion-organizacion/page.tsx`)

---

## Risks / Trade-offs

**[Risk] Tenant has no active payment methods → user cannot subscribe.**
→ Mitigation: Show a clear inline message in `SuscripcionModal` when the methods list is empty: "Esta organización no ha configurado métodos de pago. Contacta al administrador." Confirm button disabled. Documents clearly where the admin action is needed.

**[Risk] `openModal` fetches both duplicate check and methods fetch in parallel — either can fail.**
→ Mitigation: Methods fetch failure is non-blocking (sets `metodosPago: []` + error message visible in modal). Duplicate check failure is already non-blocking per existing code.

**[Risk] `metodo_pago_id` FK + ON DELETE SET NULL — admin deletes a method referenced by open pagos.**
→ Mitigation: Acceptable by design. Historical `pagos` rows lose their method link but remain intact. Admin should only delete unused methods; no guard enforced at DB level.

**[Risk] `SuscripcionModal` type signature change breaks existing consumers.**
→ Mitigation: The change adds a new required prop `metodosPago` and changes `onConfirm` payload type. Only one caller (`PlanesRolePage` or equivalent via `useSuscripcion`). Update caller at the same time the modal is changed.

**[Trade-off] Methods fetched on every `openModal` call instead of once per page load.**
→ Acceptable: the list is small and the admin can update it at any time. Stale data risk is minimized. A future optimization could cache per session.

---

## Migration Plan

**Migration file:** `supabase/migrations/<ts>_tenant_metodos_pago.sql`

Steps in order:
1. Create `tenant_metodos_pago` table with all columns, constraints, and indexes.
2. Attach `set_updated_at()` trigger as `tenant_metodos_pago_set_updated_at`.
3. Enable RLS on `tenant_metodos_pago`.
4. Create four RLS policies (member SELECT, admin INSERT/UPDATE/DELETE).
5. Add `metodo_pago_id uuid` column to `pagos`.
6. Drop `pagos_metodo_pago_ck` constraint.
7. Add FK `pagos_metodo_pago_id_fkey` → `tenant_metodos_pago(id) ON DELETE SET NULL`.
8. Add index `idx_pagos_metodo_pago_id` on `pagos(metodo_pago_id)`.

**Rollback:** The migration is additive (new table, new FK column). Rolling back requires dropping the FK column from `pagos`, dropping the constraint, and dropping `tenant_metodos_pago`. No data loss risk because `metodo_pago_id` is null for all existing rows.

**Local testing:** `npx supabase db reset` after applying the migration. Verify with `npx supabase db lint`.

---

## Open Questions

- **Should `orden` be editable via drag-and-drop in the future?** Currently, `orden` is an integer set manually in the form. The card displays `ORDER BY orden ASC, nombre ASC`. A drag-and-drop UX would require a bulk-update operation — out of scope for now.
- **Should inactive methods be visible to the admin in the card?** US-0028 implies yes (admin needs to see and re-activate them). The service `getMetodosPago(tenantId, false)` should return all methods. Resolved: card shows all methods with an `activo` badge; subscription modal only shows active ones.
