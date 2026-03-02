# User Story US0015 — Add Meeting Point Field to Trainings

## ID
US0015

## Name
Add "Punto de Encuentro" Field to Trainings

## As a
Sports organization administrator or coach (roles: `administrador`, `entrenador`)

## I Want
To be able to specify a meeting point (`punto_encuentro`) when creating or editing a training session, and see that meeting point displayed in the training list.

## So That
Athletes and participants know exactly where to gather before a training session starts, reducing confusion and improving the communication of logistics.

---

## Description

A new optional text field `punto_encuentro` (meeting point) must be added to the `entrenamientos` table and the `entrenamientos_grupo` table. The field must be surfaced in:

1. **Database** – `ALTER TABLE` migration for both tables.
2. **Sync trigger** – The existing `sync_entrenamientos_from_grupo` function must propagate `punto_encuentro` from group to instances (same sync rules already applied to other fields).
3. **TypeScript types** – `TrainingGroup`, `TrainingInstance`, `TrainingWizardValues`, `TrainingField`.
4. **Service layer** – Create and update operations must read/write the new field.
5. **Form wizard** – New text input added to the training creation/edit form (Step 1 – "Información general").
6. **List display** – When `punto_encuentro` is set, show it inside each training card in `EntrenamientosList`.

The field is **optional** (nullable). No validation is required beyond max length (200 characters). The field must be included in both `manual` and `generado` origin trainings, and must be editable for single instances, future instances, and the full series.

---

## Fields

| Field | Table(s) | Type | Nullable | Max Length | Notes |
|---|---|---|---|---|---|
| `punto_encuentro` | `entrenamientos`, `entrenamientos_grupo` | `varchar(200)` | Yes | 200 | Free text. No FK. |

---

## Expected Results

- A coach or admin can fill in or clear the meeting point when creating or editing a training (single or recurring).
- The meeting point is stored in `entrenamientos_grupo.punto_encuentro` for recurring trainings and synced to instances.
- The meeting point is stored directly in `entrenamientos.punto_encuentro` for single/manual trainings.
- The meeting point is shown in the training card in the list view when it has a value.
- The field is not required; leaving it empty does not block form submission.

---

## Files to Modify

### 1. Database migration
- **Create:** `supabase/migrations/{timestamp}_add_punto_encuentro_entrenamientos.sql`
  - `ALTER TABLE public.entrenamientos ADD COLUMN IF NOT EXISTS punto_encuentro varchar(200);`
  - `ALTER TABLE public.entrenamientos_grupo ADD COLUMN IF NOT EXISTS punto_encuentro varchar(200);`
  - Update `public.sync_entrenamientos_from_grupo()` to include `punto_encuentro = new.punto_encuentro` in the `UPDATE` set clause (same pattern as `nombre`, `descripcion`, etc.).

### 2. TypeScript Types
- **File:** `src/types/portal/entrenamientos.types.ts`
  - Add `punto_encuentro: string | null;` to `TrainingGroup`.
  - Add `punto_encuentro: string | null;` to `TrainingInstance`.
  - Add `punto_encuentro: string;` to `TrainingWizardValues`.
  - Add `'punto_encuentro'` to the `TrainingField` union type.

### 3. Service Layer
- **File:** `src/services/supabase/portal/entrenamientos.service.ts`
  - In the `createTraining` / `upsertTrainingGroup` operation: include `punto_encuentro` when building the insert/update payload from `TrainingWizardValues`.
  - In the `updateTrainingInstance` / `updateFutureInstances` operation: include `punto_encuentro` in the update payload when present.
  - In the `fetchEntrenamientos` query: ensure `punto_encuentro` is selected (or use `*` – verify current select clause).

### 4. Application Hook
- **File:** `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`
  - Add `punto_encuentro: ''` to the initial values object.
  - Wire `punto_encuentro` through the field change handler (`onChangeField`).
  - No additional validation rule needed (field is optional).

### 5. Form Component – Wizard
- **File:** `src/components/portal/entrenamientos/EntrenamientoWizard.tsx` (Step 1 – "Información general")
  - Add a labeled `<textarea>` or `<input type="text">` for `punto_encuentro`.
  - Label: **"Punto de encuentro"**, placeholder: `"Ej. Entrada principal del estadio, puerta norte..."`.
  - Render below the `descripcion` field.
  - `maxLength={200}`.
  - Pass `values.punto_encuentro` and call `onChangeField('punto_encuentro', value)` on change.

- **File:** `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`
  - No structural changes required if `EntrenamientoWizard` already receives all `values` and `onChangeField` props. Confirm existing prop passthrough covers the new field.

### 6. List Component
- **File:** `src/components/portal/entrenamientos/EntrenamientosList.tsx`
  - Inside each training card, after the scenario/location row, conditionally render `punto_encuentro` when it is a non-empty string:
    ```tsx
    {item.instance.punto_encuentro ? (
      <p className="text-xs text-slate-400">
        <span className="font-medium text-slate-300">Punto de encuentro:</span>{' '}
        {item.instance.punto_encuentro}
      </p>
    ) : null}
    ```

---

## Steps to Complete

1. **Create DB migration** file with `ALTER TABLE` statements for both tables and the updated trigger function.
2. **Update `TrainingGroup` and `TrainingInstance`** types with the new nullable field.
3. **Update `TrainingWizardValues`** and `TrainingField` union type.
4. **Update service layer** to include `punto_encuentro` in all relevant insert/update queries.
5. **Update `useEntrenamientoForm`** to include the field in initial values and change handler.
6. **Add the input field** to `EntrenamientoWizard` Step 1.
7. **Add the display** of `punto_encuentro` to `EntrenamientosList` training cards.
8. **Run local Supabase** (`npx supabase db reset` or `npx supabase migration up`) and verify the column is created.
9. **Manual smoke test:** Create a recurring training with a meeting point → verify it appears in the list and is synced to instances. Edit a single instance and change the meeting point → verify only that instance is updated.
10. **Verify** the training creation form submits correctly when `punto_encuentro` is left blank (optional).

---

## Non-Functional Requirements

### Security
- RLS policies on `entrenamientos` and `entrenamientos_grupo` already scope reads/writes by `tenant_id`. No new policy required.
- The field does not contain sensitive data, but follows the same tenant isolation as all other fields.

### Performance
- `punto_encuentro` is a plain `varchar(200)` column. No index is required.
- The sync trigger already bulk-updates future instances; adding one more column to the `SET` clause has negligible overhead.

### Data Integrity
- The column is nullable with no FK. No constraint beyond the max-length check enforced at the DB level via `varchar(200)`.
- The migration must use `ADD COLUMN IF NOT EXISTS` to be idempotent.

### Accessibility
- The new form input must include a visible `<label>` element associated via `htmlFor` / `id`.
- The input should be wrapped with the same fieldset/grid pattern used by adjacent fields in the wizard step.

---

## Out of Scope
- Mobile / athlete-facing view (`entrenamientos-disponibles`) – no changes required in this user story.
- Push notifications or email notifications about meeting point changes.
- Filtering or searching by `punto_encuentro`.
