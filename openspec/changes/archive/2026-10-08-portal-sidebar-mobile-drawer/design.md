## Context

The portal shell (`src/app/portal/layout.tsx`) renders a column with `PortalHeader` and a scrollable `<main>`. Navigation is the `PortalNavMenu` dropdown inside the header. It is fed by `usePortalNavigation(role)`, which:
1. reads the tenant id from the pathname;
2. resolves the per-tenant role with `useTenantAccess` (client, calling `tenantService.canUserAccessTenant`);
3. returns a flat list from `resolvePortalMenu(role, tenantId)` in `src/types/portal.types.ts`.

`PortalBreadcrumb` already resolves the tenant name with `useTenantName` (a `tenants.nombre` select). Authorization is enforced server-side by the `(administrador)`, `(entrenador)`, `(atleta)` and `(shared)` route-group layouts through `getCachedTenantAccess`. The menu only mirrors those rules.

Design references are `E73seM` (desktop sidebar) and `AGzMs` (mobile drawer) in `projectspec/designs/pencil/grit-arena-v2.pen`. The design's tenant avatar is deliberately **not** implemented; only the tenant name is shown.

Constraints from `projectspec/03-project-structure.md`:
- shell components live at `src/components/portal/` root, not in feature folders;
- no Supabase calls from components;
- `grit-*` tokens and `@/components/ui` kit only;
- `rounded-grit-*` radii only.

## Goals / Non-Goals

**Goals:**
- One navigation model (global items + role-filtered tenant tree) rendered by one component in two shells: the desktop sidebar and the mobile drawer.
- A mobile drawer that can never overflow the viewport: `100dvh`, an internal scroll region, scroll lock, and a proper modal-dialog accessibility pattern.
- Zero new database queries, and no tenant logo fetch.
- Keep server authorization untouched.

**Non-Goals:**
- Icon-only collapsed desktop sidebar, persisted expansion state, new routes ("Equipo › Reservas"), changes to `UserAvatarMenu` / `NotificacionesBell` / `PortalBreadcrumb` internals, new tokens.

## Architecture

Following page → component → hook → service → types:

```
src/app/portal/layout.tsx  (Server: cookies → role, displayProfile)
└─ <PortalNavigationProvider role>              (client context)
   └─ div.grit-shell.flex.h-screen
      ├─ <PortalSidebar profile/>               hidden lg:flex, 280px
      │   ├─ Logo
      │   ├─ scroll region → <PortalNavContent variant="sidebar"/>
      │   └─ GritDivider + <PortalSidebarUser/>
      └─ div.flex-1.flex-col
         ├─ <PortalHeader profile role/>
         │   ├─ Logo (lg:hidden) · NotificacionesBell · UserAvatarMenu
         │   ├─ Hamburger (lg:hidden) ── open ─┐
         │   └─ <PortalMobileDrawer/> ◄────────┘  BodyPortal, z-[60]
         │        ├─ header: Logo + Close
         │        ├─ scroll region → <PortalNavContent variant="drawer" onNavigate=close/>
         │        └─ GritDivider + <PortalSidebarUser/>
         └─ main#portal-main → PortalBreadcrumb + GritPageContainer(children)

usePortalNavigation(role)  (hook, consumed once by the provider)
├─ usePathname()                    → activePath, tenantId
├─ useTenantAccess(tenantId)        → tenantRole, loading, allowed   (existing → tenantService.canUserAccessTenant)
├─ useTenantName(tenantId)          → tenantName                     (existing → tenants.nombre)
└─ portal.types.ts (pure)
   ├─ resolveGlobalMenu()           → 6 MenuItem
   ├─ resolveTenantNav(role, id)    → ResolvedNavNode[] from TENANT_NAV_TREE
   └─ findActiveHref(path, hrefs)   → longest-prefix match
```

## Decisions

### D1. Declarative `TENANT_NAV_TREE` with per-leaf `roles` instead of per-role lists
The existing `ROLE_TENANT_ITEMS` duplicates items per role. Grouping would triple that duplication (one tree per role). A single tree whose leaves declare `roles` (and an optional `labelByRole`) keeps the structure in one place. `resolveTenantNav` filters it and drops empty groups.
- *Alternative*: three hand-written trees. Rejected: they drift, and the "same tree filtered" decision from the user story would not be enforced structurally.
- The usuario "Planes" leaf sits at the top level, not under "Administración", so athletes never see an "Administración" heading. It is a separate leaf entry with `roles: ['usuario']`.

### D2. Longest-prefix active matching
Global `/portal/orgs` is a prefix of every tenant route. The current `startsWith` check would mark both "Organizaciones" and the tenant item active. `findActiveHref` picks the longest matching href, so exactly one link is active, and nested routes (`gestion-eventos/nuevo`, `control-ingreso/{id}`) map to their parent item.
- *Alternative*: exclude `/portal/orgs` from matching inside a tenant. Rejected: it is a special case that the general rule already covers.

### D3. One `PortalNavigationProvider` instead of calling the hook in sidebar and header
Both shells need the same data. Calling `usePortalNavigation` twice would run `useTenantAccess` and `useTenantName` twice per tenant change. A small client context in the layout runs it once, and `PortalSidebar` / `PortalHeader` (→ drawer) read it with `usePortalNavigationContext()`. `PortalBreadcrumb` keeps its own `useTenantName` call (out of scope). That leaves one duplicate `nombre` select, which is accepted.

