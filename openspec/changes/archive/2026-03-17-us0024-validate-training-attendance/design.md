## Context

The `asistencias` table was introduced in the initial schema migration (`20260221000100_migracion_inicial_bd.sql`) with a unique constraint on `reserva_id` — one attendance record per booking. No RLS policies, service layer, or UI exist for it yet. As a result, the `ReservasPanel` slide-over currently displays booking rows (via `useReservas`) with no attendance state, and there is no role-gated path for admins/coaches to mark whether an athlete actually showed up.

The bookings feature (`us0016`) already established the pattern this change extends:
- `ReservasPanel` is a right slide-over panel (not a page route).
- It uses a single-mount modal strategy (`ReservaFormModal` rendered once at panel level, controlled by a boolean `formModalOpen` state).
- The `isAdmin` flag (`role === 'administrador' || role === 'entrenador'`) already gates admin-only controls inside the panel.
- Hooks follow the `{state, actions, error, isLoading}` shape and expose a `refresh()` method.
- Services use `createClient()` (browser client), a custom Error class, and `tenant_id` scoping on every query.

This change adds a new parallel data slice (`asistencias`) consumed exclusively within `ReservasPanel`, following the same layered pattern: types → service → hook → components.

## Goals / Non-Goals

**Goals:**
- Enable admins and coaches to create, update, and delete attendance records per booking from within `ReservasPanel`.
- Display attendance state inline on each booking row via `AsistenciaStatusBadge`, visible to all panel users.
- Gate the attendance action controls (modal open button) to `isAdmin` only.
- Enforce RLS so athletes cannot query `asistencias` at all — not in the UI, not via the API.
- Re-use the existing `get_trainer_or_admin_tenants_for_authenticated_user()` helper for RLS policies.

**Non-Goals:**
- No changes to booking requirements, booking state machine, or `ReservaFormModal`.
- No attendance reporting, filtering, or export functionality.
- No bulk attendance operations.
- No new DB schema changes — the `asistencias` table structure is used as-is.

## Decisions

### 1. Attendance data fetched as a `reserva_id`-keyed map

**Decision:** `getAsistenciasByEntrenamiento` returns `Record<string, Asistencia>` keyed by `reserva_id`, not a plain array.

**Why:** `ReservasPanel` renders a list of `ReservaView` objects. Looking up attendance for each row requires O(1) access. A map eliminates a `.find()` per row and avoids re-renders from array length changes when a single record is mutated.

**Alternative considered:** Return an array and let the panel `.find()` per row. Rejected — O(n²) for large booking lists and harder to invalidate individually.

---

### 2. Single modal mounted at panel level, controlled by `selectedReservaForAsistencia` state

**Decision:** `AsistenciaFormModal` is rendered once inside `ReservasPanel`, driven by a `selectedReservaForAsistencia: ReservaView | null` state variable (mirroring how `ReservaFormModal` is driven by `formModalOpen`).

**Why:** Consistent with the existing single-mount pattern for `ReservaFormModal`. Mounts one set of form state and avoids multiple modal instances leaking into the DOM.

**Alternative considered:** Per-row modal instances. Rejected — DOM fragmentation, multiple state variables, and inconsistent with the panel's established pattern.

---

### 3. `isEnabled` guard — athletes skip the fetch entirely

**Decision:** `useAsistencias` accepts `isEnabled: boolean`. When `false` (athlete role), the hook returns an empty map and no-op functions without issuing any Supabase query.

**Why:** Athletes are excluded from RLS — any query would return an empty result at best or a permission error at worst. Skipping the fetch avoids a wasted round-trip, a confusing empty error state, and unnecessary Supabase calls on every panel open for the majority of users.

**Alternative considered:** Let RLS silently return empty results. Rejected — adds a network request with no utility and depends on RLS returning gracefully rather than an error.

---

### 4. Upsert on `reserva_id` conflict, not separate insert/update paths

**Decision:** `upsertAsistencia` always calls `.upsert({ ...input }, { onConflict: 'reserva_id' })`, regardless of whether an existing record is present.

**Why:** The `asistencias` table has `asistencias_reserva_id_uk unique (reserva_id)`. An upsert is atomic and removes the need for a pre-check query or conditional branching in the service. The `AsistenciaFormModal` props expose `existing: Asistencia | null` purely for UX (pre-filling the form and showing the Delete button), not to choose between insert vs. update code paths.

