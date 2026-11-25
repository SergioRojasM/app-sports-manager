# US-0138 — Portal Sidebar (Desktop) and Navigation Drawer (Mobile)

## ID
US-0138

## Name
Replace the portal header dropdown menu with a persistent sidebar on large screens and a right-side scrollable drawer on small screens, including a collapsible "Organización" section grouped by area

## As a
Authenticated portal user (administrador, entrenador or usuario/atleta)

## I Want
A fixed side menu on large screens and a full-height drawer that slides in from the right on small screens, showing my personal menu everywhere and, when I am inside an organization, a collapsible "Organización" section with that organization's tools grouped by area

## So That
I can reach every portal page in one click, always know where I am, and never lose menu items off-screen on mobile (today the dropdown overflows the viewport and cannot be scrolled)

---

## Description

### Current State
- Navigation lives in `PortalNavMenu` (`src/components/portal/PortalNavMenu.tsx`), a dropdown button inside `PortalHeader`. It renders a flat list from `resolvePortalMenu(role, tenantId)` (`src/types/portal.types.ts`).
- Inside a tenant, the admin menu has 15 flat items (Inicio, Organizaciones Disponibles + 13 tenant items). On small screens the dropdown grows taller than the viewport, has no internal scroll, and the last items cannot be reached.
- Inside a tenant, the personal items (Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas) disappear from the menu.
- `RoleBasedMenu.tsx` is dead code (no imports).

### Design Reference
Source: `projectspec/designs/pencil/grit-arena-v2.pen`
- **Desktop sidebar**: node `E73seM` (frame "Content" inside "Sidebar — Desktop (Dentro de organización)"), sidebar child `s2lcM4`.
- **Mobile drawer**: node `AGzMs` ("Drawer" inside "Sidebar — Mobile Drawer (Dentro de organización)").

The design shows an **organization avatar/logo** in the Organización header. **Do not implement it**: render only the label "Organización" and the organization **name** (no image request, no `logo_url` read). Use a static icon (`shield`) in its place, or no icon at all.

#### Design → code token mapping
Use only the existing `grit-*` tokens and `@/components/ui` kit (US-0116). No new tokens are needed.

| Design value (`.pen`) | Code |
|---|---|
| `$bg-navy` `#07111F` (drawer panel) | `bg-grit-bg` |
| Sidebar fill `#060E1ACC` | `bg-grit-sidebar` |
| `$glass-fill` (org dropdown, hamburger) | `bg-grit-glass` |
| `$glass-border` | `border-grit-glass-border` |
| `$accent-cyan` | `text-grit-cyan` / `bg-grit-cyan` |
| `$text-primary` / `$text-subtext` | `text-grit-text` / `text-grit-subtext` |
| Overline `#BAC7D599` | `text-grit-muted` |
| Active sub-item `#14DBC41A` | `bg-grit-cyan/10` |
| Dividers `#FFFFFF12` | `GritDivider` |
| Sub-list guide line `#FFFFFF14` | `border-white/[0.08]` |
| Scrim `#02070ECC` | `bg-grit-bg/70 backdrop-blur-sm` (portal modal backdrop convention) |
| Radii 12 / 10 / 8 / 6 | `rounded-grit-lg` / `md` / `sm` / `xs` |
| `$font-title` / `$font-body` | `font-grit-title` / `font-grit-body` |
| Lucide icons | `GritIcon` (Material Symbols) via `icon-map.ts` |
| Logo (zap tile + "GRIT ARENA" text) | Existing `/logo-navbar.png` asset, as in today's `PortalHeader` |
| Focus states | `gritFocusRing` |

### Proposed Changes

#### 1. Navigation model (`src/types/portal.types.ts`)

Replace the flat tenant menu with a typed tree. Remove `SHARED_TENANT_ITEMS`, `ROLE_TENANT_ITEMS`, `resolvePortalMenu`, and the `INICIO_MENU_ITEM` / `BASE_MENU_ITEM` / … constants that become unused. Keep `MenuItem`.

