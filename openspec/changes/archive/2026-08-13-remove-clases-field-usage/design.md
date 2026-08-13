## Context

Since US-0062 introduced the `servicios` catalog and `plan_tipos_servicios` assignments, and US-0063 introduced `suscripcion_servicios` for per-subscription unit tracking, the `plan_tipos.clases_incluidas` field became redundant — services with finite `unidades` replace the class-count model. US-0064 replaced `book_and_deduct_class` / `cancel_and_restore_class` with `book_and_deduct_service_units` / `cancel_and_restore_service_units`, which operate on `suscripcion_servicios` and the `reserva_servicios` ledger. The old RPCs are no longer called.

Despite these changes, the application layer still:
- Reads `clases_incluidas` from `plan_tipos` and displays it in `PlanFormModal`
- Writes `clases_plan` / `clases_restantes` to `suscripciones` on subscription creation and approval
- Displays `clases_restantes / clases_plan` in admin tables, athlete cards, and the home dashboard

This is a purely subtractive refactor — no new behaviour is introduced.

## Goals / Non-Goals

**Goals:**
- Remove all reads of `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, and `suscripciones.clases_plan` from the application layer.
- Remove all writes of these fields from create/update service payloads.
- Remove all UI that displays these fields.
- Pass `npx tsc --noEmit` with zero errors after all removals.

**Non-Goals:**
- Do NOT drop or alter any database column.
- Do NOT change the `suscripcion_servicios` or `reserva_servicios` tables or RPCs.
- Do NOT change the booking / cancellation flow.
- Do NOT change the services catalog or plan-services assignment UI.
- Do NOT add any new fields, types, or components.

## Decisions

### Decision 1: Remove fields from types first, then follow TS errors

**Chosen approach**: Start with type definitions (types layer), then let TypeScript errors guide which service/hook/component lines to remove. This ensures no orphaned usages survive.

**Alternative**: Remove field-by-field across all layers simultaneously. Rejected — higher risk of missing an occurrence.

### Decision 2: Keep `clases_plan` snapshot field on `Suscripcion` type as deprecated vs. remove entirely

**Chosen approach**: Remove entirely from all app-layer types and services. The column remains in the DB for historical data; TypeScript types should not expose dead fields.

**Alternative**: Keep with `@deprecated` JSDoc. Rejected — the field has no remaining reads or writes, keeping it would invite future accidental use.

### Decision 3: No migration needed for this story

`clases_incluidas`, `clases_restantes`, and `clases_plan` columns are kept as-is in the DB. Existing rows with non-null values are silently ignored by the app (no display, no writes). A future clean-up migration (separate US) will drop the columns once historical data is no longer needed.

## Risks / Trade-offs

- **[Risk] Admin edits a subscription in the DB directly and relies on `clases_restantes`**: After this change the UI no longer reflects that value. → Mitigation: Historical data is preserved; users who need it can query Supabase Studio.
- **[Risk] A missed usage causes a runtime error**: A field removed from a TypeScript type but still referenced in JSX will produce a compile error, not a silent runtime failure. The `tsc --noEmit` gate catches this before merge.
- **[Risk] `SuscripcionInsert` no longer sends `clases_plan`**: If the DB column has a `NOT NULL` constraint this would fail. → Verified: `suscripciones.clases_plan` is nullable; no constraint issue.
