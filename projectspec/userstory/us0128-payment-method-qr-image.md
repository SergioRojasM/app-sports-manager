# US-0128 — Payment Method QR Image

## ID
US-0128

## Name
Upload an optional QR image for a tenant payment method and show it wherever the method is presented to a payer

## As a
Tenant administrator

## I Want
To attach an image (typically the payment QR code of Nequi, Bancolombia, Daviplata, a bank key, etc.) to each payment method of my organization

## So That
Athletes and event ticket buyers can scan the QR directly from the payment step instead of typing an account number by hand, which reduces payment mistakes and speeds up the purchase

---

## Description

### Current State
- `public.tenant_metodos_pago` (US-0028) stores `nombre`, `tipo`, `valor`, `url`, `comentarios`, `activo`, `orden`. There is no way to attach an image.
- Admins manage methods in **Gestión de organización** through `TenantPaymentMethodsCard` + `MetodoPagoFormModal` (state in `useMetodosPago`, data in `metodosPagoService`).
- Payers see a method in three places:
  1. `SuscripcionModal` (athlete buys a plan) — shows `valor`, `url`, `comentarios` of the selected method.
  2. `EventoMetodoPagoCard` (event checkout, `EventoCompraPasoPago`) — renders the **snapshot** stored in `eventos.metodos_pago` (`EventoMetodoPagoSnapshot`), never the live row. Buyers can be anonymous guests.
  3. `CrearSuscripcionModal` (admin creates a subscription on behalf of an athlete) — only the method name; **out of scope**.
- Images already live in the private `org-assets` bucket; the app stores a 1-year signed URL in a text column (`tenants.logo_url`, `tenants.banner_url`, `eventos.banner_url`). `org_admin_upload` / `org_admin_update` / `org_admin_delete` already let a tenant admin write anywhere under `orgs/{tenantId}/`.

### Proposed Changes

#### Data model
- New nullable column `tenant_metodos_pago.qr_url text` holding the signed URL of the image. `null` = no image.
- `EventoMetodoPagoSnapshot` gains an optional `qr_url?: string | null`, copied into the event snapshot when the admin selects the method in the wizard.

#### Storage
- Bucket: existing `org-assets` (no new bucket, no new storage policy).
- Path: `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{timestamp}.{ext}`.
  - A **new object per upload** (timestamped, `upsert: false`). Previous objects are intentionally **not deleted** on replace or removal: event snapshots already published keep pointing to the image that was valid when the event was saved, and a fixed path would serve a stale CDN-cached image after a replace.
- The value stored in `qr_url` is the signed URL returned by `createSignedUrl(path, SIGNED_URL_TTL)` (same convention as logo/banner). Because it is a signed URL, non-members and anonymous event buyers can load it without any extra read policy.

#### Admin UI — `MetodoPagoFormModal`
- New optional field **"Imagen QR (opcional)"**, placed between **URL** and **Comentarios**.
- States:
  - *Empty*: dashed drop area / button "Subir imagen" + helper text "JPEG, PNG o WebP. Máximo 2 MB."
  - *With image* (existing `qr_url` or a newly selected file): square preview (max 160×160, `object-contain`, white background so the QR stays scannable on the dark theme) + buttons **"Cambiar"** and **"Quitar"**.
- Validation on file select (client side, before any upload):
  - MIME must be `image/jpeg`, `image/png` or `image/webp` → otherwise inline error "Solo se permiten imágenes JPEG, PNG o WebP."
  - Size ≤ 2 MB → otherwise inline error "El archivo no puede superar 2 MB."
  - An invalid file is discarded and the previous state (existing image or empty) is kept.
- Nothing is uploaded until the admin presses **"Crear método" / "Guardar cambios"**. Closing or cancelling the modal discards the selected file (revoke the object URL).
- The field is available for every `tipo` (including `efectivo`); it is never required.
- The field is disabled while `isSubmitting`.

#### Admin UI — `TenantPaymentMethodsCard`
- When `metodo.qr_url` is set, show a small `qr_code_2` Material Symbols icon with the text "QR" next to the existing badges (`title="Tiene imagen QR"`). No thumbnail in the list.

#### Save flow — `useMetodosPago.submitForm`
`submitForm(data, qr)` where `qr` is `{ file: File | null; remove: boolean }`:
1. **Create**: insert the row (without `qr_url`) → if `qr.file`, upload it using the new row id → `updateMetodoPago(id, { qr_url })`.
2. **Edit**:
   - `qr.file` set → upload → include `qr_url: signedUrl` in the update payload.
   - `qr.remove` and no file → include `qr_url: null` in the update payload.
   - neither → `qr_url` is not sent (unchanged).
