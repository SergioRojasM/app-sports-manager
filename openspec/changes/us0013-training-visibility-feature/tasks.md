## 1. Branch Setup

- [x] 1.1 Create a new git branch named `feat/training-visibility-feature` from the latest base branch
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before continuing

## 2. Seed — Public Tenant

- [x] 2.1 Verify `supabase/seed.sql` contains the fixed-UUID upsert for the public tenant (`id = '2a089688-3cfc-4216-9372-33f50079fbd1'`, `nombre = 'qbop Public'`) — already added in design update; confirm it is correct
- [x] 2.2 Run `supabase db reset` locally and confirm `SELECT id FROM public.tenants WHERE id = '2a089688-3cfc-4216-9372-33f50079fbd1'` returns one row

## 3. Database Migration

- [x] 3.1 Create `supabase/migrations/20260301000100_entrenamientos_visibilidad.sql`
- [x] 3.2 Add `ALTER TABLE public.entrenamientos ADD COLUMN IF NOT EXISTS visibilidad varchar(10) NOT NULL DEFAULT 'privado'`
- [x] 3.3 Add `ALTER TABLE public.entrenamientos ADD COLUMN IF NOT EXISTS visible_para uuid`
- [x] 3.4 Add CHECK constraint `entrenamientos_visibilidad_ck` enforcing `visibilidad IN ('publico', 'privado')`
- [x] 3.5 Add FK constraint `entrenamientos_visible_para_fkey` referencing `public.tenants(id) ON DELETE SET NULL`
- [x] 3.6 Write backfill: `UPDATE public.entrenamientos SET visible_para = tenant_id WHERE visibilidad = 'privado' AND visible_para IS NULL`
- [x] 3.7 Add index `idx_entrenamientos_visibilidad` on `(visibilidad)`
- [x] 3.8 Add index `idx_entrenamientos_visible_para` on `(visible_para)`
- [x] 3.9 Drop existing `entrenamientos_select_authenticated` SELECT policy and recreate it to allow `visibilidad = 'publico'` OR tenant membership (see design Decision 3)
- [x] 3.10 Wrap entire migration in `begin; … commit;`
- [x] 3.11 Apply migration locally (`supabase db reset` or `supabase migration up`) and verify zero errors
- [x] 3.12 Verify backfill: `SELECT count(*) FROM public.entrenamientos WHERE visible_para IS NULL` returns 0

## 4. Domain Types (`src/types/portal/entrenamientos.types.ts`)

- [x] 4.1 Add `export type TrainingVisibility = 'publico' | 'privado'`
- [x] 4.2 Add `visibilidad: TrainingVisibility` and `visible_para: string | null` fields to `TrainingInstance`
- [x] 4.3 Add `visibilidad: TrainingVisibility` to `TrainingWizardValues` (default value will be set in hook)
- [x] 4.4 Add `visibilidad: TrainingVisibility` to `CreateTrainingSeriesInput`
- [x] 4.5 Add `visibilidad?: TrainingVisibility` (optional) to `UpdateTrainingSeriesInput`
- [x] 4.6 Add `visibilidad?: TrainingVisibility` (optional) to `UpdateTrainingInstanceInput`
- [x] 4.7 Run `pnpm tsc --noEmit` and confirm no type errors from the changes

## 5. Application Constants (`src/lib/constants.ts`)

- [x] 5.1 Add `export const PUBLIC_TENANT_ID = '2a089688-3cfc-4216-9372-33f50079fbd1'` with a JSDoc comment explaining it is the system-level public tenant UUID

## 6. Service Layer (`src/services/supabase/portal/entrenamientos.service.ts`)

- [x] 6.1 Add pure helper function `resolveVisiblePara(visibilidad: TrainingVisibility, tenantId: string): string` using `PUBLIC_TENANT_ID`
- [x] 6.2 Update `createTrainingSeries`: accept `visibilidad` from `CreateTrainingSeriesInput`; call `resolveVisiblePara` and write both `visibilidad` and `visible_para` on every generated instance
- [x] 6.3 Update `generateSeriesInstances`: derive `visibilidad` and `visible_para` from the parent group/input; persist on each generated instance row
- [x] 6.4 Update `updateTrainingSeries` (`scope='series'`): include `visibilidad` and `visible_para` (recomputed) in the UPDATE applied to eligible future instances (`fecha_hora >= now()` OR `fecha_hora IS NULL`, not cancelled, `bloquear_sync_grupo = false`)
- [x] 6.5 Update `updateTrainingSeries` (`scope='future'`): same propagation as 6.4 but scoped from the effective date forward
- [x] 6.6 Update `updateTrainingInstance`: accept optional `visibilidad`; if provided, call `resolveVisiblePara` and write both fields on the single instance
- [x] 6.7 Confirm that instances with `bloquear_sync_grupo = true` are excluded from all series sync UPDATE queries (existing WHERE clause — verify it is present)

