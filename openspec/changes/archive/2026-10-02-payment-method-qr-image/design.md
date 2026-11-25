## Context

`tenant_metodos_pago` (US-0028) holds text-only payment instructions. Admins manage it through `TenantPaymentMethodsCard` → `MetodoPagoFormModal`, with state in `useMetodosPago` and data access in `metodosPagoService`. Payers see a method in `SuscripcionModal` (live row) and in the event checkout through `EventoMetodoPagoCard`, which renders the **snapshot** stored in `eventos.metodos_pago` and can be viewed by anonymous guests.

Images in this app live in the private `org-assets` bucket; the convention is to upload through `storageService` and persist a 1-year signed URL in a text column (`tenants.logo_url`, `tenants.banner_url`, `eventos.banner_url`). Storage policies `org_admin_upload/update/delete` already let an active administrator write anywhere under `orgs/{tenantId}/`.

No new page or component is introduced; the change extends existing ones following their current styling.

```
MetodoPagoFormModal ──(data, qr)──▶ useMetodosPago.submitForm
                                        │ 1. metodosPagoService.create/update
                                        │ 2. storageService.uploadMetodoPagoQr ──▶ org-assets/orgs/{t}/metodos-pago/{id}/qr-{ts}.{ext}
                                        │ 3. metodosPagoService.update({ qr_url: signedUrl })
                                        ▼
                          tenant_metodos_pago.qr_url
                             │                         │
             getMetodosPago  ▼                         ▼  EventoMetodosPagoStep.toSnapshot
                  SuscripcionModal            eventos.metodos_pago[].qr_url
                                                       ▼
                                             EventoMetodoPagoCard (checkout, incl. guests)
```

## Goals / Non-Goals

**Goals:**
- Optional image per payment method, managed by tenant admins in the existing form.
- Image visible to every payer that already sees the method (athlete buying a plan, member or guest buying an event ticket).
- Zero new RLS/storage policies and no change to `guardar_evento_completo`.
- Existing methods and existing event snapshots keep working untouched.

**Non-Goals:**
- QR generation or content validation, orphan cleanup, signed-URL renewal, backfill of event snapshots, showing the QR in `CrearSuscripcionModal`, PDFs or emails.

## Decisions

### 1. Store a signed URL in `qr_url text` (not a storage path)
Follows the logo/banner convention, and it is what makes the image reachable by non-members and anonymous guests without a new `storage.objects` read policy.
- *Alternative — store the path and sign on read*: guests cannot call `createSignedUrl` on a private bucket; it would need a new anon read policy or an API route. Rejected as disproportionate.
- *Alternative — public bucket*: a new bucket and policy set for one field. Rejected.

### 2. Timestamped object per upload, never deleted
Path `orgs/{tenantId}/metodos-pago/{metodoId}/qr-{Date.now()}.{ext}`, `upsert: false`.
- Event snapshots copy `qr_url`; deleting or overwriting the object on replace would break or silently change the image of already-published events, contradicting the snapshot semantics of US-0119.
- A fixed path with `upsert` would also serve a stale cached image after a replace, and changes path anyway when the extension changes.
- Trade-off: orphaned objects accumulate (≤ 2 MB each, rare admin action). Accepted; cleanup is a non-goal.

### 3. Create the row first, then upload, then set `qr_url`
The path needs the method id. Order on create: insert → upload → update. On edit: upload → single update carrying all fields.
- *Alternative — client-generated UUID and upload first*: leaves an orphan object when the insert fails (e.g. duplicate `nombre`), which is the more common failure.
- Partial failure (created, upload failed): the hook switches the modal to edit mode on the created row and shows "El método se guardó, pero no fue posible subir la imagen. Intenta de nuevo.", so a retry updates instead of inserting a duplicate.

### 4. File state lives in the modal; upload orchestration lives in the hook
`MetodoPagoFormModal` owns the selected `File`, preview object URL, and `remove` flag, and validates type/size on select. It calls `onSubmit(data, { file, remove })`. `useMetodosPago.submitForm` runs the service calls. This keeps the component free of Supabase access (component → hook → service → types).
- A dedicated `useMetodoPagoQrUpload` hook (like `useOrgLogoUpload`) was considered; rejected because the upload must be sequenced with the row insert that `useMetodosPago` already owns.

### 5. Validation: JPEG/PNG/WebP, ≤ 2 MB, client-side
Same limits as the org logo; constants exported from `metodos-pago.types.ts`. The bucket's `allowed_mime_types` remains the server-side backstop. SVG excluded (not in the bucket allow-list; script risk).

### 6. Snapshot field is optional
`EventoMetodoPagoSnapshot.qr_url?: string | null`. `guardar_evento_completo` only checks `id` and `nombre` per element and stores the JSON as-is, so no RPC migration. Old snapshots lack the key and render as before.

### 7. Rendering
QR shown on a white background with `object-contain` (dark theme would hurt scannability), `loading="lazy"`, `alt="Código QR de {nombre}"`, hidden on `onError`. In `EventoMetodoPagoCard` it sits inside the expanded area and counts toward `hasDetails`. In `SuscripcionModal` the info box also renders when the QR is the only detail.

## Risks / Trade-offs

- [Signed URL expires after 1 year] → Same known limitation as logo/banner; payer views hide a broken image and keep the text data; re-uploading regenerates the URL. Documented as a non-goal.
- [Signed URL is public-by-possession] → Acceptable: a payment QR is content the admin publishes to payers, same exposure as `valor`/`url`.
- [Orphaned objects grow over time] → Small files, rare action; future cleanup job can target `orgs/*/metodos-pago/` objects not referenced by `tenant_metodos_pago.qr_url` nor any `eventos.metodos_pago` snapshot.
- [Event snapshot shows an outdated QR after the admin replaces it] → Intended snapshot behaviour; re-saving the event with the method selected refreshes it.
- [Client-only size check can be bypassed] → Bucket caps at 10 MiB and restricts MIME types; only tenant admins can upload.

## Migration Plan

1. Add `supabase/migrations/{timestamp}_tenant_metodos_pago_qr_url.sql` (`add column if not exists qr_url text` + comment). Apply **locally only**; never push to the remote Supabase project from this change.
2. Ship code; column is nullable so old and new code are both compatible with the schema.
3. Rollback: revert the code; the column can stay (unused) or be dropped with `alter table ... drop column qr_url`.

## Open Questions

- None blocking. Visual details follow the existing form/card styles; no separate design mockup was provided.
