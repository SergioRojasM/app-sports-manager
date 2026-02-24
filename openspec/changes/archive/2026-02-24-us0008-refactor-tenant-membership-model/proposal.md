## Why

The current model stores `tenant_id` and `rol_id` directly on `usuarios`, which prevents true multi-tenant access and makes role context ambiguous outside a single organization. This change is needed now to align domain behavior with the target data model and to safely onboard all new users into a deterministic default tenant context.

## What Changes

- Refactor tenant-role ownership from `usuarios` to membership records in `miembros_tenant`.
- Enforce allowed membership roles as `administrador`, `entrenador`, and `usuario`.
- Guarantee default `public` tenant and default membership (`public` + `usuario`) for newly created users. through a function and trigger in supabase inside of migration supabase/migrations/20260223000100_seed_inicial.sql
- Update portal bootstrap/profile resolution to derive role and tenant context from memberships.
- Keep `/portal` welcome + header, but constrain navigation to one item: `Organizaciones Disponibles`.
- **BREAKING**: Any logic depending on direct `usuarios.tenant_id` / `usuarios.rol_id` as the source of truth must migrate to membership-based resolution.

## Capabilities

### New Capabilities
- `tenant-membership-model`: Multi-tenant membership source of truth, default public membership provisioning, and membership-scoped role resolution.

### Modified Capabilities
- `portal-role-navigation`: Replace role-derived menu behavior for this story with a single visible option (`Organizaciones Disponibles`) and membership-backed context resolution.
- `organization-view`: Resolve tenant context from membership relation instead of direct user tenant columns.
- `signup-page`: Extend signup outcomes to ensure default tenant membership provisioning as part of user onboarding.

## Impact

- Affected systems: Supabase schema/seeds/triggers, portal bootstrap/service contracts, portal navigation rendering.
- Primary files likely touched:
  - `supabase/migrations/20260221000100_migracion_inicial_bd.sql`
  - `supabase/migrations/20260223000100_seed_inicial.sql`
  - `src/services/supabase/portal.ts`
  - `src/services/supabase/portal/index.ts`
  - `src/services/supabase/portal/organization-view.service.ts`
  - `src/app/portal/bootstrap/route.ts`
  - `src/components/portal/PortalNavMenu.tsx`
  - `src/types/portal.types.ts`
- New/updated spec artifacts expected:
  - `openspec/changes/us0008-refactor-tenant-membership-model/specs/tenant-membership-model/spec.md`
  - Delta specs for modified capabilities listed above.

## Non-goals

- Building tenant switching UX for selecting among multiple memberships.
- Redesigning portal header, welcome copy, or global visual system.
- Introducing new public APIs outside existing app routes and Supabase contracts.

## Files to be Modified or Created

- Create: `openspec/changes/us0008-refactor-tenant-membership-model/proposal.md`
- Create later in this change: capability specs, `design.md`, and `tasks.md`.
- Modify later in implementation: migration, seed, portal services, portal bootstrap, menu component, portal types.

## Step-by-step Implementation Plan

1. **Page**: keep `/portal` shell and welcome page behavior; limit visible nav to one option.
2. **Component**: adjust shared portal nav/menu components to render only required item for this scope.
3. **Hook**: keep navigation state coherent with simplified menu.
4. **Service**: migrate profile/tenant-role resolution to membership joins and deterministic selection.
5. **Types**: update role and profile contracts to membership-backed tenant context.
6. **Database**: apply schema/seed updates for membership model and default provisioning (`public` + `usuario`).
7. Validate signup/login/bootstrap flow and tenant-scoped organization behavior end-to-end.
