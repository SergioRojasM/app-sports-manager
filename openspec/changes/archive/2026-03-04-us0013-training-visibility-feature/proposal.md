## Why

The current training management feature (US-0012) exposes all trainings only within the tenant that created them, making it impossible for athletes from other organizations to discover publicly available sessions. Adding a `visibilidad` field allows tenant administrators to opt specific trainings into a public-facing pool, expanding reach while keeping internal sessions private by default.

## What Changes

- **New DB columns** on `public.entrenamientos`: `visibilidad varchar(10)` (`'publico'|'privado'`, default `'privado'`) and `visible_para uuid` (FK → `tenants.id`, auto-computed by service).
- **New DB constraint + indexes** on `entrenamientos.visibilidad` and `entrenamientos.visible_para`.
- **Backfill migration**: existing rows default to `privado` with `visible_para = tenant_id`.
- **Updated RLS SELECT policy** on `public.entrenamientos` to allow authenticated users to read rows where `visibilidad = 'publico'` regardless of tenant membership.
- **New application constant** `PUBLIC_TENANT_ID` in `src/lib/constants.ts`.
- **Updated TypeScript types**: `TrainingVisibility`, extended `TrainingInstance`, `CreateTrainingSeriesInput`, `UpdateTrainingSeriesInput`, `UpdateTrainingInstanceInput`.
- **Updated service functions**: `resolveVisiblePara` helper + compute/propagate `visibilidad`/`visible_para` in all mutation functions.
- **Updated hook** `useEntrenamientoForm`: add `visibilidad` field with default `'privado'`.
- **Updated form component** `EntrenamientoFormModal`: add visibility radio/toggle selector with reactive helper text.
- **Series sync propagation** extended to include `visibilidad`/`visible_para`, respecting `bloquear_sync_grupo`.

## Capabilities

### New Capabilities

*(none — this change only extends an existing capability)*

### Modified Capabilities

- `training-management`: Adding visibility control requirements (new `visibilidad`/`visible_para` fields, updated RLS, form selector, and series-sync propagation) constitutes a spec-level behavior change to the training management capability.

## Non-goals

- Implementing a public-facing discovery/browse page for athletes outside a tenant (separate story).
- Adding an `is_public` boolean column to the `tenants` table (out of scope; use a hard-coded `PUBLIC_TENANT_ID` constant for now).
- Visibility control on `entrenamientos_grupo` (series-level visibility); only instance-level `entrenamientos` rows are addressed.
- Role-based visibility beyond `publico`/`privado` (e.g., per-plan or per-role restrictions).
- Email/push notifications on visibility change.

## Impact

### Files to Modify or Create

#### Database
- `supabase/migrations/20260301000100_entrenamientos_visibilidad.sql` ← **NEW**

#### Domain (`src/types`)
- `src/types/portal/entrenamientos.types.ts` — add `TrainingVisibility`, extend interfaces

#### Infrastructure (`src/services`)
- `src/services/supabase/portal/entrenamientos.service.ts` — add `resolveVisiblePara`, update all mutation functions

#### Application core (`src/hooks`)
- `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` — add `visibilidad` field

#### Presentation (`src/components`)
- `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` — add visibility selector with helper text

#### Utilities
- `src/lib/constants.ts` — add `PUBLIC_TENANT_ID` constant

### Step-by-Step Implementation Plan

1. **Types first** — Define `TrainingVisibility` and update all affected interfaces in `entrenamientos.types.ts`.
2. **Constants** — Add `PUBLIC_TENANT_ID` to `src/lib/constants.ts`.
3. **Migration** — Create and apply `20260301000100_entrenamientos_visibilidad.sql` (columns, constraints, indexes, backfill, updated RLS).
4. **Service** — Add `resolveVisiblePara` helper; update `createTrainingSeries`, `updateTrainingSeries`, `updateTrainingInstance`, `generateSeriesInstances`.
5. **Hook** — Add `visibilidad` state (default `'privado'`), setter, validation, and payload integration to `useEntrenamientoForm`.
6. **Component** — Add visibility radio/toggle to `EntrenamientoFormModal` with dynamic helper text; load persisted value on edit.
7. **Smoke test** — Create a public training and verify cross-tenant visibility via `entrenamientos-disponibles` page.

### Affected Systems
- Supabase DB schema and RLS policies
- `entrenamientos` service, hook, types, and form modal
- Application constants (`src/lib/constants.ts`)
