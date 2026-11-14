# Project Structure — {{APP_NAME}}

{{APP_DESCRIPTION}}

The structure below is the target pattern for this application: **hexagonal architecture + feature slices**. It is the source of truth for every change; update it whenever an implementation adds or moves routes, features, layers or conventions.

## Directory Structure

```text
/
├── DESIGN.md                             # UI design guide: tokens, page skeleton, component kit
├── middleware.ts                         # Session refresh + protected-path redirect
├── next.config.ts
├── tailwind.config.ts
├── openspec/                             # Spec-driven workflow (specs, changes, config.yaml)
├── projectspec/                          # Specs, user stories, designs
│   ├── 01-project-tech-stack.md
│   ├── 02-project-init.md
│   ├── 03-project-structure.md           # This file
│   ├── 04-supabase-setup.md
│   ├── userstory/                        # us{NNNN}-{short-description}.md
│   └── designs/                          # Sketches, .pen or HTML references
├── supabase/
│   ├── config.toml
│   └── migrations/                       # {timestamp}_{name}.sql — applied locally only
├── public/
└── src/
    ├── app/                              # Inbound adapters (routing / delivery)
    │   ├── layout.tsx                    # Root layout with providers
    │   ├── page.tsx                      # Landing/home
    │   ├── globals.css                   # Global styles, Tailwind imports, design tokens
    │   ├── api/                          # Privileged route handlers (server-only; the ONLY place the service-role client is used)
    │   ├── auth/                         # Authentication routes
    │   │   ├── login/page.tsx
    │   │   ├── signup/page.tsx
    │   │   ├── callback/route.ts
    │   │   ├── forgot-password/page.tsx
    │   │   └── update-password/page.tsx
    │   └── {{AREA}}/                     # Main post-login bounded context
    │       ├── layout.tsx                # Shared shell (header + navigation) and auth gate
    │       ├── loading.tsx
    │       ├── page.tsx
    │       └── ({{ROLE}})/               # One route group per role, each with a role-guard layout
    │           ├── layout.tsx
    │           └── <route>/page.tsx      # Route entrypoint: renders one feature page component
    ├── components/                       # Presentation
    │   ├── ui/                           # Design-system kit shared by every feature
    │   ├── auth/
    │   ├── landing/
    │   └── {{AREA}}/
    │       ├── <ShellComponent>.tsx      # Shared shell components (header, sidebar…) stay outside feature folders
    │       └── <feature-name>/           # Feature UI
    ├── hooks/                            # Application (use cases)
    │   ├── auth/useAuth.ts
    │   └── {{AREA}}/<feature-name>/
    ├── services/                         # Infrastructure (outbound adapters)
    │   └── supabase/
    │       ├── client.ts                 # Browser client
    │       ├── server.ts                 # Server client (cookies)
    │       ├── DESIGN.md                             # UI design guide: tokens, page skeleton, component kit
├── middleware.ts             # updateSession()
    │       ├── auth.ts
    │       └── {{AREA}}/<feature-name>.service.ts
    ├── types/                            # Domain contracts (ports)
    │   ├── auth.types.ts
    │   └── {{AREA}}/<feature-name>.types.ts
    └── lib/                              # Pure helpers and constants (no I/O, no React)
```

## Roles

| Role | Description | Landing route |
|------|-------------|---------------|
| `{{ROLE}}` | {{ROLE_DESCRIPTION}} | `/{{AREA}}/...` |

## Hexagonal Architecture Layers

### Layer Overview

| Layer | Directory | Responsibility | Hexagonal Role | Example |
|-------|-----------|---------------|----------------|---------|
| **Delivery** | `app/` | HTTP routing & request handling | Inbound adapters | Pages, layouts, route handlers |
| **Presentation** | `components/` | UI rendering & user interaction | Inbound adapters | React components |
| **Application** | `hooks/` | Business logic & use cases | Application core | Custom hooks |
| **Infrastructure** | `services/` | External API & database access | Outbound adapters | Supabase clients, feature services |
| **Domain** | `types/` | Data contracts & interfaces | Ports | TypeScript types |
| **Utilities** | `lib/` | Pure helper functions | Support | Utils, constants |

### Dependency Direction

