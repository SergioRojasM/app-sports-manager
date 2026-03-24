## Context

The training management feature (`entrenamientos_grupo` / `entrenamientos`) already has a pattern for propagating optional text fields from a training group down to its generated instances: `punto_encuentro` was introduced this way in migration `20260302000100`. This change follows the exact same pathway — database column → type → service → hook → component — to add `formulario_externo`, an optional URL that coaches and administrators can attach to a training for athletes to access an external registration or data-collection form.

The sync trigger `sync_entrenamientos_from_grupo()` is defined in `20260226000200_entrenamientos_grupo_recurrencia.sql` and currently syncs: `nombre`, `descripcion`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`. The service-level sync path in `syncGroupPatchToInstances` (inside `updateTrainingSeries`) already includes `punto_encuentro` in the `instancePatch` object. The new field must be added to both paths.

## Goals / Non-Goals

**Goals:**
- Add `formulario_externo VARCHAR(500) DEFAULT NULL` to `entrenamientos_grupo` and `entrenamientos`.
- Propagate the field through all create, update, and series-sync code paths identically to `punto_encuentro`.
- Expose the field in the training wizard form (step 1) as a `type="url"` input.
- Display the field as a safe clickable link in `EntrenamientosList` and `ReservasPanel`.

**Non-Goals:**
- Iframe/preview of the external form inside the app.
- Server-side URL reachability validation.
- Click analytics or tracking.
- RLS policy changes (the column inherits existing access rules).

## Decisions

### Decision 1 — Mirror `punto_encuentro` exactly as the implementation pattern

`formulario_externo` will be added in every place `punto_encuentro` appears across migration, types, service, hook, and components. This avoids diverging patterns within the same feature and keeps the diff reviewable.

**Alternatives considered:**
- Storing the URL in a separate linked table for extensibility — rejected because a single optional column is sufficient; over-engineering a join for a plain text field adds query complexity with no benefit.

### Decision 2 — `VARCHAR(500)` at the DB layer, `maxLength={500}` at the UI layer

URLs with query strings and UTM parameters can easily exceed 200 characters (the length used for `punto_encuentro`). 500 characters covers all practical external form URLs while preventing unbounded storage.

**Alternatives considered:**
- `TEXT` (unlimited) — rejected to maintain a predictable UI constraint and limit accidental misuse.
- 255 characters — too close to the edge for URLs with multiple query parameters.

### Decision 3 — `type="url"` input with native browser validation

The wizard uses uncontrolled-style inputs with `type="text"` for most fields. `formulario_externo` uses `type="url"` so the browser enforces scheme format for free, without adding a custom validator. The value is trimmed and stored as `null` when empty.

**Alternatives considered:**
- Custom regex validation in the hook — rejected; native `type="url"` gives the same UX signal with zero code.

### Decision 4 — Update the DB trigger AND the service-level sync

The `sync_entrenamientos_from_grupo()` trigger was created early in the project and later complemented by the service-level `syncGroupPatchToInstances` function (which is the active sync path since the trigger is intentionally disabled in the migration). Both must be updated:
- The trigger: kept in sync for correctness so future re-enablement doesn't lose the field.
- The service `syncGroupPatchToInstances`: this is the live path — it explicitly builds the `instancePatch` object and runs the update.

### Decision 5 — Display in `ReservasPanel` header section

The panel already shows the training `nombre` and a subtitle in the `<header>` block. The external form link is placed beneath the subtitle as a single line, conditionally rendered, consistent with how `EntrenamientosList` will display it. This is the only place athletes interact with training details directly.

## Risks / Trade-offs

- **Open external link target** → Mitigation: always render with `target="_blank" rel="noopener noreferrer"` to prevent tabnapping.
- **Invalid URL stored if JS is disabled** → Mitigation: `type="url"` is a hint; the DB column is `VARCHAR(500)` with no format constraint. The risk is acceptable since the field is admin/trainer-only and the URL is never fetched server-side.
- **Trigger vs. service sync divergence** → Mitigation: update both in the same migration so they stay aligned regardless of which path is active.

## Migration Plan

1. Create migration file `supabase/migrations/YYYYMMDD000100_add_formulario_externo_entrenamientos.sql`:
   ```sql
   alter table public.entrenamientos_grupo
     add column if not exists formulario_externo varchar(500) default null;

   alter table public.entrenamientos
     add column if not exists formulario_externo varchar(500) default null;

   -- Replace the trigger function to include the new field
   create or replace function public.sync_entrenamientos_from_grupo()
   returns trigger language plpgsql as $$
   begin
     update public.entrenamientos
     set
       nombre              = new.nombre,
       descripcion         = new.descripcion,
       punto_encuentro     = new.punto_encuentro,
       formulario_externo  = new.formulario_externo,
       disciplina_id       = new.disciplina_id,
       escenario_id        = new.escenario_id,
       entrenador_id       = new.entrenador_id,
       duracion_minutos    = new.duracion_minutos,
       cupo_maximo         = new.cupo_maximo,
       updated_at          = timezone('utc', now())
     where entrenamiento_grupo_id = new.id
       and tenant_id = new.tenant_id
       and (fecha_hora is null or fecha_hora >= timezone('utc', now()))
       and coalesce(lower(estado), '') not in ('cancelado')
       and coalesce(bloquear_sync_grupo, false) = false;
     return new;
   end;
   $$;
   ```
2. Apply locally: `npx supabase db reset` (dev) or `npx supabase migration up`.
3. **Rollback**: `alter table ... drop column if exists formulario_externo;` — safe because the column is nullable with no dependants.

## Open Questions

- None. The scope is narrow and all technical decisions align with existing patterns.
