## Context

Form templates (`formularios_plantillas` → `formulario_plantilla_esquema`, US-0084/US-0085) currently only support custom "Datos" sections that the athlete types in by hand. The athlete's profile lives in two separate tables managed at `/portal/perfil`:

- `public.usuarios`: `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh` (plus `id`, `email`, `foto_url`, not requestable here).
- `public.perfil_deportivo`: `peso_kg`, `altura_cm` (one row per user, may not exist yet).

The fill-out flow that renders a template and collects answers (`useFormularioRespuestaForm` / `FormularioRespuestaModal`) is shared, unmodified, between two booking surfaces:
1. `ReservasPanel` (tenant-scoped booking, admin can book on behalf of any tenant athlete).
2. `PublicTrainingReservaModal` (cross-tenant marketplace booking, US-0089), which composes the same hook via `usePublicTrainingReserva.ts`.

The atomic write path for every booking with a form response is the `book_and_deduct_service_units` SECURITY DEFINER RPC (extended in US-0087), which already validates required "Datos" fields server-side before inserting `formulario_respuestas` + `reservas` in one transaction.

Both `usuarios` and `perfil_deportivo` carry permissive `select ... using (true)` policies from the initial schema migration (`20260221000100_migracion_inicial_bd.sql`), so any authenticated user — including staff booking on behalf of someone else — can already read another user's profile fields. This means the summary/gate can be computed for any `atletaId`, not just "self", with no new RLS policy needed.

## Goals / Non-Goals

**Goals:**
- Let an admin pick, per template, which of a fixed set of 9 profile fields the template needs — without duplicating them as "Datos" sections.
- Show the athlete a compact read-only summary of those fields' current values at fill-out time.
- Block booking submission (client-side, with a server-side backstop) when the athlete's profile is missing a requested field, with a clear path to fix it (`/portal/perfil`) and a way to re-check without losing in-progress answers.
- Keep the change fully backward compatible: every existing template has `perfil_campos_requeridos = '{}'`, so nothing changes for templates that don't opt in.

**Non-Goals:**
- Editing the profile inline inside the fill-out modal (out of scope — link out to `/portal/perfil` instead).
- Extending the profile-fields catalog beyond the 9 fixed keys, or supporting tenant-specific custom profile fields.
- Changing `formulario_externo` (external link) behavior — `perfil_campos_requeridos` only exists on `formularios_plantillas` rows, which only internal (`formulario_id`) attachments reference.
- Changing RLS policies — reads are already permissive enough; no new policy is introduced.

## Decisions

### 1. Store the requested fields as a `text[]` column with a DB check constraint, not a join table
**Decision**: `formularios_plantillas.perfil_campos_requeridos text[] not null default '{}'`, constrained via `<@ array[...]::text[]` against the fixed catalog.

