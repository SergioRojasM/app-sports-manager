## Why

Tenant administrators currently do not have a dedicated, architecture-compliant workflow to maintain the discipline catalog inside tenant scope, which blocks consistent setup for downstream training/session flows. This change addresses that gap now by introducing a full CRUD discipline experience aligned with the existing portal patterns and design reference.

## What Changes

- Add a new tenant-admin discipline management page at `/portal/orgs/[tenant_id]/gestion-disciplinas` with table-based view, search/filter, and action controls.
- Introduce create/edit using a right-side modal interaction pattern aligned with the existing scenarios UX and design reference in `projectspec/designs/09_disciplines.html`.
- Implement delete with explicit confirmation and dependency-safe error handling for FK-restricted records.
- Include and document the discipline data model design based on the current SQL definitions in `supabase/migrations`, including tenant scope, constraints, and integrity rules used by CRUD operations.
- Implement the feature using the required layering flow: page -> component -> hook -> service -> types.
- Add a dedicated `disciplines` feature slice across portal presentation, hooks, services, and typed contracts.
- Update role-based tenant navigation requirements so administrators can discover and access the new discipline route.

## Capabilities

### New Capabilities
- `disciplines-management`: Tenant-scoped administrator capability to view, create, edit, and delete disciplines with table UX and right-side modal interactions.

### Modified Capabilities
- `portal-role-navigation`: Extend administrator tenant-scoped navigation requirements to include access to the disciplines management entry and route.

## Impact

- Affected code areas (expected):
  - `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx`
  - `src/components/portal/disciplines/*`
  - `src/hooks/portal/disciplines/*`
  - `src/services/supabase/portal/disciplines.service.ts`
  - `src/services/supabase/portal/index.ts` (exports wiring)
  - `src/types/portal/disciplines.types.ts`
- Affected specs:
  - New: `specs/disciplines-management/spec.md`
  - Delta: `portal-role-navigation`
- Data/API impact:
  - Uses and aligns with the existing `public.disciplinas` model defined in `supabase/migrations`, including unique and FK constraints relevant to create/update/delete behavior.
  - If a model gap is identified during implementation, add a focused migration in `supabase/migrations` to keep schema and feature behavior consistent.
  - No new external API contract required.
- Dependencies/systems:
  - Supabase tenant-scoped CRUD paths, existing portal role-gating and sidebar rendering.

## Non-goals

- Redesign unrelated database modules outside the disciplines and tenant-scoping context.
- Build discipline history/audit timeline or advanced analytics.
- Rework global portal shell architecture outside changes required for navigation linkage.
- Create non-admin discipline workflows in this change.

## Files to Modify or Create

- Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx`
- Create `src/components/portal/disciplines/DisciplinesPage.tsx`
- Create `src/components/portal/disciplines/DisciplinesTable.tsx`
- Create `src/components/portal/disciplines/DisciplineFormModal.tsx`
- Create `src/components/portal/disciplines/DisciplinesHeaderFilters.tsx` (if split is kept)
- Create `src/components/portal/disciplines/index.ts`
- Create `src/hooks/portal/disciplines/useDisciplines.ts`
- Create `src/hooks/portal/disciplines/useDisciplineForm.ts` (optional split)
- Create `src/services/supabase/portal/disciplines.service.ts`
- Modify `src/services/supabase/portal/index.ts` (if needed for exports)
- Create `src/types/portal/disciplines.types.ts`
- Read/align with existing migrations in `supabase/migrations/*.sql`
- Create or modify a migration in `supabase/migrations/*.sql` only if required by validated model gaps
- Modify `README.md` (brief capability note)
- Modify `projectspec/03-project-structure.md` (feature slice examples, if needed)

## Step-by-step Implementation Plan

1. Define the delivery route entrypoint for tenant admin disciplines and keep it as a thin composition page.
2. Analyze `supabase/migrations` to map the current disciplines model (columns, constraints, keys, policies) and confirm the expected behavior contract.
3. Build presentation components for page container, table, filters, and right-side create/edit modal using the provided design direction.
4. Define domain contracts and view models in the disciplines types file.
5. Implement tenant-scoped Supabase service methods for list/create/update/delete with error mapping.
6. Implement hook orchestration for loading, filtering, modal state, selection state, and mutation flows.
7. Wire component -> hook -> service -> types integration and add role-based navigation entry for administrators.
8. Validate loading/empty/error states and dependency-safe delete error behavior.
9. If a validated schema mismatch exists, add a focused migration under `supabase/migrations` and document the reason.
10. Update relevant docs/exports and run lint/type checks for touched files.