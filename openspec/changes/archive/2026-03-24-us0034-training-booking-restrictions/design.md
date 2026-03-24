## Context

Currently, any authenticated tenant member can book any training session that has available capacity. The booking service (`reservas.service.ts`) enforces capacity limits and duplicate-booking prevention but performs no access gating based on the athlete's account, subscription, or discipline level. Training sessions and groups (`entrenamientos`, `entrenamientos_grupo`) carry no timing-policy fields.

This design introduces a configurable restriction layer. It involves a DB schema change, a service-layer validation gate, and a new admin UI section inside the training form. The approach must be backward-compatible — existing trainings and bookings must be unaffected.

Key constraints:
- Supabase (Postgres 15) with RLS; all sensitive validation must be enforceable at the DB layer.
- Frontend: Next.js 15 App Router, React 19, TypeScript strict, Tailwind + Shadcn UI.
- Architecture: hexagonal feature-slice (page → component → hook → service → types).
- No new pages; changes are confined to the training form modal and the booking service.

## Goals / Non-Goals

**Goals:**
- Add `reserva_antelacion_horas` / `cancelacion_antelacion_horas` columns to `entrenamientos` and `entrenamientos_grupo`.
- Add `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones` tables (flat-row OR/AND access conditions).
- Enforce timing and access restrictions in `reservas.service.ts` before inserting or cancelling a booking.
- Return a typed `BookingRejection` error from the service containing the specific rejection reason and a human-readable message in Spanish.
- Display the rejection reason inline in `ReservasPanel` so the athlete understands exactly why they cannot book or cancel.
- Expose a restriction-row editor in `EntrenamientoFormModal` for admins.
- Propagate group restrictions to generated sessions at generation time.
- Full RLS on new tables (member read, admin write).

**Non-Goals:**
- Retroactive update of existing generated sessions when a group's restrictions change.
- A dedicated "why can't I book" screen or modal — feedback is shown inline in the existing `ReservasPanel`.
- Restriction bulk import/export or template library.
- Changes to role definitions or `miembros_tenant` model.
- Any migration of existing data (all new columns nullable / all new tables empty).

## Decisions

### Decision 1: Flat-row table with AND-per-row / OR-across-rows logic

**Chosen:** `entrenamiento_restricciones` stores one row per OR branch. Each row's non-null columns are ANDed together.

**Rationale:** The domain has exactly four access condition types — all known at design time. A flat table gives native FK constraints on `plan_id` and `disciplina_id`, a simple `SELECT * WHERE entrenamiento_id = ?` query, and straightforward OR evaluation in code with no pivoting. The mental model is familiar (spreadsheet rows = alternatives).

**Alternatives considered:**
- **EAV / JSONB column on `entrenamientos`:** No FK enforcement, no type safety, difficult to query. Rejected.
- **Graph model (groups + items):** Two extra tables, more complex joins. Appropriate if condition types were dynamic. Rejected as over-engineering for a four-column domain.

---

### Decision 2: Timing restrictions as scalar columns, not restriction rows

**Chosen:** `reserva_antelacion_horas` and `cancelacion_antelacion_horas` are added directly to `entrenamientos` / `entrenamientos_grupo` as nullable integers.

**Rationale:** Timing policies apply uniformly to all athletes — there is no scenario where "Plan A requires 24h notice but Plan B requires 0h". Storing them in restriction rows would create confusing AND logic (timing AND plan AND discipline) and make OR evaluation semantically broken for timing. Separate scalar columns are the right separation of concerns.

---

### Decision 3: Validation in the service layer (TypeScript), not a DB trigger

**Chosen:** Restriction validation is performed in `reservas.service.ts` via sequential Supabase queries, wrapped in a single async function called before the `INSERT` into `reservas`.

**Rationale:**
- DB triggers in Supabase require `SECURITY DEFINER` functions that bypass RLS — acceptable for performance but adds complexity and obscures intent.
- The validation logic (loop over OR rows, multiple FK lookups) is clearer in TypeScript and easier to unit test.
- A failed validation raises an application-level error before any DB write, keeping the DB clean.
- Returning structured rejection objects from TypeScript is straightforward and gives full control over the human-readable message without custom Postgres error codes.
- **Security:** The Supabase client validation is backed by RLS policies. Even if a client bypasses the service (direct PostgREST call), `INSERT INTO reservas` will succeed, but restriction enforcement via RLS functions can be added in a future hardening step. For now, service-layer enforcement is the primary gate — consistent with how capacity and duplicate checks are already implemented.

