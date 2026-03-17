## Context

The portal currently redirects users post-login to `/portal/orgs`, a flat organization list with no personalized data. The existing `/portal/page.tsx` is a static placeholder. Athletes must navigate into each organization individually to see their subscriptions, trainings, or payments.

This design covers the new `/portal/inicio` route — a Server Component dashboard that aggregates the authenticated user's cross-tenant data into a single glassmorphism card-based view. The visual reference is `projectspec/designs/12_user_home.html`.

### Current Architecture Patterns

- **Hexagonal architecture + feature slices**: `types/ → services/ → hooks/ → components/ → app/`
- **Server Components** for data-fetching pages (e.g., `portal/perfil/page.tsx`)
- **Client Components** only when interactivity is needed (hooks, form modals)
- **Services** use either `createClient()` (browser) or accept a Supabase instance from the server
- **Portal layout** provides the shell (header + nav); pages render inside `<main>`
- **Menu resolution** via `resolvePortalMenu()` in `portal.types.ts` — returns `MenuItem[]` based on role and optional tenant context

## Goals / Non-Goals

**Goals:**

- Provide a personalized post-login landing page aggregating cross-tenant user data
- Fetch all dashboard data server-side in parallel via `Promise.all()` for fast initial render
- Match the glassmorphism card-based design from `12_user_home.html` using existing Tailwind theme tokens
- Follow the project's hexagonal architecture: types → service → components → page
- Support graceful empty states for each data section
- Responsive layout: 1-col (mobile) → 3-col grid (desktop)

**Non-Goals:**

- No new database schema, migrations, or RLS policies
- No real-time data updates or WebSocket subscriptions
- No client-side data fetching for the initial load
- No admin-specific dashboard variant
- No payment processing or write operations — read-only dashboard
- No social feed or activity wall at `/portal` root (reserved for future)

## Decisions

### 1. Server Component with server-side Supabase client

**Decision**: The `/portal/inicio/page.tsx` route will be a React Server Component that creates a server Supabase client via `createClient()` from `@/services/supabase/server`, fetches all data in parallel, and passes it as props to `InicioPage`.

**Why**: Consistent with the existing pattern in the portal (e.g., `bootstrap/route.ts` uses server client). Server-side fetching avoids client-side loading spinners, keeps user IDs out of the browser, and leverages RLS transparently.

**Alternative considered**: Client-side fetching via hooks — rejected because (1) the dashboard is primarily read-only with no interactive mutations, (2) server-side avoids exposing cross-tenant query patterns to the browser, (3) faster Time-to-First-Byte.

### 2. New service file with server Supabase instance passed as parameter

**Decision**: Create `inicio.service.ts` with functions that accept a Supabase server client instance as first parameter (e.g., `fetchMisSuscripciones(supabase, userId)`), rather than creating the client internally.

**Why**: Existing services like `suscripciones.service.ts` and `pagos.service.ts` use `createClient()` (browser client) internally — that pattern is for client components. Since the inicio page is a Server Component, the service must use the server client. Passing it as a parameter makes the functions testable and consistent with how `portalService.fetchDisplayProfile(supabase, userId)` works in `bootstrap/route.ts`.

**Alternative considered**: Creating a separate server-side service module — rejected as unnecessary complexity; a parameter-based approach is simpler and already used elsewhere.

### 3. Single aggregated stats function vs. individual count queries

**Decision**: Implement `fetchInicioStats()` that runs four `count` queries in parallel via `Promise.all()` and returns an `InicioStats` object.

**Why**: The stats row needs four numbers (active subscriptions, upcoming trainings, pending payments, organizations). Running them in parallel within one function keeps the page's data-fetching code clean. Individual functions would require the page to manage four more promises.

**Alternative considered**: A single SQL function/view that returns all counts — rejected because it requires a migration, and the four parallel count queries are fast enough (< 100ms each for typical data volumes).

### 4. Component decomposition — 8 presentation components + 1 layout component

**Decision**: Split the dashboard into `InicioPage` (layout grid) + 7 section components (`InicioStatsCards`, `InicioFeaturedTraining`, `InicioProximosEntrenamientos`, `InicioSuscripciones`, `InicioPagosPendientesAlert`, `InicioOrganizaciones`, `InicioQuickActions`), all as Server Components receiving data as props.

**Why**: Each section maps to a distinct visual card or card group from the design. This keeps each component focused (< 100 lines), testable, and independently modifiable. The user story explicitly names these sections.

**Alternative considered**: A single monolithic `InicioPage` — rejected for maintainability; the design has 7 visually distinct sections.

### 5. Subscription status filter chips — client-side interactivity

**Decision**: `InicioSuscripciones` will be the only `"use client"` component in the feature. It receives the full subscription list as props and filters locally using `useState` for the status chips (Todas / Activas / Pendientes).