Dependencies point inward only. A layer may import from the layers to its right, never from the ones to its left:

```
app → components → hooks → services → types
                                  lib ↗ (importable from any layer; imports only types)
```

| Layer | May import | Must NOT import |
|-------|-----------|-----------------|
| `app/` | components, hooks (server-side helpers), services (server client in layouts/route handlers), types, lib | — |
| `components/` | components, hooks, types, lib | services, Supabase SDK |
| `hooks/` | services, types, lib, other hooks | components, `app/` |
| `services/` | types, lib, SDKs | hooks, components, `app/`, React |
| `types/` | other types | everything else |
| `lib/` | types | services, hooks, components, React |

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

## Feature Slice Convention

Every feature is a vertical slice that uses the **same feature name** in every layer:

```text
app/{{AREA}}/({{ROLE}})/<route>/page.tsx            # Route entrypoint
components/{{AREA}}/<feature-name>/*               # UI/presentation
hooks/{{AREA}}/<feature-name>/*                    # Use-case orchestration
services/supabase/{{AREA}}/<feature-name>.service.ts # Data access
types/{{AREA}}/<feature-name>.types.ts             # Contracts and view models
```

Rules:
- Feature folder names use kebab-case (e.g., `order-management`).
- A page file only composes: it renders one feature page component (in `Suspense` when it reads search params) and holds no logic.
- Keep shell/shared components outside feature folders.
- Never call Supabase directly from pages or components.
- A feature never imports another feature's components or hooks. Shared UI goes to `components/ui/`, shared logic to `lib/`, shared contracts to `types/`.
- Implementation order for any change: **page → component → hook → service → types**.

## Features

| Feature | Route | Roles | Tables |
|---------|-------|-------|--------|
| `<feature-name>` | `/{{AREA}}/<route>` | `{{ROLE}}` | `public.<table>` |

## File Naming Conventions

| Kind | Pattern | Examples |
|------|---------|----------|
| Components | `PascalCase.tsx` | `OrdersPage.tsx`, `OrderFormModal.tsx` |
| Hooks | `useCamelCase.ts` | `useOrders.ts`, `useOrderForm.ts` |
| Services | `<feature-name>.service.ts` | `orders.service.ts` |
| Types | `<feature-name>.types.ts` | `orders.types.ts` |
| Constants | `UPPER_SNAKE_CASE` in `constants.ts` | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` |
| Migrations | `{YYYYMMDDHHMMSS}_{snake_case}.sql` | `20260101000100_create_orders.sql` |
| User stories | `us{NNNN}-{short-description}.md` | `us0001-create-landing-page.md` |

## Architecture Rules

### Hard Rules (MUST follow)

1. **No Direct Database Calls from Components**
   - ❌ Components/pages calling Supabase directly
   - ✅ Components → Hooks → Services → Supabase

2. **Separation of Concerns**
   - `components/`: Only UI rendering, no business logic
   - `hooks/`: Business logic, orchestration
   - `services/`: External API calls only; receive the Supabase client as a parameter

3. **TypeScript Mandatory**
   - All new code must be TypeScript
   - No `any` types (use `unknown` if necessary)
   - Proper type definitions for all functions

4. **Server vs Client Components**
   - Use Server Components by default
   - Only add `'use client'` when necessary
   - See [Supabase Setup](04-supabase-setup.md) for client usage

5. **Security**
   - Every table has RLS enabled with explicit policies; the UI role guard is never the only protection
   - The service-role client is used only in `src/app/api/` route handlers
   - Secrets never use the `NEXT_PUBLIC_` prefix

6. **Database changes**
   - Only through files in `supabase/migrations/`
   - Applied to the local stack only; never pushed to the remote project from a development session

### Best Practices

1. **Co-location by feature slice** — keep each feature grouped across layers using the same feature name.
2. **Single Responsibility** — one component = one responsibility, one hook = one use case, one service = one data source.
3. **Composition Over Inheritance** — functional components only; prefer composition and custom hooks.
4. **Error Handling** — handle errors in services, show user-friendly messages in components, use error boundaries in the App Router.

## Example Implementation

### Feature: `orders`

```
src/
├── app/{{AREA}}/({{ROLE}})/orders/page.tsx
├── components/{{AREA}}/orders/
│   ├── OrdersPage.tsx
│   ├── OrdersTable.tsx
│   └── OrderFormModal.tsx
├── hooks/{{AREA}}/orders/
│   ├── useOrders.ts
│   └── useOrderForm.ts
├── services/supabase/{{AREA}}/orders.service.ts
└── types/{{AREA}}/orders.types.ts
```

### Code Flow Example

```typescript
// 1. Page (delivery)
// app/{{AREA}}/({{ROLE}})/orders/page.tsx
import { OrdersPage } from '@/components/{{AREA}}/orders/OrdersPage'

