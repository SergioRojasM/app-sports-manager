## Context

The `gestion-entrenamientos` module already handles training series creation, instance editing, and calendar visualization. The `entrenamientos`, `miembros_tenant`, `reservas`, and `asistencias` tables all exist in the DB schema. RLS policies for `reservas` are **not yet defined**, which blocks data access entirely from the browser client.

The existing codebase follows a strict hexagonal architecture: components → hooks → services → Supabase. The `useEntrenamientos` hook owns all training state; `EntrenamientosPage` already has a `selectedInstanceForAction` local state that drives the `EntrenamientoActionModal`. The `useEntrenamientoScope` hook provides role detection (`isAdmin`, `isEntrenador`, `isAtleta`).

All Supabase calls must use the **browser client** (`createClient` from `@/services/supabase/client`) so that RLS is enforced automatically.

## Goals / Non-Goals

**Goals:**
- Embed booking management (list, create, cancel, edit, delete) inside the existing `gestion-entrenamientos` page without adding new routes.
- Enforce role-based access: atleta self-books and self-cancels; entrenador/administrador has full CRUD.
- Validate capacity (`cupo_maximo`) and duplicate bookings in the service layer.
- Show a capacity indicator on every training card/event.
- Provide RLS policies for `public.reservas` and a DB index on `(tenant_id, entrenamiento_id)`.

**Non-Goals:**
- Attendance tracking (`asistencias` table).
- Subscription credit decrement (`suscripciones.clases_restantes`).
- New routes or pages.
- Waitlist, notifications, or payment flows.

## Decisions

### 1. ReservasPanel as a slide-over panel, not a modal

**Decision:** `ReservasPanel` renders as a right-side slide-over panel anchored inside `EntrenamientosPage`, triggered when a training instance is selected. It uses the existing `selectedInstanceForAction` state (already in the page) extended with a `'reservas'` action mode.

**Why:** The page already has action-state-driven modals (`EntrenamientoActionModal`). Reusing the same selection pattern avoids a second state variable and keeps the UX consistent — one click on a training card opens its action context, and a "Ver reservas" button within the `EntrenamientoActionModal` transitions to the bookings panel.

**Alternative considered:** A separate details drawer that replaces `EntrenamientoActionModal` entirely. Rejected to avoid breaking existing edit/delete flows.

---

### 2. Role detection via `useEntrenamientoScope` (existing hook)

**Decision:** `useReservas` and `useReservaForm` receive `role` as a parameter derived from `useEntrenamientoScope`, keeping role logic centralized.

**Why:** The scope hook already resolves role from tenant membership and is tested. Duplicating role detection in the new hooks would create drift.

---

### 3. Capacity validation in the service layer

**Decision:** `reservas.service.ts` performs a count of non-cancelled bookings for the training before inserting. If count ≥ `cupo_maximo`, it throws a typed `ReservaServiceError('capacity_exceeded', ...)`.

**Why:** RLS cannot enforce business-level capacity rules. Hook-level validation is insufficient because concurrent bookings could race. Service-layer validation with the same Supabase client catches this consistently.

**Alternative considered:** DB trigger/function to enforce capacity. Rejected to avoid migration complexity and to keep business logic observable in TypeScript.

---

### 4. Single `reservas.service.ts` file (not a class)

**Decision:** Service is a plain object export with named async functions, matching the pattern in `entrenamientos.service.ts` and `planes.service.ts`.

```typescript
export const reservasService = {
  getByEntrenamiento,
  getMyReserva,
  create,
  update,
  cancel,
  delete: deleteReserva,
  getCapacidad,
};
```

---

### 5. Optimistic UI for cancel and delete

**Decision:** `useReservas` applies optimistic state updates for cancel and delete actions, rolling back on error.

**Why:** Cancellation and deletion are high-frequency interactions for the atleta role. Optimistic updates avoid the perceived latency of round-trips.

---

### 6. `reservas_activas` enrichment on `TrainingInstance`

**Decision:** `useEntrenamientos` enriches each `TrainingInstance` with `reservas_activas: number` by joining a count subquery in the training fetch, rather than a separate request.

**Why:** The calendar and list components need the count to render capacity indicators without an additional loading state per card. A single join query is more efficient than N+1 calls.

**Alternative considered:** Lazy fetching per card on hover. Rejected — the count is always visible in the UI.

---

### 7. RLS migration required before any client access

**Decision:** A dedicated migration `20260302000200_reservas_rls_policies.sql` must be created and applied before any browser client calls to `reservas` work.

