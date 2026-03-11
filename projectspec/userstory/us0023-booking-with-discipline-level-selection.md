# User Story: Booking with Discipline Level Selection

## ID
US0023

## Title
Level-Aware Training Booking — Show Available Levels at Reservation and Associate the Selected Level to the Booking

## As a
**Athlete (Atleta)** member of a tenant

## I Want
When I open the booking form for a training session that has per-level categories defined (from `entrenamiento_categorias`), to see the available levels listed with their remaining spots, be required to choose one, and have my reservation saved with that level associated.

## So That
- I am directed to the correct skill-level group automatically.
- I cannot accidentally fill spots that belong to a different level.
- Admins and coaches can see which level each participant registered for, enabling accurate attendance management per level.

---

## Description

US0022 introduced the `entrenamiento_categorias` table, which associates per-level capacity allocations (`cupos_asignados`) with each training instance, and added the nullable column `entrenamiento_categoria_id` to `reservas`.

This story implements the **booking UX** that makes use of those columns:

1. When the athlete opens the booking panel for a training that has **one or more rows in `entrenamiento_categorias`**, a **level selector** step is shown before confirming the reservation.
2. The selector lists only categories that still have **available spots** (i.e., categories where `cupos_asignados > count of active reservas for that categoria`).
3. If the athlete has an assigned discipline level (`usuario_nivel_disciplina`), their level is **pre-selected** automatically (if available).
4. If `entrenamiento_categorias` has no rows for that training (categories not configured), existing behavior is unchanged — no level selector is shown and `entrenamiento_categoria_id` is stored as `null`.
5. The service must **validate per-category capacity** before inserting the reservation to prevent overbooking.

---

## Affected Tables (No New Migration Required)

All required schema changes were introduced in migration `20260311000100_entrenamiento_categorias_niveles.sql`.

| Table | Role in this story |
|---|---|
| `entrenamiento_categorias` | Source of per-level capacity for a training instance. Read to populate the level picker. |
| `nivel_disciplina` | Provides `nombre` and `orden` for display. Joined via `entrenamiento_categorias.nivel_id`. |
| `usuario_nivel_disciplina` | Used to auto-select the athlete's assigned level for the relevant discipline. |
| `reservas.entrenamiento_categoria_id` | Written on create; validated (per-category capacity) before insert. |

---

## Service-Layer Changes

### File: `src/services/supabase/portal/reservas.service.ts`

#### New function: `getCategoriasConDisponibilidad`

```ts
getCategoriasConDisponibilidad(tenantId: string, entrenamientoId: string): Promise<CategoriaDisponibilidad[]>
```

Returns all `entrenamiento_categorias` for the given training instance, enriched with:
- `nivel_id`
- `nombre` (from `nivel_disciplina.nombre`)
- `orden` (from `nivel_disciplina.orden`)
- `cupos_asignados`
- `reservas_activas` — count of non-cancelled `reservas` where `entrenamiento_categoria_id = categoria.id`
- `disponible` — `reservas_activas < cupos_asignados`

The query:
```sql
SELECT
  ec.id,
  ec.nivel_id,
  ec.cupos_asignados,
  nd.nombre,
  nd.orden,
  COUNT(r.id) FILTER (WHERE r.estado <> 'cancelada') AS reservas_activas
FROM entrenamiento_categorias ec
JOIN nivel_disciplina nd ON nd.id = ec.nivel_id
LEFT JOIN reservas r ON r.entrenamiento_categoria_id = ec.id
WHERE ec.entrenamiento_id = :entrenamientoId
GROUP BY ec.id, nd.nombre, nd.orden
ORDER BY nd.orden ASC;
```

> Implement with the Supabase client (chained `.select()` with `.eq()`) rather than raw SQL. Use a join on `nivel_disciplina` and aggregate the count in the service layer from the returned rows if the PostgREST aggregate is not straightforward.

#### Updated function: `createReserva`

After validating overall capacity, add a **per-category capacity check** when `entrenamiento_categoria_id` is provided:

