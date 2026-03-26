# US-0044 — User Subscriptions and Payments View

## ID
US-0044

## Name
View Own Subscriptions and Upload Payment Proof (Usuario Role)

## As a
Usuario (athlete member of a tenant organization)

## I Want
To see my active and past subscriptions within an organization, view the status of each associated payment, and upload or re-upload my payment proof (comprobante) when required

## So That
I can track my subscription status, confirm that my payment has been received and validated by the admin, and provide proof of payment when my submission was rejected or when I haven't uploaded it yet

---

## Description

### Current State
The `usuario` role has no page to view their own subscriptions or payments within a tenant. The only subscription management UI is `gestion-suscripciones`, which is scoped to the `administrador` role and shows all tenant subscriptions with full CRUD capabilities. The user home dashboard (`/portal/inicio`) shows a partial cross-tenant summary, but there is no tenant-specific, role-appropriate view for the user to interact with their subscriptions.

Additionally, the root `[tenant_id]/layout.tsx` only checks tenant membership — it does not enforce that a `usuario` cannot navigate directly to admin-only routes by URL.

### Proposed Changes

#### New Page & Route
A new page at `(usuario)/mis-suscripciones-y-pagos/page.tsx` under `[tenant_id]`. The page shell must include a **page-level role guard**: if the authenticated user's role for this tenant is not `usuario`, redirect them to the tenant landing page. This closes the existing gap where any authenticated tenant member can access any route group by typing the URL.

#### Page Layout
The page shows a list of the user's subscriptions for the current tenant, ordered by `created_at` descending. Each subscription entry is a card that contains:

**Subscription Card:**
- Plan name (`plan_nombre`)
- `SuscripcionEstadoBadge` (pendiente / activa / vencida / cancelada)
- Start date (`fecha_inicio`) and end date (`fecha_fin`) — shown as "—" when null
- Remaining classes counter (`clases_restantes / clases_plan`) — only visible when not null (class-based plans)

**Payment Section (within the subscription card):**
If the subscription has an associated `pago`:
- Amount (`monto`) formatted as currency
- Payment method name (`metodo_pago_nombre`) — shown as "—" when null
- `PagoEstadoBadge` (pendiente / validado / rechazado)
- Payment date (`fecha_pago`) — shown as "—" when null
- **Comprobante viewer**: if `comprobante_path` is not null, show a preview — inline `<img>` for image types (jpg/jpeg/png/webp), or a PDF icon + download link for PDF. Uses a signed URL with 5-minute TTL.
- **Upload / Re-upload button**: shown only when `pago.estado` is `pendiente` or `rechazado` (i.e., hidden when `validado`). Accepts image/\* and .pdf files, max 5 MB. On success, the comprobante viewer refreshes with the new file.

If the subscription has no associated `pago`, show an informational message: _"No payment record found for this subscription."_

#### Filters
The page includes a filter bar above the subscription list that allows the user to narrow results by:

- **Subscription status** (`suscripcion_estado`): chip/select with options — All, Pendiente, Activa, Vencida, Cancelada. Default: All.
- **Payment status** (`pago_estado`): chip/select with options — All, Pendiente, Validado, Rechazado. Default: All.

Filtering is **client-side** — the full list is fetched once on page load and the hook applies the active filters in memory. No additional server requests are made when the user changes a filter.

When both filters are active, results must satisfy both conditions simultaneously (AND logic).

When filters result in zero matching subscriptions (but the user does have subscriptions for the tenant), display a "No results match the selected filters" message with a "Clear filters" action that resets both filters to All. This is distinct from the true empty state (user has no subscriptions at all).

**Empty State:**
When the user has no subscriptions for this tenant, display a friendly empty state message with a call-to-action linking to the plans page (`gestion-planes`).

#### Navigation
Add a "Mis Suscripciones" entry to the `usuario` menu in `ROLE_TENANT_ITEMS` in `portal.types.ts`, using icon `receipt_long`. Position it after the existing "Planes" entry.

---

## Database Changes

No new tables or columns are required. All needed columns already exist:

- `suscripciones.atleta_id` — filters to the authenticated user
- `suscripciones.tenant_id` — scopes to the current organization
- `pagos.comprobante_path` — stores the relative storage path
- `pagos.estado` — determines upload button visibility

**Existing RLS policies that apply (already in place):**
- `pagos_update_own` (migration `20260325212737_pagos_update_own_comprobante_path.sql`): Athlete can `UPDATE comprobante_path` on `pagos` rows linked to their own `suscripciones`. No migration needed.
- `pagos_select_authenticated`: All authenticated users can select from `pagos`.

No new migrations required.

---

## API / Server Actions

