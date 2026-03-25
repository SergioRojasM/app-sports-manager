## Context

`ValidarPagoModal` currently reads `pago.metodo_pago` (a legacy free-text enum: `'transferencia' | 'efectivo' | 'tarjeta'`) and renders a static `<a>` link to `pago.comprobante_url` — a long-lived signed URL generated once at upload time (TTL ≈ 1 year). Since US-0028 introduced `pagos.metodo_pago_id` (FK → `tenant_metodos_pago`) and US-0041 added Supabase Storage for proof files, neither field reflects the actual state:

- `metodo_pago` is never set for new pagos; the actual method name lives in `tenant_metodos_pago.nombre`.
- `comprobante_url` is an opaque blob — the storage path cannot be recovered from it, preventing fresh URL generation. The URL itself is a security risk (long-lived, shareable).

Since there is no production data, both issues are fixed cleanly: `comprobante_url` is dropped and replaced with `comprobante_path`, and the admin query is extended to join the payment method name.

## Goals / Non-Goals

**Goals:**
- Drop `pagos.comprobante_url`; store only `comprobante_path` (relative storage path).
- Extend the `gestion-suscripciones` admin query to expose `metodo_pago_nombre` and `metodo_pago_tipo` via a join on `tenant_metodos_pago`.
- Generate a short-lived (300 s) signed URL on each modal open, client-side, using the existing `storageService.getSignedUrl`.
- Render an inline image thumbnail (JPEG/PNG/WebP) or PDF indicator inside `ValidarPagoModal`, with "Ver comprobante" and "Descargar" actions.
- Show payment method name from the joined record, with graceful fallback to the legacy `metodo_pago` text.

**Non-Goals:**
- Backfilling existing `pagos` rows (no production data).
- SSR-based or server-action signed URL generation.
- Displaying the receipt viewer outside `ValidarPagoModal`.
- Changing the storage path convention (`orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}`).

## Decisions

### 1. Drop `comprobante_url`, keep only `comprobante_path`

**Decision**: Remove `comprobante_url` from the `pagos` table and all related types/services. Store the relative storage path as `comprobante_path`. Signed URLs are generated on-demand.

**Why**: Storing a signed URL in the DB couples the record to a specific URL that can become stale, cannot be regenerated without the path, and has a long TTL that violates least-privilege. The path is the canonical identifier; URLs are ephemeral artifacts derived from it.

**Alternative considered**: Keep both columns (`comprobante_url` for legacy, `comprobante_path` for new). Rejected — adds complexity with zero benefit given no production data.

---

### 2. Client-side signed URL generation in `useComprobanteViewer` (TTL = 300 s)

**Decision**: A new `'use client'` hook `useComprobanteViewer(path: string | null)` calls `storageService.getSignedUrl(supabase, path, 300)` in a `useEffect` on mount. Exposes `{ signedUrl, isLoading, error }`.

**Why**: The signed URL is only needed when an admin opens the modal (an infrequent, user-initiated action). Client-side generation avoids server round-trips, works within the existing RLS-authenticated browser client, and keeps the URL scoped to the session — it is never stored.

**Why 300 s TTL**: Sufficient for an admin review session. Short enough to limit blast radius if the tab is left open or the URL is copied.

**Alternative considered**: Server action to generate URL (e.g., called from the modal). Rejected — unnecessary complexity; the browser Supabase client has the same Storage access as a Server Action for authenticated users.

---

### 3. Extend admin query with `tenant_metodos_pago` join

**Decision**: Extend the `pagos(...)` sub-select in `fetchSuscripcionesAdmin` to include:
```
metodo_pago_id,
comprobante_path,
metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(id, nombre, tipo)
```
Map `metodo_pago_ref.nombre` → `metodo_pago_nombre` and `metodo_pago_ref.tipo` → `metodo_pago_tipo` in `mapRawRow`. Add both to `PagoAdminRow`.

**Why**: Fetching the method name at query time avoids a second round-trip in the component. The FK `pagos_metodo_pago_id_fkey` is already indexed; Supabase PostgREST resolves it in the same network call.

