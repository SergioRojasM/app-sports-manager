## Context

The `entrenamientos` feature (US-0012) already supports full CRUD for training series and instances within a tenant scope. All `public.entrenamientos` rows are today readable only by members of the tenant that owns them (via the existing RLS SELECT policy). There is no mechanism for a tenant admin to expose a training to athletes outside their organization.

This design extends the `entrenamientos` table with two fields — `visibilidad` and `visible_para` — and propagates them through the existing types → service → hook → component stack without breaking any existing behavior. The implementation follows the project's layered architecture: `types → service → hook → component`.

**Constraints:**
- No new route or page is introduced.
- `visible_para` is **never set by the client**; it is always computed server-side in the service layer.
- All existing `single`/`future`/`series` scope edit paths must propagate the new fields with the same eligibility rules as existing synced fields.
- New RLS policy must not weaken INSERT/UPDATE/DELETE policies (admin-only gates remain unchanged).

---

## Goals / Non-Goals

**Goals:**
- Add `visibilidad` (`'publico'|'privado'`, default `'privado'`) and `visible_para` (FK → `tenants.id`) to `public.entrenamientos`.
- Auto-compute `visible_para` in the service layer using a `PUBLIC_TENANT_ID` application constant.
- Update the SELECT RLS policy so authenticated users can read cross-tenant rows with `visibilidad = 'publico'`.
- Extend all mutation service functions, hook form state, and the form modal to carry the new field.
- Propagate `visibilidad`/`visible_para` in series sync (`scope='series'` and `scope='future'`), respecting `bloquear_sync_grupo`.
- Backfill all existing rows to `visibilidad='privado'`, `visible_para=tenant_id` in the migration.

**Non-Goals:**
- Public-facing athlete discovery/browse page (separate story).
- `is_public` column on `tenants` table.
- Visibility on `entrenamientos_grupo` (series-level).
- Role-based or plan-based visibility tiers.
- Unauthenticated (anonymous) access to public trainings.

---

## Decisions

### Decision 1 — `visible_para` computed server-side, never client-supplied

**Choice:** The service layer always calls `resolveVisiblePara(visibilidad, tenantId)` to derive `visible_para`. The client only sends `visibilidad`.

**Rationale:** Allowing the client to set `visible_para` directly would let a bad actor forge a cross-tenant injection. Computing it server-side in the service layer is the minimal secure approach without adding a Postgres function or trigger.

**Alternative considered:** Enforce via a Postgres trigger on INSERT/UPDATE. Rejected — adds DB complexity and makes the rule implicit; the service layer is the right place per the hexagonal architecture.

---

### Decision 2 — Hard-coded `PUBLIC_TENANT_ID` constant (not a DB column)

**Choice:** Define `PUBLIC_TENANT_ID` as a string constant in `src/lib/constants.ts`, pointing to the UUID of the public tenant seeded in `supabase/seed.sql`.

**Confirmed value:** `PUBLIC_TENANT_ID = '2a089688-3cfc-4216-9372-33f50079fbd1'`. The public tenant is seeded in `supabase/seed.sql` with this fixed UUID via an explicit `INSERT … ON CONFLICT (id) DO NOTHING` block.

**Rationale:** Adding `is_public` to `tenants` is a schema change that requires its own story and migration. A constant keeps this story self-contained; the constant can be replaced with a DB lookup later without touching the service contract.

**Alternative considered:** Query `tenants` for a well-known `nombre='publico'` at runtime. Rejected — adds an extra DB round-trip on every mutation and couples the feature to a data convention with no enforcement.

---

### Decision 3 — Single updated RLS SELECT policy (replace, not add)

**Choice:** Drop and recreate the existing `entrenamientos_select_authenticated` (or equivalent) policy so it covers both tenant-scoped and public-visibility rows in one expression.

**Rationale:** Two separate overlapping SELECT policies on the same table for the same role create confusion. A single policy is easier to audit and reason about.

**Policy logic:**
```sql
using (
  visibilidad = 'publico'
  or tenant_id in (
    select mt.tenant_id from public.miembros_tenant mt
    where mt.usuario_id = auth.uid()
  )
)
```

**Alternative considered:** Keep the original policy and add a second one for the public case. Rejected — Postgres OR's multiple permissive policies, which is equivalent but harder to audit.

---

### Decision 4 — Extend `TrainingWizardValues` and `TrainingInstance`, not a new type

**Choice:** Add `visibilidad: TrainingVisibility` to the existing `TrainingWizardValues` form state shape and to `TrainingInstance`. Introduce only the thin `TrainingVisibility` union type.

**Rationale:** The wizard already carries all other training fields. Adding `visibilidad` to the same shape keeps the hook and form consistent with no new plumbing. `visible_para` is a DB-level computed column; it belongs on `TrainingInstance` (read model) but not on wizard form values.

---

### Decision 5 — UI: radio group (not a toggle switch)

**Choice:** Implement the visibility selector as a radio group with two labelled options (`Privado` / `Público`) and a reactive description paragraph below.

**Rationale:** Radio buttons make the binary choice explicit and accessible (keyboard navigable, screen-reader labelled) with no ambiguity about which state is active. A toggle switch requires the user to interpret its on/off state in context. The description paragraph is critical UX — it explains the data-sharing consequence and a toggle offers less natural space to attach it.

