## Context

- Trainings (`gestion-entrenamientos`, `(shared)` route) are private to the tenant. Since US-0123 they cannot be published, and members book them with their team plans.
- Events (`gestion-eventos`, `(administrador)` route) are created through the three-step wizard (`EventoWizardPage` + `useEventoWizard`) and saved atomically by the `guardar_evento_completo` RPC.
- US-0122 added a pre-fill mode to that wizard: `nuevo?duplicar={id}` loads a source, maps it to an unsaved draft whose baseline stays the empty draft (dirty from the start), and shows a dismissible notice. US-0132 asks for the same flow with a **training** as the source, with three constraints:
  - only future trainings;
  - administradores only (the wizard is admin-only);
  - capacity explicitly stated as not shared.

The two data models differ:

| Training (`entrenamientos`) | Event (`eventos` / `EventoDraft`) |
|-----------------------------|-----------------------------------|
| `disciplina_id` FK (uuid) | `disciplina_id` = discipline **name** snapshot |
| `escenario_id` FK (required) | `escenario_id` = `EventoEscenarioSnapshot` jsonb (optional) |
| `entrenador_id` FK → `usuarios` (one) | `entrenador_id` = `EventoEntrenadorSnapshot[]` (many, with `experiencia`) |
| `descripcion` text (no limit) | `descripcion` ≤ 300 + `descripcion_larga` |
| `formulario_externo` link, `formulario_id`, `formulario_obligatorio` | `formulario_id` only (always answered at checkout) |
| `fecha_hora` timestamptz | `fechaHora` `datetime-local` in Bogotá |

Trainer option ids are `usuario_id` in both modules (`listTrainerOptions`), so a trainer snapshot built from `entrenador_id` matches the wizard's trainer selector.

## Goals / Non-Goals

**Goals:**
- One click from a future training to a pre-filled, unsaved event draft, built with the US-0122 machinery.
- A single, pure, testable mapping from training to `EventoDraft`.
- The future-only rule defined once and enforced both in the UI and when the wizard loads.
- Capacity independence stated where the admin edits the value.

**Non-Goals:**
- Event → training, series → events, past trainings.
- Any persistent link, sync, or shared capacity between the two records.
- Database, RLS, RPC or migration changes.

## Decisions

### Flow (page → component → hook → service → types)

```
EntrenamientosPage (admin, future)            ── router.push ──►  gestion-eventos/nuevo?desdeEntrenamiento={id}
  └ EntrenamientoActionModal "Publicar en eventos"                         │
                                                                 nuevo/page.tsx (UUID check, duplicar wins)
                                                                           │ desdeEntrenamientoId
                                                                 EventoWizardPage ── notice / empty states
                                                                   └ EventoConfiguracionStep ── capacity hint
                                                                           │
                                                                 useEventoWizard.load()
                                                                   ├ entrenamientosService.getEntrenamientoParaEvento
                                                                   ├ esEntrenamientoFuturo(fecha_hora, now) ─ no → notFoundKind 'entrenamiento-pasado'
                                                                   └ draftFromEntrenamiento → setDraft (baseline = empty) + origenEntrenamiento
                                                                           │ Guardar borrador / Publicar
                                                                 guardar_evento_completo (existing RPC, p_es_nuevo = true)
```

### D1. Reuse the wizard's pre-fill mode instead of a separate "convert" action
The hook gets a third optional source, `desdeEntrenamientoId`, next to `eventoId` and `duplicarDeId`. Priority: edit > duplicate > training.
- Rationale: identity (client-generated id), the dirty baseline, the draft → edit hand-off, the leave guard and the empty and error states already exist and are tested.
- Alternative considered: a server RPC that inserts an event from a training. Rejected because it creates orphan events if the admin backs out, needs a migration, and duplicates the wizard's validation.

### D2. Dedicated service read with embeds
`getEntrenamientoParaEvento` selects one row with `disciplina:disciplinas(nombre)`, `escenario:escenarios(...)` and `entrenador:usuarios!entrenamientos_entrenador_id_fkey(...)`. Embeds can come back as one-element arrays, so the function normalizes them.
- Rationale: one round trip, and it works for inactive disciplines and scenarios, which the active-only option lists would miss. FKs are `on delete restrict` for discipline and scenario, so the embeds always resolve. A deleted trainer becomes `null` (`on delete set null`).
- Alternative considered: resolve names from the wizard's option lists. Rejected because those lists are active-only, load in parallel (race), and do not carry scenario snapshot fields.

