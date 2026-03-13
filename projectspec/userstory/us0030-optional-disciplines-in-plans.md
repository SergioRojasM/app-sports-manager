# User Story US-0030 — Optional Disciplines in Plans

## Metadata

| Field       | Value                                |
|-------------|--------------------------------------|
| **ID**      | US-0030                              |
| **Name**    | Optional Disciplines in Plans        |
| **Status**  | Ready for Development                |

---

## Story

**As an** organization administrator,  
**I want** to be able to create or edit plans without assigning disciplines,  
**So that** I can offer general-purpose plans (e.g., gym access, monthly pass) that are not tied to any specific discipline.

---

## Description

Currently, when creating or editing a plan, selecting at least one discipline is **mandatory** (enforced by client-side validation). This prevents the creation of plans that are not discipline-specific — for example, a general gym membership, a monthly all-access pass, or promotional plans.

This story makes `disciplinas` an **optional field** in the plan form. Plans without disciplines are valid and fully functional. The DB schema already supports this (no constraint requires at least one row in `planes_disciplina`), so no migration is needed. The change is purely in the application layer: validation, UI labels, and empty-state display.

---

## Acceptance Criteria

1. A plan can be created with zero disciplines selected — no error is shown for the discipline field.
2. A plan can be saved (create or edit) with disciplines partially removed, resulting in zero associated disciplines.
3. The plan table correctly handles plans without disciplines (shows a "—" or "Sin disciplinas" placeholder instead of empty or broken UI).
4. The plan form clearly communicates that disciplines are optional (e.g., label text update).
5. The search/filter logic in the plan list is not broken by plans with empty discipline arrays.
6. All existing plans with disciplines continue to function exactly as before.

---

## Scope of Changes

### No DB migration required

The `planes_disciplina` table uses a join-table pattern without any constraint enforcing that at least one row exists per plan. The database already supports plans with no associated disciplines.

---

### Files to Modify

#### 1. `src/hooks/portal/planes/usePlanForm.ts`

**Remove the discipline validation rule** that enforces at least one selection:

```ts
// REMOVE this block:
if (values.disciplinaIds.length === 0) {
  errors.disciplinaIds = 'Debe seleccionar al menos una disciplina.';
}
```

No replacement needed — disciplines become fully optional with no validation.

---

#### 2. `src/components/portal/planes/PlanFormModal.tsx`

**Update the discipline section's label** to communicate optionality:

- Change any label or helper text that implies disciplines are required.  
- Example: if the section heading reads `"Disciplinas *"` or `"Disciplinas (required)"`, change it to `"Disciplinas"` with an optional hint like `"(opcional)"`.
- The discipline multi-select checkboxes remain functional; no structural change is needed.
- If a `fieldErrors.disciplinaIds` error element exists, it can remain — it will simply never be triggered once the validation is removed.

---

#### 3. `src/components/portal/planes/PlanesTable.tsx`

**Handle the empty-disciplines case gracefully** in the "Disciplinas" column:

Current behavior (line ~79):
```tsx
{row.disciplinaNames.length > 0 ? (
  row.disciplinaNames.map((name) => (
    <span ...>{name}</span>
  ))
) : ???}
```

Expected behavior: when `disciplinaNames` is empty, render a muted placeholder:
```tsx
{row.disciplinaNames.length > 0 ? (
  row.disciplinaNames.map((name) => (
    <span key={name} className="...">
      {name}
    </span>
  ))
) : (
  <span className="text-slate-500 text-xs italic">Sin disciplinas</span>
)}
```

---

#### 4. `src/types/portal/planes.types.ts`

No type changes are required. `disciplinaIds: string[]` in `CreatePlanInput` and `UpdatePlanInput` already accepts an empty array, which maps to zero rows inserted in `planes_disciplina`.

---

#### 5. `src/services/supabase/portal/planes.service.ts`

No changes required. The `createPlan` and `updatePlan` service functions already handle `disciplinaIds: []` — they simply skip inserting rows into `planes_disciplina` when the array is empty, and when updating they delete existing associations and re-insert (an empty array results in a delete-all with no re-insert). Verify that the update flow explicitly handles the empty array case:

- If `updatePlan` deletes all existing `planes_disciplina` rows for the plan and then skips the bulk insert when `disciplinaIds.length === 0`, behavior is correct.
- If there is a guard like `if (disciplinaIds.length > 0) { /* insert */ }` — keep it as-is.
- If the insert is called unconditionally with an empty array, verify that Supabase does not throw on an empty `.insert([])` call (it should be a no-op). Add a guard if needed:
  ```ts
  if (input.disciplinaIds.length > 0) {
    await supabase.from('planes_disciplina').insert(...)
  }
  ```

---

### Files to Verify (Read-Only, No Changes Expected)

| File | What to Verify |
|------|---------------|
| `src/hooks/portal/planes/usePlanes.ts` | The `toTableItem` function maps `disciplinas` to `disciplinaNames`. Verify it handles an empty array (returns `[]`) without errors. |
| `src/components/portal/planes/SuscripcionModal.tsx` | Subscription modal shows plan details. Verify no crash or blank render when `plan.disciplinas` is empty. |
| `src/components/portal/planes/PlanesHeaderFilters.tsx` | Filter logic. If there is a discipline filter, verify plans with no disciplines are still returned when no discipline filter is active. |
| `src/hooks/portal/planes/usePlanes.ts` (search) | The full-text search `haystack` concatenates `disciplinaNames` — verify empty arrays do not cause issues (spreading an empty array is safe). |

---

## Steps to Consider the Task Complete

- [ ] Remove discipline validation from `usePlanForm.ts` (`validate` function).
- [ ] Update discipline field label in `PlanFormModal.tsx` to indicate it is optional.
- [ ] Add "Sin disciplinas" placeholder in `PlanesTable.tsx` for the empty case.
- [ ] Verify `planesService.createPlan` and `planesService.updatePlan` handle `disciplinaIds: []` safely (no Supabase error on empty insert).
- [ ] Manual test: create a plan without selecting any discipline → plan saves successfully and appears in the table with the "Sin disciplinas" placeholder.
- [ ] Manual test: edit an existing plan and remove all disciplines → plan saves and table reflects the change.
- [ ] Manual test: existing plans with disciplines continue to display and function normally.
- [ ] No TypeScript or ESLint errors introduced.

---

## Non-Functional Requirements

### Security
- No changes to RLS policies or authorization logic. Existing admin-only insert/update/delete policies on `planes` and `planes_disciplina` remain unchanged.
- The empty array case (`disciplinaIds: []`) does not bypass any authorization check — the plan insert still requires admin tenant membership.

### Performance
- No new queries introduced. Removing the discipline bulk insert for plans without disciplines slightly reduces DB writes.

### UX
- The discipline selector should remain visible in the form to allow optional selection — it should not be hidden or removed.
- The form must be clearly understandable: the discipline field is optional, not missing.

---

## Out of Scope

- Filtering plans by "no disciplines" in the admin list (can be a future story).
- Any changes to the subscription / booking flow based on plan discipline membership.
- Changes to how `entrenamientos` (trainings) relate to plans.