```ts
export type PortalNavLeaf = {
  kind: 'leaf';
  label: string;
  /** Path relative to `/portal/orgs/{tenantId}/`. */
  path: string;
  icon?: string;              // Material Symbols name; only top-level leaves show an icon
  roles: readonly UserRole[];
  /** Optional per-role label (e.g. "Entrenamientos disponibles" for usuario). */
  labelByRole?: Partial<Record<UserRole, string>>;
};

export type PortalNavGroup = {
  kind: 'group';
  id: 'administracion' | 'equipo' | 'entrenamientos' | 'eventos';
  label: string;
  icon: string;
  children: readonly PortalNavLeaf[];
};

export type PortalNavNode = PortalNavLeaf | PortalNavGroup;

/** Tree resolved for one role: hrefs are absolute, labels resolved, empty groups removed. */
export type ResolvedNavLeaf = { label: string; href: string; icon?: string };
export type ResolvedNavGroup = { id: PortalNavGroup['id']; label: string; icon: string; children: ResolvedNavLeaf[] };
export type ResolvedNavNode = ({ kind: 'leaf' } & ResolvedNavLeaf) | ({ kind: 'group' } & ResolvedNavGroup);
```

**Global menu**: shown in both contexts and in this order. The "MENÚ" section is identical inside and outside an organization.

| Label | Href | Icon (Material) |
|-------|------|-----------------|
| Inicio | `/portal/inicio` | `home` |
| Organizaciones | `/portal/orgs` | `corporate_fare` |
| Eventos | `/portal/eventos` | `emoji_events` |
| Mis Suscripciones | `/portal/mis-suscripciones` | `credit_card` |
| Mis Reservas | `/portal/mis-reservas` | `event_available` |
| Mis Entradas | `/portal/mis-entradas` | `confirmation_number` |

Note: the label changes from "Organizaciones Disponibles" to **"Organizaciones"**.

**Tenant tree (`TENANT_NAV_TREE`)**: role visibility mirrors the existing route-group guards (`(administrador)`, `(entrenador)`, `(atleta)`, `(shared)`) and today's role menus.

| Group (icon) | Item | Path | administrador | entrenador | usuario |
|---|---|---|---|---|---|
| Administración (`tune`) | Configuración | `gestion-organizacion` | ✓ | | |
| | Escenarios | `gestion-escenarios` | ✓ | | |
| | Disciplinas | `gestion-disciplinas` | ✓ | | |
| | Servicios | `gestion-servicios` | ✓ | | |
| | Planes | `gestion-planes` | ✓ | ✓ | |
| Equipo (`group`) | Miembros | `gestion-equipo` | ✓ | | |
| | Atletas | `atletas` | | ✓ | |
| | Suscripciones | `gestion-suscripciones` | ✓ | | |
| Entrenamientos (`fitness_center`) | Calendario *(usuario: "Entrenamientos disponibles")* | `gestion-entrenamientos` | ✓ | ✓ | ✓ |
| | Reservas | `gestion-reservas` | ✓ | ✓ | |
| | Formularios | `gestion-formularios` | ✓ | | |
| Eventos (`emoji_events`) | Calendario | `gestion-eventos` | ✓ | | |
| | Check-in | `control-ingreso` | ✓ | ✓ | |
| *(top-level leaf)* Planes (`card_membership`) | | `gestion-planes` | | | ✓ |
| *(top-level leaf)* Analítica (`bar_chart`) | | `analitica` | ✓ | | |

The mockup's "Equipo › Reservas" item is **intentionally removed**. Only one reservations route exists (`gestion-reservas`, training reservations), and it lives under Entrenamientos.

Resulting trees:
- **administrador**: Administración (5) · Equipo (Miembros, Suscripciones) · Entrenamientos (3) · Eventos (2) · Analítica
- **entrenador**: Administración (Planes) · Equipo (Atletas) · Entrenamientos (Calendario, Reservas) · Eventos (Check-in)
- **usuario**: Entrenamientos (Entrenamientos disponibles) · Planes

New pure functions in the same file:
- `resolveGlobalMenu(): MenuItem[]`: returns the six global items.
- `resolveTenantNav(role: UserRole, tenantId: string): ResolvedNavNode[]`: filters `TENANT_NAV_TREE` by role, applies `labelByRole`, builds `href = /portal/orgs/${tenantId}/${path}`, and drops groups with zero visible children.
- `findActiveHref(pathname: string, hrefs: string[]): string | null`: returns the **longest** href where `pathname === href || pathname.startsWith(href + '/')`. Only one item may be active at a time. For example, `/portal/orgs/{id}/gestion-eventos/nuevo` activates Eventos › Calendario, not "Organizaciones".

