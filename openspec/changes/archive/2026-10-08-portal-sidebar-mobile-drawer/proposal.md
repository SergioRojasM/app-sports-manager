## Why

Portal navigation is a header dropdown (`PortalNavMenu`) with a flat list. Inside a tenant, an administrator gets 15 items. On small screens the panel grows past the viewport and cannot be scrolled, so the last items are unreachable. Inside a tenant, the personal entries (Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas) also disappear. US-0138 replaces the dropdown with a persistent sidebar on large screens and a scrollable right-side drawer on small screens. Organization tools are grouped by area inside a collapsible "Organización" section, following the approved designs `E73seM` (desktop) and `AGzMs` (mobile) in `projectspec/designs/pencil/grit-arena-v2.pen`.

## What Changes

- **Desktop sidebar (≥1024px)**: a new 280px `PortalSidebar` in the portal shell. The logo is on top, the navigation scrolls in the middle, and a user footer (name, role or email, profile link, logout) is at the bottom.
- **Mobile drawer (<1024px)**: a new `PortalMobileDrawer`, opened from a hamburger on the right of `PortalHeader`.
  - It slides from right to left and sits above the page with a scrim. It is `100dvh` tall, its menu area scrolls, and the page behind is scroll-locked.
  - It closes on X, scrim click, Escape, navigation, or resizing to ≥1024px. Focus is trapped while open and returns to the hamburger on close.
- **Global menu ("MENÚ")**: the same six items in every context: Inicio, Organizaciones, Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas. "Organizaciones Disponibles" is renamed to "Organizaciones".
- **"ORGANIZACIÓN" section** (only inside an accessible tenant):
  - A collapsible header with the label and the **tenant name only**. No tenant logo is fetched or rendered.
  - Collapsible groups underneath: Administración, Equipo, Entrenamientos, Eventos, plus top-level leaves (Analítica; Planes for `usuario`).
  - The tree is filtered by the per-tenant role. "Equipo › Reservas" from the mockup is intentionally excluded.
- **Active state**: the longest-prefix match picks exactly one active link. The group containing it is expanded and highlighted.
- **Header**: `PortalHeader` loses the `PortalNavMenu` dropdown and its separator. The logo is hidden at ≥1024px (it moves to the sidebar), and the header gains the mobile hamburger.
- **BREAKING (internal)**: `resolvePortalMenu`, `ROLE_TENANT_ITEMS` and `SHARED_TENANT_ITEMS` are replaced by `resolveGlobalMenu`, `resolveTenantNav`, `TENANT_NAV_TREE` and `findActiveHref`. `usePortalNavigation` returns a new shape. `PortalNavMenu.tsx` and the unused `RoleBasedMenu.tsx` are deleted.
- `BodyPortal` moves to `src/components/ui/BodyPortal.tsx`; the old export is kept as a re-export.
- New `.grit-scrollbar` utility and new `icon-map.ts` entries. Only existing `grit-*` tokens are used (`bg-grit-sidebar`, `bg-grit-glass`, `border-grit-glass-border`, `text-grit-muted`, `GritDivider`, `gritFocusRing`).

## Capabilities

### New Capabilities
- `portal-mobile-navigation-drawer`: right-side, full-height, scrollable navigation drawer for viewports below 1024px. Covers open/close triggers, layering, scroll lock, focus management and reduced motion.

### Modified Capabilities
- `portal-role-navigation`: the menu changes from a flat role list to a global "MENÚ" plus a grouped "ORGANIZACIÓN" tree.
  - The six global items are present in every context.
  - New per-role visibility for each tenant entry.
  - The org section shows the tenant name without a logo.
  - New active-link rule (longest prefix).
  - "Eventos Check-in" becomes "Eventos › Check-in", and `mis-suscripciones-y-pagos` is not a tenant menu entry.
- `portal-dashboard-layout`: the shell becomes two columns (persistent `PortalSidebar` ≥1024px plus header/main).
  - `PortalHeader` no longer contains `PortalNavMenu`, hides its logo at ≥1024px, and gains the mobile hamburger.
  - The visual requirement no longer references `PortalNavMenu` / `RoleBasedMenu` dropdowns.

