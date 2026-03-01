## Conventional Commit Message

feat(portal): implement tenant training management with series/instances scope flows

- add entrenamientos feature slice (types, service, hooks, components)
- wire shared tenant route gestion-entrenamientos to EntrenamientosPage
- add month-based calendar/list view with current-month default and month navigation
- implement create/edit/delete scope flows (single|future|series)
- map training service validation/permission/dependency errors to deterministic UI messages
- update README and project structure docs for trainings module

## Pull Request Description

### Summary
Implement US0012 training management for tenant context using the series → instances model, following feature-slice architecture and render-only route composition.

### Scope
- Delivery: `src/app/portal/orgs/[tenant_id]/(shared)/gestion-entrenamientos/page.tsx`
- Presentation: new components under `src/components/portal/entrenamientos/`
- Application: new hooks under `src/hooks/portal/entrenamientos/`
- Infrastructure: `src/services/supabase/portal/entrenamientos.service.ts`
- Domain: `src/types/portal/entrenamientos.types.ts`
- Exports/docs: `src/services/supabase/portal/index.ts`, `README.md`, `projectspec/03-project-structure.md`

### Functional Highlights
- Current-month default calendar range with previous/next month navigation.
- Grouped series table plus instance calendar cards.
- Right-side wizard modal for unique/recurrent creation and edit.
- Scope selector modal for recurring mutations: `single`, `future`, `series`.
- Immediate instance generation for recurrent series creation.

### Validation & Error Handling
- Required-field and schedule validation for form inputs.
- Date-range constraints including 6-month max window.
- Deterministic service error mapping for forbidden/FK/validation conflicts.

### Verification Evidence
- `npm run lint` ✅
- `npm run build` ✅
- Manual QA pending in browser for scoped mutation behaviors and UX flows.

### Known Limitations
- Manual QA checklist remains to be executed end-to-end against real tenant data.
- Trainer option discovery depends on role name match (`entrenador`) in current data model.