#### 2. Hook (`src/hooks/portal/usePortalNavigation.ts`)

Rewrite to return:

```ts
type PortalTenantNav = {
  tenantId: string;
  tenantName: string | null;   // from useTenantName; null while loading or on error
  role: UserRole;
  nodes: ResolvedNavNode[];
};

type UsePortalNavigationResult = {
  activePath: string;
  activeHref: string | null;    // findActiveHref over global + tenant leaves
  globalItems: MenuItem[];
  tenantNav: PortalTenantNav | null;  // null outside a tenant or when access is denied
  tenantLoading: boolean;       // true while useTenantAccess resolves
  activeGroupId: PortalNavGroup['id'] | null; // group that contains activeHref
};
```

- Tenant id is extracted from the pathname exactly as today (`/^\/portal\/orgs\/([^/]+)/`).
- Use the existing `useTenantAccess(tenantId)` for the per-tenant role and the existing `useTenantName(tenantId)` for the name. **No new queries.** `tenants.logo_url` is never read.
- `tenantNav` is `null` when there is no tenant id, when access is not allowed, or when the role is null.

#### 3. Shared nav content (`src/components/portal/PortalNavContent.tsx`)

This component renders the navigation body and is used by both the sidebar and the drawer. Props: `{ variant: 'sidebar' | 'drawer'; nav: UsePortalNavigationResult; onNavigate?: () => void }`.

- **Section "MENÚ"**: overline label (10px, letter-spacing 2px, `text-grit-muted`) followed by the six global links. Each link shows an icon at 18px and the label at 14px (sidebar) or 15px (drawer). Inactive links are `text-grit-subtext`. Hover is `hover:bg-grit-cyan/10 hover:text-grit-text`. The active link reuses the existing active style: `border-grit-glass-border bg-gradient-to-r from-grit-cyan/15 to-transparent font-semibold text-grit-text`, icon `text-grit-cyan`.
- **`GritDivider` + section "ORGANIZACIÓN"**: rendered only when `tenantNav !== null` or `tenantLoading`.
  - While `tenantLoading`, render one skeleton block with the height of the org header (`animate-pulse`, `bg-grit-glass`).
  - **Org dropdown container**: `bg-grit-glass border border-grit-glass-border rounded-grit-lg p-1.5`.
  - **Org header** is a `<button>` that toggles the whole section (`aria-expanded`, `aria-controls`). It contains:
    - Left: a 30–32px square tile with the static `shield` icon in cyan. This is **not** the tenant logo.
    - Center: "Organización" (13–14px, semibold, `text-grit-text`) and, below it, the **tenant name** (11px, `text-grit-cyan`, `truncate`, `title={tenantName}`). While `tenantName === null`, show a 10px-high skeleton bar instead of the name.
    - Right: chevron `expand_less` when open and `expand_more` when closed.
  - **Group**: a `<button>` header with the icon at 16–17px, the label (13–14px semibold) and a chevron (`expand_more` open, `chevron_right` closed). The group icon is `text-grit-cyan` when the group contains `activeHref`, otherwise `text-grit-subtext`. Children render in a list indented 18px with a 1px left guide line (`border-l border-white/[0.08]`, the design’s `#FFFFFF14`; same `white/[…]` pattern already used in portal tables). Each child is a link at 12.5px (sidebar) or 13.5px (drawer). The active child gets `bg-grit-cyan/10 text-grit-cyan font-semibold`.
  - **Top-level leaf** (Analítica, Planes for usuario): same look as a group header, without a chevron, rendered as a link.
- **Expansion state**: local `useState`, initialized once per tenant id.
  - Org section: open by default.
  - Both variants: only `activeGroupId` expanded by default; every other group starts collapsed.
  - The "MENÚ" overline is a toggle button (`aria-expanded`, chevron) that collapses the six global links; open by default.
  - When `activeGroupId` changes because of navigation, that group is force-expanded. Other groups keep the state the user chose.
- Every link calls `onNavigate?.()` on click. Every link sets `aria-current="page"` when `href === activeHref`.

#### 4. Desktop sidebar (`src/components/portal/PortalSidebar.tsx`)

