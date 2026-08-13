## Context

US-0095 (`form-template-profile-data-requirements`, sibling change not yet archived) added `formularios_plantillas.perfil_campos_requeridos` and a completeness gate inside `book_and_deduct_service_units`: before inserting a `reservas`/`formulario_respuestas` row, the RPC fetches the target athlete's `usuarios` + `perfil_deportivo` rows and raises `PERFIL_INCOMPLETO` if any requested field is missing. That fetch already happens in-transaction, at exactly the moment the values are known-good — but the RPC discards them after the check instead of persisting them.

`formulario_respuestas` already solves this exact problem for custom "Datos" fields via `campos_snapshot` (US-0087): `{ [campo_nombre]: { etiqueta, tipo, orden } }` frozen at submission time, so `FormularioRespuestaViewerModal` and the "Descargar Respuestas Formulario" export keep rendering correctly even after the template is edited or hard-deleted. Profile data has no equivalent — today, "Ver respuesta" and the export are entirely blind to `perfil_campos_requeridos`.

## Goals / Non-Goals

**Goals:**
- Freeze the athlete's requested profile field values into `formulario_respuestas` at the exact point the existing completeness check passes, with zero additional queries.
- Surface those frozen values in the response viewer (above the "Datos" answers) and the Excel export (after the fixed identity columns), following the same "catalog resolves key → label" pattern already established for the fill-out flow's summary (US-0095).
- Guarantee historical accuracy: a booking made before a later profile edit must keep showing the value as it was at booking time.

**Non-Goals:**
- No backfill for pre-existing responses — they simply carry `perfil_snapshot = '{}'`.
- No change to the profile-completeness gate's validation logic, error codes, or client-side UX (US-0095's warning/summary panel is untouched).
- No new profile fields or catalog changes — same fixed 9-key `FORMULARIO_PERFIL_CAMPOS`.
- No editing of snapshotted values — read-only, like `campos_snapshot` today.

## Decisions

### 1. Store snapshot values as plain strings, not `{ value, label }` pairs like `campos_snapshot`
**Decision**: `perfil_snapshot` is `{ [key]: string }`, unlike `campos_snapshot`'s `{ [key]: { etiqueta, tipo, orden } }`.

**Rationale**: `campos_snapshot` stores `etiqueta`/`tipo`/`orden` because those come from an ADMIN-EDITABLE DB row (`formulario_plantilla_esquema.campo_etiqueta` etc.) that can drift or disappear (template edited/deleted) — the snapshot is the only place that metadata survives. Profile field labels, by contrast, come from the FIXED, CODE-LEVEL `FORMULARIO_PERFIL_CAMPOS` catalog, which cannot drift per-response the way a DB row can; the frontend can always resolve `key → label` from the current catalog. Storing labels per-snapshot would be redundant and would only matter if the catalog's wording itself changed retroactively for old responses, which is explicitly out of scope (Non-Goals).

**Alternative considered**: Mirror `campos_snapshot`'s shape exactly for consistency. Rejected as unnecessary duplication — the two snapshots serve structurally different sources (admin-editable schema vs. fixed code catalog) and don't need identical shapes to be understandable side by side.

### 2. Build the snapshot inside the SAME RPC transaction, immediately after the completeness check
**Decision**: Extend `book_and_deduct_service_units` (already modified by the sibling US-0095 change) to populate a `v_perfil_snapshot` variable right after `v_missing_keys` is confirmed empty, using the already-fetched `v_usuario`/`v_deportivo` records, and pass it into the existing `insert into formulario_respuestas (...)` statement.

**Rationale**: Same rationale as the existing `campos_snapshot` build in that same function — one transaction, one source of truth, no risk of the snapshot reflecting different data than what was actually validated. Also zero additional round-trips: the profile rows are already in memory.