### New: `fetchMisSuscripcionesTenant`
- **File**: `src/services/supabase/portal/mis-suscripciones.service.ts`
- **Signature**: `fetchMisSuscripcionesTenant(supabase: SupabaseClient, tenantId: string, userId: string): Promise<MiSuscripcionRow[]>`
- **Query**: `SELECT` from `suscripciones` where `atleta_id = userId AND tenant_id = tenantId`, ordered by `created_at DESC`
- **Joins**:
  - `planes` → `plan_nombre`
  - `pagos` (single latest per suscripcion, or all — see note below) → all payment fields
  - `tenant_metodos_pago` → `nombre` as `metodo_pago_nombre`, `tipo` as `metodo_pago_tipo`
- **Note**: Each subscription has at most one active payment in the current data model. Fetch the single associated `pago` via `suscripcion_id`.
- **Auth**: Called server-side with authenticated Supabase client. Relies on `pagos_select_authenticated` RLS.
- **Returns**: `MiSuscripcionRow[]`

### Existing: `storageService.uploadPaymentProof` (extend for re-upload)
- **File**: `src/services/supabase/portal/storage.service.ts`
- **Change**: Add an `options?: { upsert?: boolean }` parameter to `uploadPaymentProof()`. When `upsert: true`, the storage upload call uses `upsert: true` to replace an existing file at the same path.
- **Existing signature**: `uploadPaymentProof(supabase, tenantId, userId, pagoId, file)`
- **Extended signature**: `uploadPaymentProof(supabase, tenantId, userId, pagoId, file, options?: { upsert?: boolean })`

