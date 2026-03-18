# US-0034 — Training Booking Restrictions

## ID
US-0034

## Name
Add Booking Restrictions to Training Sessions and Groups

## As a
Tenant administrator

## I Want
To define access restrictions on training sessions (and recurring training groups) that athletes must satisfy in order to place or cancel a booking

## So That
I can independently control who may book each training based on their account status, active subscription plan, discipline enrollment, and discipline level — as well as enforce advance-notice windows for bookings and cancellations

---

## Description

Currently any active team member can book any training session that has available capacity. This story introduces a configurable restriction system that allows administrators to attach access conditions to every training session or recurring group.

Restrictions are modeled in two layers:

1. **Timing restrictions** (scalar, training-level): `reserva_antelacion_horas` and `cancelacion_antelacion_horas` are stored directly on `entrenamientos` / `entrenamientos_grupo`. They apply universally regardless of who the athlete is.

2. **Access restrictions** (conditional, per-row AND / multi-row OR): Stored in new tables `entrenamiento_restricciones` / `entrenamiento_grupo_restricciones`. Each row is an independent access path (OR between rows). Within a single row, all non-null columns must be satisfied simultaneously (AND logic).

### Access Restriction Logic

```
Can book if:
  (row1.usuario_estado satisfied AND row1.plan_id satisfied AND row1.disciplina_id satisfied AND row1.validar_nivel_disciplina satisfied)
  OR
  (row2.usuario_estado satisfied AND row2.plan_id satisfied AND ...)
  OR ...
  AND reserva_antelacion_horas satisfied
  AND cancelacion_antelacion_horas satisfied (for cancellations)
```

If **no access restriction rows exist** for a training, the booking is open to any member (no access gate).

---

## Design Decision: Why the flat-table approach

| Criterion | Flat table (chosen) | EAV / JSONB | Graph model (groups + items) |
|---|---|---|---|
| FK enforcement | ✅ Native DB constraints | ❌ None | ❌ Value in JSON |
| Query simplicity | ✅ Single SELECT | ❌ Complex pivoting | ⚠️ Extra joins |
| OR/AND expressiveness | ✅ Row = OR branch | ✅ Group = OR branch | ✅ |
| Extensibility | ⚠️ DDL for new types | ✅ No DDL needed | ✅ |
| Dev cognitive load | ✅ Low | ❌ High | ⚠️ Medium |
| Correctness for this domain | ✅ 4 fixed types fits well | ❌ Type safety lost | ✅ but overkill |

**Timing constraints are NOT stored in the restriction rows** — they are scalar columns on the training/group tables because they apply uniformly and do not participate in OR logic.

---

## Restriction Field Reference

| Field | Type | Semantics |
|---|---|---|
| `usuario_estado` | `varchar(20)` nullable | Required `usuarios.activo` equivalent — valid values: `'activo'`. NULL = no restriction. |
| `plan_id` | `uuid` nullable FK → `planes` | Athlete must have an active subscription (`suscripciones.estado = 'activa'`) to this plan. NULL = no restriction. |
| `disciplina_id` | `uuid` nullable FK → `disciplinas` | Athlete must have an active subscription to a plan that includes this discipline (`planes_disciplina`). NULL = no restriction. |
| `validar_nivel_disciplina` | `boolean` not null default `false` | When `true`, athlete's `usuario_nivel_disciplina.orden` must be ≥ training's `entrenamiento_categorias.nivel_id.orden`. Ignored when the training has no level-based categories. |
| `reserva_antelacion_horas` | `integer` nullable (on `entrenamientos`) | Minimum hours before the training's `fecha_hora` that a booking can be placed. NULL = no advance-notice enforcement. |
| `cancelacion_antelacion_horas` | `integer` nullable (on `entrenamientos`) | Minimum hours before the training's `fecha_hora` that a cancellation can be submitted. NULL = no cancellation-notice enforcement. |

---

## Database Changes

### 1. Alter `entrenamientos`

```sql
alter table public.entrenamientos
  add column reserva_antelacion_horas   integer check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  add column cancelacion_antelacion_horas integer check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0);
```

