# Project Structure

Following structure shows scaffolding for the project based on hexagonal architecture.

## Directory Structure

```text
/

│
├── src/
│   ├── app/                         # Inbound adapters (routing / delivery)
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles & Tailwind imports
│   │   ├── auth/                    # Authentication routes
│   │   │   └── callback/
│   │   │       └── route.ts         # OAuth callback handler
│   │   └── {feature}/
│   │       ├── page.tsx             # Feature route
│   │       ├── [id]/page.tsx        # Dynamic route
│   │       ├── loading.tsx          # Loading UI
│   │       ├── error.tsx            # Error boundary
│   │       └── layout.tsx           # Feature-specific layout
│   ├── components/              # UI adapters (presentation)
│   │   ├── common/              # Shared UI components ()
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Loading.tsx
│   │   └── {feature}/           # Feature-specific components
│   │       ├── {Feature}List.tsx
│   │       ├── {Feature}Form.tsx
│   │       ├── {Feature}Card.tsx
│   │       └── {Feature}Detail.tsx
│   │
│   ├── hooks/                   # Application core (use cases)
│   │   ├── common/              # Shared hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useToast.ts
│   │   └── {feature}/
│   │       ├── use{Feature}.ts      # Main feature hook
│   │       ├── use{Feature}Form.ts  # Form-specific logic
│   │       └── use{Feature}Query.ts # Data fetching
│   │
│   ├── services/                # Outbound adapters (API)
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser client (see supabase-setup.md)
│   │   │   ├── server.ts        # Server client (see supabase-setup.md)
│   │   │   ├── middleware.ts    # Auth middleware (see supabase-setup.md)
│   │   │   └── auth.ts          # Auth service
│   │   └── {feature}Service.ts  # Feature-specific API calls
│   │
│   ├── types/                   # Domain & contracts
│   │   ├── database.types.ts    # Supabase generated types
│   │   ├── {feature}.types.ts   # Feature domain types
│   │   └── common.types.ts      # Shared types
│   │
│   └── lib/                     # Pure utilities
│       ├── utils.ts             # Helper functions
│       ├── constants.ts         # App constants
│       └── validators.ts        # Data validation functions
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

1. **Co-location**
   - Keep feature-specific code together
   - Example: `hooks/events/`, `components/events/`, `services/eventsService.ts`

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

### Feature: Events

```
src/
├── components/events/
│   ├── EventList.tsx          # Displays list of events
│   ├── EventCard.tsx          # Individual event card
│   └── EventForm.tsx          # Create/edit form
│
├── hooks/events/
│   ├── useEvents.ts           # Fetch and manage events
│   ├── useEventForm.ts        # Form state and validation
│   └── useEventSubscription.ts # Real-time updates
│
├── services/
│   └── eventsService.ts       # Supabase CRUD operations
│
└── types/
    └── events.types.ts        # Event interfaces
```

### Code Flow Example

```typescript
// 1. Component (presentation)
// components/events/EventList.tsx
'use client'

import { useEvents } from '@/hooks/events/useEvents'
import { EventCard } from './EventCard'

export function EventList() {
  const { events, loading, error } = useEvents()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

// 2. Hook (business logic)
// hooks/events/useEvents.ts
import { useState, useEffect } from 'react'
import { eventsService } from '@/services/eventsService'
import { Event } from '@/types/events.types'

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await eventsService.getAll()
        setEvents(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  return { events, loading, error }
}

// 3. Service (data access)
// services/eventsService.ts
import { createClient } from '@/services/supabase/client'
import { Event } from '@/types/events.types'

export const eventsService = {
  async getAll(): Promise<Event[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  async create(event: Omit<Event, 'id'>): Promise<Event> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// 4. Types (contracts)
// types/events.types.ts
export interface Event {
  id: string
  name: string
  date: string
  description: string | null
  user_id: string
  created_at: string
}

export type CreateEventInput = Omit<Event, 'id' | 'created_at'>
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
| Add new page | `app/{feature}/page.tsx` | `app/events/page.tsx` |
| Add UI component | `src/components/{feature}/` | `src/components/events/EventCard.tsx` |
| Add business logic | `src/hooks/{feature}/` | `src/hooks/events/useEvents.ts` |
| Add API call | `src/services/` | `src/services/eventsService.ts` |
| Add type | `src/types/` | `src/types/events.types.ts` |

---

**Note**: This structure follows hexagonal architecture principles to maintain clean separation of concerns and testability. 