### Existing: `pagosService.updateComprobantePath`
- **File**: `src/services/supabase/portal/pagos.service.ts`
- **Signature**: `updateComprobantePath(supabase: SupabaseBrowserClient, pagoId: string, path: string): Promise<void>`
- **No changes needed** — already implemented and works for user context.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/mis-suscripciones-y-pagos.types.ts` | **New** — `MiPagoRow`, `MiSuscripcionRow` |
| Service | `src/services/supabase/portal/mis-suscripciones.service.ts` | **New** — `fetchMisSuscripcionesTenant` |
| Service | `src/services/supabase/portal/storage.service.ts` | **Modify** — add `options?: { upsert?: boolean }` to `uploadPaymentProof` |
| Hook | `src/hooks/portal/mis-suscripciones-y-pagos/useMisSuscripciones.ts` | **New** — fetch subscriptions + payments, expose filter state and filtered results |
| Hook | `src/hooks/portal/mis-suscripciones-y-pagos/useSubirComprobante.ts` | **New** — file validation, upload, `comprobante_path` update |
| Component | `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesFilters.tsx` | **New** — filter bar: subscription status + payment status chip selectors |
| Component | `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx` | **New** — subscription card with plan info and `SuscripcionEstadoBadge` |
| Component | `src/components/portal/mis-suscripciones-y-pagos/PagoCard.tsx` | **New** — payment info, comprobante viewer, upload trigger |
| Component | `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesYPagosPage.tsx` | **New** — page container, list + empty state |
| Component | `src/components/portal/mis-suscripciones-y-pagos/index.ts` | **New** — barrel export |
| Page | `src/app/portal/orgs/[tenant_id]/(usuario)/mis-suscripciones-y-pagos/page.tsx` | **New** — route shell with page-level role guard |
| Types | `src/types/portal.types.ts` | **Modify** — add `mis-suscripciones-y-pagos` entry to `ROLE_TENANT_ITEMS.usuario` |

**Reused without modification:**
- `src/components/portal/gestion-suscripciones/SuscripcionEstadoBadge.tsx`
- `src/components/portal/gestion-suscripciones/PagoEstadoBadge.tsx`
- `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts`
- `src/services/supabase/portal/pagos.service.ts` (`updateComprobantePath`)

---

## Acceptance Criteria

1. A user with role `usuario` sees a "Mis Suscripciones" entry in the tenant sidebar navigation.
2. Navigating to `/portal/orgs/{tenant_id}/mis-suscripciones-y-pagos` renders the page with the user's subscriptions for that specific tenant only — no subscriptions from other tenants appear.
3. Each subscription card shows: plan name, subscription status badge, start/end dates, and classes remaining (if applicable).
4. Each subscription card includes a payment section with: amount, payment method name, payment status badge, and payment date.
5. When `pago.comprobante_path` is not null, a preview is displayed — inline image for jpg/jpeg/png/webp, or a PDF icon with download link for PDF files.
6. When `pago.estado` is `pendiente` or `rechazado`, an upload button is visible in the payment section.
7. When `pago.estado` is `validado`, the upload button is not rendered.
8. Clicking the upload button opens a file picker that accepts image/\* and .pdf files.
9. Selecting a file larger than 5 MB shows a client-side validation error and does not trigger the upload.
10. A successful upload updates `pagos.comprobante_path` in the database and immediately refreshes the comprobante preview with the new file.
11. A re-upload (when a `comprobante_path` already exists and `estado` is `pendiente` or `rechazado`) replaces the existing file in storage and updates the path in the DB.
12. A filter bar is shown above the subscription list with two independent selectors: subscription status and payment status, both defaulting to "All".
13. Selecting a subscription status filter shows only subscriptions whose `estado` matches the selected value; selecting "All" removes the filter.
14. Selecting a payment status filter shows only subscriptions whose associated `pago.estado` matches the selected value; subscriptions without a payment record are excluded when any payment status filter is active.
15. When both filters are active, only subscriptions matching both conditions are shown.
16. When filters produce zero results but the user has subscriptions, a "No results match the selected filters" message is shown with a "Clear filters" button that resets both filters to All.
17. When the user has no subscriptions for the current tenant, an empty state message is displayed with a link to the plans page (filter bar is not shown in this state).
18. When a subscription has no associated `pago`, the payment section shows: _"No payment record found for this subscription."_
19. An authenticated user with role `administrador` or `entrenador` who navigates directly to `/{tenant_id}/mis-suscripciones-y-pagos` is redirected to the tenant landing page (role guard).
20. An unauthenticated user navigating to the page is redirected to `/auth/login` (handled by existing root layout).
21. Upload errors (network failure, storage error) are displayed as an inline error message below the upload button without crashing the page.

---

## Implementation Steps

- [ ] Create `src/types/portal/mis-suscripciones-y-pagos.types.ts` with `MiPagoRow` and `MiSuscripcionRow` interfaces
- [ ] Create `src/services/supabase/portal/mis-suscripciones.service.ts` with `fetchMisSuscripcionesTenant`
- [ ] Modify `src/services/supabase/portal/storage.service.ts` — add `options?: { upsert?: boolean }` to `uploadPaymentProof`
- [ ] Create `src/hooks/portal/mis-suscripciones-y-pagos/useMisSuscripciones.ts` — include `suscripcionEstadoFilter`, `pagoEstadoFilter`, setters, `filteredSuscripciones`, and `clearFilters`
- [ ] Create `src/hooks/portal/mis-suscripciones-y-pagos/useSubirComprobante.ts`
- [ ] Create `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesFilters.tsx`
- [ ] Create `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`
- [ ] Create `src/components/portal/mis-suscripciones-y-pagos/PagoCard.tsx` (reuse `useComprobanteViewer`, `PagoEstadoBadge`)
- [ ] Create `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesYPagosPage.tsx`
- [ ] Create `src/components/portal/mis-suscripciones-y-pagos/index.ts`
- [ ] Create `src/app/portal/orgs/[tenant_id]/(usuario)/mis-suscripciones-y-pagos/page.tsx` with role guard
- [ ] Modify `src/types/portal.types.ts` — add `{ label: 'Mis Suscripciones', path: 'mis-suscripciones-y-pagos', icon: 'receipt_long' }` to `ROLE_TENANT_ITEMS.usuario`
- [ ] Test manually: happy path (view + upload), re-upload flow, `validado` hides button, role guard redirect, empty state, >5 MB file rejection, filter combinations, filter empty state + clear

---

## Non-Functional Requirements

- **Security**:
  - Page-level role guard in `page.tsx`: call `tenantService.canUserAccessTenant()` and redirect if role ≠ `usuario`.
  - `fetchMisSuscripcionesTenant` must always filter by both `tenant_id` and `atleta_id = auth.uid()` to prevent horizontal privilege escalation (user seeing another user's subscriptions).
  - `uploadPaymentProof` uses the authenticated Supabase browser client; the existing `pagos_update_own` RLS policy enforces that only the subscription owner can update `comprobante_path`.
  - File type validation on the client (accept attribute + MIME check before upload). File size max 5 MB enforced client-side before upload.
- **Performance**:
  - `fetchMisSuscripcionesTenant` is a server-side fetch at page load — no extra round trips needed.
  - Signed URLs for comprobante preview are generated client-side via `useComprobanteViewer` (TTL 300 s) so they don't block the initial render.
- **Accessibility**:
  - File input must have a visible label and be keyboard-accessible.
  - Upload errors must be announced via `aria-live` or equivalent mechanism.
  - Status badges reuse existing badge components which already include accessible color + text combinations.
- **Error Handling**:
  - Upload error: inline error message below the upload button (no toast, no full-page error).
  - Data fetch error: full-page error state with retry option.
  - Comprobante viewer fetch error: inline message within the payment card ("Unable to load proof preview").