### 2. Alter `entrenamientos_grupo`

```sql
alter table public.entrenamientos_grupo
  add column reserva_antelacion_horas   integer check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  add column cancelacion_antelacion_horas integer check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0);
```

### 3. Create `entrenamiento_restricciones`

```sql
create table public.entrenamiento_restricciones (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null,
  entrenamiento_id         uuid not null,
  usuario_estado           varchar(20) check (usuario_estado is null or usuario_estado = 'activo'),
  plan_id                  uuid,
  disciplina_id            uuid,
  validar_nivel_disciplina boolean not null default false,
  orden                    integer not null default 1 check (orden > 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint ent_restricciones_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint ent_restricciones_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade,
  constraint ent_restricciones_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete set null,
  constraint ent_restricciones_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete set null,
  constraint ent_restricciones_tenant_entrenamiento_fk
    foreign key (tenant_id, entrenamiento_id)
    references public.entrenamientos(tenant_id, id) on delete cascade
);

create index idx_ent_restricciones_entrenamiento on public.entrenamiento_restricciones (entrenamiento_id);
create index idx_ent_restricciones_tenant on public.entrenamiento_restricciones (tenant_id);
```

> Note: `entrenamientos` must expose a `(tenant_id, id)` unique constraint to support the composite FK. Add it if not already present:
> `alter table public.entrenamientos add constraint entrenamientos_tenant_id_id_uk unique (tenant_id, id);`

### 4. Create `entrenamiento_grupo_restricciones`

Mirrors `entrenamiento_restricciones` but references `entrenamientos_grupo`. When a training is generated from a group, its restrictions are copied from the group's restriction rows (same logic currently applied to other group fields). Updates to group restrictions do NOT retroactively modify existing generated trainings (consistent with current `bloquear_sync_grupo` model).

```sql
create table public.entrenamiento_grupo_restricciones (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null,
  entrenamiento_grupo_id   uuid not null,
  usuario_estado           varchar(20) check (usuario_estado is null or usuario_estado = 'activo'),
  plan_id                  uuid,
  disciplina_id            uuid,
  validar_nivel_disciplina boolean not null default false,
  orden                    integer not null default 1 check (orden > 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint eg_restricciones_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint eg_restricciones_grupo_fkey
    foreign key (tenant_id, entrenamiento_grupo_id)
    references public.entrenamientos_grupo(tenant_id, id) on delete cascade,
  constraint eg_restricciones_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete set null,
  constraint eg_restricciones_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete set null
);

create index idx_eg_restricciones_grupo on public.entrenamiento_grupo_restricciones (entrenamiento_grupo_id);
```

### 5. RLS Policies

Both new tables require RLS:
- **SELECT**: Any authenticated member of the tenant (`miembros_tenant` lookup)
- **INSERT / UPDATE / DELETE**: Admin only (via `get_admin_tenants_for_authenticated_user()`)
- Follow the exact policy structure used in `entrenamiento_categorias_niveles.sql`

---

## UI Changes

### `EntrenamientoFormModal.tsx`

Add a new collapsible **"Restricciones"** section after the existing fields. The section has two subsections:

#### A. Timing (scalar fields)

| Field | Input | Validation |
|---|---|---|
| Horas de antelación para reservar | Number input, min 0 | Optional; null = no restriction |
| Horas de antelación para cancelar | Number input, min 0 | Optional; null = no restriction |

#### B. Access Conditions (dynamic rows)

A table/list of restriction rows. Each row contains:

| Column | Control | Options |
|---|---|---|
| Estado usuario | Select | `"(sin restricción)"`, `"Activo"` |
| Plan requerido | Select | `"(sin restricción)"`, list of plans for current tenant (from `planes` where `activo = true`) |
| Disciplina requerida | Select | `"(sin restricción)"`, list of disciplines for current tenant (from `disciplinas` where `activo = true`) |
| Validar nivel | Toggle/Checkbox | `true/false`, default `false` |
| Actions | Duplicate icon + Delete icon | Duplicate copies the row; Delete removes it |

