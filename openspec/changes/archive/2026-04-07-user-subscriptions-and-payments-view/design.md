## Context

The `usuario` role currently has no tenant-scoped page for viewing their own subscriptions and payment status. The admin `gestion-suscripciones` page is role-guarded and exposes all tenant subscriptions — it is not a suitable base to extend for user-facing viewing. This change introduces a purpose-built user view at `(usuario)/mis-suscripciones-y-pagos` that is scoped strictly to the authenticated user's own records within a single tenant.

The data model already fully supports this feature: `suscripciones` and `pagos` tables with all needed columns are in place, and two RLS policies (`pagos_select_authenticated` and `pagos_update_own`) already enforce the correct access patterns. No schema migrations are needed.

## Goals / Non-Goals

**Goals:**
- Provide the `usuario` role with a read-only view of their own subscriptions and payments per tenant.
- Allow the user to upload or re-upload a payment proof (comprobante) when payment state is `pendiente` or `rechazado`.
- Enforce a page-level role guard to close the URL-bypass gap in the tenant route tree.
- Support client-side filtering by subscription status and payment status without additional server round-trips.
- Extend `uploadPaymentProof` to support upsert so re-uploads replace the existing storage object.

**Non-Goals:**
- Creating, modifying, or cancelling subscriptions from the user side.
- Admin-facing subscription management (unchanged).
- Server-side pagination or filtering.
- Notifications or webhooks when payment status changes.

## Decisions

### 1. Client-side filtering only
**Decision:** Fetch all user subscriptions once at page load; filter in memory via hook state.  
**Rationale:** A typical user will have a small number of subscriptions (< 50). Client-side filtering avoids additional Supabase round-trips and keeps the filter UX instant. Adding server-side filter params would complicate the service signature and caching without measurable benefit at this scale.  
**Alternative considered:** Server-side query params with refetch on filter change — rejected because it adds latency and complexity for no gain given the expected data volume.

### 2. Page-level role guard in page.tsx (not middleware)
**Decision:** Enforce `usuario`-only access inside the page component by calling `tenantService.canUserAccessTenant()` (or equivalent) and issuing a `redirect()` on role mismatch.  
**Rationale:** Next.js middleware already handles unauthenticated redirects globally. Role guards per route group are the established pattern in this project (see `gestion-suscripciones`). A page-level guard is colocated with the route, easy to audit, and does not require changes to the shared middleware.  
**Alternative considered:** Extending root `[tenant_id]/layout.tsx` with role-aware blocking — rejected because it would affect all child routes and add complexity to a shared layout.

### 3. Reuse `useComprobanteViewer` for signed URL generation
**Decision:** Import and reuse the existing `useComprobanteViewer` hook inside `PagoCard` to generate signed preview URLs for comprobante files.  
**Rationale:** The hook already handles TTL (300 s), file type sniffing, and error states. Duplicating this logic in a new hook would diverge the two implementations and increase maintenance burden.

### 4. Extend `uploadPaymentProof` with optional `upsert` flag
**Decision:** Add `options?: { upsert?: boolean }` as the last parameter to `uploadPaymentProof`. Default behaviour (no flag) remains unchanged for existing callers.  
**Rationale:** Re-uploading a comprobante stores a file at an identical path. Without `upsert: true` on the storage call, Supabase returns a conflict error. Making the flag optional preserves backward compatibility with `useSuscripcion` which does not need upsert.

### 5. Separate `useSubirComprobante` hook
**Decision:** Encapsulate the upload-and-patch flow in a dedicated hook rather than embedding it in `PagoCard`.  
**Rationale:** The upload flow involves file validation, async storage upload, and DB patch — three concerns that deserve isolation for testability and reuse. Keeping component state minimal also simplifies `PagoCard`.

### 6. Architecture: Page → Component → Hook → Service → Types
Following the project convention (page → component → hook → service → types):

```
page.tsx (role guard, server fetch, passes data)
  └─ MisSuscripcionesYPagosPage (list container, empty state, filter bar)
       ├─ MisSuscripcionesFilters (filter selectors)
       └─ SuscripcionCard (subscription header, classes counter, badge)
            └─ PagoCard (payment info, comprobante viewer, upload trigger)

Hooks:
  useMisSuscripciones     ← data fetch + filter state + filteredSuscripciones
  useSubirComprobante     ← file validation + upload + updateComprobantePath

Services:
  mis-suscripciones.service.ts  ← fetchMisSuscripcionesTenant
  storage.service.ts            ← uploadPaymentProof (extended)
  pagos.service.ts              ← updateComprobantePath (unchanged)

Types:
  portal/mis-suscripciones-y-pagos.types.ts  ← MiPagoRow, MiSuscripcionRow
```

## Risks / Trade-offs

- **Stale signed URLs** → `useComprobanteViewer` uses a 300 s TTL. If a user leaves the tab open and returns after 5 minutes, the preview URL will be expired. Mitigation: refresh on re-focus or trigger a new signed URL on each upload success (already done via hook refresh).
- **Re-upload path collision** → Two rapid re-uploads to the same path with `upsert: true` could race. Mitigation: disable the upload button while upload is in progress (loading state in `useSubirComprobante`).
- **RLS policy assumes single pago per suscripcion** → The current model has at most one payment per subscription; `fetchMisSuscripcionesTenant` fetches the single associated `pago`. If the data model evolves to allow multiple payments per subscription, this query will need revision. This is an accepted trade-off for current scope.