- `<aside aria-label="Navegación principal">`, `hidden lg:flex` (≥1024px), `w-[280px] shrink-0 flex-col gap-5 h-full`, `bg-grit-sidebar border-r border-grit-glass-border` (existing token `--grit-sidebar-fill`, the same fill as the design sidebar `#060E1ACC`), padding `pt-7 px-4 pb-5`.
- **Top**: GRIT Arena logo (same `/logo-navbar.png` + `<Link href="/portal">` used today by `PortalHeader`).
- **Middle**: a scroll region `flex-1 min-h-0 overflow-y-auto overscroll-contain grit-scrollbar` that renders `<PortalNavContent variant="sidebar" />`. Logo and footer never scroll.
- **Bottom**: `GritDivider` + `PortalSidebarUser`.

#### 5. Mobile drawer (`src/components/portal/PortalMobileDrawer.tsx`)

- Props: `{ open: boolean; onClose: () => void; profile: PortalDisplayProfile; nav: UsePortalNavigationResult; returnFocusRef: RefObject<HTMLButtonElement> }`.
- Render through `BodyPortal` (`src/components/portal/gestion-eventos/EventoModalShell.tsx`). Move `BodyPortal` to `src/components/ui/BodyPortal.tsx` and re-export it from the original file so existing imports keep working.
- **Layer**: `fixed inset-0 z-[60] lg:hidden`. This is above the header (`z-20`) and below rejection dialogs (`z-[70]`).
- **Scrim**: `absolute inset-0 bg-grit-bg/70 backdrop-blur-sm`. Clicking it closes the drawer.
- **Panel**:
  - `role="dialog" aria-modal="true" aria-label="Menú de navegación"`.
  - `absolute right-0 top-0 h-dvh w-[336px] max-w-[86vw] flex flex-col gap-4 bg-grit-bg border-l border-grit-glass-border shadow-[-12px_0_40px_rgba(0,0,0,0.6)]`, padding `pt-[18px] px-4 pb-5`.
  - It slides **from right to left**: `translate-x-full` → `translate-x-0`, `transition-transform duration-200 ease-out`, `motion-reduce:transition-none`. The scrim fades in.
- **Header row**: logo (left) and a close button (38×38, `rounded-grit-md`, icon `close`, `aria-label="Cerrar menú"`).
- **Scroll region**: `flex-1 min-h-0 overflow-y-auto overscroll-contain grit-scrollbar` with `<PortalNavContent variant="drawer" onNavigate={onClose} />`. A bottom fade overlay (`pointer-events-none sticky bottom-0 h-14 bg-gradient-to-t from-grit-bg to-transparent`) shows only while the region can still scroll down.
- **Footer**: `GritDivider` + `PortalSidebarUser`, always visible.
- **Behavior**:
  - Close triggers: close button, scrim click, `Escape`, a pathname change (`usePathname` effect), and the viewport crossing ≥1024px (`matchMedia('(min-width: 1024px)')` change listener).
  - On open, focus moves to the close button. Focus is trapped inside the panel (Tab / Shift+Tab cycle). On close, focus returns to `returnFocusRef` (the hamburger).
  - While open, the page behind does not scroll. Set `overflow-hidden` on `document.body` and on the `<main>` scroll container (add `id="portal-main"` to look it up), and restore both on close.
  - The component stays unmounted while it has never been opened. After the first open it may stay mounted (closed) so the slide-out animation can play.

#### 6. Sidebar/drawer footer (`src/components/portal/PortalSidebarUser.tsx`)

- Avatar circle (36px) with the initials of `profile.nombre` + `profile.apellido` (or `foto_url` image when present, same treatment as `UserAvatarMenu`).
- Name `nombre apellido` (13px semibold, `truncate`). Below it:
  - Inside a tenant: the tenant role label (`Administrador` / `Entrenador` / `Atleta` for `usuario`).
  - Outside a tenant: `profile.email` (`truncate`).
- The whole name block links to `/portal/perfil`.
- Logout icon button (`logout`, `aria-label="Cerrar sesión"`) calls `useAuth().signOut()`, with the same logic as `UserAvatarMenu`.

#### 7. Shell wiring

