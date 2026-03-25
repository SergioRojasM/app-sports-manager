## 1. Branch Setup

- [x] 1.1 Create branch `feat/payment-receipt-viewer` from current working branch
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/{timestamp}_pagos_replace_comprobante_url.sql`
- [x] 2.2 Write migration: `ALTER TABLE public.pagos DROP COLUMN IF EXISTS comprobante_url; ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS comprobante_path text;`
- [x] 2.3 Apply migration locally: `npx supabase migration up`
- [x] 2.4 Verify `pagos` table schema: `comprobante_url` absent, `comprobante_path` present

## 3. Types

- [x] 3.1 Update `src/types/portal/pagos.types.ts`: replace `comprobante_url: string | null` with `comprobante_path: string | null` in `Pago`
- [x] 3.2 Update `PagoInsert` in `src/types/portal/pagos.types.ts`: replace `comprobante_url: null` with `comprobante_path: null`
- [x] 3.3 Update `src/types/portal/gestion-suscripciones.types.ts`: remove `comprobante_url` from `PagoAdminRow`, add `comprobante_path: string | null`, `metodo_pago_nombre: string | null`, `metodo_pago_tipo: string | null`

## 4. Services

- [x] 4.1 Update `src/services/supabase/portal/pagos.service.ts`: rename `updateComprobanteUrl` → `updateComprobantePath(supabase, pagoId, path)` updating the DB column from `comprobante_url` to `comprobante_path`
- [x] 4.2 Update `pagosService.createPago`: replace `comprobante_url` with `comprobante_path` in both the insert payload and the `.select(...)` string
- [x] 4.3 Update `src/services/supabase/portal/gestion-suscripciones.service.ts`: extend `pagos(...)` sub-select to include `metodo_pago_id, comprobante_path, metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(id, nombre, tipo)`
- [x] 4.4 Update `RawSuscripcionRow` pagos array type to include `metodo_pago_id: string | null`, `comprobante_path: string | null`, and `metodo_pago_ref: { id: string; nombre: string; tipo: string } | null`
- [x] 4.5 Update `mapRawRow` in `gestion-suscripciones.service.ts`: remove `comprobante_url`; add `comprobante_path`, `metodo_pago_nombre`, `metodo_pago_tipo` mapped from `metodo_pago_ref`

## 5. Hooks

- [x] 5.1 Create `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts` — accepts `comprobantePath: string | null`, calls `storageService.getSignedUrl(supabase, path, 300)` in `useEffect` on mount, returns `{ signedUrl, isLoading, error }`
- [x] 5.2 Update `src/hooks/portal/planes/useSuscripcion.ts`: replace `updateComprobanteUrl(supabase, pago.id, result.signedUrl)` call with `updateComprobantePath(supabase, pago.id, result.path)`
- [x] 5.3 Update `PagoInsert` usage in `useSuscripcion.ts`: replace `comprobante_url: null` with `comprobante_path: null` in `pagosService.createPago` call

## 6. Component

- [x] 6.1 Update `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx`: replace `pago.metodo_pago ?? '—'` with `pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'` in the "Método" row
- [x] 6.2 Add receipt section to `ValidarPagoModal`: render only when `pago.comprobante_path` is non-null; call `useComprobanteViewer(pago.comprobante_path)`
- [x] 6.3 Implement image thumbnail: when path ends with `.jpg`, `.jpeg`, `.png`, or `.webp`, render `<img src={signedUrl} alt="Comprobante de pago" className="max-h-40 object-contain" />` inside a clickable container (opens signed URL in `_blank`)
- [x] 6.4 Implement PDF indicator: when path ends with `.pdf`, render a PDF icon and filename label
- [x] 6.5 Add "Ver comprobante" anchor (`target="_blank"`, `rel="noopener noreferrer"`, `aria-label`) and "Descargar" anchor (`download` attribute, `aria-label`), both using `signedUrl`
- [x] 6.6 Implement loading state: render skeleton/spinner in receipt section and disable/hide links when `isLoading` is true; set `aria-busy="true"` on receipt container while loading
- [x] 6.7 Implement error state: show "No fue posible cargar el comprobante" and hide preview/download links when `error` is non-null
- [x] 6.8 Remove the legacy `pago.comprobante_url` `<a>` link (no longer exists)

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: update `pagos` table documentation (remove `comprobante_url`, add `comprobante_path`); add `useComprobanteViewer` hook entry

## 8. Manual Verification

- [ ] 8.1 Open `ValidarPagoModal` for a pago with `metodo_pago_id` set — verify method name from `tenant_metodos_pago` is shown
- [ ] 8.2 Open modal for a pago with image `comprobante_path` — verify inline thumbnail appears and download link works
- [ ] 8.3 Open modal for a pago with PDF `comprobante_path` — verify PDF indicator shown and download link works
- [ ] 8.4 Open modal for a pago with `comprobante_path = null` — verify no receipt section is rendered
- [ ] 8.5 Submit a new subscription with a proof file — verify `pagos` row has `comprobante_path` set and `comprobante_url` column absent
- [ ] 8.6 Verify approve/reject actions work correctly when signed URL generation fails

## 9. Commit and Pull Request

- [ ] 9.1 Stage all changes and create commit with message: `feat(pagos): replace comprobante_url with comprobante_path; add inline receipt viewer in ValidarPagoModal`
- [ ] 9.2 Push branch and open pull request with description:
  > **What**: Drops `pagos.comprobante_url` (no production data) and introduces `comprobante_path` as the sole storage reference. Adds `useComprobanteViewer` hook to generate fresh 5-minute signed URLs on modal open. Updates `ValidarPagoModal` with inline image/PDF preview, view and download actions, and payment method name resolution via `metodo_pago_id` join.
  >
  > **Why**: Long-lived stored signed URLs cannot be regenerated from the URL alone and represent an unnecessary security exposure. Storing the storage path enables on-demand short-lived URL generation and decouples the DB record from an ephemeral URL.
  >
  > **Breaking change**: `comprobante_url` column dropped. No migration needed — no production data.
