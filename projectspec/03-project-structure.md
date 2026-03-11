# Project Structure

Following structure reflects the current implementation and the target scalable pattern based on hexagonal architecture + feature slices.

## Directory Structure

```text
/

│
├── src/
│   ├── app/                              # Inbound adapters (routing / delivery)
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Landing/home
│   │   ├── globals.css                   # Global styles & Tailwind imports
│   │   ├── auth/                         # Authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   ├── dashboard/                    # Legacy redirect entry
│   │   └── portal/                       # Main post-login bounded context
│   │       ├── layout.tsx                # Shared portal shell (header + nav)
│   │       ├── loading.tsx
│   │       ├── page.tsx                  # Redirects to /portal/inicio
│   │       ├── bootstrap/route.ts        # Post-login bootstrap (default → /portal/inicio)
│   │       ├── inicio/                   # User home dashboard (cross-tenant overview)
│   │       │   ├── page.tsx
│   │       │   └── loading.tsx
│   │       ├── perfil/page.tsx           # User profile (global, not tenant-scoped)
│   │       └── orgs/
│   │           ├── page.tsx              # Organizations discovery (all authenticated users)
│   │           └── [tenant_id]/
│   │               ├── layout.tsx        # Membership + role gate for tenant entry
│   │               ├── page.tsx          # Redirect to tenant role landing
│   │               ├── (administrador)/
│   │               │   ├── gestion-disciplinas/page.tsx
│   │               │   ├── gestion-equipo/page.tsx
│   │               │   ├── gestion-escenarios/page.tsx
│   │               │   ├── gestion-organizacion/page.tsx
│   │               │   └── gestion-suscripciones/page.tsx
│   │               ├── (atleta)/
│   │               │   └── entrenamientos-disponibles/page.tsx
│   │               ├── (entrenador)/
│   │               │   └── atletas/page.tsx
│   │               └── (shared)/
│   │                   ├── gestion-entrenamientos/page.tsx
│   │                   └── gestion-planes/page.tsx
│   │
│   ├── components/                       # Presentation layer
│   │   ├── auth/
│   │   ├── landing/
│   │   ├── portal/
│   │   │   ├── PortalHeader.tsx          # Shared portal shell components
│   │   │   ├── PortalNavMenu.tsx
│   │   │   ├── PortalSidebar.tsx
│   │   │   ├── RoleBasedMenu.tsx
│   │   │   ├── UserAvatarMenu.tsx
│   │   │   ├── inicio/                   # Feature slice (portal/inicio — user home dashboard)
│   │   │   │   ├── InicioPage.tsx
│   │   │   │   ├── InicioStatsCards.tsx
│   │   │   │   ├── InicioFeaturedTraining.tsx
│   │   │   │   ├── InicioProximosEntrenamientos.tsx
│   │   │   │   ├── InicioSuscripciones.tsx  # "use client" — filter chips
│   │   │   │   ├── InicioOrganizaciones.tsx
│   │   │   │   ├── InicioQuickActions.tsx
│   │   │   │   ├── InicioPagosPendientesAlert.tsx
│   │   │   │   └── index.ts
│   │   │   ├── tenant/                   # Feature slice (portal/tenant)
│   │   │   │   ├── TenantIdentityCard.tsx
│   │   │   │   └── TenantContactCard.tsx
│   │   │   └── scenarios/                # Feature slice (portal/scenarios)
│   │   │       ├── ScenariosPage.tsx
│   │   │       ├── ScenarioCard.tsx
│   │   │       └── ScenarioFormModal.tsx
│   │   │   └── disciplines/              # Feature slice (portal/disciplines)
│   │   │       ├── DisciplinesPage.tsx
│   │   │       ├── DisciplinesTable.tsx
│   │   │       ├── DisciplineFormModal.tsx
│   │   │       ├── NivelesDisciplinaPanel.tsx   # Collapsible panel per discipline row for level CRUD
│   │   │       └── NivelDisciplinaFormModal.tsx  # Right-side modal for create/edit level
│   │   │   └── entrenamientos/           # Feature slice (portal/entrenamientos)
│   │   │       ├── EntrenamientosPage.tsx
│   │   │       ├── EntrenamientosCalendar.tsx   # Dot colors driven by visibilidad; includes public/private legend
│   │   │       ├── EntrenamientoFormModal.tsx   # Includes visibilidad radio group (publico/privado, default 'privado')
│   │   │       ├── EntrenamientoCategoriasSection.tsx  # Optional per-level capacity allocation step
│   │   │       ├── EntrenamientosList.tsx       # Renders VisibilidadBadge per row
│   │   │       └── reservas/              # Sub-feature slice (booking)
│   │   │           ├── ReservasPanel.tsx
│   │   │           ├── ReservaFormModal.tsx
│   │   │           ├── ReservaStatusBadge.tsx
│   │   │           └── index.ts
│   │   │   └── planes/                   # Feature slice (portal/planes)
│   │   │       ├── PlanesPage.tsx
│   │   │       ├── PlanesTable.tsx
│   │   │       ├── PlanesHeaderFilters.tsx
│   │   │       ├── PlanFormModal.tsx
│   │   │       ├── PlanesViewPage.tsx
│   │   │       ├── PlanesRolePage.tsx
│   │   │       ├── SuscripcionModal.tsx
│   │   │       └── index.ts
│   │   │   └── gestion-equipo/            # Feature slice (portal/gestion-equipo)
│   │   │       ├── EquipoPage.tsx
│   │   │       ├── EquipoTable.tsx
│   │   │       ├── EquipoStatsCards.tsx
│   │   │       ├── EquipoHeaderFilters.tsx
│   │   │       ├── EquipoStatusBadge.tsx
│   │   │       └── AsignarNivelModal.tsx        # Per-discipline level assignment for athletes
│   │   │   └── gestion-suscripciones/     # Feature slice (portal/gestion-suscripciones)
│   │   │       ├── GestionSuscripcionesPage.tsx
│   │   │       ├── SuscripcionesTable.tsx
│   │   │       ├── SuscripcionesStatsCards.tsx
│   │   │       ├── SuscripcionesHeaderFilters.tsx
│   │   │       ├── SuscripcionEstadoBadge.tsx
│   │   │       ├── PagoEstadoBadge.tsx
│   │   │       ├── ValidarPagoModal.tsx
│   │   │       ├── ValidarSuscripcionModal.tsx
│   │   │       └── index.ts
│   │   │   └── perfil/                    # Feature slice (portal/perfil — user profile)
│   │   │       ├── PerfilPage.tsx
│   │   │       ├── PerfilHeader.tsx
│   │   │       ├── PerfilPersonalForm.tsx
│   │   │       ├── PerfilDeportivoForm.tsx
│   │   │       └── index.ts
│   │   └── ui/
│   │
│   ├── hooks/                            # Application core (use cases)
│   │   ├── auth/
│   │   └── portal/
│   │       ├── usePortalNavigation.ts    # Shared portal logic
│   │       ├── tenant/
│   │       │   └── useTenantView.ts
│   │       └── scenarios/
│   │           └── useScenarios.ts
│   │       └── disciplines/
│   │           ├── useDisciplines.ts
│   │           └── useDisciplineForm.ts
│   │       └── nivel-disciplina/
│   │           └── useNivelesDisciplina.ts    # List + CRUD state for discipline levels
│   │       └── entrenamientos/
│   │           ├── useEntrenamientos.ts
│   │           ├── useEntrenamientoForm.ts
│   │           ├── useEntrenamientoScope.ts
│   │           ├── useEntrenamientoCategorias.ts  # Fetch categories for a selected training instance
│   │           └── reservas/              # Sub-feature hooks (booking)
│   │               ├── useReservas.ts     # Loads reservas, capacidad, categorias; exposes refetchCategorias
│   │               └── useReservaForm.ts  # Form state with entrenamiento_categoria_id, auto-select via getAtletaNivelId
│   │       └── planes/
│   │           ├── usePlanes.ts
│   │           ├── usePlanForm.ts
│   │           ├── usePlanesView.ts
│   │           └── useSuscripcion.ts
│   │       └── gestion-equipo/
│   │           ├── useEquipo.ts
│   │           └── useUsuarioNivelDisciplina.ts  # Fetch + upsert athlete discipline levels
│   │       └── gestion-suscripciones/
│   │           ├── useGestionSuscripciones.ts
│   │           ├── useValidarPago.ts
│   │           └── useValidarSuscripcion.ts
│   │       └── perfil/
│   │           └── usePerfil.ts
│   │
│   ├── services/                         # Outbound adapters (API)
│   │   └── supabase/
│   │       ├── client.ts                 # Browser client
│   │       ├── server.ts                 # Server client
│   │       ├── middleware.ts             # Auth middleware helpers
│   │       ├── auth.ts
│   │       ├── portal/                   # Portal bounded-context services
│   │       │   ├── index.ts
│   │       │   ├── tenant.service.ts
│   │       │   └── scenarios.service.ts
│   │       │   └── disciplines.service.ts
│   │       │   └── entrenamientos.service.ts
│   │       │   └── reservas.service.ts   # CRUD + getCategoriasConDisponibilidad, getAtletaNivelId, per-category capacity check
│   │       │   └── planes.service.ts
│   │       │   └── suscripciones.service.ts
│   │       │   └── pagos.service.ts
│   │       │   └── equipo.service.ts
│   │       │   └── nivel-disciplina.service.ts         # CRUD for nivel_disciplina table
│   │       │   └── usuario-nivel-disciplina.service.ts # Upsert for usuario_nivel_disciplina
│   │       │   └── entrenamiento-categorias.service.ts # Create/sync/delete for entrenamiento_categorias
│   │       │   └── gestion-suscripciones.service.ts
│   │       │   └── perfil.service.ts
│   │       │   └── inicio.service.ts      # Server-side cross-tenant dashboard queries
│   │       └── portal.ts                 # Transitional/legacy entrypoint
│   │
│   ├── types/                            # Domain & contracts
│   │   ├── auth.types.ts
│   │   ├── portal.types.ts               # Shared portal contracts (INICIO_MENU_ITEM, resolvePortalMenu, etc.)
│   │   └── portal/
│   │       ├── tenant.types.ts
│   │       └── scenarios.types.ts
│   │       └── disciplines.types.ts
│   │       └── entrenamientos.types.ts
│   │       └── reservas.types.ts         # ReservaView, CreateReservaInput, CategoriaDisponibilidad (level availability with cupos)
│   │       └── planes.types.ts
│   │       └── suscripciones.types.ts
│   │       └── pagos.types.ts
│   │       └── equipo.types.ts
│   │       └── nivel-disciplina.types.ts      # NivelDisciplina, form values, service error types
│   │       └── entrenamiento-categorias.types.ts # EntrenamientoCategoria, input, view models
│   │       └── gestion-suscripciones.types.ts
│   │       └── perfil.types.ts
│   │       └── inicio.types.ts            # Dashboard view model interfaces
│   │
│   └── lib/                              # Pure utilities
│       ├── utils.ts
       ├── constants.ts                      # PUBLIC_TENANT_ID: well-known UUID for the system-level public tenant (used by resolveVisiblePara in entrenamientos.service.ts)
│       └── validators.ts
│
├── public/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── openspec/                    # OpenSpec configuration
│   ├── config.yaml
│   ├── custom-specs/
│   │   ├── project-init.md      # Initialization guide
│   │   ├── project-structure.md # This file
│   │   ├── supabase-setup.md    # Supabase configuration
│   │   └── tech-spec.md         # Technology specifications
│   └── specs/
│
├── proxy.ts                     # Next.js proxy (required for Supabase)
├── .env.local                   # Environment variables (not committed)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.mjs            # ESLint configuration
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── package.json                 # Dependencies
```

