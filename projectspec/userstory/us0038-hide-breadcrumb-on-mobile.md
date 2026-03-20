# US-0038 — Hide Breadcrumb on Mobile Devices

## ID
US-0038

## Name
Hide portal breadcrumb on mobile to prevent avatar obstruction

## As a
Authenticated user accessing the portal from a mobile device

## I Want
The breadcrumb navigation to be hidden on small screens

## So That
The header remains uncluttered on mobile and the user avatar / notification button are always fully visible and accessible

---

## Description

### Current State
The `PortalHeader` renders on a single horizontal row:
- **Left side**: logo → vertical divider → nav menu → vertical divider → `PortalBreadcrumb`
- **Right side**: notifications icon → `UserAvatarMenu`

On desktop this layout works correctly. On mobile viewports, however, the breadcrumb string (which can be several segments long, e.g. `Inicio › Orgs › Gym XYZ › Entrenamientos`) expands the left side and pushes the right-side avatar/notification controls partially or entirely off-screen, making them inaccessible.

### Proposed Changes

Hide `PortalBreadcrumb` on mobile viewports (`< md`, i.e. < 768 px) using Tailwind's responsive prefix.

The change is purely presentational — no data, state, or routing logic is affected.

**Approach**: Wrap the `<PortalBreadcrumb />` usage inside `PortalHeader.tsx` with a `hidden md:block` container div. This keeps the breadcrumb component itself clean and reusable, and is the idiomatic Tailwind / Next.js pattern for responsive visibility.

```tsx
{/* Breadcrumb — hidden on mobile to keep avatar accessible */}
<div className="hidden md:flex items-center gap-2">
  <div className="h-5 w-px bg-portal-border" />
  <PortalBreadcrumb />
</div>
```

> **Note**: The existing `<div className="h-5 w-px bg-portal-border" />` separator that precedes `<PortalBreadcrumb />` must also be hidden on mobile, since it has no meaning without the breadcrumb next to it.

**Current markup in `PortalHeader.tsx` (left section)**:
```tsx
<PortalNavMenu role={role} />
<div className="h-5 w-px bg-portal-border" />
<PortalBreadcrumb />
```

**After change**:
```tsx
<PortalNavMenu role={role} />
<div className="hidden md:flex items-center gap-2">
  <div className="h-5 w-px bg-portal-border" />
  <PortalBreadcrumb />
</div>
```

No changes are required to `PortalBreadcrumb.tsx` itself.

---

## Database Changes
None.

---

## API / Server Actions
None.

---

## Files to Create or Modify

| Area      | File                                                   | Change                                                                             |
|-----------|--------------------------------------------------------|------------------------------------------------------------------------------------|
| Component | `src/components/portal/PortalHeader.tsx`               | Wrap divider + `<PortalBreadcrumb />` in `<div className="hidden md:flex ...">` |

---

## Acceptance Criteria

1. On viewports narrower than `768 px` (`md` breakpoint), the breadcrumb and its preceding divider are **not rendered** in the DOM (Tailwind `hidden` applies `display: none`).
2. On viewports `≥ 768 px`, the breadcrumb and divider are **fully visible** and behave exactly as before.
3. On mobile, the `UserAvatarMenu` and notification button in the right section of the header are **fully visible** and **clickable** at all tested widths (320 px, 375 px, 414 px).
4. No visual regression on desktop (≥ 768 px): logo, nav menu, breadcrumb, notifications, and avatar all appear correctly.
5. The `PortalBreadcrumb` component file itself is **not modified**.

---

## Implementation Steps

- [ ] Open `src/components/portal/PortalHeader.tsx`
- [ ] Locate the left-section block containing the second `<div className="h-5 w-px bg-portal-border" />` (the one before `<PortalBreadcrumb />`)
- [ ] Wrap that divider and `<PortalBreadcrumb />` together in `<div className="hidden md:flex items-center gap-2">`
- [ ] Verify in the browser at mobile widths (e.g., DevTools → 375 px) that the breadcrumb is hidden and the avatar is fully accessible
- [ ] Verify at desktop widths (e.g., 1280 px) that the breadcrumb still appears correctly
- [ ] Run `pnpm lint` and `pnpm build` to confirm no type or lint errors

---

## Non-Functional Requirements

- **Accessibility**: The breadcrumb `<nav aria-label="Ruta actual">` is hidden via `display: none` (`hidden` class), not `visibility: hidden` or `opacity-0`, so it is correctly excluded from the accessibility tree on mobile — no phantom focusable links for screen reader / keyboard users.
- **Performance**: No additional JS, hooks, or network requests. Pure CSS visibility change — zero runtime cost.
- **Security**: No security implications; purely presentational.
- **Error handling**: N/A.
