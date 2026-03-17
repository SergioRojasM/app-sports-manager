## Context

US0022 delivered the full database schema for per-level capacity (`entrenamiento_categorias`, `nivel_disciplina`, `usuario_nivel_disciplina`) and added the nullable `entrenamiento_categoria_id` column to `reservas`. The existing booking flow (`ReservasPanel → useReservas / useReservaForm → reservasService → Supabase`) is unaware of categories — it only checks overall `cupo_maximo`.

The stack follows a strict layered architecture: components call hooks, hooks call services, services call Supabase. No direct Supabase calls from components.

Affected layers (bottom-up): **types → service → hooks → components**

---

## Goals / Non-Goals

**Goals:**
- Fetch per-level availability for a training instance and expose it in `useReservas`.
- Auto-select the athlete's assigned level when opening the booking form.
- Require level selection (validation) when categories exist; skip otherwise.
- Persist `entrenamiento_categoria_id` on the created `reserva`.
- Guard per-category capacity in the service layer before insert.
- Refresh category availability counts after each booking mutation.

**Non-Goals:**
- Reassigning level after a booking is created.
- Enforcing minimum-level gating (blocking athletes below a threshold level).
- Per-level attendance statistics in the panel.
- Any database migration (schema is complete from US0022).

---

## Decisions

### Decision 1: Fetch category availability in `useReservas`, not lazily on form open

**Choice:** Load `categorias` (with availability counts) alongside `reservas` and `capacidad` inside the existing `loadReservas` callback in `useReservas`. Expose `categorias: CategoriaDisponibilidad[]`, `loadingCategorias: boolean`, and `refetchCategorias()`.

**Alternative considered:** Fetch lazily inside `useReservaForm` when the form opens. Rejected because:
- The `ReservasPanel` also needs the category list to display a capacity summary per level (future-proof).
- It avoids a second loading spinner inside the modal after it's already open.
- Consistent with how `capacidad` is already loaded together with `reservas`.

---

### Decision 2: Count active reservas per category in the service layer (application-level aggregation)

**Choice:** `getCategoriasConDisponibilidad` fetches all `entrenamiento_categorias` rows (joined with `nivel_disciplina`) and all non-cancelled `reservas` for that training filtered by `entrenamiento_categoria_id IS NOT NULL`. The service then groups and counts in TypeScript before returning `CategoriaDisponibilidad[]`.

```
Query 1 — categories:
  FROM entrenamiento_categorias ec
  JOIN nivel_disciplina nd ON nd.id = ec.nivel_id
  WHERE ec.entrenamiento_id = :id
  ORDER BY nd.orden ASC

Query 2 — active bookings per category:
  FROM reservas
  WHERE entrenamiento_id = :id
    AND entrenamiento_categoria_id IS NOT NULL
    AND estado <> 'cancelada'
  SELECT entrenamiento_categoria_id, count(*)
```

Result is merged in-memory: `reservas_activas = categoryBookingCount[ec.id] ?? 0`.

**Alternative considered:** Single PostgREST query with nested select + count. PostgREST's aggregate support (`count()`) requires `prefer: count=exact` which only works on the root level; nested aggregation is not supported in the Supabase JS client without `rpc`. Rejected to stay consistent with the existing pattern and avoid adding a DB function.

**Trade-off:** 2 round-trips instead of 1. Acceptable — the category list is small (≤10 rows); both queries are indexed.

---

### Decision 3: Auto-select athlete's level inside `useReservaForm.openCreate()` via async lookup

**Choice:** `openCreate()` becomes async. When `categorias.length > 0` and `atletaId` is provided, it queries `usuario_nivel_disciplina` for `(atletaId, tenantId, disciplinaId)` via a new thin service helper `reservasService.getAtletaNivelId(tenantId, atletaId, disciplinaId)`. If the returned `nivel_id` matches an available categoria, that categoria's `id` is pre-filled into `entrenamiento_categoria_id`.

**Alternative considered:** Pre-loading the athlete's level inside `useReservas` at mount time. Rejected because:
- `useReservas` doesn't know which specific athlete is about to book (current user id is resolved asynchronously in `ReservasPanel`).
- Coupling the athlete-level lookup to general training data loading adds unnecessary overhead for admin views.
- The lookup only fires when the form opens — minimal perceived latency.

---

### Decision 4: Per-category capacity validation is service-layer only

**Choice:** Before inserting, `reservasService.create()` checks — if `entrenamiento_categoria_id` is provided:
1. Verify it belongs to the given `entrenamiento_id` (foreign key sanity check via a select).
2. Count active reservas for that category; reject with `capacity_exceeded` if full.

Client-side "disponible" flags are display hints only, not a security gate (a concurrent booking could make a category full between form load and submit).

---

### Decision 5: Level selector rendered as radio button group inside `ReservaFormModal` (create mode only)

**Choice:** A `<fieldset>` / `<legend>` / `<input type="radio">` block is rendered between the athlete picker and the notes field in `ReservaFormModal` when `categorias.length > 0`. Disabled options use `disabled` + `aria-disabled="true"`. The field is hidden in edit mode — level is not reassignable.

Each option shows: `nombre · X cupos disponibles` (X = `cupos_asignados − reservas_activas`).

---

## Architecture Diagram

```
ReservasPanel
  ├── useReservas  ←── reservasService.getCategoriasConDisponibilidad()
  │     exposes: categorias[], loadingCategorias, refetchCategorias()
  │
  └── useReservaForm  ←── reservasService.getAtletaNivelId()  (on openCreate)
        form.entrenamiento_categoria_id
        validation: required when categorias.length > 0
        |
        └── onCreateReserva(input)  →  reservasService.create()
                                           ├── overall capacity check (existing)
                                           └── per-category capacity check (new)
                                                 INSERT reservas (with categoria_id)
```

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Race condition: two athletes book the last spot in a category simultaneously | Service-layer check is not atomic without a DB lock. Acceptable because: (a) the check runs immediately before insert, (b) the `cupos_asignados` constraint is a soft limit enforced in service code, not a DB constraint. A future story can add a `CHECK` or advisory lock if needed. |
| `openCreate()` becoming async could break call sites that don't `await` it | The function signature changes from `(defaultAtletaId?) => void` to `(defaultAtletaId?) => Promise<void>`. All call sites inside `ReservasPanel` must be updated to `await`. There is only one call site today. |
| `getAtletaNivelId` adds a 3rd network call on form open | Mitigated by the fact that it only fires when (a) the training has categories AND (b) `atletaId` is known. Admin views load the form without a specific athlete — no fetch occurs until they pick one. |

---

## Migration Plan

No database migration. Deploy the code changes as a single feature branch. The nullable `entrenamiento_categoria_id` column is already present on `reservas` — existing bookings are unaffected.

Rollback: revert the branch. Old `reservas` rows with `entrenamiento_categoria_id = null` continue to work with the old code.

---

## Open Questions

1. Should the level selector be shown for **admin/coach on-behalf bookings** even when the admin themselves has no assigned level? → **Yes** — the selector is based on the training's categories, not the admin's level. Auto-select fires only when a specific `atleta_id` is chosen from the picker (requires fetching that athlete's level). For now, no auto-select for on-behalf bookings (pre-select remains empty).
2. Should a fully-booked training (all categories at capacity) disable the "Reservar" button entirely? → **Yes** — `disponible` on the overall `ReservaCapacidad` already covers this; no change needed.
