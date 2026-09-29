# Delivery — team-events-management-phase-one (US-0118)

## Commit message

```
feat(team-events-management-phase-one): add eventos table and admin events page

- New standalone public.eventos table (independent from entrenamientos):
  constraints, indexes, updated_at trigger and RLS. anon reads public+active;
  members also read private active events; admins/trainers read all and write.
- eventosService (list with month range, get, create, update, update estado,
  delete) with typed EventoServiceError; zero-row writes map to 'forbidden'.
- GestionEventosPage at /portal/orgs/[tenant_id]/gestion-eventos with
  switchable cards / list / calendar views (?vista=), filters, stats,
  loading/error/empty states, delete and confirmado<->cancelado actions.
  "Nuevo evento" and "Editar" open a coming-soon modal (phase 1).
- "Eventos" admin menu entry and breadcrumb label.
- Docs: 03-project-structure.md (slice + eventos RLS matrix).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request

**Title:** feat: team events module — phase 1 (US-0118)

### Why
Teams need events for their own members that are not trainings. Public trainings always derive from an `entrenamientos` row, and `gestion-eventos` was an empty placeholder. This PR adds the data foundation and the admin management screen. Later phases add the create/edit form, publishing, and ticket purchase.

### What changed

**Database** (`supabase/migrations/20260928120000_eventos.sql`)
- `public.eventos` columns mirror `entrenamientos_publicos`, including the jsonb arrays `precio`, `cronograma` and `incluye`.
- `estado` must be `confirmado` or `cancelado`. Other checks cover `cupo`, `duración`, the lead times and the jsonb array types.
- `escenario_id` and `entrenador_id` are nullable uuid FKs (`on delete set null`), `disciplina_id` is `restrict`, and `tenant_id` cascades.
- RLS:

| Actor | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| anon | public + active | — |
| authenticated non-member | public + active | — |
| member (non-pending) | + active rows of own tenants | — |
| admin / trainer | all rows of their tenants | ✓ |

**Frontend**
- The `gestion-eventos` feature slice (page → components → hooks → service → types) and `src/lib/portal/eventos.utils.ts` for Bogotá dates and formatting.
- Views: cards (default), list (paginated, stacked on mobile) and a month calendar (Bogotá time, "+N" overflow, undated-events note).
- The actions menu is rendered in a portal and opens upward near the bottom of the viewport. The modals share one frame.
- "Eventos" menu item for admins, placed after "Entrenamientos", plus the breadcrumb label.

### Phase 1 limits
- "Nuevo evento" and "Editar" open an informational modal. The `createEvento` and `updateEvento` services exist but aren't wired to the UI yet.
- Trainers have write access in RLS but no UI. Phase 2 adds a separate route for them under `(shared)`.
- Delete is a hard delete. The tickets phase must block it or switch to a soft delete.
- Notifying members when an event is cancelled is deferred to a later phase.

### Verification
- The migration was applied **locally only** (`supabase migration up --local`) and was not pushed to remote.
- SQL checks, run in a rolled-back transaction:
  - defaults
  - every check constraint rejects invalid data
  - `updated_at` refreshes on update
  - discipline FK `restrict` and venue FK `set null`
  - RLS reads for anon, non-member, member, pending member, trainer and admin
  - RLS writes: denied or 0 rows for anon, non-member and member; allowed for trainer and admin
  - moving an event to another tenant is denied
- Playwright against the local dev server, with a temporary admin user and demo data, both removed afterwards:
  - cards content, including a 01:00 UTC event shown as the previous day in Bogotá
  - cancel, re-confirm and delete
  - Escape closes a modal without changes
  - "Nuevo evento" placeholder
  - list view and `?vista=` persistence
  - calendar month navigation and "+N" overflow
  - keyboard view switching
  - search, no-match state, "Limpiar filtros" and "Pasados"
  - layout at 390px
  - trainer redirected, with no menu entry
  - empty-tenant state
- `npx tsc --noEmit` and `eslint` on the changed files pass. The project has no test suite, and no build was run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
