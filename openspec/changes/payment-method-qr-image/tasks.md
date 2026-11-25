## 1. Branch setup

- [x] 1.1 Create branch `feat/payment-method-qr-image` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Database (local only)

- [x] 2.1 Create `supabase/migrations/{timestamp}_tenant_metodos_pago_qr_url.sql`: `alter table public.tenant_metodos_pago add column if not exists qr_url text;` plus a column comment referencing US-0128
- [x] 2.2 Apply the migration to the local Supabase instance only (never push to remote) and confirm existing rows have `qr_url = null`

## 3. Types

- [x] 3.1 `src/types/portal/metodos-pago.types.ts`: add `qr_url: string | null` to `MetodoPago`, `qr_url?: string | null` to `CreateMetodoPagoInput` and `UpdateMetodoPagoInput`, export `MetodoPagoQrChange`, `METODO_PAGO_QR_MIME_TYPES`, `METODO_PAGO_QR_MAX_BYTES`
- [x] 3.2 `src/types/portal/storage.types.ts`: add `buildMetodoPagoQrPath(tenantId, metodoId, ext)` → `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{Date.now()}.{ext}`
- [x] 3.3 `src/types/portal/eventos.types.ts`: add optional `qr_url?: string | null` to `EventoMetodoPagoSnapshot`

## 4. Services

- [x] 4.1 `src/services/supabase/portal/storage.service.ts`: add `uploadMetodoPagoQr(supabase, tenantId, metodoId, file)` (`upsert: false`, signed URL with `SIGNED_URL_TTL`, returns `StorageUploadResult`)
- [x] 4.2 `src/services/supabase/portal/metodos-pago.service.ts`: add `qr_url` to `COLUMNS`; insert `qr_url: payload.qr_url ?? null` in `createMetodoPago`; handle `payload.qr_url !== undefined` in `updateMetodoPago`

## 5. Hook

- [x] 5.1 `src/hooks/portal/tenant/useMetodosPago.ts`: change `submitForm` to `(data, qr?: MetodoPagoQrChange)`; create flow = insert → upload → update `qr_url`; edit flow = upload (if file) → update with `qr_url` (signed URL, `null` on remove, omitted otherwise)
- [x] 5.2 Handle partial failure on create: keep the modal open, set `editTarget` to the created method, set the error "El método se guardó, pero no fue posible subir la imagen. Intenta de nuevo." and refetch the list
- [x] 5.3 Handle upload failure on edit: no update is sent and the error "No fue posible subir la imagen. Intenta de nuevo." is set

## 6. Admin components

- [x] 6.1 `src/components/portal/tenant/MetodoPagoFormModal.tsx`: add the "Imagen QR (opcional)" field between URL and Comentarios (file input with label, helper text, white-background preview, "Cambiar" / "Quitar"), disabled while submitting
- [x] 6.2 Validate type and size on select with the shared constants; show inline `role="alert"` errors and keep the previous state on invalid files
- [x] 6.3 Reset file / remove state when the modal opens or its `editTarget` changes; revoke preview object URLs on change and unmount
- [x] 6.4 Change `onSubmit` to `(data, qr)` and pass `{ file, remove }` from `handleSubmit`
- [x] 6.5 `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`: forward the new `onSubmit` signature and show the "QR" indicator (`qr_code_2` + "QR", `title="Tiene imagen QR"`) when `metodo.qr_url` is set

## 7. Payer and wizard components

- [x] 7.1 `src/components/portal/planes/SuscripcionModal.tsx`: render the QR block ("Código QR:", white background, `max-w-[200px]`, `object-contain`, lazy, alt text, link to open in a new tab, hidden on `onError`); show the info box when the method has only a QR
- [x] 7.2 `src/components/portal/eventos/EventoMetodoPagoCard.tsx`: include `qr_url` in `hasDetails` and render the QR image in the expanded area after `comentarios` (hidden on `onError`)
- [x] 7.3 `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx`: copy `qr_url: metodo.qr_url ?? null` in `toSnapshot` and show the "QR" indicator on method cards with an image

## 8. Manual verification

- [x] 8.1 Admin: create with image, edit replace, edit remove, save without touching the image, cancel after selecting, invalid type, file over 2 MB
- [x] 8.2 Admin: simulate an upload failure on create and confirm the modal switches to edit mode without creating a duplicate on retry
- [x] 8.3 RLS: a non-admin member cannot upload under `orgs/{tenantId}/metodos-pago/` nor update `qr_url`
- [x] 8.4 Athlete: plan purchase shows the QR for a method with image (including a QR-only method) and is unchanged for a method without one
- [x] 8.5 Events: save an event with a QR method, check the checkout as member and as anonymous guest (normal and compact card), and check an event saved before the change still renders
- [x] 8.6 Replace a method's image and confirm an already-saved event still shows its original image

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md`: entries for the touched components, hook, services and types, plus the new storage path `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{timestamp}.{ext}` and the `tenant_metodos_pago.qr_url` column

## 10. Quality checks and delivery

- [x] 10.1 Run the type check, lint and tests (do not run the build) and fix any failure
- [x] 10.2 Write the commit message and the pull request description for the implementation