**Row management:**
- **"+ Añadir restricción"** button appends a new empty row.
- **Duplicate** copies the last (or the selected) row as a new row below it.
- **Delete** removes the row (disabled if it is the only row, unless you also want to allow zero rows = no access restrictions).
- A zero-row state is valid (= no access restrictions configured).

**UX hints:**
- Display an info banner inside the section: _"Cada fila es una condición alternativa (OR). Dentro de una fila, todas las condiciones seleccionadas deben cumplirse a la vez (AND)."_
- When `validar_nivel_disciplina = true` but no `disciplina_id` is set in the same row, show an inline warning: _"Seleccione una disciplina para que la validación de nivel tenga efecto."_

### `EntrenamientoCategoriasSection.tsx`

No changes needed. Level validation uses existing `entrenamiento_categorias` data.

---

## Service Layer Changes

### `entrenamientos.service.ts`

- `createEntrenamiento(input)`: persist `reserva_antelacion_horas`, `cancelacion_antelacion_horas`; after inserting the training, batch-insert `entrenamiento_restricciones` rows.
- `updateEntrenamiento(id, input)`: update timing columns; upsert restriction rows (delete all existing for the training and re-insert, atomically inside a transaction or use `supabase.rpc` if needed).
- `getEntrenamientoById(id)`: include `entrenamiento_restricciones` via a nested select.
- `getEntrenamientoGrupoById(id)`: include `entrenamiento_grupo_restricciones`.
- For group generation: when generating `entrenamientos` from a group, copy `reserva_antelacion_horas`, `cancelacion_antelacion_horas`, and insert matching `entrenamiento_restricciones` rows from `entrenamiento_grupo_restricciones`.

### `reservas.service.ts` — `createReserva(input)`

Before inserting a new reservation, apply the following validation logic **server-side via an RPC or a DB function** (preferred) or in the service layer:

```
1. Load training: fecha_hora, reserva_antelacion_horas, cancelacion_antelacion_horas
2. Check timing: if reserva_antelacion_horas is not null:
     assert now() <= fecha_hora - interval '? hours'
3. Load restriction rows for the training
4. If rows > 0:
     for each row (OR evaluation):
       row_passes = true
       if row.usuario_estado = 'activo': assert athlete.activo = true
       if row.plan_id is not null:
         assert EXISTS suscripcion where atleta_id = atleta AND plan_id = row.plan_id AND estado = 'activa'
       if row.disciplina_id is not null:
         assert EXISTS suscripcion s JOIN planes_disciplina pd ON pd.plan_id = s.plan_id
           where s.atleta_id = atleta AND s.estado = 'activa' AND pd.disciplina_id = row.disciplina_id
       if row.validar_nivel_disciplina = true AND entrenamiento has a nivel_disciplina:
         load training nivel via entrenamiento_categorias -> nivel_disciplina (orden)
         load athlete nivel via usuario_nivel_disciplina (orden)
         assert athlete.orden >= training.orden  -- athlete level must be >= required level
       if row_passes: break (at least one OR branch satisfied)
5. If no row passes: reject with HTTP 403 and descriptive message
```

For **cancellation** validation (i.e., when an athlete cancels a reservation):
```
if cancelacion_antelacion_horas is not null:
  assert now() <= entrenamiento.fecha_hora - interval '? hours'
else:
  allow cancellation
```

Validation errors must return structured messages that identify which condition was not met (for a good UX error display).

### Type Definitions (`src/types/`)

Add or update:

```typescript
// entrenamiento-restricciones.types.ts
export interface EntrenamientoRestriccion {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  usuario_estado: 'activo' | null;
  plan_id: string | null;
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
}

export type EntrenamientoRestriccionInput = Omit<EntrenamientoRestriccion, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
```

Update `Entrenamiento` type to include:
```typescript
reserva_antelacion_horas: number | null;
cancelacion_antelacion_horas: number | null;
restricciones?: EntrenamientoRestriccion[];
```

---

## Hooks Changes

### `useEntrenamientoForm.ts`

