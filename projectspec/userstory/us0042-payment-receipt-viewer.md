# US-0042 — Payment Receipt Viewer in Payment Validation Modal

## ID
US-0042

## Name
View Payment Method and Download Receipt in the Payment Validation Modal

## As a
Organization administrator

## I Want
To see the full payment method name and be able to preview or download the payment receipt directly within the "Validar Pago" modal

## So That
I can verify payment details — method name, amount, and attached proof — without leaving the modal or relying on a long-lived external link that may have expired

---

## Description

### Current State

- The `ValidarPagoModal` displays `pago.metodo_pago`, which is the legacy free-text column (`'transferencia' | 'efectivo' | 'tarjeta'`). Since US-0028 introduced `pagos.metodo_pago_id` (FK → `tenant_metodos_pago`), the actual payment method name (`tenant_metodos_pago.nombre`) is never fetched or shown in the modal.
- `pago.comprobante_url` stores a long-lived Supabase Storage signed URL (1-year TTL, set during US-0041). The modal renders a single `<a href>` link ("Ver comprobante") that opens the file in a new tab. There is no:
  - Inline image preview for JPEG/PNG/WebP receipts
  - Download button
  - Fresh short-lived signed URL (the stored URL TTL cannot be shortened and may be stale if re-generated)
- `pagos` has no `comprobante_path` column — only `comprobante_url`. Without the storage path, a fresh short-lived signed URL cannot be generated on-demand.
- The `gestion-suscripciones.service.ts` query does not join `tenant_metodos_pago` via `metodo_pago_id`, so the payment method name is not available in `SuscripcionAdminRow.pago`.

### Proposed Changes

#### 1. Database — Add `comprobante_path` to `pagos`

Add a nullable `text` column `comprobante_path` to `pagos` to store the relative storage path (e.g., `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}`). This decouples the storage path from the signed URL so a fresh signed URL can be generated at any point.

#### 2. Service — Update subscription query to expose payment method name

In `gestion-suscripciones.service.ts`, extend the Supabase query to join `tenant_metodos_pago` via `metodo_pago_id` and fetch `id, nombre, tipo`. Expose the resolved name (`metodo_pago_nombre`) and type (`metodo_pago_tipo`) in `PagoAdminRow`.

#### 3. Service — Store `comprobante_path` when creating/patching pago

In `useSuscripcion.ts`, after `storageService.uploadPaymentProof` returns `{ signedUrl, path }`, patch both `comprobante_url` (existing) and `comprobante_path` (new) on the `pagos` record.

#### 4. Hook — `useComprobanteViewer`

A new client hook that accepts a `comprobantePath: string | null` and generates a fresh short-lived signed URL on mount (TTL = 300 s / 5 minutes). Exposes `{ signedUrl, isLoading, error }`. Used exclusively within `ValidarPagoModal`.

#### 5. Component — `ValidarPagoModal` UI updates

- **Payment method row**: Replace `pago.metodo_pago` (legacy text) with `pago.metodo_pago_nombre` (the joined `tenant_metodos_pago.nombre`). If `metodo_pago_nombre` is null, fall back gracefully to `pago.metodo_pago ?? '—'`.
- **Receipt section**: When `pago.comprobante_path` is set, render a dedicated receipt section:
  - Call `useComprobanteViewer(pago.comprobante_path)` to obtain a fresh 5-minute signed URL.
  - **Image preview**: If the path ends with `.jpg`, `.jpeg`, `.png`, or `.webp`, render an `<img>` thumbnail (max-height 160 px, object-contain) inside a bordered container. Clicking the thumbnail opens the signed URL in a new tab.
  - **PDF indicator**: If the path ends with `.pdf`, render a PDF icon + filename label instead of an image preview.
  - **Preview link**: A "Ver comprobante" anchor that opens the signed URL in `_blank`.
  - **Download link**: A "Descargar" anchor using `download` attribute against the signed URL so the browser triggers a file download.
  - While `isLoading`, show a spinner/skeleton in place of the preview and disable the buttons.
  - If `error`, show a muted inline error message ("No fue posible cargar el comprobante") and hide preview/download links.