Policies:
- **SELECT**: member of the tenant AND (`atleta_id = auth.uid()` OR role is `entrenador`/`administrador`).
- **INSERT**: member of the tenant; `atleta_id` must equal `auth.uid()` unless caller is `entrenador`/`administrador`.
- **UPDATE / DELETE**: only `entrenador` or `administrador` of the tenant.

---

## Architecture

```
EntrenamientosPage
  ├── EntrenamientoActionModal         (existing — adds "Ver reservas" button)
  └── ReservasPanel (new)
        ├── ReservaStatusBadge (new)
        └── ReservaFormModal (new)

useEntrenamientos (modified)
  └── exposes: selectedInstanceId, setSelectedInstanceId, reservas_activas per instance

useReservas (new)             ← orchestrates booking state
useReservaForm (new)          ← manages form state + validation

reservas.service.ts (new)     ← Supabase CRUD

reservas.types.ts (new)       ← Reserva, ReservaView, inputs, ReservaCapacidad
entrenamientos.types.ts       ← add reservas_activas to TrainingInstance
```

### Data flow for self-booking (atleta)

```
[Atleta clicks "Reservar"]
  → ReservaFormModal (confirmation)
  → useReservaForm.submitCreate()
  → reservas.service.create()       (capacity check + insert)
  → useReservas updates state (optimistic)
  → ReservasPanel re-renders with new booking
```

### Data flow for admin booking

```
[Admin opens ReservasPanel → "Nueva reserva"]
  → ReservaFormModal (athlete select + notes)
  → useReservaForm.submitCreate()
  → reservas.service.create()
  → useReservas updates state
```

## Files to Create

| Path | Purpose |
|---|---|
| `src/types/portal/reservas.types.ts` | Domain types: `Reserva`, `ReservaView`, `CreateReservaInput`, `UpdateReservaInput`, `ReservaCapacidad`, `ReservaEstado` |
| `src/services/supabase/portal/reservas.service.ts` | All Supabase CRUD + capacity query for `reservas` |
| `src/hooks/portal/entrenamientos/reservas/useReservas.ts` | Booking list state, CRUD actions, optimistic updates |
| `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts` | Form state, validation, submission |
| `src/components/portal/entrenamientos/reservas/ReservaStatusBadge.tsx` | Status badge (`pendiente`, `confirmada`, `cancelada`, `completada`) |
| `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Main panel — role-aware booking list |
| `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | Create / edit modal |
| `src/components/portal/entrenamientos/reservas/index.ts` | Barrel exports |
| `supabase/migrations/20260302000200_reservas_rls_policies.sql` | RLS policies for `public.reservas` |
| `supabase/migrations/20260302000300_reservas_indexes.sql` | Index on `public.reservas(tenant_id, entrenamiento_id)` |

## Files to Modify

| Path | Change |
|---|---|
| `src/types/portal/entrenamientos.types.ts` | Add `reservas_activas?: number` to `TrainingInstance` |
| `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Enrich instances with `reservas_activas` count; expose `selectedInstanceId` + setter |
| `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Add `ReservasPanel` render path; add capacity indicator to calendar items/list cards |
| `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | Add "Ver reservas" action button that opens `ReservasPanel` |
| `src/components/portal/entrenamientos/index.ts` | Export reservas barrel |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Concurrent bookings exceeding capacity (race condition between capacity check and insert) | Add a DB-level `CHECK` or unique partial index as a future hardening step; document as known limitation |
| `reservas_activas` count stale after a booking action | `useReservas` calls `refresh()` from `useEntrenamientos` after any mutation to re-fetch the enriched instance list |
| RLS policy blocks legitimate entrenador INSERT on behalf of atleta | Policy must use a helper function `is_entrenador_or_admin(tenant_id)` — same pattern as disciplines/scenarios policies |
| Breaking `EntrenamientoActionModal` when adding "Ver reservas" button | Add the button as an optional prop (`onViewReservas?: () => void`) so existing usage is unchanged |

## Migration Plan

1. Write `20260302000200_reservas_rls_policies.sql` and `20260302000300_reservas_indexes.sql`.
2. Run `npx supabase db reset` locally to validate migrations apply cleanly.
3. Implement types → service → hooks → components in that order.
4. Manual QA: atleta books → entrenador confirms → atleta cancels → entrenador deletes.
5. Verify capacity indicator updates after each mutation.

**Rollback:** Remove the two SQL migrations and revert modified files. No data migration is involved (existing `reservas` rows are unaffected).

## Open Questions

- Should the capacity indicator on training cards use the tenant's local timezone for display consistency, or UTC? *(Recommend: display in Bogota timezone, matching the rest of the calendar.)*
- Should `completada` state be settable only when the training's `fecha_hora` is in the past? *(Recommend: yes — enforce this constraint in `useReservaForm` validation.)*
