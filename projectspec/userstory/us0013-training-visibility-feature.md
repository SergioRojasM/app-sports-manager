# User Story: Add Visibility to Training Management Feature (`training_visibility_feature`)

## ID
US-0013

## Name
Add visibility control to trainings (public / private) with tenant-scoped access rules

### As a...
As an authenticated tenant administrator in the portal

### I want...
I want to set a visibility level (`public` or `private`) for each training I create or edit, so that I can control whether the training is visible only to members of my tenant or also to the public tenant.

### So that...
Athletes browsing public training offerings can discover trainings that the organization decides to make public, while internal/private trainings remain restricted to the current tenant's context.

---

## Description

Extend the `entrenamientos` training management feature (introduced in US-0012) with a **visibility model**. Two new columns must be added to the `public.entrenamientos` table:

| Column | Type | Description |
|---|---|---|
| `visibilidad` | `varchar(10)` | `'publico'` or `'privado'`. Controls the visibility scope of the training instance. |
| `visible_para` | `uuid` (FK → `tenants.id`) | References the tenant that **owns** the visibility. Set automatically based on the rule below. |

**Visibility rule:**
- `visibilidad = 'privado'` → `visible_para = entrenamientos.tenant_id` (shown only to the current tenant's members).
- `visibilidad = 'publico'` → `visible_para` = ID of the **public tenant** (a system-level tenant that aggregates publicly discoverable trainings; see note below).

> **Note on the public tenant**: The public tenant is identified by a well-known, stable `tenant_id` stored as an application constant (e.g., `src/lib/constants.ts`). If none exists yet, define a constant `PUBLIC_TENANT_ID` pointing to the seed tenant marked as public (check `supabase/seed.sql` or add a `is_public` boolean column to `tenants` if needed — outside of this story's scope; use a hard-coded UUID constant for now).

This story covers:
1. A **Supabase migration** to add the two new columns to `public.entrenamientos`, with constraints and default values.
2. An **update to RLS policies** so that authenticated users outside the current tenant can query rows where `visible_para` matches the public tenant.
3. **Service layer** updates to pass `visibilidad` and compute `visible_para` on create/update.
4. **Type contract** updates in `entrenamientos.types.ts`.
5. **Form UI update** — add a visibility selector (toggle or radio group) to `EntrenamientoFormModal.tsx` with default value `'privado'` and a descriptive label explaining the semantics.
6. **Propagation rule**: when editing a series with scope `'series'` or `'future'`, sync the `visibilidad` and `visible_para` fields alongside the other series fields (respect the existing `bloquear_sync_grupo` exception flag).

---

## Functional Scope

### 1) Database migration — new columns on `public.entrenamientos`

File to create: `supabase/migrations/20260301000100_entrenamientos_visibilidad.sql`

```sql
alter table public.entrenamientos
  add column if not exists visibilidad varchar(10) not null default 'privado',
  add column if not exists visible_para uuid;

alter table public.entrenamientos
  add constraint entrenamientos_visibilidad_ck
    check (visibilidad in ('publico', 'privado'));

alter table public.entrenamientos
  add constraint entrenamientos_visible_para_fkey
    foreign key (visible_para) references public.tenants(id) on delete set null;

create index if not exists idx_entrenamientos_visibilidad
  on public.entrenamientos (visibilidad);

create index if not exists idx_entrenamientos_visible_para
  on public.entrenamientos (visible_para);
```

**Initial backfill**: existing rows default to `visibilidad = 'privado'` and `visible_para = tenant_id` (backfill with an UPDATE in the same migration).

```sql
update public.entrenamientos
  set visible_para = tenant_id
  where visibilidad = 'privado' and visible_para is null;
```

### 2) RLS policy update

Add a new SELECT policy that allows authenticated users to read **public** trainings regardless of their tenant membership:

```sql
drop policy if exists entrenamientos_select_public_visibility on public.entrenamientos;
create policy entrenamientos_select_public_visibility on public.entrenamientos
  for select to authenticated
  using (
    visibilidad = 'publico'
    or tenant_id in (
      select mt.tenant_id from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
    )
  );
```

> This replaces or extends the existing `entrenamientos` SELECT policy. Confirm the name of the current policy before dropping to avoid regressions. Check `supabase/migrations/20260226000200_entrenamientos_grupo_recurrencia.sql` for current policy definitions.

### 3) Updated service functions

File: `src/services/supabase/portal/entrenamientos.service.ts`

Update the following functions to include `visibilidad` and `visible_para` in payloads:

- `createTrainingSeries` — accept `visibilidad` as part of `CreateTrainingSeriesInput`; compute `visible_para` before persisting instances.
- `updateTrainingSeries` — accept `visibilidad`; propagate to eligible instances (same sync criteria as existing fields).
- `updateTrainingInstance` — accept `visibilidad`; compute and set `visible_para`.
- `generateSeriesInstances` — derive `visibilidad` and `visible_para` from the parent group when generating instances.

**`visible_para` computation helper** (implement as a pure function in the service or utils):

```typescript
function resolveVisiblePara(visibilidad: 'publico' | 'privado', tenantId: string): string {
  return visibilidad === 'privado' ? tenantId : PUBLIC_TENANT_ID;
}
```

### 4) Type contract updates

File: `src/types/portal/entrenamientos.types.ts`

Add:
```typescript
export type TrainingVisibility = 'publico' | 'privado';

// Update TrainingInstance to include the new fields:
export interface TrainingInstance {
  // ... existing fields ...
  visibilidad: TrainingVisibility;
  visible_para: string | null;
}

// Update input types:
export interface CreateTrainingSeriesInput {
  // ... existing fields ...
  visibilidad: TrainingVisibility; // required
}

export interface UpdateTrainingSeriesInput {
  // ... existing fields ...
  visibilidad?: TrainingVisibility;
}

export interface UpdateTrainingInstanceInput {
  // ... existing fields ...
  visibilidad?: TrainingVisibility;
}
```

### 5) Form UI — visibility selector

File: `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`

Add a visibility selector section to the form, positioned after the `descripcion` field and before the date/time section. Requirements:

- **Control type**: Radio group or segmented toggle with two options:
  - `Privado` (default, pre-selected)
  - `Público`
- **Label**: `Visibilidad`
- **Helper text / description** (shown below the control):
  - If `Privado`: _"Este entrenamiento solo será visible para los miembros de tu organización."_
  - If `Público`: _"Este entrenamiento será visible públicamente y podrá ser descubierto por atletas fuera de tu organización."_
- **Default value**: `'privado'`
- The helper text must update reactively when the selection changes.
- The field must be included in the form submission payload.

The form state must expose `visibilidad` via the hook `useEntrenamientoForm` (see section 6).

### 6) Hook update

File: `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`

- Add `visibilidad: TrainingVisibility` to the form state (initial value: `'privado'`).
- Add setter `setVisibilidad`.
- Include `visibilidad` in the validation and submission payload.
- Pass `visibilidad` to service functions when creating or updating.

### 7) Sync propagation for series edits

File: `src/services/supabase/portal/entrenamientos.service.ts` (within `updateTrainingSeries`)

When updating a series with scope `'series'` or `'future'`, extend the existing sync logic to also update `visibilidad` and `visible_para` on eligible instances:
- future instances (`fecha_hora >= now()` or `fecha_hora is null`),
- not cancelled,
- not blocked (`bloquear_sync_grupo = false`).

---

## Data Model Summary — Fields Added

### `public.entrenamientos` (new columns)

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `visibilidad` | `varchar(10)` | NO | `'privado'` | `in ('publico', 'privado')` |
| `visible_para` | `uuid` | YES | `null` (backfilled) | FK → `tenants.id` ON DELETE SET NULL |

---

## Endpoints and URLs

No new app routes are required. All changes are additive to existing service contracts.

### Internal service contract changes (Supabase SDK)

| Function | Change |
|---|---|
| `createTrainingSeries` | Accept `visibilidad`; compute and write `visible_para` on all generated instances |
| `updateTrainingSeries` | Accept `visibilidad`; propagate to eligible instances |
| `updateTrainingInstance` | Accept `visibilidad`; compute and write `visible_para` |
| `generateSeriesInstances` | Derive `visibilidad`/`visible_para` from the parent group |

---

## Files to Modify or Create

### Database
1. `supabase/migrations/20260301000100_entrenamientos_visibilidad.sql` ← **NEW**

### Domain (`src/types`)
2. `src/types/portal/entrenamientos.types.ts` — add `TrainingVisibility`, extend `TrainingInstance`, `CreateTrainingSeriesInput`, `UpdateTrainingSeriesInput`, `UpdateTrainingInstanceInput`

### Infrastructure (`src/services`)
3. `src/services/supabase/portal/entrenamientos.service.ts` — update all mutation functions; add `resolveVisiblePara` helper

### Application core (`src/hooks`)
4. `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` — add `visibilidad` field, setter, validation, and pass to service

### Presentation (`src/components`)
5. `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` — add visibility radio/toggle selector with dynamic helper text

### Utilities
6. `src/lib/constants.ts` — add `PUBLIC_TENANT_ID` constant (UUID of the public tenant)

### Documentation
7. `projectspec/03-project-structure.md` — note the visibility extension on the `entrenamientos` feature slice

---

## Steps for Completion (Definition of Done)

- [ ] Migration file created with new columns, constraints, indexes, and backfill UPDATE.
- [ ] Migration applied locally (`supabase db reset` or `supabase migration up`) without errors.
- [ ] RLS `SELECT` policy updated to allow authenticated users to read public trainings cross-tenant.
- [ ] `PUBLIC_TENANT_ID` constant defined in `src/lib/constants.ts`.
- [ ] TypeScript types updated: `TrainingVisibility`, `TrainingInstance`, and input types.
- [ ] Service functions updated: `createTrainingSeries`, `updateTrainingSeries`, `updateTrainingInstance`, `generateSeriesInstances`.
- [ ] Hook `useEntrenamientoForm` updated with `visibilidad` state and submission payload.
- [ ] `EntrenamientoFormModal` renders the visibility selector with default `'privado'` and reactive helper text.
- [ ] Creating a training with `visibilidad = 'publico'` persists the correct `visible_para` value in the DB.
- [ ] Editing a series with scope `'series'` or `'future'` propagates `visibilidad` and `visible_para` to eligible instances.
- [ ] Single-instance exception (`bloquear_sync_grupo = true`) is NOT overwritten by series sync.
- [ ] No TypeScript or ESLint errors (`pnpm lint` / `pnpm tsc --noEmit` passes).
- [ ] Manual smoke test: create public training → verify it is visible in an athlete's `entrenamientos-disponibles` page from a different tenant.

---

## UX Validations (Mandatory)

- Default value of visibility selector must be `'privado'` on every new form open.
- Visibility selector must not be disabled while the form is submitting (disable only the submit button and destructive actions).
- Helper text must switch instantly on selection change (no delay).
- The selected value must be preserved when the modal re-opens for an edit (load from the existing training record).
- Do not expose `visible_para` UUID to the user; it is computed server-side by the service.

---

## Non-Functional Requirements

### Security
- RLS policies must ensure that unauthenticated users cannot read any `entrenamientos` rows, even public ones. The SELECT policy is scoped to `authenticated`.
- Only tenant administrators (via `get_admin_tenants_for_authenticated_user()`) may create or update trainings. INSERT/UPDATE policies must remain unchanged.
- `visible_para` must never be set by the client directly; it must be computed by the service layer to avoid tenant spoofing.

### Performance
- Index `idx_entrenamientos_visibilidad` and `idx_entrenamientos_visible_para` added in migration to support the new WHERE clause patterns in public-visibility queries.

### Consistency
- Visibility fields follow the same sync propagation rules as other group-level fields; the `bloquear_sync_grupo` flag on exceptions is authoritative.
- `visibilidad` column must be kept in sync between `entrenamientos_grupo` future instances and their parent group after any series edit.

### Backwards Compatibility
- Existing training records default to `visibilidad = 'privado'` and `visible_para = tenant_id` via the migration backfill. No data is lost.
- All existing service function callers that do not pass `visibilidad` will resolve to `'privado'` through the TypeScript default or a safe fallback in the service.