- **`src/app/portal/layout.tsx`**: change the shell to two columns.
  ```tsx
  <div className="grit-shell flex h-screen overflow-hidden font-grit-body">
    <PortalSidebar profile={displayProfile} role={role} />
    <div className="flex min-w-0 flex-1 flex-col">
      <PortalHeader profile={displayProfile} role={role} />
      <main id="portal-main" className="flex-1 overflow-y-auto">
        <PortalBreadcrumb />
        <GritPageContainer>{children}</GritPageContainer>
      </main>
    </div>
  </div>
  ```
- **`PortalSidebar` and `PortalHeader`**: both are client components, and each calls `usePortalNavigation(role)` itself. The hook's fetches run in both; this is acceptable because the drawer's copy only matters below `lg`. Optionally, lift the hook into a small `PortalNavigationProvider` (client) in the layout so it runs once. Either approach is valid; the provider is preferred.
- **`src/components/portal/PortalHeader.tsx`**:
  - Remove `PortalNavMenu` and the vertical separator.
  - Logo link: `lg:hidden`, because on desktop the logo lives in the sidebar.
  - Right actions, in order: `NotificacionesBell`, `UserAvatarMenu`, then a **hamburger button** shown only below `lg`. The button is 38×38, `rounded-grit-md bg-grit-glass border border-grit-glass-border`, icon `menu`, with `aria-label="Abrir menú"`, `aria-expanded`, `aria-controls="portal-mobile-drawer"`, and `className="lg:hidden"`. It sits on the right because the drawer opens from the right.
  - Hold `drawerOpen` state and render `<PortalMobileDrawer>`.
- **Delete** `src/components/portal/PortalNavMenu.tsx` and `src/components/portal/RoleBasedMenu.tsx`.

#### 8. Styles and icons

- `src/app/globals.css`: add a `.grit-scrollbar` utility.
  - Firefox: `scrollbar-width: thin; scrollbar-color: rgb(20 219 196 / 0.6) transparent;`
  - WebKit: 3–4px thumb, `rgb(20 219 196 / 0.6)`, radius 2px, transparent track.
- `src/components/ui/grit/icon-map.ts`: add the design → Material equivalents used here: `building-2 → corporate_fare`, `trophy → emoji_events`, `credit-card → credit_card`, `ticket → confirmation_number`, `sliders-horizontal → tune`, `chevron-up → expand_less`, `chevron-right → chevron_right`, `x → close`, `menu → menu`, `log-out → logout`.

---

## Database Changes
None. The tenant name is read through the existing `useTenantName` (`tenants.nombre`, already allowed by current RLS). `tenants.logo_url` is **not** read.

---

## API / Server Actions
None. The feature reuses:
- `useTenantAccess(tenantId)`, which calls `tenantService.canUserAccessTenant` (`src/services/supabase/portal/tenant.service.ts`) to get the per-tenant role.
- `useTenantName(tenantId)`, which selects `nombre` from `tenants` for the org name.
- `useAuth().signOut()` for logout.

