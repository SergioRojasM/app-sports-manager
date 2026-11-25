## Why

Tenant payment methods (`tenant_metodos_pago`) only carry text (`valor`, `url`, `comentarios`), so payers must type account numbers by hand even though most local methods (Nequi, Bancolombia, Daviplata, bank keys) are paid by scanning a QR. Letting the administrator attach the QR image to a method reduces payment mistakes and speeds up plan and event-ticket purchases (US-0128).

## What Changes

- Add a nullable `qr_url text` column to `tenant_metodos_pago` holding the signed URL of an optional image.
- Store the image in the existing `org-assets` bucket under `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{timestamp}.{ext}` (new object per upload; no new bucket or storage policy).
- `MetodoPagoFormModal`: new optional "Imagen QR (opcional)" field (JPEG/PNG/WebP, ≤ 2 MB) with preview, "Cambiar" and "Quitar"; upload happens only on save.
- `TenantPaymentMethodsCard`: "QR" indicator on methods that have an image.
- `useMetodosPago.submitForm` gains the upload step and handles the "method created but image upload failed" case.
- `SuscripcionModal`: shows the QR image of the selected method.
- Event wizard step 3 copies `qr_url` into the event's `metodos_pago` snapshot; `EventoMetodoPagoCard` renders it in the checkout (members and anonymous guests).
- No breaking changes: existing rows and existing event snapshots have no `qr_url` and render as today.

## Non-goals

- Generating a QR from `valor` / `url`, or validating that the image actually contains a QR code.
- Deleting orphaned storage objects when an image is replaced or removed.
- Showing the QR in `CrearSuscripcionModal`, receipts, ticket PDFs or emails.
- Backfilling `qr_url` into snapshots of already-saved events.
- Renewing signed URLs before their 1-year expiry (same known limitation as logo/banner).
- Any new page, route, API route handler or storage policy.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `payment-methods-management`: administrators can attach, replace and remove an optional QR image on a payment method; the list flags methods that have one.
- `object-storage`: new storage path and upload helper for payment-method QR images under the tenant's `orgs/{tenantId}/` prefix.
- `subscription-payment-method`: the subscription modal shows the selected method's QR image.
- `team-events-wizard`: the payment-methods step copies `qr_url` into the event snapshot and flags methods with a QR.
- `team-events-checkout`: the payment step renders the QR image stored in the event's payment-method snapshot.

## Impact

### Files to create

| Area | File | Purpose |
|------|------|---------|
| Migration | `supabase/migrations/{timestamp}_tenant_metodos_pago_qr_url.sql` | Add nullable `qr_url text` + column comment (local only) |

### Files to modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/portal/tenant/MetodoPagoFormModal.tsx` | "Imagen QR" field; `onSubmit(data, qr)` |
| Component | `src/components/portal/tenant/TenantPaymentMethodsCard.tsx` | "QR" indicator; pass new `onSubmit` signature |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Render QR of the selected method |
| Component | `src/components/portal/eventos/EventoMetodoPagoCard.tsx` | Render QR; `hasDetails` includes `qr_url` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | `toSnapshot` copies `qr_url`; "QR" indicator |
| Hook | `src/hooks/portal/tenant/useMetodosPago.ts` | `submitForm(data, qr)` with upload + partial-failure handling |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadMetodoPagoQr` |
| Service | `src/services/supabase/portal/metodos-pago.service.ts` | `qr_url` in `COLUMNS`, create, update |
| Types | `src/types/portal/metodos-pago.types.ts` | `qr_url`, `MetodoPagoQrChange`, MIME/size constants |
| Types | `src/types/portal/storage.types.ts` | Add `buildMetodoPagoQrPath` |
| Types | `src/types/portal/eventos.types.ts` | Optional `qr_url` on `EventoMetodoPagoSnapshot` |
| Docs | `projectspec/03-project-structure.md` | Update touched entries and storage path notes |

No page files change: `gestion-organizacion/page.tsx` and the checkout/plan pages keep delegating to the components above.

### Systems

- **Database**: one additive, nullable column; existing RLS on `tenant_metodos_pago` covers it. `guardar_evento_completo` is unchanged (it stores the snapshot JSON as-is).
- **Storage**: existing `org-assets` bucket and `org_admin_upload` policy; reads go through signed URLs.
- **Dependencies**: none added.

### Implementation plan

1. Create branch `feat/payment-method-qr-image`.
2. Migration: add `qr_url` and apply locally.
3. Types: `metodos-pago.types.ts`, `storage.types.ts`, `eventos.types.ts`.
4. Services: `uploadMetodoPagoQr`, `metodosPagoService` column/create/update.
5. Hook: `useMetodosPago.submitForm(data, qr)`.
6. Admin components: `MetodoPagoFormModal`, `TenantPaymentMethodsCard`.
7. Payer components: `SuscripcionModal`, `EventoMetodoPagoCard`; wizard `EventoMetodosPagoStep`.
8. Manual verification (happy path, validation, upload failure, legacy events, guest checkout, RLS).
9. Update `projectspec/03-project-structure.md`; type-check, lint, test; commit message + PR description.
