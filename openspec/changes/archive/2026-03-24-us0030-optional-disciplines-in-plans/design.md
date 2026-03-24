## Context

The plans management feature (`plan-management`) requires at least one discipline per plan, enforced in the client-side `validate()` function in `usePlanForm.ts`. The `planes_disciplina` join table has no database-level constraint that enforces a minimum — it is a pure many-to-many join table. The service layer (`planes.service.ts`) already guards both the create and update insert paths with `if (input.disciplinaIds.length > 0)`, so no changes are needed there.

This is a focused UI-layer relaxation: remove one validation rule, adjust one label, and add one empty-state render path.

## Goals / Non-Goals

**Goals:**
- Allow plans to be saved with zero discipline associations.
- Communicate optionality clearly in the form UI.
- Display a graceful placeholder in the plans table for plans with no disciplines.

**Non-Goals:**
- Any database migration or schema change.
- Changes to service-layer authorization or RLS policies.
- Filtering or searching plans by discipline absence.
- Changes to subscription, booking, or training features.

## Decisions

### Decision 1: Remove validation only — do not hide or disable the discipline selector

**Chosen:** Keep the discipline multi-select visible and interactive, remove only the `disciplinaIds.length === 0` error from `validate()`.

**Rationale:** Hiding the selector would be a larger UX change and could confuse admins who want to add disciplines to a plan. The field remains useful, it is simply no longer mandatory. Removing only the validation rule is the minimal, safe change.

**Alternative considered:** Hide the discipline field behind an optional toggle. Rejected — over-engineers a simple validation relaxation, adds a new UI control, and would require a broader design change.

---

### Decision 2: Label update only — no structural form change

**Chosen:** Add `(opcional)` hint text to the discipline section label/description in `PlanFormModal.tsx`.

**Rationale:** The section already exists and is well-placed. A label hint is the standard pattern used across the form for optional fields. No new components needed.

---

### Decision 3: "Sin disciplinas" inline placeholder in the table cell

**Chosen:** When `disciplinaNames.length === 0`, render a muted italic span `"Sin disciplinas"` inside the existing cell, consistent with other optional-field empty states in the table rows.

**Rationale:** The column stays in place (it is still relevant for plans that do have disciplines). A dash or blank would be ambiguous. Consistent with how other nullable columns handle empty states in this codebase.

---

### Decision 4: No service-layer changes needed

**Observation:** `planes.service.ts` already wraps both the create and update `planes_disciplina` inserts in `if (input.disciplinaIds.length > 0)` guards. No modification required.

## Risks / Trade-offs

- **[Risk] Existing plans without disciplines in the DB (hypothetical):** None exist today — all plans were created with the mandatory-discipline form. Moot risk.  
  → Mitigation: The table empty-state placeholder handles this case regardless.

- **[Risk] Discipline filter in `PlanesHeaderFilters` may behave unexpectedly for plans with no disciplines:**  
  → Mitigation: Read-only verification — if a "filter by discipline" feature exists, plans with no disciplines should pass through when no discipline filter is active (standard array intersection logic). No code change required; verify manually.

- **[Trade-off] Removing the spec-level requirement "at least one discipline MUST be associated" changes the formal contract of `plan-management`:**  
  → Documented in the delta spec for `plan-management`.

## Migration Plan

No data migration needed. No deployment coordination required. Change is limited to the client application:

1. Remove the validation rule in `usePlanForm.ts`.
2. Update the label in `PlanFormModal.tsx`.
3. Add the empty-state render in `PlanesTable.tsx`.
4. Manual smoke test: create a plan with no disciplines, verify it saves and displays correctly.
5. Verify existing plans with disciplines are unaffected.

## Open Questions

_None — scope is fully defined._
