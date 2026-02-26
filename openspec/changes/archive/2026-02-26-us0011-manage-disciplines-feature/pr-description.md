## Summary
Implements US-0011 discipline management for tenant administrators at `/portal/orgs/[tenant_id]/gestion-disciplinas`.

## Scope
- Added `disciplines` feature slice across layers:
  - `src/types/portal/disciplines.types.ts`
  - `src/services/supabase/portal/disciplines.service.ts`
  - `src/hooks/portal/disciplines/useDisciplines.ts`
  - `src/hooks/portal/disciplines/useDisciplineForm.ts`
  - `src/components/portal/disciplines/*`
- Added tenant admin route entrypoint:
  - `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx`
- Added admin menu route entry for disciplines:
  - `src/types/portal.types.ts`
- Added DB policy migration for discipline mutations:
  - `supabase/migrations/20260226000100_disciplinas_admin_mutation_policies.sql`
- Updated docs:
  - `projectspec/03-project-structure.md`
  - `README.md`

## Architecture Decisions Applied
- Maintained page -> component -> hook -> service -> types flow.
- Kept route page as composition-only entrypoint (no direct Supabase usage).
- Enforced tenant-scoped persistence with `.eq('tenant_id', tenantId)` across mutations.
- Mapped DB constraints to user-facing errors:
  - unique `(tenant_id, nombre)` duplicate-name case
  - FK restriction from `entrenamientos_disciplina_id_fkey`

## Migrations
- Added admin-only `insert/update/delete` RLS policies for `public.disciplinas` using `public.get_admin_tenants_for_authenticated_user()`.

## Validation / QA Evidence
- `npm run lint` ✅
- Local migration apply is currently blocked by existing duplicate migration version `20260224000200` in repository migration history; discipline policy migration file is prepared and pending apply after migration-sequence cleanup.
- Manual QA checklist pending in browser (list/create/edit/delete + duplicate/FK flows).

## Rollout / Rollback
- Rollout: apply pending migrations, then deploy app changes.
- Rollback: remove/revert `20260226000100_disciplinas_admin_mutation_policies.sql` and disable discipline mutation actions in UI if DB policy state is inconsistent.