**Alternative considered**: A separate trigger (`after insert on formulario_respuestas`) that re-reads `usuarios`/`perfil_deportivo` to build the snapshot. Rejected: introduces a second read of profile data that could theoretically race with a concurrent profile update between the RPC's validation and the trigger's own read, undermining the "frozen at validated-moment" guarantee this feature exists to provide. Doing it inline in the same statement closes that gap entirely.

### 3. No new DB check constraint on `perfil_snapshot`'s keys
**Decision**: Same trust boundary as `campos_snapshot` — `formulario_respuestas` has no `insert`/`update` RLS policy for `authenticated` at all (see the "Deliberately no INSERT/UPDATE/DELETE policy" comment in the US-0087 migration); every write goes through this `security definer` RPC. Since the RPC is the only writer and is trusted code, an additional CHECK constraint validating snapshot keys would be defense-in-depth against a threat model (a compromised RPC) that isn't this feature's concern, and `campos_snapshot` sets the precedent of not having one either.

### 4. Migration sequencing depends on US-0095's merge state
**Decision**: This story's migration must run AFTER US-0095's (`..._formulario_plantilla_perfil_requerido.sql`) since both redefine `book_and_deduct_service_units`. Per the project's migration convention (`create or replace function` redefines the WHOLE body each time), stacking two separate migrations that both touch the function is valid AS LONG AS they're applied in order and each redefinition includes the other's prior changes. Because US-0095 is still unmerged at the time this design is written, the safer default is folding this change into that same migration file rather than authoring a second `create or replace function` migration that could drift from an unmerged, still-changeable sibling. The implementer must check `supabase/migrations/` at execution time and choose accordingly (documented explicitly in the user story and task list).

## Risks / Trade-offs

- **[Risk]** If US-0095's migration changes shape before merging (e.g., different variable names, different check ordering) after this design was written against a specific snapshot of that code, this change's SQL could need adjustment. → **Mitigation**: task list requires re-reading the actual current migration file content before authoring/editing, not blindly pasting the design doc's SQL.
- **[Risk]** Excel export column set is data-dependent (union of `perfil_snapshot` keys across a training's responses) rather than fixed — if one response in a training has a different snapshot key set than another (e.g., template's `perfil_campos_requeridos` was edited between two bookings), some cells legitimately render blank. → **Mitigation**: this exactly mirrors the existing, already-accepted behavior for `campos_snapshot`-driven "Datos" columns in the same export function — no new pattern, no new risk class introduced.
- **[Trade-off]** No backfill for historical responses means the export/viewer will show an inconsistent profile-data section across responses spanning the feature's rollout (some blank, some populated). Accepted — matches how `campos_snapshot` itself handles legacy data, and backfilling would require guessing at what a since-changed profile looked like in the past, which is unsafe to fabricate.

## Migration Plan

1. Read the current content of the US-0095 migration file (or confirm it has been merged/applied) before authoring this change's SQL — do not copy the design doc's SQL verbatim without verifying it matches what actually exists in the repo at implementation time.
2. Add the `perfil_snapshot` column (either via a new migration file layered on top of US-0095's, or folded into it directly if still unmerged) and redefine `book_and_deduct_service_units` accordingly.
3. Apply and verify LOCALLY ONLY (`supabase db reset`) — never push to the remote/hosted Supabase project as part of this change.
4. Roll out frontend changes bottom-up: types → service (`getRespuestasByEntrenamiento` select/mapping) → components (`FormularioRespuestaViewerModal`, then `ReservasPanel`'s two call sites).
5. Rollback: the column defaults to `'{}'`, so reverting the frontend alone is safe. Reverting the RPC requires re-applying the prior `create or replace function` body (from whichever migration preceded this one) in a follow-up migration — no destructive `DROP COLUMN` planned as part of normal rollback.

## Open Questions

- None outstanding — the user story and this design fully specify shape, placement, and sequencing. The only implementation-time judgment call is the migration-file-vs-fold-in decision from Decision #4, which is explicitly left to the implementer based on the actual repo state at that time.