## Hexagonal Architecture Layers

### Layer Overview

| Layer | Directory | Responsibility | Hexagonal Role | Example |
|-------|-----------|---------------|----------------|---------|
| **Delivery** | `app/` | HTTP routing & request handling | Inbound adapters | Pages, API routes |
| **Presentation** | `components/` | UI rendering & user interaction | Inbound adapters | React components |
| **Application** | `hooks/` | Business logic & use cases | Application core | Custom hooks |
| **Infrastructure** | `services/` | External API & database access | Outbound adapters | Supabase clients |
| **Domain** | `types/` | Data contracts & interfaces | Ports | TypeScript types |
| **Utilities** | `lib/` | Pure helper functions | Support | Utils, constants |

## Feature Slice Convention (Current Standard)

For all new portal features, use this structure consistently:

```text
app/portal/orgs/[tenant_id]/(role)/<route>/page.tsx # Tenant-scoped route entrypoint
components/portal/<feature-name>/*              # UI/presentation
hooks/portal/<feature-name>/*                   # Use-case orchestration
services/supabase/portal/<feature-name>.service.ts # Data access
types/portal/<feature-name>.types.ts            # Contracts and view models
```

Rules:
- Keep shell/shared portal components outside feature folders (`PortalHeader`, `PortalNavMenu`, etc.).
- Never call Supabase directly from page/components.
- Feature folder names use kebab-case (e.g., `organization-view`, `training-management`).