**Why not fetch method name inside the hook**: Would require an extra service call per modal open. The join is cleaner and consistent with how other FK names are already resolved (e.g., `atleta`, `plan`, `validador`).

---

### 4. `metodo_pago_nombre` with fallback to legacy `metodo_pago`

**Decision**: In `ValidarPagoModal`, display `pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'`.

**Why**: `metodo_pago_nombre` is null for pagos where `metodo_pago_id` was not set (submissions before US-0028 was deployed). The free-text `metodo_pago` column still exists in the schema — keep it as a read-only fallback display value. No new writes use it.

---

### 5. Image vs PDF detection via path extension

**Decision**: Check `comprobante_path` for `.jpg`/`.jpeg`/`.png`/`.webp` vs `.pdf` using a simple `endsWith` matched against a lowercase version of the path.

**Why**: MIME type is not stored; the path extension is reliable because `storageService.uploadPaymentProof` derives it from `file.name` at upload time (enforced by the validator in `SuscripcionModal`). No additional metadata storage needed.

---

### 6. `pagosService.updateComprobanteUrl` → `updateComprobantePath`

**Decision**: Rename the function and change the DB column it updates from `comprobante_url` to `comprobante_path`. Signature: `updateComprobantePath(supabase, pagoId, path)`.

**Why**: The old function is only used in `useSuscripcion.ts`. Renaming is safe, explicit, and prevents confusion with the removed column.

---

## Architecture

```
ValidarPagoModal (component)
  └── useComprobanteViewer (hook)
        └── storageService.getSignedUrl (service)

useSuscripcion (hook)
  └── pagosService.updateComprobantePath (service)

gestionSuscripcionesService.fetchSuscripcionesAdmin (service)
  └── JOIN tenant_metodos_pago → PagoAdminRow.metodo_pago_nombre
```

**Files affected (component → hook → service → types order):**

| Layer | File | Change |
|-------|------|--------|
| Component | `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx` | Replace legacy fields; add receipt section |
| Hook (new) | `src/hooks/portal/gestion-suscripciones/useComprobanteViewer.ts` | Generate short-lived signed URL on mount |
| Hook (modify) | `src/hooks/portal/planes/useSuscripcion.ts` | Call `updateComprobantePath` instead of `updateComprobanteUrl` |
| Service (modify) | `src/services/supabase/portal/pagos.service.ts` | Rename function, update column |
| Service (modify) | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Extend query + mapper |
| Types (modify) | `src/types/portal/gestion-suscripciones.types.ts` | Add `metodo_pago_nombre`, `metodo_pago_tipo`, `comprobante_path` to `PagoAdminRow` |
| Types (modify) | `src/types/portal/pagos.types.ts` | Replace `comprobante_url` with `comprobante_path` |
| Migration | `supabase/migrations/{ts}_pagos_replace_comprobante_url.sql` | DROP `comprobante_url`, ADD `comprobante_path` |

## Risks / Trade-offs

- **Signed URL generation failure** → Mitigation: `useComprobanteViewer` catches the error and exposes it via `error` field. The modal remains functional (approve/reject actions are unaffected); only the receipt section is degraded with an inline message.
- **URL expiry during long review sessions** → Mitigation: 300 s TTL covers typical review time. If the admin keeps the modal open >5 min, the image/link will fail silently. Acceptable trade-off vs. longer TTL; user can close and reopen.
- **`metodo_pago_id` null on legacy pagos** → Mitigation: fallback chain `metodo_pago_nombre ?? metodo_pago ?? '—'` handles all cases gracefully.
- **`comprobante_path` null on pagos created before this change** → No impact; the receipt section is not rendered when `comprobante_path` is null.

## Migration Plan

1. Write migration: `ALTER TABLE public.pagos DROP COLUMN IF EXISTS comprobante_url; ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS comprobante_path text;`
2. Apply locally: `npx supabase migration up` (or `db reset` for dev).
3. Update TypeScript types before updating services to surface compiler errors early.
4. Update services, then hooks, then component.
5. No rollback concern — no production data exists; local dev environment can be reset.

## Open Questions

- None. Scope is fully defined by the proposal and US-0042.