## Impact

- **Pages / layout**: `src/app/portal/layout.tsx` (two-column shell, `id="portal-main"` on `<main>`).
- **Components** (`src/components/portal/`):
  - New: `PortalSidebar.tsx`, `PortalMobileDrawer.tsx`, `PortalNavContent.tsx`, `PortalSidebarUser.tsx`, `PortalNavigationProvider.tsx`.
  - Modified: `PortalHeader.tsx`.
  - Deleted: `PortalNavMenu.tsx`, `RoleBasedMenu.tsx`.
- **UI kit**:
  - New `src/components/ui/BodyPortal.tsx`, exported from `src/components/ui/index.ts`.
  - `src/components/portal/gestion-eventos/EventoModalShell.tsx` re-exports `BodyPortal`.
  - `src/components/ui/grit/icon-map.ts` gets new entries.
- **Hooks**: `src/hooks/portal/usePortalNavigation.ts` is rewritten. It reuses `useTenantAccess` and `useTenantName`, with no new queries.
- **Services**: none. `tenantService.canUserAccessTenant` and the `tenants.nombre` read are reused.
- **Types**: `src/types/portal.types.ts` gets the nav tree types and resolvers; the old flat-menu code is removed.
- **Styles**: `src/app/globals.css` gets `.grit-scrollbar`.
- **Database / API**: none. Server route guards in the `(administrador)`, `(entrenador)`, `(atleta)` and `(shared)` layouts stay unchanged and remain the authorization source of truth.
- **Docs**: `projectspec/03-project-structure.md`.

## Non-goals

- No tenant logo in the navigation, and no read of `tenants.logo_url` for it.
- No new routes or pages. In particular, no "Equipo › Reservas" view (service reservations) and no change to the existing `gestion-reservas` page.
- No change to route authorization or redirects. Hiding a link is presentation only.
- No collapsible "icon-only" desktop sidebar mode, and no persistence of group expansion across reloads.
- No redesign of `UserAvatarMenu`, `NotificacionesBell` or `PortalBreadcrumb` beyond their placement in the new shell.
- No new design tokens.

## Implementation Plan

Order: page → component → hook → service → types (dependencies are built first in tasks.md, then wired upward).

1. **Page/layout**: define the two-column shell in `portal/layout.tsx` (sidebar slot + header/main column, `id="portal-main"`), mounting `PortalNavigationProvider`.
2. **Components**:
   - Build `PortalNavContent` (MENÚ, ORGANIZACIÓN, groups, leaves, expansion state, skeletons).
   - Build `PortalSidebarUser`.
   - Build `PortalSidebar` (desktop).
   - Build `PortalMobileDrawer` (BodyPortal, scrim, slide-in from right, focus trap, scroll lock, close triggers).
   - Update `PortalHeader` (remove dropdown, hamburger, logo `lg:hidden`).
   - Move `BodyPortal` to the UI kit.
   - Delete `PortalNavMenu` and `RoleBasedMenu`.
3. **Hook**: rewrite `usePortalNavigation` to return `globalItems`, `tenantNav` (role, tenant name, resolved nodes), `tenantLoading`, `activeHref` and `activeGroupId`. Expose it through `PortalNavigationProvider`.
4. **Service**: no changes. Reuse `canUserAccessTenant` (via `useTenantAccess`) and `useTenantName`.
5. **Types**: add `PortalNavLeaf`/`PortalNavGroup`/`Resolved*`, the global menu constants, `TENANT_NAV_TREE`, `resolveGlobalMenu`, `resolveTenantNav` and `findActiveHref`. Remove the flat-menu code.
6. **Styles/icons**: `.grit-scrollbar` in `globals.css`; new `icon-map.ts` entries.
7. **Verify**:
   - Manual matrix: administrador, entrenador and usuario × inside/outside tenant × 1440 / 1024 / 1023 / 390×844.
   - Confirm in the Network tab that the menu triggers no `logo_url` request.
   - Run `npx tsc --noEmit` and `npm run lint` (no build).
8. **Docs**: update `projectspec/03-project-structure.md`.
