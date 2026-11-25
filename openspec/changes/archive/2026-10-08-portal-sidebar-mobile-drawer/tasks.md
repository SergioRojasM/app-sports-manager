## 1. Branch setup

- [x] 1.1 Create branch `feat/portal-sidebar-mobile-drawer` from `develop`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Page / layout (shell contract)

- [x] 2.1 Restructure `src/app/portal/layout.tsx` into the two-column shell:
  - root `grit-shell flex h-screen overflow-hidden font-grit-body`;
  - wrapped in `<PortalNavigationProvider role={role}>`;
  - `<PortalSidebar profile={displayProfile} />`;
  - right column `flex min-w-0 flex-1 flex-col` with `PortalHeader` and `<main id="portal-main" className="flex-1 overflow-y-auto">` (breadcrumb + `GritPageContainer`)

## 3. Components

- [x] 3.1 Move `BodyPortal` from `src/components/portal/gestion-eventos/EventoModalShell.tsx` to `src/components/ui/BodyPortal.tsx`, export it from `src/components/ui/index.ts`, and re-export it from `EventoModalShell.tsx` so existing imports keep working
- [x] 3.2 Create `src/components/portal/PortalNavContent.tsx` (`variant: 'sidebar' | 'drawer'`, `onNavigate?`) with the "MENÚ" section: `text-grit-muted` overline and six global links (icon 18px, 14/15px label). Active style: cyan gradient + `grit-glass-border` + cyan icon. Every link sets `aria-current="page"` and applies `gritFocusRing`
- [x] 3.3 In `PortalNavContent`, add the "ORGANIZACIÓN" section, rendered when `tenantNav` exists or while `tenantLoading` (skeleton):
  - `GritDivider` + overline;
  - `bg-grit-glass` dropdown with `grit-glass-border` and `rounded-grit-lg`;
  - toggle header with a static `shield` tile, "Organización" and the tenant name (`truncate`, `title`). A skeleton bar shows while the name is null. No logo.
- [x] 3.4 In `PortalNavContent`, render group nodes:
  - button headers with `aria-expanded` / `aria-controls`, chevron `expand_more` / `chevron_right`, and a cyan icon when the group holds the active link;
  - children list indented 18px with a `border-l border-white/[0.08]` guide line; active child `bg-grit-cyan/10 text-grit-cyan font-semibold`;
  - top-level leaves (Analítica, Planes for usuario) rendered as links without a chevron
- [x] 3.5 In `PortalNavContent`, implement expansion state:
  - org section open by default;
  - both variants: only `activeGroupId` open, other groups collapsed; the "MENÚ" section is a collapsible toggle, open by default;
  - reset per tenant id; force-expand `activeGroupId` when it changes
- [x] 3.6 Create `src/components/portal/PortalSidebarUser.tsx`:
  - avatar (`foto_url`) or initials, name (`truncate`), and the role label (Administrador / Entrenador / Atleta) inside a tenant or the email outside;
  - the name block links to `/portal/perfil`;
  - logout icon button (`aria-label="Cerrar sesión"`) using the same `useAuth().signOut()` flow as `UserAvatarMenu`
- [x] 3.7 Create `src/components/portal/PortalSidebar.tsx`:
  - `<aside aria-label="Navegación principal">`, `hidden lg:flex w-[280px] shrink-0 flex-col gap-5 h-full bg-grit-sidebar border-r border-grit-glass-border pt-7 px-4 pb-5`;
  - logo `/logo-navbar.png` linking to `/portal`;
  - scroll region `flex-1 min-h-0 overflow-y-auto overscroll-contain grit-scrollbar` with `PortalNavContent variant="sidebar"`;
  - `GritDivider` + `PortalSidebarUser`
- [x] 3.8 Create `src/components/portal/PortalMobileDrawer.tsx`, rendered via `BodyPortal` and not mounted before the first open:
  - layer `fixed inset-0 z-[60] lg:hidden`;
  - scrim `bg-grit-bg/70 backdrop-blur-sm` (fade);
  - right-anchored panel `role="dialog" aria-modal="true" aria-label="Menú de navegación"`, `id="portal-mobile-drawer"`, `h-dvh w-[336px] max-w-[86vw] bg-grit-bg border-l border-grit-glass-border` with a left shadow;
  - slide `translate-x-full → translate-x-0` over 200ms, `motion-reduce:transition-none`
- [x] 3.9 In `PortalMobileDrawer`, build the panel layout:
  - header row: logo + 38px close button (`close` icon, `aria-label="Cerrar menú"`);
  - scroll region `flex-1 min-h-0 overflow-y-auto overscroll-contain grit-scrollbar` with `PortalNavContent variant="drawer" onNavigate={onClose}`;
  - bottom fade shown only while more content is below;
  - footer: `GritDivider` + `PortalSidebarUser`
- [x] 3.10 In `PortalMobileDrawer`, implement behavior:
  - close on X, scrim, Escape, pathname change, and `matchMedia('(min-width: 1024px)')` becoming true;
  - focus the close button on open; trap Tab / Shift+Tab inside the panel; return focus to the hamburger ref on close;
  - lock `overflow` on `document.body` and `#portal-main` while open, restoring both in the effect cleanup
- [x] 3.11 Update `src/components/portal/PortalHeader.tsx`:
  - remove `PortalNavMenu` and the vertical separator;
  - logo link `lg:hidden`;
  - add the hamburger after `UserAvatarMenu`: `lg:hidden`, 38px `rounded-grit-md bg-grit-glass border border-grit-glass-border`, `menu` icon, `aria-label="Abrir menú"`, `aria-expanded`, `aria-controls="portal-mobile-drawer"`;
  - own the `drawerOpen` state and hamburger ref, and render `PortalMobileDrawer`