3. If the upload fails **after** a successful create, the method stays created without image, the modal stays open in edit mode for that method and shows: "El método se guardó, pero no fue posible subir la imagen. Intenta de nuevo." If the upload fails on edit, no field is updated and the same inline error area shows "No fue posible subir la imagen. Intenta de nuevo."

#### Payer UI
- **`SuscripcionModal`**: inside the selected-method info box, when `selectedMetodo.qr_url` is set, render the image under the existing lines with the label "Código QR:" (white background, `max-w-[200px]`, `object-contain`, `alt={`Código QR de ${selectedMetodo.nombre}`}`), wrapped in a link that opens the image in a new tab (`target="_blank" rel="noopener noreferrer"`). The info box must also appear when the method has **only** a QR (today it can render empty).
- **`EventoMetodoPagoCard`**: when `metodo.qr_url` is set, render the same image block inside the expanded area (after `comentarios`). `hasDetails` must also be true when `qr_url` is set, so the compact variant shows "Ver más".
- In both places, if the image fails to load (`onError`), hide it silently — the rest of the method data stays visible.

#### Event wizard snapshot — `EventoMetodosPagoStep`
- `toSnapshot()` copies `qr_url: metodo.qr_url ?? null`.
- In the checkbox card of each method, show the same "QR" indicator as in `TenantPaymentMethodsCard` when the method has an image.
- Existing events keep their stored snapshot (no `qr_url`) and render exactly as today. An event picks up the QR only when the admin re-saves it with the method selected. No backfill.
- `guardar_evento_completo` needs **no change**: it only validates that each snapshot element is an object with `id` and `nombre` and stores the JSON as-is.

#### Out of scope
- Generating a QR from `valor` / `url`.
- Decoding or validating that the uploaded image really contains a QR code.
- Deleting orphaned storage objects.
- Showing the QR in `CrearSuscripcionModal`, payment receipts, PDFs or emails.
- Renewing signed URLs before their 1-year expiry (same known limitation as logo/banner; re-uploading the image regenerates it).

---

## Database Changes

Migration `supabase/migrations/{timestamp}_tenant_metodos_pago_qr_url.sql`:

```sql
-- US-0128: optional QR image for a tenant payment method
alter table public.tenant_metodos_pago
  add column if not exists qr_url text;

comment on column public.tenant_metodos_pago.qr_url is
  'Signed URL of the optional QR image (org-assets/orgs/{tenant_id}/metodos-pago/{id}/qr-{ts}.{ext}). US-0128';
```

- **No new constraint, index or default.** Existing rows get `null`.
- **RLS**: no change. The column is covered by the existing table policies (`tenant_metodos_pago_select_member` — any authenticated user; insert/update/delete — tenant admins via `get_admin_tenants_for_authenticated_user()`).
- **Storage policies**: no change. `org_admin_upload` already authorizes an active `administrador` of `{tenantId}` to insert under `orgs/{tenantId}/…`; non-admins are rejected by storage RLS. Reading goes through the signed URL.
- **Bucket**: no change (`org-assets` already allows `image/jpeg`, `image/png`, `image/webp`, 10 MiB cap; the 2 MB limit is enforced client-side like the org logo).
- **`eventos.metodos_pago`** (jsonb): no schema change; new snapshots simply carry the extra `qr_url` key.

---

## API / Server Actions

No API routes or server actions. All calls go through the browser Supabase client, as the rest of this feature does.

### `src/types/portal/storage.types.ts`
- **`buildMetodoPagoQrPath(tenantId: string, metodoId: string, ext: string): string`**
  Returns `orgs/${tenantId}/metodos-pago/${metodoId}/qr-${Date.now()}.${ext}`.

### `src/services/supabase/portal/storage.service.ts`
- **`uploadMetodoPagoQr(supabase: SupabaseClient, tenantId: string, metodoId: string, file: File): Promise<StorageUploadResult>`**
  - Uploads to `buildMetodoPagoQrPath(...)` with `{ upsert: false, contentType: file.type }`, then `createSignedUrl(path, SIGNED_URL_TTL)`.
  - Returns `{ signedUrl, path }`; throws `Error` with the storage message on failure (same shape as `uploadOrgLogo`).
  - Auth: storage RLS `org_admin_upload` (active administrador of the tenant).