### Data Flow

```
User Action
    ↓
Component (presentation)
    ↓
Hook (business logic)
    ↓
Service (data access)
    ↓
Supabase (database)
```

## File Naming Conventions

### Components
```
PascalCase.tsx
Examples:
  - Button.tsx
  - EventList.tsx
  - UserProfile.tsx
```

### Hooks
```
useCamelCase.ts
Examples:
  - useAuth.ts
  - useEvents.ts
  - useEventForm.ts
```

### Services
```
camelCaseService.ts
Examples:
  - authService.ts
  - eventsService.ts
  - uploadService.ts
```

### Types
```
camelCase.types.ts or PascalCase (for interfaces)
Examples:
  - database.types.ts
  - events.types.ts
  - interface User {}
  - type Event = {}
```

### Constants
```
UPPER_SNAKE_CASE in constants.ts
Examples:
  - API_BASE_URL
  - MAX_FILE_SIZE
  - DEFAULT_PAGE_SIZE
```

## Architecture Rules

### Hard Rules (MUST follow)

1. **No Direct Database Calls from Components**
   - ❌ Components/pages calling Supabase directly
   - ✅ Components → Hooks → Services → Supabase

2. **Separation of Concerns**
   - `components/`: Only UI rendering, no business logic
   - `hooks/`: Business logic, orchestration
   - `services/`: External API calls only