- **Fallback**: If `pago.comprobante_path` is null but `pago.comprobante_url` is set, retain the existing "Ver comprobante" external link (legacy behavior, no fresh URL generation).

---

## Database Changes

### Migration: add `comprobante_path` to `pagos`

```sql
-- supabase/migrations/{timestamp}_pagos_add_comprobante_path.sql
alter table public.pagos
  add column if not exists comprobante_path text;
```

No new RLS policies required — `pagos` RLS already governs row-level access. The new column is a plain data field.

---

## API / Server Actions

### `storageService.getSignedUrl` (existing — no change)

- **File**: `src/services/supabase/portal/storage.service.ts`
- **Description**: Already implemented in US-0041. Generates a signed URL for any storage path.
- **Used by**: `useComprobanteViewer` with `expiresIn = 300` (5 minutes).

### `gestionSuscripcionesService.fetchSuscripcionesAdmin` (modify)

- **File**: `src/services/supabase/portal/gestion-suscripciones.service.ts`
- **Change**: Extend the `pagos(...)` sub-select to include `metodo_pago_id, comprobante_path, metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(id, nombre, tipo)`.
- **Extract**: Map `metodo_pago_ref.nombre` → `metodo_pago_nombre` and `metodo_pago_ref.tipo` → `metodo_pago_tipo` in `mapRawRow`.

### `pagosService.updateComprobanteUrl` (existing — extend)