### `src/services/supabase/portal/metodos-pago.service.ts`
- Add `qr_url` to the `COLUMNS` constant so `getMetodosPago` returns it (this automatically feeds `useSuscripcion`, `useCrearSuscripcion`, `useEventoWizardOptions`).
- **`createMetodoPago(payload: CreateMetodoPagoInput)`**: insert `qr_url: payload.qr_url ?? null`.
- **`updateMetodoPago(id, payload: UpdateMetodoPagoInput)`**: `if (payload.qr_url !== undefined) updates.qr_url = payload.qr_url;` (`null` clears it).
- Auth: existing table RLS (admin-only write).

### `src/types/portal/metodos-pago.types.ts`
- `MetodoPago.qr_url: string | null`
- `CreateMetodoPagoInput.qr_url?: string | null`
- `UpdateMetodoPagoInput.qr_url?: string | null`
- `export type MetodoPagoQrChange = { file: File | null; remove: boolean };`
- `export const METODO_PAGO_QR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];`
- `export const METODO_PAGO_QR_MAX_BYTES = 2 * 1024 * 1024;`

### `src/types/portal/eventos.types.ts`
- `EventoMetodoPagoSnapshot.qr_url?: string | null` (optional: older snapshots do not have it).

### `src/hooks/portal/tenant/useMetodosPago.ts`
- `submitForm(data: CreateMetodoPagoInput | UpdateMetodoPagoInput, qr?: MetodoPagoQrChange): Promise<void>` implementing the save flow above. On "created but upload failed", set `editTarget` to the created method, keep `formOpen = true`, set `error`, and refetch the list.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_tenant_metodos_pago_qr_url.sql` | Add nullable `qr_url text` column + comment |
| Types | `src/types/portal/metodos-pago.types.ts` | `qr_url` on `MetodoPago` / create / update inputs; `MetodoPagoQrChange`; MIME + size constants |
| Types | `src/types/portal/storage.types.ts` | Add `buildMetodoPagoQrPath` |
| Types | `src/types/portal/eventos.types.ts` | Optional `qr_url` on `EventoMetodoPagoSnapshot` |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadMetodoPagoQr` |
| Service | `src/services/supabase/portal/metodos-pago.service.ts` | `qr_url` in `COLUMNS`, create and update |
| Hook | `src/hooks/portal/tenant/useMetodosPago.ts` | `submitForm(data, qr)`: upload + persist `qr_url`, partial-failure handling |
| Component | `src/components/portal/tenant/MetodoPagoFormModal.tsx` | "Imagen QR" field (select, validate, preview, Cambiar / Quitar); `onSubmit(data, qr)` |
| Component | `src/components/portal/tenant/TenantPaymentMethodsCard.tsx` | "QR" indicator; pass the new `onSubmit` signature through |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Render QR image of the selected method |
| Component | `src/components/portal/eventos/EventoMetodoPagoCard.tsx` | Render QR image; include `qr_url` in `hasDetails` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | `toSnapshot` copies `qr_url`; "QR" indicator |
| Docs | `projectspec/03-project-structure.md` | Update the entries of the touched files, storage path list and `tenant_metodos_pago` notes |
| Spec | `openspec/specs/payment-methods-management/spec.md` | Add the QR image requirement (through the OpenSpec change for this story) |

---

## Acceptance Criteria

