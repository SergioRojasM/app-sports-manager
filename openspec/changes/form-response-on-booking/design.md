## Context

`formularios_plantillas` + `formulario_plantilla_esquema` (US-0084/US-0085) and `entrenamientos(_grupo).formulario_id/formulario_obligatorio` (US-0086) are already live in the codebase — confirmed by reading `entrenamientos.service.ts`, `entrenamientos.types.ts`, and the applied migrations directly, not just their spec files. `ReservasPanel.tsx` already shows the attached form (external link or internal template name) with an "Obligatorio" badge, but that flag is decorative: "Reservar" never checks it. The booking write path itself is a single `SECURITY DEFINER` RPC, `book_and_deduct_service_units` (`20260625000100_validar_suscripcion_activa_en_reserva.sql`), called from `reservasService.create()` after a series of client-side pre-checks (past-date guard, restriction evaluation, capacity, duplicate-booking, per-category capacity). This design adds the missing piece: an actual place to store an athlete's answers, and a UI step to collect them, without disturbing any of that existing pre-check chain.

## Goals / Non-Goals

**Goals:**
- Persist a structured JSON answer set (`formulario_respuestas`) for a training's internal form, atomically tied to the reservation it was collected for.
- Insert that response and the reservation in a single transaction — no orphan response rows, no reservation silently missing its response due to a partial failure.
- Reuse the existing booking pre-check pipeline unchanged; only extend the final RPC call and the modal chain in front of it.
- Support the `imagen` field type via the existing `org-assets` Storage bucket.
- Give staff a read path to a submitted response.

**Non-Goals:**
- Enforcing `formulario_obligatorio` in the database (stays client-side only).
- Editing/resubmitting a response.
- Any change to the `formulario_externo` (URL) flow.
- A cross-training report/export of responses.

## Decisions