- Add form state for `reserva_antelacion_horas`, `cancelacion_antelacion_horas`.
- Add `restricciones: EntrenamientoRestriccionInput[]` array state.
- Expose `addRestriccion()`, `duplicateRestriccion(index)`, `removeRestriccion(index)`, `updateRestriccion(index, patch)` handlers.
- On load of an existing training, hydrate `restricciones` from the fetched data.
- Validation: warn (non-blocking) if `validar_nivel_disciplina = true` and `disciplina_id = null` in the same row.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `supabase/migrations/{timestamp}_entrenamiento_restricciones.sql` | **Create** — DDL for new tables, alters, indexes, RLS |
| `src/types/entrenamiento-restricciones.types.ts` | **Create** — TypeScript types |
| `src/services/supabase/portal/entrenamientos.service.ts` | **Modify** — CRUD + group generation |
| `src/services/supabase/portal/reservas.service.ts` | **Modify** — pre-booking + pre-cancellation validation |
| `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | **Modify** — restriction rows state + handlers |
| `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | **Modify** — add "Restricciones" section |
| `src/components/portal/entrenamientos/EntrenamientoRestriccionesSection.tsx` | **Create** — standalone component for the restriction rows editor |

---

## Expected Results

1. An administrator can open the training form (create or edit) and configure:
   - Optional advance-notice hours for booking and cancellation.
   - Zero or more access restriction rows, each with up to 4 condition columns.
2. Rows can be added blank, duplicated from an existing row, or deleted.
3. When an athlete attempts to book a training:
   - If the current time violates `reserva_antelacion_horas`, the booking is rejected with a human-readable message.
   - If access restriction rows are defined and none of them passes, the booking is rejected with a descriptive message identifying the unmet condition.
4. When an athlete attempts to cancel a reservation:
   - If the current time violates `cancelacion_antelacion_horas`, the cancellation is rejected.
5. A training with no restriction rows remains bookable by any team member (backward-compatible).
6. Restrictions defined on an `entrenamientos_grupo` are propagated to newly generated `entrenamientos` instances at generation time. Existing instances are not retroactively updated.

---

## Acceptance Criteria

- [ ] Migration applies cleanly with no errors.
- [ ] Admin can create a training with 0 restriction rows — booking still works for any member.
- [ ] Admin can create a training with `reserva_antelacion_horas = 24` — booking fails if attempted < 24 h before the session.
- [ ] Admin can add a restriction row requiring `plan_id = X` — an athlete without an active subscription to plan X cannot book.
- [ ] Admin can add two restriction rows (plan A, plan B) — an athlete with either plan can book.
- [ ] Admin can enable `validar_nivel_disciplina` — an athlete whose level is below the training level cannot book.
- [ ] Admin can duplicate a restriction row from the UI.
- [ ] Admin can delete a restriction row from the UI.
- [ ] Cancellation fails if the athlete tries to cancel inside the `cancelacion_antelacion_horas` window.
- [ ] All booking validation failures return a translated, user-friendly error message.
- [ ] RLS prevents unauthenticated or non-member access to restriction rows.
- [ ] RLS prevents non-admin users from inserting/updating/deleting restriction rows.

---

## Non-Functional Requirements

### Security
- All restriction validation must execute in the database layer (RPC function or query enforced by RLS), not only client-side, to prevent bypassing via direct API calls.
- RLS must be enabled on both `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones`.
- FK constraints must be present on `plan_id` and `disciplina_id` to prevent dangling references after plan/discipline deletion (`ON DELETE SET NULL` is correct).

### Performance
- Add indexes on `entrenamiento_id` and `entrenamiento_grupo_id` for efficient restriction lookups at booking time.
- The validation query should execute in a single round-trip; avoid N+1 queries per restriction row.

### Data Integrity
- Deleting a plan or discipline must not break existing restriction rows — `ON DELETE SET NULL` handles this; the row remains but that condition column is no longer evaluated (NULL = no restriction).
- Deleting a training cascades to its restriction rows automatically.

### Backward Compatibility
- Existing trainings without restriction rows remain fully open to booking (no access change).
- The `reserva_antelacion_horas` and `cancelacion_antelacion_horas` columns default to `NULL`, which means no timing enforcement for existing sessions.