## 7. Hook Layer (`src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`)

- [x] 7.1 Add `visibilidad: 'privado' as TrainingVisibility` to the `EMPTY_FORM` constant
- [x] 7.2 Expose `visibilidad` in the hook's returned state and add `setVisibilidad` setter (or integrate into the existing generic field setter)
- [x] 7.3 Include `visibilidad` in the submit payload passed to `createTrainingSeries` and `updateTrainingInstance` / `updateTrainingSeries`
- [x] 7.4 Add validation: `visibilidad` must be `'publico'` or `'privado'`; reject submission otherwise
- [x] 7.5 Ensure `visibilidad` is populated from the existing training record when the form opens in edit mode

## 8. Form Component (`src/components/portal/entrenamientos/EntrenamientoFormModal.tsx`)

- [x] 8.1 Add a radio group section labelled "Visibilidad" after the `descripcion` field and before the date/time section
- [x] 8.2 Render two radio options: `Privado` (value `'privado'`) and `Público` (value `'publico'`); `'privado'` is pre-selected by default
- [x] 8.3 Render a reactive `<p>` helper text below the radio group:
  - `'privado'` → "Este entrenamiento solo será visible para los miembros de tu organización."
  - `'publico'` → "Este entrenamiento será visible públicamente y podrá ser descubierto por atletas fuera de tu organización."
- [x] 8.4 Wire the radio group to the `visibilidad` field in the hook state via `setVisibilidad` (or equivalent)
- [x] 8.5 Do NOT disable the visibility selector while the form is submitting (only the submit button and destructive actions should be disabled)

## 9. List View Badge (`src/components/portal/entrenamientos/EntrenamientosList.tsx`)

- [x] 9.1 Import or create a `VisibilidadBadge` component (can be inline) that accepts `visibilidad: TrainingVisibility`
- [x] 9.2 Render the badge adjacent to the training name in each list row
  - `'publico'` → label "Público", accent/highlighted color class
  - `'privado'` → label "Privado", neutral/muted color class
- [x] 9.3 Verify the badge appears correctly in both populated and empty-state renders

## 10. Calendar View Dot & Legend (`src/components/portal/entrenamientos/EntrenamientosCalendar.tsx`)

- [x] 10.1 Update the calendar day-cell instance dot/indicator to derive its color from `visibilidad`:
  - `'publico'` → accent dot color
  - `'privado'` → muted/neutral dot color
- [x] 10.2 Add a permanent legend in the calendar header or footer with two entries:
  - Accent dot + "Público – visible para todos"
  - Muted dot + "Privado – solo tu organización"
- [x] 10.3 Confirm the legend is always rendered regardless of whether any trainings exist

## 11. Documentation

- [ ] 11.1 Update `projectspec/03-project-structure.md`: add note to the `entrenamientos` feature-slice section about the `visibilidad`/`visible_para` fields and the `PUBLIC_TENANT_ID` constant
- [ ] 11.2 Update `projectspec/userstory/us0013-training-visibility-feature.md` Definition of Done checkboxes to reflect any scope changes from design/spec phases

## 12. Verification & PR

- [x] 12.1 Run `pnpm lint` and `pnpm tsc --noEmit` — confirm zero errors
- [x] 12.2 Smoke test: create a training with `Público` → verify `visibilidad = 'publico'` and `visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'` in the DB
- [x] 12.3 Smoke test: edit a series with scope `'series'` and change visibility → verify eligible future instances are updated; verify blocked exceptions are not changed
- [x] 12.4 Smoke test: open the list view → confirm Público/Privado badges appear per row
- [x] 12.5 Smoke test: open the calendar view → confirm dot colors differ by visibility and the legend is visible
- [ ] 12.6 Write commit message following conventional commits format:
  ```
  feat(entrenamientos): add visibility control (publico/privado) to training instances

  - Add visibilidad + visible_para columns to public.entrenamientos (migration)
  - Seed public tenant with fixed UUID 2a089688-3cfc-4216-9372-33f50079fbd1
  - Update RLS SELECT policy for cross-tenant public training access
  - Add PUBLIC_TENANT_ID constant; resolveVisiblePara service helper
  - Extend types, hook, and form modal with visibility radio selector
  - Add visibility badge to list view and color-coded dot + legend to calendar

  Closes US-0013
  ```
- [ ] 12.7 Open a Pull Request with title `feat: training visibility (público/privado) — US-0013` and include the commit message body as the PR description; add checklist items from Definition of Done in US-0013