3. **TypeScript Mandatory**
   - All new code must be TypeScript
   - No `any` types (use `unknown` if necessary)
   - Proper type definitions for all functions

4. **Server vs Client Components**
   - Use Server Components by default
   - Only add `'use client'` when necessary
   - See [Supabase Setup](supabase-setup.md) for client usage

### Best Practices

1. **Co-location by feature slice**
  - Keep each feature grouped across layers using the same feature name.
  - Example: `components/portal/scenarios/`, `hooks/portal/scenarios/`, `services/supabase/portal/scenarios.service.ts`, `types/portal/scenarios.types.ts`

2. **Single Responsibility**
   - One component = one responsibility
   - One hook = one use case
   - One service = one data source

3. **Composition Over Inheritance**
   - Use functional components only
   - Prefer composition and custom hooks

4. **Error Handling**
   - Always handle errors in services
   - Show user-friendly messages in components
   - Use error boundaries in App Router

## Example Implementation

### Feature: Portal Tenant + Scenarios + Disciplines

```
src/
├── app/portal/orgs/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-escenarios/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-disciplinas/page.tsx
├── app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx
├── components/portal/tenant/
│   ├── TenantIdentityCard.tsx
│   └── TenantContactCard.tsx
├── components/portal/scenarios/
│   ├── ScenariosPage.tsx
│   ├── ScenarioCard.tsx
│   └── ScenarioFormModal.tsx
├── components/portal/disciplines/
│   ├── DisciplinesPage.tsx
│   ├── DisciplinesTable.tsx
│   └── DisciplineFormModal.tsx
├── hooks/portal/tenant/
│   └── useTenantView.ts
├── hooks/portal/scenarios/
│   └── useScenarios.ts
├── hooks/portal/disciplines/
│   ├── useDisciplines.ts
│   └── useDisciplineForm.ts
├── services/supabase/portal/
│   ├── tenant.service.ts
│   └── scenarios.service.ts
│   └── disciplines.service.ts
└── types/portal/
  ├── tenant.types.ts
  └── scenarios.types.ts
  └── disciplines.types.ts
```

### Code Flow Example