**Alternative considered:** Postgres `BEFORE INSERT` trigger on `reservas`. More secure against direct API calls but harder to maintain, harder to return human-readable structured messages, and complicates local dev. Deferred to a future hardening story.

---

### Decision 7: Typed `BookingRejection` error object — not a plain string or generic Error

**Chosen:** The validation function returns `{ ok: true }` on success or `{ ok: false; code: BookingRejectionCode; message: string }` on failure. `BookingRejectionCode` is a TypeScript union of known codes.

**Rejection codes and default Spanish messages:**

| Code | Trigger | Default message |
|---|---|---|
| `TIMING_RESERVA` | `now > fecha_hora - reserva_antelacion_horas` | `"Solo puedes reservar con al menos {N} h de antelación. El entrenamiento comienza el {fecha}."` |
| `TIMING_CANCELACION` | `now > fecha_hora - cancelacion_antelacion_horas` | `"Solo puedes cancelar con al menos {N} h de antelación. El entrenamiento comienza el {fecha}."` |
| `USUARIO_INACTIVO` | `usuario_estado = 'activo'` fails | `"Tu cuenta está inactiva. Contacta al administrador para reactivar tu acceso."` |
| `PLAN_REQUERIDO` | `plan_id` condition fails | `"Este entrenamiento requiere una suscripción activa al plan {nombre_plan}."` |
| `DISCIPLINA_REQUERIDA` | `disciplina_id` condition fails | `"Este entrenamiento requiere una suscripción activa que incluya la disciplina {nombre_disciplina}."` |
| `NIVEL_INSUFICIENTE` | `validar_nivel_disciplina` condition fails | `"Tu nivel actual en {disciplina} no es suficiente para este entrenamiento (mínimo: {nivel_requerido})."` |

**Rationale:** A typed union prevents missing-case bugs in the UI. The `message` field is pre-interpolated with entity names (fetched during validation) so the UI only needs to render the string — no additional lookups required. Using `{ ok, code, message }` avoids throwing Errors for non-exceptional control flow (validation failure is expected, not exceptional).

**Alternative considered:** Throw a custom `BookingError` class. Rejected — `try/catch` for control flow is an antipattern; the `ok`/`code`/`message` discriminated union is idiomatic for service-layer results.

**UI integration:** `useReservas.ts` reads the rejection result and stores it in local state (`bookingRejection: BookingRejection | null`). `ReservasPanel` renders it as an inline `Alert` (Shadcn) with a warning icon above the action buttons when non-null. The alert is cleared on re-attempt or when the panel is closed.

---

### Decision 4: Delete-all-then-reinsert for restriction row updates

**Chosen:** When saving an existing training, delete all `entrenamiento_restricciones` rows for that training, then insert the current set from the form state.

**Rationale:** Restriction rows have no external references (they are not FK targets). Upsert by row identity would require stable client-side IDs across form edits, adding complexity to the hook. Delete-and-reinsert is safe, simple, and transactionally atomic when wrapped in a Supabase transaction (`rpc` or sequential ops within a single request batch).

---

### Decision 5: Group restrictions propagated by copy at generation time only

**Chosen:** When generating `entrenamientos` from an `entrenamientos_grupo`, copy the group's restriction rows into `entrenamiento_restricciones`. Subsequent edits to the group's restrictions do NOT update already-generated sessions.

**Rationale:** Consistent with the existing `bloquear_sync_grupo` model for other group fields. Administrators can override restrictions on individual sessions. Mass retroactive updates are a separate story and require explicit user intent.

---

### Decision 6: Zero restriction rows = unrestricted booking

**Chosen:** If `entrenamiento_restricciones` has no rows for a given training, the booking is allowed without access checks (timing checks still apply if columns are non-null).

**Rationale:** Backward compatibility. Every existing training has zero restriction rows post-migration. This default must preserve current behavior.

---

### Component architecture

Following the feature-slice pattern (page → component → hook → service → types):

