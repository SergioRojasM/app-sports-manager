## Context

The `planes` table was originally the sole entity holding plan commercial terms (price, validity, class quota). US-0036 introduced `plan_tipos` as subtypes offering variant pricing/durations per plan. However, the original columns on `planes` were never removed, resulting in duplicated data and fallback logic (`tipo?.field ?? plan.field`) throughout the codebase. The proposal (proposal.md) establishes the need to consolidate these fields exclusively on `plan_tipos` and enforce that every plan has at least one subtype.

**Current architecture** (data flow):
```
planes.precio / vigencia_meses / clases_incluidas  ←  plan-level defaults (BEING REMOVED)
           ↓ fallback
plan_tipos.precio / vigencia_dias / clases_incluidas  ←  subtype-level (SINGLE SOURCE OF TRUTH)
           ↓
useSuscripcion.ts  →  selectedTipo?.precio ?? selectedPlan.precio  (BEING SIMPLIFIED)
           ↓
suscripciones.clases_plan / pagos.monto  →  persisted snapshots
```

**After this change**:
```
plan_tipos.precio / vigencia_dias / clases_incluidas  ←  single source of truth
           ↓ (no fallback)
useSuscripcion.ts  →  selectedTipo.precio  (required)
           ↓
suscripciones.clases_plan / pagos.monto  →  persisted snapshots
```

## Goals / Non-Goals

**Goals:**
- Eliminate data duplication by dropping `precio`, `vigencia_meses`, and `clases_incluidas` from `planes`.
- Enforce that every plan has at least one `plan_tipo` at UI-validation level.
- Make `plan_tipos.clases_incluidas` explicitly optional (`NULL` = unlimited).
- Remove all fallback logic across services, hooks, and components.
- Update admin subscription validation to use `plan_tipo.vigencia_dias` (days-based) instead of `plan.vigencia_meses` (months-based).

**Non-Goals:**
- Changing `plan_tipos` schema (columns, constraints, RLS policies remain as-is).
- Making `plan_tipo_id` required on `suscripciones` — it stays nullable for backward compatibility.
- Backfilling or migrating existing `plan_tipos` data.
- Converting `vigencia_dias` to a month-based unit.

## Decisions

### D1: Drop columns via ALTER TABLE, not soft-delete
**Decision:** Hard-drop the three columns from `planes`.
**Rationale:** The columns are fully duplicated in `plan_tipos`. All existing plans already have plan_tipos populated. Soft-deleting (e.g., renaming to `_deprecated`) would keep the confusion alive and require additional cleanup later.
**Alternatives considered:** Soft-deprecation with `_deprecated` suffix — rejected because it adds no safety given plan_tipos already hold the data.

### D2: At-least-one-tipo enforcement at form-validation level only
**Decision:** Enforce the "minimum 1 plan_tipo" rule in `usePlanForm.ts` validation, not via a database trigger or constraint.
**Rationale:** A DB CHECK or TRIGGER on `planes` cannot easily verify child rows in `plan_tipos` atomically (the plan is inserted first, then tipos are inserted in separate statements). Client-side validation is sufficient because the only plan creation path is the admin form.
**Alternatives considered:** DB trigger — rejected due to complexity with multi-statement inserts; application-level middleware — rejected as overkill for a single form.

### D3: vigenciaLabel derived from plan_tipos range
**Decision:** When all active plan_tipos share the same `vigencia_dias`, display that single value. When they differ, display a range (e.g., "30–90 días"). When no active tipos exist, display "—".
**Rationale:** This gives admins a quick summary without needing to expand subtypes.
**Alternatives considered:** Show only the first/cheapest tipo's vigencia — rejected as it could be misleading.

### D4: Admin validation uses addDays instead of addMonths
**Decision:** Replace `addMonths(start, plan_vigencia_meses)` with `addDays(start, plan_tipo_vigencia_dias)` in `useValidarSuscripcion.ts`.
**Rationale:** `plan_tipos.vigencia_dias` is days-based. Using addMonths would require unit conversion.
**Alternatives considered:** None — this is the natural consequence of the column removal.

### D5: plan_tipo clases_incluidas empty = NULL (unlimited)
**Decision:** In `PlanTipoFormValues`, an empty `clases_incluidas` string maps to `NULL` (no limit). The form placeholder reads "Sin límite (dejar vacío)".
**Rationale:** This aligns with the existing behavior where `NULL` means unlimited in the subscription class deduction flow.
**Alternatives considered:** Require a numeric value and use `0` for unlimited — rejected because `0` is semantically different from "no limit" and would break the existing `clases_incluidas IS NULL` checks.

## Risks / Trade-offs

- **[Data loss on column drop]** → Mitigation: The three columns on `planes` are already duplicated in `plan_tipos`. No unique data is lost. A `supabase db reset` restores from migrations + seed.
- **[Existing plans without plan_tipos]** → Mitigation: Verify in seed data and production that every plan has at least one plan_tipo. If any orphaned plans exist, they will appear with "—" labels and cannot be used for subscriptions until a tipo is added.
- **[Admin validation date precision change]** → Mitigation: Admin can still override `fecha_fin` in the validation modal. The change from month-granularity to day-granularity is more precise, not less.
- **[clases_incluidas NULL ambiguity]** → Mitigation: All downstream code already handles `NULL` as "unlimited" — the subscription class deduction migration (`20260319000200_deduct_classes_on_booking.sql`) skips deduction when `clases_restantes IS NULL`.

## Migration Plan

1. Apply migration `{timestamp}_remove_planes_precio_vigencia_clases.sql` to drop columns.
2. Deploy code changes (types → services → hooks → components).
3. Rollback: Re-add columns via a reverse migration. Since the data exists in plan_tipos, it can be reconstructed if needed — but given the scope this is low-risk.

## Open Questions

_None — all decisions are resolved._