export default function Page() {
  return <OrdersPage />
}

// 2. Component (presentation)
// components/{{AREA}}/orders/OrdersPage.tsx
'use client'

import { useOrders } from '@/hooks/{{AREA}}/orders/useOrders'
import { OrdersTable } from './OrdersTable'

export function OrdersPage() {
  const { data, loading, error } = useOrders()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data.length) return <div>Empty state</div>

  return <OrdersTable orders={data} />
}

// 3. Hook (business logic)
// hooks/{{AREA}}/orders/useOrders.ts
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/services/supabase/client'
import { ordersService } from '@/services/supabase/{{AREA}}/orders.service'
import type { Order } from '@/types/{{AREA}}/orders.types'

export function useOrders() {
  const [data, setData] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function load() {
      try {
        setData(await ordersService.fetchOrders(supabase))
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

// 4. Service (data access)
// services/supabase/{{AREA}}/orders.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order } from '@/types/{{AREA}}/orders.types'

export const ordersService = {
  async fetchOrders(supabase: SupabaseClient): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      total: row.total,
      createdAt: row.created_at,
    }))
  },
}

// 5. Types (contracts)
// types/{{AREA}}/orders.types.ts
export type OrderStatus = 'pending' | 'paid' | 'cancelled'

export type Order = {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
}
```

## Database Functions & Scheduled Jobs

Document here every `SECURITY DEFINER` function, trigger and `pg_cron` job as they are added: name, purpose, caller and the user story that introduced it.

## Environment Variables

```env
# Supabase Configuration (see 04-supabase-setup.md)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only — NEVER prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=http://localhost:3000
```

## Testing Strategy

Tests are co-located per layer in `__tests__/` folders:

```
src/
├── components/{{AREA}}/<feature-name>/__tests__/OrdersTable.test.tsx
├── hooks/{{AREA}}/<feature-name>/__tests__/useOrders.test.ts
└── services/supabase/{{AREA}}/__tests__/orders.service.test.ts
```

## Visual Design System

The UI design guide lives in `DESIGN.md` at the project root (design source, tokens, fonts, radii, page skeleton and the shared kit in `components/ui/`). Summarize here the design source, the token prefix and the fonts once it exists.

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
import { Button } from '@/components/ui'

// 3. Relative imports
import { OrderCard } from './OrderCard'

// 4. Types (at the end)
import type { Order } from '@/types/{{AREA}}/orders.types'
```

### Component Structure
```typescript
'use client' // if needed

// Imports
import { useState } from 'react'

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
| Add route entry | `src/app/{{AREA}}/({{ROLE}})/{route}/page.tsx` | `src/app/{{AREA}}/({{ROLE}})/orders/page.tsx` |
| Add UI component | `src/components/{{AREA}}/{feature-name}/` | `src/components/{{AREA}}/orders/OrdersTable.tsx` |
| Add business logic | `src/hooks/{{AREA}}/{feature-name}/` | `src/hooks/{{AREA}}/orders/useOrders.ts` |
| Add data access | `src/services/supabase/{{AREA}}/{feature-name}.service.ts` | `src/services/supabase/{{AREA}}/orders.service.ts` |
| Add contracts | `src/types/{{AREA}}/{feature-name}.types.ts` | `src/types/{{AREA}}/orders.types.ts` |
| Add migration | `supabase/migrations/{timestamp}_{name}.sql` | `supabase/migrations/20260101000100_create_orders.sql` |

## Related Documentation

- [Tech Stack](01-project-tech-stack.md)
- [Project Initialization](02-project-init.md)
- [Supabase Setup](04-supabase-setup.md)
