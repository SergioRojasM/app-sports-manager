## Why

The `ValidarPagoModal` shows a legacy free-text payment method name and relies on `pagos.comprobante_url` — a long-lived signed URL that cannot be re-generated on demand. Since US-0028 introduced `pagos.metodo_pago_id` and US-0041 established Supabase Storage for proof files, the proper design is to store only the storage path and generate fresh short-lived signed URLs at view time. With no production data, this change replaces `comprobante_url` with `comprobante_path` as the single source of truth.

## What Changes

- **BREAKING**: Drop `comprobante_url` column from `pagos`; replace with `comprobante_path text` as the sole storage reference.
- Extend the `gestion-suscripciones` query to join `tenant_metodos_pago` via `metodo_pago_id`, exposing `metodo_pago_nombre` and `metodo_pago_tipo` on `PagoAdminRow`.
- Update the proof upload flow in `useSuscripcion` to patch `comprobante_path` (instead of `comprobante_url`) after upload.
- Add `useComprobanteViewer` hook that generates a fresh 5-minute signed URL from `comprobante_path` on mount.
- Update `ValidarPagoModal` to display `metodo_pago_nombre` (with legacy free-text fallback via `metodo_pago`), render an inline image/PDF receipt preview, and provide "Ver comprobante" and "Descargar" actions using the fresh signed URL.

## Capabilities

### New Capabilities

- `payment-receipt-viewer`: Full receipt viewing capability within `ValidarPagoModal` — payment method name resolution via `metodo_pago_id` join, fresh short-lived signed URL generation via `useComprobanteViewer`, inline image thumbnail, PDF indicator, view and download actions, and loading/error states.

### Modified Capabilities

- `payment-proof-upload`: The post-upload patch step now persists `comprobante_path` instead of `comprobante_url`. `comprobante_url` is removed from the schema entirely; a fresh signed URL is generated on demand at view time.

## Impact

**Database**
- `pagos` table: drop `comprobante_url`, add `comprobante_path text` nullable — new migration required

**Types**
- `src/types/portal/pagos.types.ts` — replace `comprobante_url` with `comprobante_path: string | null` in `Pago` and `PagoInsert`
- `src/types/portal/gestion-suscripciones.types.ts` — replace `comprobante_url` with `comprobante_path`; add `metodo_pago_nombre`, `metodo_pago_tipo` to `PagoAdminRow`

**Services**
- `src/services/supabase/portal/gestion-suscripciones.service.ts` — extend `pagos(...)` sub-select; update `RawSuscripcionRow` and `mapRawRow`
- `src/services/supabase/portal/pagos.service.ts` — rename/replace `updateComprobanteUrl` → `updateComprobantePath` patching only `comprobante_path`
- `src/services/supabase/portal/storage.service.ts` — `getSignedUrl` already exists (US-0041), used as-is

**Hooks**
- `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts` — new hook
- `src/hooks/portal/planes/useSuscripcion.ts` — patch `comprobante_path` (replacing `comprobante_url`) after upload

**Components**
- `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx` — payment method name display, receipt section with preview/download

**Breaking change** — `comprobante_url` is dropped from `pagos`. No production data exists, so no data migration is required. All code referencing `comprobante_url` must be updated.

## Non-goals

- Data migration of legacy rows (no production data; clean slate).
- Displaying the receipt viewer anywhere other than `ValidarPagoModal`.
- Changing the storage bucket layout or file naming convention established in US-0041.
- Server-side signed URL generation (SSR); the fresh URL is generated client-side inside the modal.