1. After the migration, `tenant_metodos_pago` has a nullable `qr_url text` column and every pre-existing row has `qr_url = null`.
2. The create/edit payment method modal shows an optional "Imagen QR (opcional)" field between URL and Comentarios, for every method type.
3. Selecting a JPEG, PNG or WebP file ≤ 2 MB shows a preview with "Cambiar" and "Quitar"; nothing is uploaded until the form is saved.
4. Selecting a file of another type shows "Solo se permiten imágenes JPEG, PNG o WebP." and the previous state is kept.
5. Selecting a file larger than 2 MB shows "El archivo no puede superar 2 MB." and the previous state is kept.
6. Creating a method with an image stores the object at `org-assets/orgs/{tenantId}/metodos-pago/{metodoId}/qr-{timestamp}.{ext}` and the row's `qr_url` holds a working signed URL.
7. Creating or editing a method without touching the image field behaves exactly as before; on edit, `qr_url` is left unchanged.
8. Editing a method that has an image shows the current image in the modal. "Cambiar" + save replaces `qr_url` with the new image's URL; "Quitar" + save sets `qr_url` to `null`.
9. Cancelling or closing the modal after selecting / removing an image changes nothing in the database or storage.
10. If the image upload fails while creating, the method exists without image, the modal stays open on that method in edit mode and shows "El método se guardó, pero no fue posible subir la imagen. Intenta de nuevo."; saving again does not create a duplicate method.
11. If the image upload fails while editing, no field of the method is updated and an error is shown in the modal.
12. A non-admin user cannot upload under `orgs/{tenantId}/metodos-pago/` (storage RLS rejects it) nor change `qr_url` (table RLS rejects it).
13. In the organization's payment methods list, methods with an image show a "QR" indicator; methods without one do not.
14. In `SuscripcionModal`, selecting a method with `qr_url` shows the QR image with alt text "Código QR de {nombre}"; clicking it opens the image in a new tab. A method with only a QR (no valor / url / comentarios) still shows the info box with the image.
15. In `SuscripcionModal`, a method without `qr_url` renders exactly as today.
16. In the event wizard step 3, selecting a method that has an image stores `qr_url` in the event's `metodos_pago` snapshot.
17. In the event checkout payment step, a snapshot with `qr_url` shows the QR image — for authenticated buyers and for anonymous guests. In the `compact` variant it appears after pressing "Ver más", and "Ver más" is offered even when the QR is the only detail.
18. Events saved before this story (snapshots without `qr_url`) render without errors and without image.
19. Replacing or removing a method's image does not break the image shown by events whose snapshot was saved earlier.
20. If the QR image cannot be loaded in a payer view, the image is hidden and the rest of the method information remains visible.
21. `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Create the migration `{timestamp}_tenant_metodos_pago_qr_url.sql` and apply it locally
- [ ] Extend `metodos-pago.types.ts`, `storage.types.ts` (`buildMetodoPagoQrPath`) and `EventoMetodoPagoSnapshot`
- [ ] Add `storageService.uploadMetodoPagoQr`
- [ ] Update `metodosPagoService` (`COLUMNS`, create, update)
- [ ] Update `useMetodosPago.submitForm` with the upload flow and partial-failure handling
- [ ] Add the "Imagen QR" field to `MetodoPagoFormModal` (validation, preview, Cambiar / Quitar, object URL cleanup)
- [ ] Add the "QR" indicator to `TenantPaymentMethodsCard` and wire the new `onSubmit` signature
- [ ] Render the QR in `SuscripcionModal`
- [ ] Render the QR in `EventoMetodoPagoCard` (normal + compact) and copy `qr_url` in `EventoMetodosPagoStep.toSnapshot`
- [ ] Verify storage RLS: admin can upload, non-admin member cannot
- [ ] Test manually: create with image, edit replace, edit remove, invalid type, oversized file, cancel, plan purchase as athlete, event checkout as member and as guest, legacy event without `qr_url`
- [ ] Update `projectspec/03-project-structure.md` and the `payment-methods-management` spec

---

## Non-Functional Requirements

- **Security**:
  - Writes to `qr_url` are restricted to tenant admins by the existing `tenant_metodos_pago` RLS; uploads by the existing `org_admin_upload` storage policy. No new policies, no service-role usage.
  - MIME type and size are validated client-side; the bucket's `allowed_mime_types` is the server-side backstop. SVG is not accepted.
  - The image is rendered only through `<img src>`; `qr_url` is never interpolated into HTML or used as a navigation target other than "open image in new tab" with `rel="noopener noreferrer"`.
  - The signed URL is public-by-possession by design: a payment QR is information the admin publishes to payers (same exposure as `valor` / `url`).
- **Performance**: no new queries (the column rides on the existing select). Payer-side images use `loading="lazy"`; the 2 MB cap keeps the payment step light. No index needed.
- **Accessibility**: the file input has a visible `<label>` ("Imagen QR") and is keyboard-operable; "Cambiar" / "Quitar" are real buttons with visible focus ring; validation errors use `role="alert"`; the preview and payer images have descriptive `alt` ("Código QR de {nombre}"); the "QR" list indicator has accessible text, not just an icon. The image is shown on a white background to keep the QR scannable on the dark theme.
- **Error handling**: validation and upload errors are shown inline in the modal's existing error area (`role="alert"`), in Spanish, consistent with the current form. Payer-side image load failures degrade silently (image hidden).
