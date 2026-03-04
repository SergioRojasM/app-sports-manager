## Why

Users currently have no way to view or edit their own personal information within the platform. The avatar dropdown already links to `/portal/perfil`, but the route resolves to a "Módulo en construcción" stub. This feature replaces that stub with a fully functional, globally accessible profile page that lets any authenticated user manage their identity and sports data.

## What Changes

- **New route** `src/app/portal/perfil/page.tsx` — profile page outside tenant scope, accessible to all authenticated roles.
- **New feature slice** `perfil-usuario` — types, service, hook, and components following the project's hexagonal architecture convention.
- **Service layer** that reads/writes both `public.usuarios` (personal info) and `public.perfil_deportivo` (sports data) in a single page load.
- **Editable form** with dirty-tracking, inline validation, cancel/revert, and success feedback; email field is read-only.
- **Avatar section** with current photo or initials fallback and a non-functional upload button placeholder ("Próximamente").
- **Remove stub page** at `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx` (tenant-scoped placeholder no longer needed).
- **RLS policies** — verify or add UPDATE policy on `usuarios`, and INSERT/UPDATE/SELECT policies on `perfil_deportivo` scoped to `auth.uid()`.
- **`projectspec/03-project-structure.md`** updated with new perfil feature slice directories.

## Capabilities

### New Capabilities

- `user-profile-management`: Allows any authenticated user to view and edit their personal profile (nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, rh) and sports profile (peso_kg, altura_cm) from a globally accessible portal page at `/portal/perfil`. Includes avatar display with upload placeholder, dirty-state tracking, validation, and persistence to `public.usuarios` + `public.perfil_deportivo`.

### Modified Capabilities

_(none — navigation link already exists; no existing spec-level requirements are changing)_

## Impact

- **New files**: `src/types/portal/perfil.types.ts`, `src/services/supabase/portal/perfil.service.ts`, `src/hooks/portal/perfil/usePerfil.ts`, `src/components/portal/perfil/` (PerfilPage, PerfilHeader, PerfilPersonalForm, PerfilDeportivoForm, index.ts), `src/app/portal/perfil/page.tsx`.
- **Removed file**: `src/app/portal/orgs/[tenant_id]/(shared)/perfil/page.tsx`.
- **Modified file**: `projectspec/03-project-structure.md`.
- **Database**: No schema changes needed — `public.usuarios` and `public.perfil_deportivo` already exist. Only RLS policies may need to be added via a new migration.
- **Dependencies**: Supabase browser client (`createBrowserClient`), existing auth session hook (`useAuth` / Supabase `getUser`), project Tailwind design tokens.
- **No breaking changes** to existing routes or components.