- [x] 3.12 Delete `src/components/portal/PortalNavMenu.tsx` and `src/components/portal/RoleBasedMenu.tsx`. Verify `grep -rn "PortalNavMenu\|RoleBasedMenu" src` returns nothing

## 4. Hook

- [x] 4.1 Rewrite `src/hooks/portal/usePortalNavigation.ts` to return `{ activePath, activeHref, globalItems, tenantNav, tenantLoading, activeGroupId }`:
  - reuse `useTenantAccess(tenantId)` and `useTenantName(tenantId)`;
  - `tenantNav` is null when there is no tenant, access is denied, or the role is null;
  - `activeHref = findActiveHref(pathname, [...global hrefs, ...tenant leaf hrefs])`
- [x] 4.2 Create `src/components/portal/PortalNavigationProvider.tsx`: a client context that calls `usePortalNavigation(role)` once and exposes `usePortalNavigationContext()`, which throws if used outside the provider. Consume it from `PortalSidebar` and `PortalHeader`

## 5. Service

- [x] 5.1 Confirm no service changes are needed. `tenantService.canUserAccessTenant` (via `useTenantAccess`) and the `tenants.nombre` select (via `useTenantName`) are reused, and `tenants.logo_url` is not read anywhere in the navigation

## 6. Types

- [x] 6.1 In `src/types/portal.types.ts`, add `PortalNavLeaf`, `PortalNavGroup`, `PortalNavNode`, `ResolvedNavLeaf`, `ResolvedNavGroup` and `ResolvedNavNode`
- [x] 6.2 Add the global menu constants and `resolveGlobalMenu()`: Inicio, Organizaciones, Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas, with icons `home`, `corporate_fare`, `emoji_events`, `credit_card`, `event_available`, `confirmation_number`
- [x] 6.3 Add `TENANT_NAV_TREE` as specified (Administración, Equipo, Entrenamientos, Eventos, the Planes leaf for usuario, the Analítica leaf for administrador; per-leaf `roles`; `labelByRole.usuario = 'Entrenamientos disponibles'` on `gestion-entrenamientos`; no "Equipo › Reservas"). Add `resolveTenantNav(role, tenantId)`, which drops empty groups
- [x] 6.4 Add `findActiveHref(pathname, hrefs)` (longest-prefix match) and remove `SHARED_TENANT_ITEMS`, `ROLE_TENANT_ITEMS`, `resolvePortalMenu` and the now-unused menu item constants

## 7. Styles and icons

- [x] 7.1 Add the `.grit-scrollbar` utility to `src/app/globals.css`:
  - Firefox: `scrollbar-width: thin`, `scrollbar-color` cyan 60% on transparent;
  - WebKit: 4px thumb, 2px radius, transparent track
- [x] 7.2 Add the Lucide → Material entries to `src/components/ui/grit/icon-map.ts`: `building-2`, `trophy`, `credit-card`, `ticket`, `sliders-horizontal`, `chevron-up`, `chevron-right`, `x`, `menu`, `log-out`

## 8. Verification

- [x] 8.1 Manual check outside a tenant (`/portal/inicio`, `/portal/mis-entradas`): exactly six MENÚ items, no ORGANIZACIÓN section, correct single active link
- [x] 8.2 Manual check inside a tenant as administrador, entrenador and usuario: each role sees the exact tree from the spec, there is no "Equipo › Reservas", every link opens its route, and the tenant name shows without a logo (Network tab: no `logo_url` request from the menu)
- [x] 8.3 Manual check of the active state: `/portal/orgs/{id}/gestion-eventos/nuevo` activates only Eventos › Calendario; the active group has a cyan icon and is expanded; org/group toggles update `aria-expanded`
- [x] 8.4 Manual check of the desktop layout at 1440px and 1024px: the sidebar is visible and only its middle area scrolls; the header shows no logo, dropdown or hamburger; the widest pages (analítica, gestion-equipo, entrenamientos calendar) still lay out correctly
- [x] 8.5 Manual check of the mobile drawer at 1023px and 390×844:
  - opens from the right above the content with a scrim; every admin item, including Analítica, is reachable by scrolling; the background does not scroll;
  - closes on X, scrim, Escape, link tap and resize to ≥1024px;
  - focus goes to the close button, is trapped, and returns to the hamburger;
  - no slide animation with reduced motion
- [x] 8.6 Verify the event modals that use `BodyPortal` still render correctly after the move

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md`:
  - add `PortalSidebar`, `PortalMobileDrawer`, `PortalNavContent`, `PortalSidebarUser` and `PortalNavigationProvider` to the portal shell section;
  - remove `PortalNavMenu` (and update the `PortalHeader` note: hamburger, logo `lg:hidden`);
  - update the `portal.types.ts` entry (global menu, `TENANT_NAV_TREE`, `resolveTenantNav`, `findActiveHref`, "Organizaciones" label, no "Equipo › Reservas");
  - update `usePortalNavigation` and add `ui/BodyPortal.tsx` and `.grit-scrollbar`

## 10. Quality gates and delivery

- [x] 10.1 Run `npx tsc --noEmit` and fix any type errors
- [x] 10.2 Run `npm run lint` and fix any lint errors
- [x] 10.3 Run the tests. The project has no automated test runner, so record the manual verification results from section 8 (do not run a build)
- [x] 10.4 Write the commit message (conventional commits, e.g. `feat(portal): replace header nav dropdown with sidebar and mobile drawer`) and the pull request description (summary, US-0138 link, design nodes `E73seM` / `AGzMs`, role tree, screenshots desktop/mobile, verification checklist)