**Why**: The filter is purely presentational — no server round-trip needed. Marking only this one component as client keeps the rest of the tree as Server Components for performance.

**Alternative considered**: Server-side filtering via URL searchParams — rejected as over-engineered for a simple 3-option toggle on a small list.

### 6. Navigation menu update approach

**Decision**: Add a new `INICIO_MENU_ITEM` constant in `portal.types.ts` and prepend it to the return array in `resolvePortalMenu()` when no tenant context is active (`!tenantId`). The menu order becomes: **Inicio → Organizaciones Disponibles** (base), then tenant items when inside a tenant.

**Why**: The existing `resolvePortalMenu(role, tenantId?)` function is the single source of truth for menu items. Adding "Inicio" there keeps the pattern consistent. When inside a tenant context, "Inicio" still appears first so users can always navigate back.

**Alternative considered**: Adding "Inicio" only at base level (no tenant) — rejected because users should always have a way to return to their personal dashboard.

### 7. Bootstrap redirect and portal root changes

**Decision**: Three redirect changes:
1. `bootstrap/route.ts`: default `nextPath` → `/portal/inicio`
2. `portal/layout.tsx`: two `redirect()` calls target → `/portal/inicio`
3. `portal/page.tsx`: replace placeholder content with `redirect('/portal/inicio')`

**Why**: The dashboard should be the primary post-login destination. Keeping `/portal/page.tsx` as a redirect (rather than removing it) ensures any existing links to `/portal` still work.

### 8. Featured training card — handling missing images

**Decision**: The `InicioFeaturedTraining` component will use a CSS gradient fallback when no discipline/venue image is available. The left 1/3 will show the gradient overlay directly over a solid dark background.

**Why**: Currently there are no image URLs stored on `entrenamientos`, `disciplinas`, or `escenarios` tables. The design shows an image, but the data model doesn't support it yet. A gradient fallback keeps the visual pattern intact without requiring a migration.

## Architecture Overview

```
page.tsx (Server Component)
  │
  ├─ createClient() → server Supabase
  ├─ supabase.auth.getUser() → userId
  ├─ Promise.all([
  │     fetchInicioStats(supabase, userId),
  │     fetchProximosEntrenamientos(supabase, userId, 5),
  │     fetchMisSuscripciones(supabase, userId),
  │     fetchPagosPendientes(supabase, userId),
  │     fetchMisMembresias(supabase, userId),
  │   ])
  │
  └─ <InicioPage data={...}>          ← layout grid (Server Component)
       ├─ <InicioStatsCards />         ← 4 KPI cards (Server Component)
       ├─ <InicioOrganizaciones />     ← left column (Server Component)
       ├─ <InicioQuickActions />       ← left column (Server Component)
       ├─ <InicioSuscripciones />      ← left column ("use client" — filter chips)
       ├─ <InicioFeaturedTraining />   ← right column (Server Component)
       ├─ <InicioProximosEntrenamientos /> ← right column (Server Component)
       └─ <InicioPagosPendientesAlert />   ← right column, conditional (Server Component)
```

## Risks / Trade-offs

**[Performance] Cross-tenant queries without indexes on `atleta_id` columns** → Mitigation: The queries filter by `auth.uid()` which RLS already enforces. For typical data volumes (< 100 rows per user), index absence is unlikely to be noticeable. If needed, indexes on `suscripciones(atleta_id)`, `reservas(atleta_id)`, and `pagos(suscripcion_id)` can be added in a future migration without schema changes.

**[UX] No loading skeleton for the initial server render** → Mitigation: Since data is fetched server-side, the page renders complete on first load. A `loading.tsx` file at the `/portal/inicio/` level can provide a skeleton fallback during navigation transitions, consistent with the existing `portal/loading.tsx` pattern.

**[Data] No image URLs in the current schema for the featured training card** → Mitigation: Use a CSS gradient/background-dark fallback for the image area. The visual design remains intact with the gradient overlay. When image support is added to disciplines/venues, the component can be updated without structural changes.

**[Scope] Subscription filter chips require a client component boundary** → Mitigation: Only `InicioSuscripciones` is marked `"use client"`. All data is still passed as serializable props from the server — no client-side fetching. The client boundary is minimal and isolated.

**[Navigation] Changing the default redirect may break bookmarked `/portal/orgs` direct links** → Mitigation: `/portal/orgs` still exists and works. Only the *default* redirect changes. Users with direct bookmarks to `/portal/orgs` are unaffected.

## Open Questions

- Should the "Inicio" menu item be visible when inside a tenant context, or only at the base portal level? (Current decision: always visible as the first item for consistent navigation back to personal dashboard.)
- Should we implement the `loading.tsx` skeleton for `/portal/inicio/` as part of this change, or defer it? (Recommendation: include it for UX consistency.)