1. Reject if the referenced `entrenamiento_categoria_id` does not belong to the requested `entrenamiento_id`.
2. Count active reservas for that category; if `count >= cupos_asignados` → throw `ReservaServiceError` with code `'capacity_exceeded'` and message `'No hay cupos disponibles para el nivel seleccionado.'`

#### New error code

Add `'categoria_not_found'` to `ReservaServiceErrorCode` for the case where the provided `entrenamiento_categoria_id` does not match the training instance.

---

## Type Changes

### File: `src/types/portal/reservas.types.ts`

Add the following type (can be co-located in this file):

```ts
export type CategoriaDisponibilidad = {
  id: string;                   // entrenamiento_categorias.id
  nivel_id: string;
  nombre: string;               // nivel_disciplina.nombre
  orden: number;                // nivel_disciplina.orden
  cupos_asignados: number;
  reservas_activas: number;
  disponible: boolean;          // reservas_activas < cupos_asignados
};
```

`Reserva` and `CreateReservaInput` already include `entrenamiento_categoria_id` — no addition needed.

---

## Hook Changes

### File: `src/hooks/portal/entrenamientos/reservas/useReservas.ts`

Add a new state field and loader for categories:

```ts
categorias: CategoriaDisponibilidad[];
loadingCategorias: boolean;
```

Categories are fetched (via `getCategoriasConDisponibilidad`) whenever `entrenamientoId` changes and the hook mounts. Expose `refetchCategorias()` to allow the panel to refresh after a booking is made (to reflect updated available spots).

### File: `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts`

Extend `ReservaFormValues` with:

```ts
entrenamiento_categoria_id: string | null;
```

Extend `ReservaFormErrors` with:

```ts
entrenamiento_categoria_id?: string;
```

Add to `UseReservaFormOptions`:

```ts
categorias: CategoriaDisponibilidad[];   // passed in from the panel
disciplinaId: string | null;             // to look up athlete's assigned level
atletaId: string | null;                 // current user's id (for auto-select)
```

**Auto-select logic** in `openCreate()`:
When `categorias.length > 0` and `atletaId` is known, the hook fetches `usuario_nivel_disciplina` for `(atletaId, tenantId, disciplinaId)` and pre-fills `entrenamiento_categoria_id` with the categoria whose `nivel_id` matches the athlete's assigned level — provided that categoria is `disponible`. If no match or not available, `entrenamiento_categoria_id` remains `null`.

**Validation** in `submitCreate()`:
If `categorias.length > 0` and `entrenamiento_categoria_id` is `null` → set field error: `'Debes seleccionar un nivel para esta reserva.'`

---

## Component Changes

### File: `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx`

#### New props

```ts
categorias: CategoriaDisponibilidad[];         // list of levels with availability
loadingCategorias: boolean;
```

Extend `form` shape with `entrenamiento_categoria_id: string | null`.

Extend `errors` shape with `entrenamiento_categoria_id?: string`.

Extend `onUpdateField` union to include `'entrenamiento_categoria_id'`.

#### UX — Level Selector Section (create mode only)

Displayed between the athlete picker (or header) and the notes field, **only when `categorias.length > 0`**:

```
┌──────────────────────────────────────────────────────────┐
│  Selecciona tu nivel                                      │
│                                                           │
│  ○  Básico          8 / 10 cupos disponibles             │
│  ●  Intermedio      3 / 8  cupos disponibles  ← selected │
│  ✕  Avanzado        0 / 5  cupos disponibles  (disabled) │
│                                                           │
│  [ inline error if not selected on submit ]               │
└──────────────────────────────────────────────────────────┘
```

- Each level is rendered as a radio option (or a styled button group).
- When `categorias` is loading: show a skeleton or spinner in place of the selector.
- Categories with `disponible = false` are rendered as disabled and visually muted (greyed out, strikethrough on the spot count).
- The pre-selected option (if auto-matched) is visually distinct.
- The remaining spots are displayed as: `X cupos disponibles` (where X = `cupos_asignados - reservas_activas`).

#### Access note

**Athletes** always see this selector and must choose.
**Admins / Entrenadores** creating a reservation on behalf of an athlete also see this selector — same rules apply.