---

### Decision 6 — Visibility visual distinction in list and calendar views

**Choice:** Add visual differentiation for public vs. private trainings in both `EntrenamientosList` and `EntrenamientosCalendar`:

- **List view (`EntrenamientosList`):** Each training row displays a small badge (`Público` in accent color / `Privado` in neutral/muted color) adjacent to the training name.
- **Calendar view (`EntrenamientosCalendar`):** The colored dot/indicator used to mark an instance on the calendar cell changes color based on visibility (`accent` for public, `muted` for private). A **legend** is added to the calendar header/footer explaining the two dot colors.

**Rationale:** Admins need at-a-glance awareness of which trainings are publicly exposed without opening each record. A badge in the list and a color-coded dot in the calendar are the least intrusive additions consistent with the existing UI patterns in scenarios/disciplines. The legend prevents confusion about dot semantics.

**Alternative considered:** Show visibility only on hover/tooltip. Rejected — too easy to miss for a security-relevant setting.

**Files affected:**
- `src/components/portal/entrenamientos/EntrenamientosList.tsx` — add visibility badge per row
- `src/components/portal/entrenamientos/EntrenamientosCalendar.tsx` — change dot color by visibility + add legend

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `PUBLIC_TENANT_ID` UUID is wrong in an environment that never ran the seed | The public tenant is now explicitly seeded with the fixed UUID `2a089688-3cfc-4216-9372-33f50079fbd1`; verify with `SELECT id FROM tenants WHERE id = '2a089688-3cfc-4216-9372-33f50079fbd1'` after reset |
| Existing training rows left with `visible_para = null` if backfill fails silently | Migration uses an explicit `UPDATE … WHERE visible_para IS NULL` and runs inside a transaction (`begin/commit`) |
| Series sync propagates `visibilidad` to an instance that a different admin intended to keep private | The existing `bloquear_sync_grupo` flag on that instance prevents the sync — same protection as for other fields |
| RLS policy rewrite accidentally breaks INSERT/UPDATE/DELETE gates | Only the SELECT policy is touched; INSERT/UPDATE/DELETE policies reference `get_admin_tenants_for_authenticated_user()` and remain untouched |
| TypeScript consumers break if `visibilidad` is required but not available in older DB rows | Migration backfill ensures all rows have a non-null `visibilidad`; the DB column has `NOT NULL DEFAULT 'privado'` |

---

## Migration Plan

### Apply order
1. Create migration file `supabase/migrations/20260301000100_entrenamientos_visibilidad.sql`.
2. Apply locally: `supabase db reset` (dev) or `supabase migration up` (staging/prod).
3. Verify backfill: `SELECT count(*) FROM entrenamientos WHERE visible_para IS NULL;` → must return 0.
4. Verify policy: use a test authenticated user without tenant membership to query — should return only rows where `visibilidad = 'publico'`.

### Migration contents (summary)
```sql
begin;

-- 1. Add columns
alter table public.entrenamientos
  add column if not exists visibilidad varchar(10) not null default 'privado',
  add column if not exists visible_para uuid;

-- 2. Constraints
alter table public.entrenamientos
  add constraint entrenamientos_visibilidad_ck
    check (visibilidad in ('publico', 'privado'));

alter table public.entrenamientos
  add constraint entrenamientos_visible_para_fkey
    foreign key (visible_para) references public.tenants(id) on delete set null;

-- 3. Backfill
update public.entrenamientos
  set visible_para = tenant_id
  where visibilidad = 'privado' and visible_para is null;

-- 4. Indexes
create index if not exists idx_entrenamientos_visibilidad
  on public.entrenamientos (visibilidad);

create index if not exists idx_entrenamientos_visible_para
  on public.entrenamientos (visible_para);

-- 5. Updated SELECT policy (drop old, create new)
drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
create policy entrenamientos_select_authenticated on public.entrenamientos
  for select to authenticated
  using (
    visibilidad = 'publico'
    or tenant_id in (
      select mt.tenant_id from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
    )
  );

commit;
```

### Rollback strategy
Drop the two new columns and restore the original SELECT policy in a follow-up migration. Data loss risk is minimal — the only new data written is `visibilidad` and `visible_para` on newly created/updated rows.

---

## Resolved Questions

1. **Public tenant UUID** → `2a089688-3cfc-4216-9372-33f50079fbd1`. Seeded explicitly in `supabase/seed.sql` with a fixed-UUID upsert. Constant defined in `src/lib/constants.ts` as `PUBLIC_TENANT_ID`.

2. **`sync_entrenamientos_from_grupo` trigger** → The DB trigger (`sync_entrenamientos_from_grupo`) will **not** be re-enabled. All series sync — including `visibilidad`/`visible_para` — is handled exclusively at the service layer. No trigger changes are needed now or in future stories.

3. **Visual distinction for visibility in UI** → **In scope for this story.** List view gets a `Público`/`Privado` badge per row (`EntrenamientosList`). Calendar view changes the instance dot color by visibility and adds a legend to the calendar header (`EntrenamientosCalendar`). See Decision 6.
