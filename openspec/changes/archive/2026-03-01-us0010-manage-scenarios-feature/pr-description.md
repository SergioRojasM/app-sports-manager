## Summary
Implements US-0010 scenario management for tenant administrators at `/portal/orgs/[tenant_id]/gestion-escenarios`.

## Scope
- Added `scenarios` feature slice across layers:
  - `src/types/portal/scenarios.types.ts`
  - `src/services/supabase/portal/scenarios.service.ts`
  - `src/hooks/portal/scenarios/useScenarios.ts`
  - `src/components/portal/scenarios/*`
- Refactored route entrypoint:
  - `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx`
- Updated service exports and tenant-menu behavior:
  - `src/services/supabase/portal/index.ts`
  - `src/hooks/portal/usePortalNavigation.ts`
  - `src/types/portal.types.ts` (shared items typing fix)
- Documentation updates:
  - `projectspec/03-project-structure.md`
  - `README.md`

## Architecture Decisions Applied
- Maintained page -> component -> hook -> service -> types flow.
- Kept page as composition-only entrypoint (no direct Supabase usage).
- Enforced tenant-scoped persistence on scenario update via `.eq('tenant_id', tenantId)`.
- Limited data scope to `public.escenarios` and `public.horarios_escenarios`.

## Validation / QA Evidence
- `npm run lint` ✅
- `npx tsc --noEmit` ✅ (after clearing stale `.next` artifacts)
- Manual QA checklist pending (route interaction tests in browser).

## Non-goals Confirmed
- No new external dependencies.
- No unrelated portal shell redesign.
- No cross-feature module additions outside scenarios.