- **File**: `src/services/supabase/portal/pagos.service.ts`
- **Change**: Rename/extend to `updateComprobante(pagoId, url, path)` that patches both `comprobante_url` and `comprobante_path` in one UPDATE call, or add a separate `updateComprobantePath` function.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_pagos_add_comprobante_path.sql` | Add `comprobante_path text` column to `pagos` |
| Types | `src/types/portal/gestion-suscripciones.types.ts` | Add `metodo_pago_nombre`, `metodo_pago_tipo`, `comprobante_path` to `PagoAdminRow` |
| Types | `src/types/portal/pagos.types.ts` | Add `comprobante_path: string \| null` to `Pago` and `PagoInsert` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Extend query to join `tenant_metodos_pago` via `metodo_pago_id`; map new fields in `mapRawRow`; update `RawSuscripcionRow` `pagos` array type |
| Service | `src/services/supabase/portal/pagos.service.ts` | Extend `updateComprobanteUrl` (or add overload) to also patch `comprobante_path` |
| Hook | `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts` | New hook — calls `storageService.getSignedUrl(path, 300)` on mount; exposes `{ signedUrl, isLoading, error }` |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | Patch `comprobante_path` alongside `comprobante_url` after proof upload |
| Component | `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx` | Show `metodo_pago_nombre`; add receipt preview section using `useComprobanteViewer`; add download link |

---

## Acceptance Criteria

1. When the `ValidarPagoModal` is opened for a subscription whose payment has a `metodo_pago_id`, the "Método" row displays the value of `tenant_metodos_pago.nombre` (e.g., "Transferencia Nequi"), not the legacy enum value.
2. When `metodo_pago_id` is null but `metodo_pago` (legacy field) has a value, that legacy value is displayed as the fallback.
3. When neither `metodo_pago_id` nor `metodo_pago` is set, the "Método" row displays "—".
4. When the payment has a `comprobante_path` (i.e., the receipt was uploaded via Supabase Storage), the modal fetches a fresh 5-minute signed URL on open.
5. If the receipt file is an image (`.jpg`, `.jpeg`, `.png`, `.webp`), an inline thumbnail preview is displayed in the modal.
6. If the receipt file is a PDF (`.pdf`), a PDF icon and filename are shown instead of an inline preview.
7. A "Ver comprobante" link opens the fresh signed URL in a new browser tab.
8. A "Descargar" link triggers a file download of the receipt using the fresh signed URL.
9. While the signed URL is being fetched, a loading indicator is shown in the receipt section and the preview/download links are disabled.
10. If `storageService.getSignedUrl` fails, an error message "No fue posible cargar el comprobante" is shown and the preview/download links are hidden.
11. When `comprobante_path` is null but `comprobante_url` is set (legacy records), the existing "Ver comprobante" external link is shown as before (no signed URL regeneration).
12. When neither `comprobante_path` nor `comprobante_url` is set, the receipt section is not rendered.
13. A new athlete subscription submitted with a proof file stores both `comprobante_url` and `comprobante_path` in the `pagos` row.
14. The modal renders correctly on mobile (responsive, no horizontal overflow).

---

## Implementation Steps

- [ ] Create migration `{timestamp}_pagos_add_comprobante_path.sql` — add `comprobante_path text` to `pagos`
- [ ] Apply migration locally (`npx supabase db reset` or `npx supabase migration up`)
- [ ] Update `src/types/portal/pagos.types.ts` — add `comprobante_path: string | null` to `Pago` and `PagoInsert`
- [ ] Update `src/types/portal/gestion-suscripciones.types.ts` — add `metodo_pago_nombre`, `metodo_pago_tipo`, `comprobante_path` to `PagoAdminRow`
- [ ] Update `src/services/supabase/portal/gestion-suscripciones.service.ts`:
  - Extend `pagos(...)` sub-select to include `metodo_pago_id, comprobante_path, metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(id, nombre, tipo)`
  - Update `RawSuscripcionRow.pagos` array type to include `metodo_pago_id`, `comprobante_path`, and `metodo_pago_ref`
  - Update `mapRawRow` to map `metodo_pago_nombre`, `metodo_pago_tipo`, and `comprobante_path`
- [ ] Update `src/services/supabase/portal/pagos.service.ts` — extend `updateComprobanteUrl` to also patch `comprobante_path`
- [ ] Create `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts` — fetches fresh signed URL on mount
- [ ] Update `src/hooks/portal/planes/useSuscripcion.ts` — store `comprobante_path` alongside `comprobante_url` after proof upload
- [ ] Update `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx`:
  - Replace legacy `metodo_pago` display with `metodo_pago_nombre` (with fallback)
  - Add receipt preview section using `useComprobanteViewer`
  - Add image thumbnail for image files
  - Add PDF indicator for PDF files
  - Add "Ver comprobante" and "Descargar" links
- [ ] Manually test: open modal for pago with `metodo_pago_id` → correct payment method name shown
- [ ] Manually test: open modal for pago with image comprobante → inline preview appears + download works
- [ ] Manually test: open modal for pago with PDF comprobante → PDF icon shown + download works
- [ ] Manually test: open modal for pago with no comprobante → no receipt section shown
- [ ] Manually test: open modal for legacy pago with only `comprobante_url` → fallback link shown
- [ ] Test: new subscription with file proof → verify both `comprobante_url` and `comprobante_path` saved in DB

---

## Non-Functional Requirements

- **Security**: The signed URL is generated fresh on each modal open with a short TTL (300 s). This ensures URLs are not long-lived in the browser's address bar or history. The `storageService.getSignedUrl` call is made through the RLS-authenticated browser client — the `org_member_read` policy in `storage.objects` limits access to active members of the tenant only.
- **Performance**: Signed URL generation is a single Supabase Storage API call and does not require a full page reload or additional DB round-trips. No index changes required.
- **Accessibility**: The "Ver comprobante" and "Descargar" anchor elements must have descriptive `aria-label` attributes. The image preview must include an `alt` attribute (e.g., "Comprobante de pago"). The loading state must use `aria-busy="true"` on the container.
- **Error handling**: Signed URL fetch failures surface as an inline muted message inside the receipt section. The rest of the modal (approve/reject actions) must remain functional even if the signed URL cannot be generated.
- **Responsive**: The image preview is capped at `max-h-40` with `object-contain` to prevent layout overflow on mobile. The receipt section stacks vertically on narrow viewports.
