## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/user-subscriptions-and-payments-view` from the current working branch
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Types

- [x] 2.1 Create `src/types/portal/mis-suscripciones-y-pagos.types.ts` — define `MiPagoRow` (monto, metodo_pago_nombre, metodo_pago_tipo, estado, fecha_pago, comprobante_path, id) and `MiSuscripcionRow` (id, plan_nombre, estado, fecha_inicio, fecha_fin, clases_restantes, clases_plan, pago: MiPagoRow | null)

## 3. Services

- [x] 3.1 Create `src/services/supabase/portal/mis-suscripciones.service.ts` — implement `fetchMisSuscripcionesTenant(supabase, tenantId, userId)` selecting from `suscripciones` joined with `planes` (plan_nombre) and `pagos` joined with `tenant_metodos_pago` (metodo_pago_nombre, metodo_pago_tipo), filtered by `atleta_id = userId AND tenant_id = tenantId`, ordered by `created_at DESC`, returning `MiSuscripcionRow[]`
- [x] 3.2 Modify `src/services/supabase/portal/storage.service.ts` — extend `uploadPaymentProof` signature to accept `options?: { upsert?: boolean }` as last parameter; pass `upsert: options?.upsert ?? false` to the Supabase storage upload call

## 4. Hooks

- [x] 4.1 Create `src/hooks/portal/mis-suscripciones-y-pagos/useMisSuscripciones.ts` — accepts `initialData: MiSuscripcionRow[]`; exposes `suscripcionEstadoFilter`, `setSuscripcionEstadoFilter`, `pagoEstadoFilter`, `setPagoEstadoFilter`, `filteredSuscripciones`, and `clearFilters`; applies AND logic when both filters are non-"All"
- [x] 4.2 Create `src/hooks/portal/mis-suscripciones-y-pagos/useSubirComprobante.ts` — accepts `pagoId`, `tenantId`, `userId`; exposes `upload(file: File)`, `isUploading`, `error`; validates MIME type (image/*, application/pdf) and max size 5 MB before upload; calls `storageService.uploadPaymentProof` with `{ upsert: true }` and then `pagosService.updateComprobantePath`; returns the new `comprobante_path` on success for preview refresh

## 5. Components

- [x] 5.1 Create `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesFilters.tsx` — two chip/select controls for subscription status (All, Pendiente, Activa, Vencida, Cancelada) and payment status (All, Pendiente, Validado, Rechazado); calls parent setters on change
- [x] 5.2 Create `src/components/portal/mis-suscripciones-y-pagos/PagoCard.tsx` — displays monto (currency), metodo_pago_nombre (or "—"), `PagoEstadoBadge`, fecha_pago (or "—"); uses `useComprobanteViewer` for signed URL; renders inline `<img>` for image types or PDF icon + download link for PDFs; renders upload button (accepts image/*, .pdf) only when `pago.estado` is `pendiente` or `rechazado`; integrates `useSubirComprobante`; shows inline error below upload button; file input has visible label and keyboard accessibility; upload errors announced via `aria-live`
- [x] 5.3 Create `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx` — shows plan_nombre, `SuscripcionEstadoBadge`, fecha_inicio / fecha_fin (or "—"), classes counter when not null; renders `PagoCard` if pago is not null, otherwise shows _"No payment record found for this subscription."_
- [x] 5.4 Create `src/components/portal/mis-suscripciones-y-pagos/MisSuscripcionesYPagosPage.tsx` — accepts full subscription list; uses `useMisSuscripciones`; renders `MisSuscripcionesFilters` (hidden in empty state), list of `SuscripcionCard`, filter-empty state with "Clear filters" button, or true empty state with link to `gestion-planes`
- [x] 5.5 Create `src/components/portal/mis-suscripciones-y-pagos/index.ts` — barrel export for all components in this folder

## 6. Page

- [x] 6.1 Create `src/app/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos/page.tsx` — server component; calls `tenantService.canUserAccessTenant()` (or equivalent role resolution); redirects to tenant landing if role ≠ `usuario`; fetches `fetchMisSuscripcionesTenant` server-side; passes data to `MisSuscripcionesYPagosPage`

## 7. Navigation

- [x] 7.1 Modify `src/types/portal.types.ts` — add `{ label: 'Mis Suscripciones', path: 'mis-suscripciones-y-pagos', icon: 'receipt_long' }` to `ROLE_TENANT_ITEMS.usuario` after the existing `gestion-planes` entry

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` — document the new `(usuario)/mis-suscripciones-y-pagos` route, the new `mis-suscripciones-y-pagos` components folder, the new service `mis-suscripciones.service.ts`, the two new hooks, and the new types file

## 9. Commit & Pull Request

- [x] 9.1 Stage all changes and create a commit with message: `feat(portal): add user subscriptions and payments view for usuario role`
- [x] 9.2 Write pull request description summarizing: new `mis-suscripciones-y-pagos` page for `usuario` role with client-side filtering, comprobante preview and re-upload, role guard, and `uploadPaymentProof` upsert extension; reference US-0044; list AC items verified