### File: `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`

- Pass `categorias` and `loadingCategorias` obtained from `useReservas` down to `ReservaFormModal`.
- After a successful booking mutation, call `refetchCategorias()` so remaining spots are updated before the next booking attempt.
- Pass `disciplinaId` (from `instance.disciplina_id`) and `atletaId` (from `currentUserId`) into `useReservaForm` options.

---

## Files to Modify

| File | Change |
|---|---|
| `src/types/portal/reservas.types.ts` | Add `CategoriaDisponibilidad` type |
| `src/services/supabase/portal/reservas.service.ts` | Add `getCategoriasConDisponibilidad`, update `createReserva` per-category validation |
| `src/hooks/portal/entrenamientos/reservas/useReservas.ts` | Add `categorias`, `loadingCategorias`, `refetchCategorias` |
| `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts` | Add `entrenamiento_categoria_id` to form/errors/validation; add auto-select logic |
| `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | Add level selector UI section (create mode) |
| `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Wire new props; call `refetchCategorias` after mutation; pass `disciplinaId` and `atletaId` |

No database migration is needed.

---

## Expected Results / Acceptance Criteria

1. **No categories configured**: Opening the booking form for a training that has no `entrenamiento_categorias` rows behaves exactly as before — no level selector is shown, `entrenamiento_categoria_id` is `null` on the created `reserva`.

2. **Categories present — happy path**:
   - The level selector is visible in the booking form.
   - Available levels show their remaining spot count.
   - Fully booked levels are shown as disabled.
   - The athlete's assigned level (if any) is pre-selected.
   - Submitting creates a `reserva` with `entrenamiento_categoria_id` pointing to the chosen `entrenamiento_categorias.id`.

3. **Validation — no level selected**:
   - Submitting without selecting a level shows the inline error `'Debes seleccionar un nivel para esta reserva.'`
   - The form does not submit.

4. **Concurrency / race condition guard**:
   - If a category reaches full capacity between the form load and submission (another athlete books the last spot), the service throws `capacity_exceeded`, and the modal shows the error `'No hay cupos disponibles para el nivel seleccionado.'`

5. **Admin on-behalf booking**: Same level-picker rules apply when an admin or coach creates a booking for an athlete.

6. **Existing reservas**: Previously created reservas with `entrenamiento_categoria_id = null` continue to display and function without errors.

---

## Implementation Steps

1. **Types** — Add `CategoriaDisponibilidad` to `reservas.types.ts`.
2. **Service** — Implement `getCategoriasConDisponibilidad`. Update `createReserva` to validate per-category capacity.
3. **Hook `useReservas`** — Add category loading state and `refetchCategorias`.
4. **Hook `useReservaForm`** — Add `entrenamiento_categoria_id` to form state; implement auto-select; add validation guard.
5. **Component `ReservaFormModal`** — Implement the level selector section.
6. **Component `ReservasPanel`** — Wire all new props; call `refetchCategorias` after mutations.
7. **Manual QA** — Test all acceptance criteria in the running app against a tenant with and without discipline levels configured.

---

## Non-Functional Requirements

### Security
- The per-category capacity check must occur **server-side** (inside the service, which queries the database). Client-side spot counts are for display only.
- RLS on `entrenamiento_categorias` is already in place (select for authenticated tenant members) — no additional policies needed.
- `entrenamiento_categoria_id` is validated as belonging to the target `entrenamiento_id` before insert to prevent an athlete injecting an arbitrary foreign key reference.

### Performance
- `getCategoriasConDisponibilidad` should be a single round-trip via Supabase client joining `entrenamiento_categorias`, `nivel_disciplina`, and counting from `reservas`. Avoid N+1 fetching.
- The category list is expected to be small (typically 1–5 levels), so no pagination is required.

### Accessibility
- The level selector must use proper `<fieldset>` / `<legend>` / `<input type="radio">` semantics (or equivalent accessible component) so screen readers enumerate the options correctly.
- Disabled options (full capacity) must have `aria-disabled="true"` and communicate spot count.