```
EntrenamientoFormModal.tsx          ← modified: adds <EntrenamientoRestriccionesSection />
  └─ EntrenamientoRestriccionesSection.tsx  ← new standalone component
       receives: restricciones[], planes[], disciplinas[], handlers from hook

ReservasPanel.tsx                   ← modified: renders <BookingRejectionAlert /> when rejection present
  └─ BookingRejectionAlert.tsx      ← new (or inline): Shadcn Alert showing rejection message

useEntrenamientoForm.ts             ← modified: adds restriction row state + handlers
  └─ calls entrenamientos.service.ts on submit

useReservas.ts                      ← modified: stores bookingRejection state, clears on re-attempt
  └─ calls reservas.service.ts (createReserva, cancelReserva)

entrenamientos.service.ts           ← modified: persist timing cols + restriction rows
reservas.service.ts                 ← modified: validateBooking() returns BookingRejection | null
entrenamiento-restricciones.types.ts ← new: TypeScript interfaces + BookingRejectionCode union
```

## Risks / Trade-offs

- **[Risk] Service-layer-only validation can be bypassed via direct PostgREST calls.**
  → Mitigation: RLS SELECT policies prevent reading other tenants' restrictions. A future hardening story should add a `BEFORE INSERT` trigger or an RPC wrapper for `reservas` that re-runs the validation check server-side.

- **[Risk] Delete-and-reinsert of restriction rows loses row `id` references if any external system were indexing them.**
  → Mitigation: Restriction rows are internal implementation detail — not exposed in any external API or referenced by any other table. Safe for this version.

- **[Risk] `ON DELETE SET NULL` on `plan_id` / `disciplina_id` silently degrades a restriction row (the condition becomes NULL = "no restriction").** An admin may not notice a restriction became ineffective after a plan is deleted.
  → Mitigation: Acceptable for V1. A future improvement could mark the row as "invalid" or notify the admin. Out of scope for this story.

- **[Trade-off] Copying restriction rows at generation time means a group's restrictions and its generated sessions can diverge.**
  → Accepted. Consistent with how all other group fields behave. Admins can inspect and edit per-session if needed.

- **[Trade-off] `validar_nivel_disciplina = true` with no matching `entrenamiento_categorias` row is silently ignored (no level check performed).**
  → This is intentional — if the training has no level-based capacity allocations, level validation cannot be performed. A UI warning in the form alerts the admin to configure categories if they enable level validation.

- **[Trade-off] Rejection message uses the first failing condition within the first failing OR row.**
  → When multiple rows exist and all fail, reporting all reasons would produce a confusing multi-part message. Reporting only the first failure (of the first OR row) is sufficient UX for V1. Future improvement: show "ninguna de las opciones disponibles es válida para tu perfil" as a fallback.

## Migration Plan

1. Run migration file `{timestamp}_entrenamiento_restricciones.sql`:
   - `ALTER TABLE entrenamientos` — add timing columns (nullable, no default → NULL).
   - `ALTER TABLE entrenamientos_grupo` — add timing columns (nullable).
   - `ALTER TABLE entrenamientos ADD CONSTRAINT entrenamientos_tenant_id_id_uk` (if not present).
   - `CREATE TABLE entrenamiento_restricciones` with indexes + RLS.
   - `CREATE TABLE entrenamiento_grupo_restricciones` with indexes + RLS.
2. No data backfill required. All new columns/tables start empty/null.
3. Rollback: `DROP TABLE` both new tables; `ALTER TABLE` to drop new columns. Safe — no other table references them.

## Resolved Decisions

- **Cancellation timing scope:** Timing enforcement (`cancelacion_antelacion_horas`) applies only to atleta self-cancellation. Admin and coach bypass it — consistent with the existing bypass for capacity on admin-created bookings.
- **`validar_nivel_disciplina` with no category:** If the training has no `entrenamiento_categorias` row with a `nivel_id`, the level condition is silently skipped (pass). No category = no level assigned = no restriction to enforce.
- **Rejection alert lifecycle:** The `bookingRejection` state in `useReservas` is cleared when the panel is closed, ensuring the athlete always sees a fresh state on re-open. Stale messages after an external condition change would be misleading.