Server-side route guards (`(administrador)`, `(entrenador)`, `(atleta)`, `(shared)` layouts) remain the source of truth for authorization. The menu only hides links.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal.types.ts` | Add `PortalNavLeaf`, `PortalNavGroup`, `PortalNavNode`, `Resolved*` types, global menu constants, `TENANT_NAV_TREE`, `resolveGlobalMenu`, `resolveTenantNav`, `findActiveHref`. Remove `SHARED_TENANT_ITEMS`, `ROLE_TENANT_ITEMS`, `resolvePortalMenu` |
| Hook | `src/hooks/portal/usePortalNavigation.ts` | Return `globalItems`, `tenantNav` (with `tenantName`), `tenantLoading`, `activeHref`, `activeGroupId` |
| Component | `src/components/portal/PortalNavContent.tsx` | New: MENÚ + ORGANIZACIÓN sections, collapsible org dropdown and groups (`sidebar` / `drawer` variants) |
| Component | `src/components/portal/PortalSidebar.tsx` | New: desktop `<aside>` (≥ lg), logo, scrollable nav, user footer |
| Component | `src/components/portal/PortalMobileDrawer.tsx` | New: right-side drawer (< lg), scrim, focus trap, scroll lock, close triggers |
| Component | `src/components/portal/PortalSidebarUser.tsx` | New: avatar, name, role/email, profile link, logout |
| Component | `src/components/portal/PortalNavigationProvider.tsx` | New (preferred): client context that runs `usePortalNavigation` once for sidebar and header |
| Component | `src/components/portal/PortalHeader.tsx` | Remove `PortalNavMenu` and separator, hide logo on lg, add hamburger (< lg), own drawer state |
| Component | `src/components/ui/BodyPortal.tsx` | New: moved from `EventoModalShell.tsx`; export from `src/components/ui/index.ts` |
| Component | `src/components/portal/gestion-eventos/EventoModalShell.tsx` | Re-export `BodyPortal` from `@/components/ui` |
| Component | `src/components/portal/PortalNavMenu.tsx` | Delete |
| Component | `src/components/portal/RoleBasedMenu.tsx` | Delete (unused) |
| Layout | `src/app/portal/layout.tsx` | Two-column shell (sidebar + header/main), `id="portal-main"` on `<main>` |
| UI kit | `src/components/ui/grit/icon-map.ts` | Add icon mappings listed in §8 |
| Styles | `src/app/globals.css` | Add `.grit-scrollbar` |
| Docs | `projectspec/03-project-structure.md` | Document the new shell components, remove `PortalNavMenu`, update the `portal.types.ts` entry (nav tree, "Organizaciones" label, "Equipo › Reservas" not present) |

---

## Acceptance Criteria

**Layout and breakpoints**
1. At viewport width ≥ 1024px, a 280px sidebar is always visible on the left. The header shows no logo, no "Menú" dropdown and no hamburger.
2. At viewport width < 1024px, the sidebar is not rendered visibly. The header shows the logo on the left and, on the right, the bell, the avatar and a hamburger button.
3. The header dropdown `PortalNavMenu` no longer exists anywhere in the portal.

**Menu outside an organization** (`/portal/inicio`, `/portal/orgs`, `/portal/eventos`, `/portal/mis-*`)
4. The menu shows exactly, in this order: Inicio, Organizaciones, Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas. No "ORGANIZACIÓN" section is shown.

**Menu inside an organization** (`/portal/orgs/{tenant_id}/…`)
5. The same six items are shown under "MENÚ", followed by an "ORGANIZACIÓN" section.
6. The org header shows "Organización" and the **tenant name**. No tenant logo/image is requested. Verify in DevTools → Network that no request for the tenant's `logo_url` happens because of the menu.
7. A long tenant name is truncated with an ellipsis, and the full name is available on hover (`title`).
8. While the tenant role is resolving, a skeleton is shown in the ORGANIZACIÓN section. While the name is loading, a skeleton bar replaces the name. If the name cannot be loaded, only "Organización" is shown.
9. The **administrador** sees: Administración (Configuración, Escenarios, Disciplinas, Servicios, Planes), Equipo (Miembros, Suscripciones), Entrenamientos (Calendario, Reservas, Formularios), Eventos (Calendario, Check-in), Analítica.
10. The **entrenador** sees: Administración (Planes), Equipo (Atletas), Entrenamientos (Calendario, Reservas), Eventos (Check-in).
11. The **usuario** sees: Entrenamientos (Entrenamientos disponibles), Planes.
12. No "Reservas" item appears under Equipo for any role.
13. Every link navigates to its route from the table in §1. For example, Administración › Configuración → `/portal/orgs/{tenant_id}/gestion-organizacion`, and Entrenamientos › Calendario → `/portal/orgs/{tenant_id}/gestion-entrenamientos`.
14. If the user has no access to the tenant (access denied or pending activation), the ORGANIZACIÓN section is not shown. The existing server redirects remain unchanged.

**Active state and collapsing**
15. Exactly one link has `aria-current="page"`, chosen by longest-prefix match. On `/portal/orgs/{id}/gestion-eventos/nuevo`, "Eventos › Calendario" is active and "Organizaciones" is not.
16. The group that contains the active link shows a cyan icon and is expanded.
17. Clicking the org header collapses or expands the whole ORGANIZACIÓN section. Clicking a group header collapses or expands that group. The chevron and `aria-expanded` reflect the state.
18. In the sidebar and the drawer, only the group containing the active link starts expanded; the rest start collapsed. The "MENÚ" section can be collapsed and expanded from its header and starts expanded.

**Mobile drawer**
19. Tapping the hamburger opens a drawer that slides in from the **right edge toward the left**. The drawer sits above the header and page content, and a dimmed, blurred scrim covers the rest of the screen.
20. The drawer is the full viewport height (`100dvh`). Its logo/close header and user footer stay fixed, and the menu between them scrolls vertically. With every admin group expanded on a 390×844 viewport, all items, including Analítica, can be reached by scrolling.
21. The page behind the drawer does not scroll while the drawer is open.
22. The drawer closes when: tapping the close button, tapping the scrim, pressing `Escape`, tapping any menu link (after navigation), or resizing the viewport to ≥ 1024px.
23. On open, focus is on the close button. Tab and Shift+Tab stay inside the drawer. On close, focus returns to the hamburger.
24. With `prefers-reduced-motion: reduce`, the drawer appears without the slide animation.

**Desktop sidebar**
25. When the sidebar content is taller than the viewport, only the middle navigation area scrolls. The logo and the user footer remain visible.

**User footer (sidebar and drawer)**
26. The footer shows the avatar or initials and the full name. Below the name it shows the tenant role label inside a tenant, or the email outside one.
27. Clicking the name goes to `/portal/perfil`. Clicking the logout icon signs the user out.

**Visual**
28. Colors, spacing, typography and radii match nodes `E73seM` / `AGzMs`, using only `grit-*` tokens and `rounded-grit-*` radii (no `rounded-lg` / `rounded-xl`).

---

## Implementation Steps

- [ ] Add the nav types, global menu, `TENANT_NAV_TREE`, `resolveGlobalMenu`, `resolveTenantNav` and `findActiveHref` to `src/types/portal.types.ts`, and remove the old flat-menu code
- [ ] Rewrite `usePortalNavigation` (reuse `useTenantAccess` + `useTenantName`)
- [ ] (Preferred) Create `PortalNavigationProvider` and mount it in `portal/layout.tsx`
- [ ] Add icon mappings to `icon-map.ts` and `.grit-scrollbar` to `globals.css`
- [ ] Move `BodyPortal` to `src/components/ui/BodyPortal.tsx`, export it, and re-export it from `EventoModalShell.tsx`
- [ ] Build `PortalNavContent` (sections, org dropdown, groups, leaves, expansion state)
- [ ] Build `PortalSidebarUser`
- [ ] Build `PortalSidebar` and wire it into `portal/layout.tsx` (two-column shell, `id="portal-main"`)
- [ ] Build `PortalMobileDrawer` (portal, scrim, slide-in from right, focus trap, scroll lock, close triggers)
- [ ] Update `PortalHeader` (remove dropdown, hide logo on lg, add hamburger + drawer)
- [ ] Delete `PortalNavMenu.tsx` and `RoleBasedMenu.tsx`, and confirm no imports remain (`grep -r "PortalNavMenu\|RoleBasedMenu" src`)
- [ ] Test manually as administrador, entrenador and usuario, inside and outside a tenant, at 1440px, 1024px, 1023px and 390×844
- [ ] Verify there is no `logo_url` request from the menu (Network tab)
- [ ] Run `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: The menu is presentation only. Hiding a link never replaces the server guards in the `(administrador)`, `(entrenador)`, `(atleta)` and `(shared)` layouts, which stay unchanged. The per-tenant role comes from `miembros_tenant` (via `canUserAccessTenant`), never from the `portal_role` cookie, when inside a tenant.
- **Performance**: No new database queries. Reuse `useTenantAccess` and `useTenantName`, and do not fetch or render the tenant logo. Prefer the provider so these hooks run once per tenant change, not once per shell component. The drawer is not mounted until it is first opened.
- **Accessibility**:
  - The sidebar is an `<aside>` with a labelled `<nav>`. The drawer is `role="dialog"` + `aria-modal="true"` with a focus trap and focus return.
  - The hamburger has `aria-expanded` / `aria-controls`. Group and org toggles are `<button>` elements with `aria-expanded` / `aria-controls`.
  - The active link has `aria-current="page"`. All interactive elements (links, toggles, hamburger, close, logout) apply the kit’s `gritFocusRing` (`@/components/ui/grit/styles`).
  - `Escape` closes the drawer, and the slide animation respects `prefers-reduced-motion`.
  - Touch targets in the drawer are at least 40px tall.
- **Error handling**: If tenant access fails, the ORGANIZACIÓN section is hidden silently, matching today's behavior. If the tenant name fails to load, the label "Organización" is shown without a name. If logout fails, keep the current `UserAvatarMenu` behavior.