### D3. Pure mapper in its own lib file
`src/lib/portal/entrenamiento-evento.utils.ts` holds `esEntrenamientoFuturo` and `draftFromEntrenamiento`. Both are free of I/O and receive `now` / data as arguments.
- `draftFromEntrenamiento` returns `{ draft, ajustes, fechaOriginal }`, the same shape as `draftFromEventoDuplicado`. The hook can then seed `fechaAncla` the same way, so ticket window ends follow later date edits.
- Descriptions longer than 300 characters go whole to `descripcionLarga` instead of being truncated: no data loss and no mid-word cut.
- The file name is direction-neutral. It is a natural home for a future event → training mapper without touching `eventos-wizard.utils.ts`.

### D4. `toEscenarioSnapshot` promoted to `eventos-wizard.utils.ts`
The private `toSnapshot` in `EventoEscenarioSelector` builds exactly the snapshot the mapper needs. Exporting it from the wizard utils keeps a single definition of the snapshot shape.

### D5. Future-only rule enforced twice, from one helper
- **UI**: `EntrenamientosPage.selectedActionContext` computes `canPublicarEnEventos` with the same `currentTimestamp` it uses for edit and delete, so the option card is disabled with a visible reason.
- **Load**: `useEventoWizard` re-checks with `Date.now()`. This covers stale tabs, shared or hand-typed URLs, and a training that started meanwhile. It shows `notFoundKind = 'entrenamiento-pasado'` instead of building a draft.
- Alternative considered: clear the date, as duplicate mode does for past events. Rejected because the story restricts the action to future trainings.

### D6. `notFoundKind` instead of new boolean flags
`notFound` stays the single gate for the empty state. `notFoundKind: 'evento' | 'entrenamiento' | 'entrenamiento-pasado'` only selects the title and description, so `EventoWizardPage` changes in one place.

### D7. Capacity message in two places
- The dismissible notice explains the rule once.
- The field hint (not dismissible) keeps it next to the value. It reuses the existing `hintId="evento-cupo-hint"`, so `aria-describedby` already points at it.

Both read `wizard.origenEntrenamiento`, which also carries `cupoMaximo` and `nombre`, and are cleared after the first successful save.
- Alternative considered: a confirmation dialog before publishing. Rejected because it adds friction on every save without adding information.

### D8. Role gating at the entry point; the route guard stays the authority
The option is rendered only for `administrador`. Trainers can manage trainings but cannot open the `(administrador)` wizard, so showing them the option would lead to a redirect. The layout guard and RLS remain the actual security boundary.

## Risks / Trade-offs

- **[Two independent capacities can oversell the real venue]** → Explicitly out of scope. Mitigated by the notice and the persistent field hint telling the admin to split capacity between both.
- **[Training edited after the event is created; the two drift apart]** → Expected (no link). Documented as a non-goal; the admin edits each record separately.
- **[Embed shape (object vs array) varies by relationship inference]** → The service normalizes both shapes. The `!entrenamientos_entrenador_id_fkey` hint removes ambiguity for `usuarios`.
- **[Trainer snapshot for a user who is no longer a trainer]** → It is copied as stored. The trainer selector treats it like any stored snapshot in edit mode, and the admin can remove it.
- **[Clock difference between the options modal and the wizard load]** → The wizard check is authoritative. A training that starts in between shows "Este entrenamiento ya pasó".
- **[`key` change on `nuevo/page.tsx`]** → The new key (`entrenamiento-{id}`) remounts the wizard when the source changes, avoiding stale draft state. The duplicate and empty keys are unchanged.

## Migration Plan

No database migration. Deploy is a frontend-only release, and rollback is a revert of the commit. Nothing is pushed to the remote Supabase project.

## Open Questions

None. Scope decisions (future-only, training → event only, capacity not shared but stated while creating) were confirmed by the product owner on US-0132.
