# Delivery — team-events-management-phase-two (US-0119)

## Commit message

```
feat(team-events-management-phase-two): create/edit wizard with tickets, coupons, payment methods and drafts

- Add full-page 3-step wizard at gestion-eventos/nuevo and gestion-eventos/[evento_id]/editar
  (Configura tu evento / tus entradas / tus métodos de pago) with live page/card preview
- "Guardar borrador" on any step with only the name; drafts are hidden from non-staff by RLS
- eventos: disciplina_id -> text (name), escenario_id -> jsonb snapshot, entrenador_id -> jsonb
  array with experiencia; new borrador, formulario_id, metodos_pago; precio now derived
- New evento_entradas (Sencilla/Múltiple + bundle) and evento_entrada_cupones (% discount,
  codes private to staff) with RLS
- New SECURITY INVOKER RPC guardar_evento_completo: atomic draft/final save with sync of
  tickets and coupons and a client_key -> id map
- Event banner upload (orgs/{tenantId}/eventos/) + event_banner_read storage policy
- Management page: navigation to the wizard, publish banner, draft tag/filter/stat/actions;
  remove EventoProximamenteModal
- Inline scenario creation via useScenarios({ onCreated }); breadcrumb labels for the wizard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request description

### Why
Phase 1 (US-0118) shipped a read-only events page: "Nuevo evento" and "Editar" only opened a
"próximamente" modal, and events had no tickets, coupons, access form or payment methods.
US-0119 lets admins create and edit events end to end, and save drafts at any point so work is never lost.

### Breaking changes
- **Schema (`eventos`)**: `disciplina_id` uuid FK → `text` (discipline name); `escenario_id` uuid FK →
  `jsonb` snapshot; `entrenador_id` uuid FK → `jsonb` array `[{id,nombre,experiencia}]`. Existing rows are
  migrated in place. `precio` is now derived from the tickets by the save RPC.
- **Service**: `eventosService.createEvento` / `updateEvento` removed → `guardarEventoCompleto` /
  `getEventoCompleto`. `listEventos` no longer embeds joins. `EventoListItem.disciplinaId` removed
  (discipline filter matches by name).

### Data model
- `eventos` + `borrador`, `formulario_id` (FK, `on delete set null`), `metodos_pago` (snapshots).
- `evento_entradas`: `sencilla | multiple`, `eventos_id_bundle` (same-tenant events, never itself),
  `valor`, sale window, `orden`. `evento_entrada_cupones`: `%` discount (0,100], uppercase code unique per event.
- Ticket/coupon fields that a draft may leave empty are nullable; format checks stay in the table and
  completeness is enforced by the RPC on final save.

| Actor | `eventos` | `evento_entradas` | `evento_entrada_cupones` | Writes |
|---|---|---|---|---|
| anon | public + active + **not borrador** | of readable events | no grant | — |
| non-member | same as anon | of readable events | 0 rows | — |
| member | + active, not-draft rows of own tenant | of readable events | 0 rows | — |
| admin / trainer | all incl. drafts | all | all | ✓ (tenant-consistent) |

### Save model
`guardar_evento_completo` (SECURITY INVOKER, one transaction):
- **Draft** (`p_borrador = true`): name + format only; incomplete tickets/coupons are kept.
- **Final**: + discipline, ≥1 complete ticket, bundle for Múltiple, complete coupons, no coupons on free
  tickets, payment method when any ticket is paid, active form. Sets `borrador = false`.
- One-way: a published event cannot go back to draft.
- Syncs children (delete missing / upsert present), rewrites `precio`, returns persisted ids per `client_key`.

### Wizard
1. **Configura tu evento** — every `eventos` field, banner upload, discipline, venue (+ inline creation with
   the existing `ScenarioFormModal`), multiple trainers with experience, live preview (event page / card).
2. **Configura tus entradas** — tickets, coupons, access form (with preview).
3. **Configura tus métodos de pago** — active payment methods + summary.

The first draft save of a new event switches the URL to `/{id}/editar?paso=N` without a reload.
The same client and server rules are used, so errors show inline before any request.

### Verification
- SQL (local, rolled-back transaction): data migration, RLS per actor (anon, non-member, member,
  admin), and the RPC in both modes (draft incomplete data, format errors, atomic final rejection,
  publish, no revert to draft, sync, no duplicates on repeated saves, derived `precio`, duplicate coupon
  code, cross-tenant ticket insert).
- Browser (local, admin): name-only draft → edit URL without a reload; incomplete ticket/coupon saved
  and restored; hidden-step error jump and focus; inline scenario creation and auto-selection; live
  preview; coupon uppercase and discount preview; bundle required; payment method required; publish
  banner; edit round trip (no draft button on published, leave guard, ticket-with-coupon delete
  confirmation); drafts in the list (tag, filter, stat, restricted menu).
- `npx tsc --noEmit` and `eslint` on the changed files pass. The project has no test script. No build was run.

### Notes
- **Migrations were applied to the local database only. They must not be pushed to remote as part of this PR review.**
- Not verified in the browser: trainer/athlete redirect (unchanged `(administrador)` layout), the
  offline save error, and keyboard-only navigation.
- The preview reuses the public training detail body; section copy such as "¿Qué incluye este
  entrenamiento?" still says "entrenamiento" (only the kind tag was made configurable).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