### D4. Shared `PortalNavContent` with a `variant` prop
The sidebar and drawer render the same sections and differ only in sizes (14 vs 15px labels, 12.5 vs 13.5px children, row padding) and in row sizes. A single component with `variant: 'sidebar' | 'drawer'` avoids divergence. Expansion state is local `useState` keyed by tenant id. In both variants only the group holding the active link starts expanded; the "MENÚ" section is itself collapsible and starts expanded. `activeGroupId` changes force-expand that group (state adjusted during render, no effect).

### D5. Drawer state owned by `PortalHeader`; drawer rendered via `BodyPortal`
The hamburger lives in the header, so the header owns `drawerOpen` and a `ref` to the hamburger for focus return. No global state is needed. The drawer renders through `BodyPortal` because the header has `backdrop-blur`. A `backdrop-filter` ancestor creates a containing block that traps `fixed` children (the same reason `EventoModalShell` introduced `BodyPortal`). `BodyPortal` moves to `src/components/ui/BodyPortal.tsx` so a shell component does not import from a feature folder, and `EventoModalShell.tsx` re-exports it so existing imports are unchanged.
- *Alternative*: render the drawer in `layout.tsx` and share state through the provider. Rejected: it spreads one interaction across files for no benefit.

### D6. Mobile overflow fix: `h-dvh` + `min-h-0` scroll region + scroll lock
The reported bug ("se sale de la pantalla") comes from a panel sized by content with no internal scroll.
- The panel is `h-dvh flex flex-col`. `dvh` accounts for mobile browser chrome, where `100vh` overflows behind the URL bar.
- Only the middle child scrolls: `flex-1 min-h-0 overflow-y-auto overscroll-contain`. `min-h-0` is required for a flex child to shrink below its content height.
- The page behind is locked. The portal scroll container is `<main>`, not `body`, so both get `overflow:hidden` while open (main looked up by `id="portal-main"`), and the previous values are restored on close.

### D7. Focus trap implemented in-component (no new dependency)
The project has no focus-trap library. The drawer has a small, static set of focusables. A `keydown` handler that queries `a[href],button:not([disabled])` inside the panel and wraps Tab / Shift+Tab is enough. Escape is handled in the same handler. Focus goes to the close button on open and back to the hamburger ref on close.
- *Alternative*: add `focus-trap-react`. Rejected: it is a new dependency for about 20 lines of code.

### D8. Responsive switch by CSS, with a `matchMedia` listener only to close the drawer
Visibility uses Tailwind (`hidden lg:flex`, `lg:hidden`) so SSR renders correctly with no hydration flash. JavaScript is only needed to close an open drawer when the viewport crosses 1024px (`matchMedia('(min-width: 1024px)')` change event).

### D9. No tenant logo; static `shield` tile
Per the user story, the org header shows "Organización" plus the tenant name from `useTenantName`. `useTenantName` selects only `nombre`, so `logo_url` is never read or requested. The `shield` icon tile preserves the design's visual rhythm without an image.

### D10. Tokens
Only existing tokens and kit pieces are used:
- `bg-grit-sidebar` (`#060E1ACC`, identical to the design sidebar), `bg-grit-bg`, `bg-grit-glass`, `border-grit-glass-border`;
- `text-grit-{text,subtext,muted,cyan}`, `bg-grit-cyan/10`;
- `GritDivider`, `gritFocusRing`, `GritIcon`, `rounded-grit-*`.

The one non-token value is the sub-list guide line `border-white/[0.08]`, which follows the accepted `white/[…]` separator pattern. Additions: `.grit-scrollbar` in `globals.css`, and Lucide → Material entries in `icon-map.ts` (`building-2→corporate_fare`, `trophy→emoji_events`, `credit-card→credit_card`, `ticket→confirmation_number`, `sliders-horizontal→tune`, `chevron-up→expand_less`, `chevron-right→chevron_right`, `x→close`, `menu→menu`, `log-out→logout`).

## Risks / Trade-offs

- **[Risk]** The two-column shell changes the available width for every portal page at ≥1024px (−280px). Pages tuned for the full width might wrap differently. → Mitigation: `GritPageContainer` is already fluid with a 1440px max. Check the widest pages (analítica, gestion-equipo table, entrenamientos calendar) at 1024px and 1440px during verification.
- **[Risk]** A client-side role resolution delay makes the ORGANIZACIÓN section pop in after first paint. → Mitigation: show the skeleton while `tenantLoading`. This is the same latency as today's dropdown.
- **[Risk]** Scroll lock leaves `overflow:hidden` stuck if the drawer unmounts unexpectedly. → Mitigation: restore in the effect cleanup, which also runs on unmount.
- **[Risk]** The internal API change (`resolvePortalMenu` removed, new `usePortalNavigation` shape) could break unknown consumers. → Mitigation: grep shows the only consumers are `usePortalNavigation`, `PortalNavMenu` and `PortalHeader`. Confirm with `npx tsc --noEmit`.
- **[Trade-off]** `PortalBreadcrumb` and the provider each fetch `tenants.nombre`, which is one small duplicate query. This is accepted to keep the breadcrumb out of scope.
- **[Trade-off]** Groups start collapsed except the active one, which differs from the `E73seM` mockup (all expanded). This was a user decision after seeing the implementation: the admin tree is shorter and fits without scrolling.

## Migration Plan

- Front-end only: no database migration and no Supabase changes (nothing is pushed to the remote).
- Deploys with the normal build. Rollback is reverting the commit; no data is affected.

## Open Questions

- None blocking. A future story may add an "Equipo › Reservas" view (service reservations) as a new leaf in `TENANT_NAV_TREE`.