**Alternative considered:** Check for existing record and branch into insert/update. Rejected — two round-trips instead of one, race condition risk, and unnecessary complexity.

---

### 5. `validado_por` and `fecha_asistencia` set at the hook level, not the service

**Decision:** The hook's `upsertAsistencia` wrapper enriches the `AsistenciaFormValues` with `validado_por = currentUserId` and `fecha_asistencia = new Date().toISOString()` before calling the service. The service receives the full `UpsertAsistenciaInput`.

**Why:** RLS already enforces `validado_por = auth.uid()` on INSERT. Setting it at the hook keeps the service pure (no auth dependency) and makes the value explicit in calling code. The service does not import `createClient().auth`.

**Alternative considered:** Let the service call `auth.getUser()` internally. Rejected — mixes auth concerns into the data layer, harder to test, and the hook already has `currentUserId` in scope.

---

### 6. `AsistenciaStatusBadge` shown on all roles; action button shown only to `isAdmin`

**Decision:** `AsistenciaStatusBadge` renders for all users in the panel (admin and athlete alike in the displayed rows). The pencil/verify icon button that opens `AsistenciaFormModal` is wrapped in `{isAdmin && ...}`.

**Why:** The badge is read-only and informational. Showing attendance state to everyone in the panel is consistent — athletes can see if their attendance was recorded. The action to create/edit/delete attendance is admin-only per the user story. This avoids two separate row layouts for the same data.

**Alternative considered:** Hide the badge entirely for athletes. Rejected — the user story only restricts _manipulation_, not visibility of the recorded fact for the athlete's own booking.

## Architecture

```
ReservasPanel (modified)
├── useAsistencias (new)            ← fetches asistenciaMap, exposes upsert/delete
│   └── asistencias.service (new)  ← Supabase CRUD, tenant-scoped
├── AsistenciaStatusBadge (new)     ← per booking row, read-only
└── AsistenciaFormModal (new)       ← mounted once, driven by selectedReservaForAsistencia

Types (new): src/types/portal/asistencias.types.ts
Migration (new): supabase/migrations/20260312000100_asistencias_rls_policies.sql
```

**Layer order (page → component → hook → service → types):**
1. `asistencias.types.ts` — domain types, no dependencies.
2. `asistencias.service.ts` — Supabase CRUD, imports types only.
3. `useAsistencias.ts` — state management, imports service + types.
4. `AsistenciaStatusBadge.tsx` — pure display, imports types only.
5. `AsistenciaFormModal.tsx` — form UI, imports types only.
6. `ReservasPanel.tsx` — integrates hook + components.

## Risks / Trade-offs

- **[Risk] Stale attendance map after mutation** — After `upsertAsistencia` or `deleteAsistencia`, the hook's `asistenciaMap` is out of date until `refresh()` is called. Mitigation: The panel calls `asistenciasHook.refresh()` in every `onSave` and `onDelete` handler, immediately after the mutation resolves. This is the same pattern used by `reservasHook.refresh()` in the booking mutation handlers.

- **[Risk] RLS policy regression** — If `get_trainer_or_admin_tenants_for_authenticated_user()` is modified or dropped in a future migration, all four `asistencias` policies break silently (empty results or permission errors). Mitigation: The migration has a clear comment referencing the origin migration (`20260302000200_reservas_rls_policies.sql`). The helper function is shared with `reservas` policies so any breakage would be visible across two features.

- **[Risk] `validado_por` mismatch on UPDATE** — The INSERT policy enforces `validado_por = auth.uid()`, but the UPDATE policy does not. An admin could technically call upsert with a different `validado_por` on an update cycle. Mitigation: The hook always sets `validado_por = currentUserId` (from `auth.getUser()`) before calling upsert, so in practice the value is always the current user. The RLS asymmetry is an accepted trade-off from the user story's own migration spec.

- **[Trade-off] No optimistic updates** — Attendance mutations wait for the Supabase round-trip before the badge updates. This matches the pattern used by `useReservas` (no optimistic updates there either). The `saving` prop on `AsistenciaFormModal` shows a loading state during the round-trip.

## Migration Plan

1. Apply `supabase/migrations/20260312000100_asistencias_rls_policies.sql` to enable RLS on `asistencias`.
2. Deploy application code (no data migration required — the table and any existing rows are unaffected).
3. **Rollback**: Drop the four RLS policies and revoke the `grant` statement. No data is lost; the table structure is unchanged.

## Open Questions

- None at this time. All design decisions are resolved based on the user story spec and existing codebase patterns.