**1. Extend `book_and_deduct_service_units` in place, rather than adding a second RPC.**
The function already owns the one moment where a reservation is atomically created (transactionally paired with service-unit deduction). Adding two trailing optional parameters (`p_formulario_plantilla_id`, `p_formulario_respuesta`, both defaulting to `null`) keeps every existing caller — and the existing `20260625000100` "reject inactive subscriptions" logic it already contains — untouched, while giving the response insert the same atomicity guarantee the deductions already have. Alternative considered: a wrapper RPC that calls `book_and_deduct_service_units` internally after inserting the response — rejected because it reintroduces the two-write race (response could be inserted, then booking could fail on a capacity/duplicate race not visible to the client's pre-checks), which defeats the purpose of doing this in SQL at all.

**2. Required-field validation lives in the RPC, not only in the client.**
The client (`useFormularioRespuestaForm`) validates required `datos` fields before allowing submit, but the RPC re-validates the same rule (`formulario_plantilla_esquema` where `seccion_tipo = 'datos' and campo_obligatorio = true and activo = true`) before inserting. This is the standard defense-in-depth pattern already used elsewhere in this schema (e.g. the check-constraint-driven validation in `formulario_plantilla_esquema` itself) — a stale client (cached template, a field deactivated by an admin mid-session) must not be able to write incomplete required data.

**3. No DB-level enforcement of `formulario_obligatorio`.**
This was a deliberate, explicit trade-off confirmed with the requester: staff bookings must always be able to skip the form regardless of the flag (mirrors the existing `bypass_restrictions` precedent for admin/entrenador). Enforcing "obligatorio implies a response must exist" at the DB layer would require the RPC to know which caller role is exempt, which pushes an authorization concern into a function that currently has none — kept out of scope; the flag remains purely a UI gate on the self-booking path.

**4. `formulario_plantilla_id` FK uses `on delete restrict`, not `set null`.**
Unlike `entrenamientos.formulario_id` (`on delete set null`, since detaching a template from a *future* training is harmless), a `formulario_respuestas` row is a historical record: without the template, `campo_nombre` keys in the JSON blob have no label mapping and become unreadable. `restrict` trades a small amount of admin friction (can't hard-delete a template that was ever used) for preserving the readability of past submissions. Alternative considered: `set null` + snapshotting the template's labels into `formulario_respuestas` at submission time — rejected as materially more work (schema + write-time complexity) for a benefit (unrestricted template deletion) nobody asked for.

**5. `imagen` fields store a Storage *path*, not a signed URL, in the JSON.**
Signed URLs expire (`SIGNED_URL_TTL` = 1 year today, but still finite); a path is stable forever and the viewer/service layer already has `storageService.getSignedUrl(path)` to resolve it on read, exactly like `useComprobanteViewer` does for payment receipts. The upload path is always rooted at the *athlete's own* user folder (`orgs/{tenant}/users/{atletaId}/formularios/...`) even when staff uploads on the athlete's behalf, so the existing `org_member_read` SELECT policy (any active tenant member can read anything under `orgs/{tenantId}/...`) covers reads with zero new SELECT policy, and per-athlete storage layout stays consistent with the existing `receipts` folder convention.

**6. Two-step modal, not one combined modal.**
`ReservaFormModal` already owns non-form concerns (athlete picker, categoría selection, notas) with its own validation/submit lifecycle (`useReservaForm`). Rather than growing that modal and hook to also own arbitrary per-template dynamic fields, a second modal (`FormularioRespuestaModal`) + a dedicated hook (`useFormularioRespuestaForm`) owns only the form-fill concern, and the existing `useReservaForm.submitCreate` is extended to accept the collected answers as an optional payload merged into the same `CreateReservaInput` it already builds. This keeps each hook's responsibility narrow (matches this codebase's established pattern of parallel state slices — see US-0086's `formularioForm` precedent in `useEntrenamientoForm.ts`) and lets the existing admin "no-units, confirm anyway" replay path (`pendingBookingInputRef` in `useReservas.ts`) work with zero changes, since it already replays whatever full `CreateReservaInput` it was given.

**7. No new capability name for "form templates" or "training-form-attachment" in `openspec/specs/`.**
Neither of those has been synced into `openspec/specs/` yet (their `openspec/changes/*` directories were never archived), so this change does not attempt a delta against specs that don't exist. It adds a self-contained new capability (`form-responses`) and a delta against the one capability that *does* exist and is genuinely affected (`training-booking`).

## Risks / Trade-offs

- **[Risk]** Changing `book_and_deduct_service_units`'s signature is a shared, security-sensitive surface — a mistake here affects every booking, not just form-related ones. → **Mitigation**: new parameters are strictly additive with defaults; the entire pre-existing body (deduction passes, reservation insert shape) is preserved verbatim except for the new response-insert block and one new column in the `reservas` insert list. Verified via local `supabase db reset` before any code depends on it.
- **[Risk]** `on delete restrict` on `formulario_plantilla_id` could surprise an admin trying to clean up an old template. → **Mitigation**: the service-layer delete error is mapped to a friendly message (per US-0087 AC 13), not a raw Postgres error; documented explicitly as a flagged trade-off for future review.
- **[Risk]** Image upload adds a failure mode (network drop mid-upload) inside a multi-field form. → **Mitigation**: each `imagen` field uploads independently and immediately on selection (not deferred to final submit), so a failure is caught and retried per-field before the athlete ever hits "Guardar y reservar" rather than surfacing as one opaque submit-time error.
- **[Risk]** Staff always being able to skip the form (decision #3) means `formulario_obligatorio = true` provides no hard guarantee data was ever collected. → **Mitigation**: this is an accepted, explicit product decision (not an oversight) — staff already bypass every other booking restriction; the alternative (forcing staff to fill out a medical form on an athlete's behalf) was rejected by the requester as worse friction.

## Migration Plan

1. Apply `supabase/migrations/{timestamp}_formulario_respuestas.sql` locally (`supabase db reset` or equivalent) — table, RLS, extended RPC. **Never pushed to the remote Supabase project as part of this change** — local verification only, per project convention.
2. Apply `supabase/migrations/{timestamp}_formulario_respuestas_storage.sql` locally — new storage policies.
3. Ship type/service/hook changes (additive — no existing exported function signature loses a parameter or changes its return shape for existing callers).
4. Ship the two new components and the `ReservaFormModal`/`ReservasPanel` wiring last, since they're the only pieces that change existing user-visible behavior.
5. Rollback: both migrations are additive (new table, new nullable column, new policies, backward-compatible function signature) — a rollback is a straightforward drop of the new table/column/policies and reverting the function to its prior `create or replace` body; no data backfill is involved since nothing pre-existing is touched.

## Open Questions

- Should a future US allow editing a submitted response (e.g., an athlete correcting a mistake before the training starts)? Left for a later change — no UI or RPC path exists for it here by design.
- Should `formulario_obligatorio` eventually become DB-enforced for self-bookings specifically (while staff stays exempt)? Would require the RPC to be role-aware; deferred until product confirms staff-exemption is a permanent rule rather than a temporary convenience.
