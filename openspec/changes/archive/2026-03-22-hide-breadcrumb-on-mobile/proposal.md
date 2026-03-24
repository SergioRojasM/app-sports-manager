## Why

On mobile viewports (< 768 px), the `PortalBreadcrumb` component expands the left side of `PortalHeader` and pushes the `UserAvatarMenu` and notification button off-screen, making them inaccessible. This is a usability defect that needs fixing before wider mobile usage of the portal.

## What Changes

- Wrap the breadcrumb divider and `<PortalBreadcrumb />` inside a `<div className="hidden md:flex items-center gap-2">` container in `PortalHeader.tsx`
- The divider preceding `<PortalBreadcrumb />` is included in the same wrapper so it is also hidden on mobile
- No changes to `PortalBreadcrumb.tsx` itself

## Capabilities

### New Capabilities
<!-- None — this is a purely presentational fix with no new user-facing capabilities -->

### Modified Capabilities
<!-- No spec-level requirement changes; this is an implementation-only fix -->

## Impact

- **File modified**: `src/components/portal/PortalHeader.tsx`
- **No API, database, routing, or state changes**
- Affects all portal pages on mobile viewports (breadcrumb is hidden)
- The breadcrumb remains fully visible and functional on desktop (≥ 768 px)
- Accessibility: `display: none` removes the breadcrumb from the accessibility tree on mobile — no phantom focusable links for screen readers / keyboard users

## Non-goals

- Replacing or redesigning the breadcrumb component
- Adding a mobile-specific navigation alternative
- Modifying any other header elements or layout
- Changing breakpoints or responsive behaviour of other portal shell components

## Files to Modify

| File | Change |
|------|--------|
| `src/components/portal/PortalHeader.tsx` | Wrap divider + `<PortalBreadcrumb />` in `<div className="hidden md:flex items-center gap-2">` |

## Implementation Plan

1. Open `src/components/portal/PortalHeader.tsx`
2. Locate the left-section block containing the second `<div className="h-5 w-px bg-portal-border" />` (the separator before `<PortalBreadcrumb />`)
3. Wrap that divider and `<PortalBreadcrumb />` together in `<div className="hidden md:flex items-center gap-2">`
4. Verify at mobile widths (375 px) that breadcrumb is hidden and avatar is accessible
5. Verify at desktop widths (1280 px) that breadcrumb still appears correctly
6. Run `pnpm lint` and `pnpm build` to confirm no errors