**Alternatives considered**:
- A `formulario_plantilla_perfil_campos` join table (one row per requested field, mirroring `formulario_plantilla_esquema`'s per-field-row shape). Rejected: the catalog is fixed and small (9 keys), there's no per-field metadata to store (no ordering, no obligatorio flag — a requested field is implicitly always required), so a join table adds migration/RLS/query overhead for no benefit over a constrained array column. This mirrors how `entrenamiento_restricciones` stores `servicio_1_id...servicio_4_id` as flat columns rather than a child table when the set is small and fixed.

**Rationale**: Simpler read/write path (`UPDATE formularios_plantillas SET perfil_campos_requeridos = $1`), no extra RLS policies needed (inherits the parent row's existing admin-only write / authenticated-read policies), and the check constraint gives the same "no unknown values" guarantee a foreign key would.

### 2. `tipo_identificacion` catalog key represents both `tipo_identificacion` + `numero_identificacion`
**Decision**: The catalog exposes a single "Identificación" checkbox (key `tipo_identificacion`) that, when selected, requires BOTH `usuarios.tipo_identificacion` and `usuarios.numero_identificacion` to be non-null/non-empty.

**Alternatives considered**: Two separate checkboxes. Rejected: a lone ID type or a lone ID number is not useful data on its own (mirrors how `PerfilPersonalForm` already treats them as a pair), and splitting them doubles the catalog surface for no real admin benefit.

### 3. Profile-completeness gate lives in the shared hook (`useFormularioRespuestaForm`), not duplicated per booking surface
**Decision**: All fetching/computation of `perfilResumen` / `perfilFaltantes` happens once in `useFormularioRespuestaForm`, consumed identically by `ReservasPanel` and `PublicTrainingReservaModal` (via `usePublicTrainingReserva`).

**Rationale**: Both surfaces already share this hook and `FormularioRespuestaModal` for the "Datos" fill-out; adding the profile logic here means zero duplicated logic and both surfaces get the feature "for free," consistent with how US-0087's field validation already works today.

### 4. Server-side enforcement is mandatory, not just a UX nicety
**Decision**: Extend `book_and_deduct_service_units` to re-check `perfil_campos_requeridos` against the actual `p_atleta_id` profile and raise `PERFIL_INCOMPLETO` (Postgres `P0001`) before any write, exactly mirroring the existing `FORMULARIO_CAMPOS_FALTANTES` check already in that function.

**Alternatives considered**: Client-only validation (skip the RPC change). Rejected: since `formularios_plantillas`/`usuarios`/`perfil_deportivo` are all broadly readable, a modified/bypassed client could otherwise submit a booking with an incomplete profile, defeating the feature's purpose. The RPC is the sole write path for this flow (per the `training-booking` spec's existing requirement), so this is the correct enforcement point — no new write path is introduced.

### 5. Reuse `perfil.service.ts`'s existing `getPerfil(userId)` rather than adding a new endpoint
**Decision**: `useFormularioRespuestaForm` calls the existing `getPerfil(atletaId)` (already parameterized by arbitrary `userId`, not hardcoded to "self") to fetch both `usuarios` and `perfil_deportivo` rows in parallel.

**Rationale**: No new service function needed; the existing function's shape (`{ usuario, deportivo }`) already matches what the hook needs to compute `perfilResumen`/`perfilFaltantes`.

## Risks / Trade-offs

- **[Risk]** A staff member booking on behalf of an athlete sees the SAME missing-fields gate but has no way to fix the athlete's profile from within the booking flow (the "Actualizar perfil" link points to the CURRENT user's own `/portal/perfil`, not the target athlete's). → **Mitigation**: acceptance criteria call out that staff-on-behalf booking still shows the correct missing-field list (computed against the target athlete), and staff already has `EditarPerfilMiembroModal` in `gestion-equipo` as the existing tool to fix another member's profile; the warning panel's copy for the on-behalf case should say "El perfil del atleta no tiene estos datos" rather than "Tu perfil," and can suggest using team management instead of linking to `/portal/perfil`. This copy distinction is called out in tasks.
- **[Risk]** `perfil_deportivo` may not have a row at all for a given athlete (no upsert has ever happened). → **Mitigation**: existing `getPerfil` already returns `deportivo: null` in that case; the completeness check treats a null row the same as null `peso_kg`/`altura_cm` values (both fields count as missing).
- **[Risk]** Extending the RPC redefinition duplicates the entire function body (per project convention for `create or replace function`), risking drift with the US-0087 version if both are edited independently later. → **Mitigation**: this is the existing pattern in the codebase (each RPC-touching migration redefines the whole function); acceptance/tests should diff against the current function body before merging to ensure no unrelated behavior regresses.
- **[Trade-off]** Fixed catalog (9 keys) instead of a dynamic/tenant-configurable field list. Accepted as a deliberate scope limit (see proposal's Non-goals) — revisit only if a future US needs custom profile fields.

## Migration Plan

1. Add the migration file locally (`supabase/migrations/{timestamp}_formulario_plantilla_perfil_requerido.sql`) with the new column, check constraint, and RPC redefinition.
2. Apply it to the LOCAL Supabase instance only (`supabase db reset` or `supabase migration up` against the local stack) to verify it applies cleanly on top of `20260723000100_formulario_respuestas.sql`. Do **not** push to the remote/hosted Supabase project as part of this change — deployment of the migration to remote is a separate, explicit release step outside this design's scope.
3. Regenerate/verify TypeScript types if the project uses generated Supabase types (check `src/types` for a generated file); otherwise hand-update `formularios.types.ts` as described in the proposal.
4. Roll out frontend changes (types → service → hooks → components) in the same order as the "Files to Create or Modify" list in the User Story, since each layer depends on the one below it (hexagonal architecture convention: `components → hooks → services → supabase`).
5. Rollback: the column has a `default '{}'`, so reverting the frontend alone is safe (unused column). Reverting the RPC requires re-applying the prior `create or replace function` body from `20260723000100_formulario_respuestas.sql` in a follow-up migration if a rollback is ever needed — no destructive `DROP COLUMN` is planned as part of normal rollback.

## Open Questions

- Should the warning panel's copy differ between self-booking ("Tu perfil...") and admin-on-behalf booking ("El perfil de {atleta}...")? Recommendation: yes (see Risk above) — confirm during implementation review since the User Story doesn't explicitly specify copy variants.
- Should `FormularioFormModal` (create-only modal) also expose the checkbox grid at creation time, or only in the editor page afterward? Design follows the existing convention (editor-page-only, matching how sections are also only added post-creation) — flag if product wants it available at creation time too.