```typescript
// 1. Component (presentation)
// components/portal/organization-view/OrganizationInfoCards.tsx
'use client'

import { useOrganizationView } from '@/hooks/portal/organization-view/useOrganizationView'
import { OrganizationIdentityCard } from './OrganizationIdentityCard'
import { OrganizationContactCard } from './OrganizationContactCard'

export function OrganizationInfoCards() {
  const { data, loading, error } = useOrganizationView()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>Empty state</div>
  
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <OrganizationIdentityCard identity={data.identity} context={data.context} />
      <div className="lg:col-span-2">
        <OrganizationContactCard contact={data.contact} social={data.social} />
      </div>
    </div>
  )
}

// 2. Hook (business logic)
// hooks/portal/organization-view/useOrganizationView.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/services/supabase/client'
import { organizationViewService } from '@/services/supabase/portal/organization-view.service'
import { OrganizationViewData } from '@/types/portal/organization-view.types'

export function useOrganizationView() {
  const [data, setData] = useState<OrganizationViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error('No active session')
        const payload = await organizationViewService.fetchOrganizationViewData(supabase, auth.user.id)
        setData(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  return { data, loading, error }
}

// 3. Service (data access)
// services/supabase/portal/organization-view.service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { OrganizationViewData } from '@/types/portal/organization-view.types'

export const organizationViewService = {
  async fetchOrganizationViewData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<OrganizationViewData> {
    // Query tenant + coach + location and map to view model
    return {} as OrganizationViewData
  }
}

// 4. Types (contracts)
// types/portal/organization-view.types.ts
export type OrganizationViewData = {
  identity: {
    name: string
    description: string | null
    foundedAt: string | null
  }
  context: {
    headCoachName: string | null
    location: string | null
  }
  contact: {
    email: string | null
    phone: string | null
    websiteUrl: string | null
  }
  social: {
    instagramUrl: string | null
    facebookUrl: string | null
    xUrl: string | null
  }
}
```

## Environment Variables

Required variables in `.env.local`:

```env
# Supabase Configuration (see supabase-setup.md)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics, monitoring, etc.
NEXT_PUBLIC_GA_ID=your-ga-id
```

## Testing Strategy (Future)

```
src/
├── components/
│   └── __tests__/
│       └── EventList.test.tsx
├── hooks/
│   └── __tests__/
│       └── useEvents.test.ts
└── services/
    └── __tests__/
        └── eventsService.test.ts
```

## Related Documentation

- [Project Initialization](project-init.md) - Setup instructions
- [Supabase Setup](supabase-setup.md) - Complete Supabase configuration
- [Tech Spec](tech-spec.md) - Technology stack details

## Code Style Rules

### Language
- All code, comments, and documentation must be in **English**
- User-facing messages can be localized

### General
- Use functional components only (no class components)
- Prefer `const` over `let`, never use `var`
- Use arrow functions for callbacks
- Always add semicolons

### Imports
```typescript
// 1. External libraries
import { useState } from 'react'

// 2. Internal absolute imports
import { Button } from '@/components/common/Button'

// 3. Relative imports
import { EventCard } from './EventCard'

// 4. Types (at the end)
import type { Event } from '@/types/events.types'
```

### Component Structure
```typescript
'use client' // if needed

// Imports
import { useState } from 'react'
import type { Props } from './types'

// Types/Interfaces
interface ComponentProps {
  // ...
}

// Component
export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState()

  // Handlers
  const handleClick = () => {
    // ...
  }

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## Common Patterns

### Loading States
```typescript
if (loading) return <Loading />
if (error) return <ErrorMessage error={error} />
if (!data) return <EmptyState />

return <DataDisplay data={data} />
```

### Error Handling
```typescript
try {
  const result = await service.someOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw error instanceof Error ? error : new Error('Unknown error')
}
```

### Async Operations
```typescript
// In hooks
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const doSomething = async () => {
  setLoading(true)
  setError(null)
  try {
    await service.operation()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error occurred')
  } finally {
    setLoading(false)
  }
}
```

## Quick Reference for new feature

| Task | Location | Example |
|------|----------|---------|
| Add route entry | `src/app/portal/(role)/{route}/page.tsx` | `src/app/portal/(administrador)/gestion-organizacion/page.tsx` |
| Add UI component | `src/components/portal/{feature-name}/` | `src/components/portal/organization-view/OrganizationIdentityCard.tsx` |
| Add business logic | `src/hooks/portal/{feature-name}/` | `src/hooks/portal/organization-view/useOrganizationView.ts` |
| Add data access | `src/services/supabase/portal/{feature-name}.service.ts` | `src/services/supabase/portal/organization-view.service.ts` |
| Add contracts | `src/types/portal/{feature-name}.types.ts` | `src/types/portal/organization-view.types.ts` |

---

**Note**: This structure follows hexagonal architecture principles to maintain clean separation of concerns and testability. 