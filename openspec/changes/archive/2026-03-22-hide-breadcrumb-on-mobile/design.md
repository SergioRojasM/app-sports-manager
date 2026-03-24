## Context

`PortalHeader` renders its left section with: logo → divider → nav menu → divider → breadcrumb. On mobile, the breadcrumb can be several segments long, causing the right-side controls (notifications, avatar) to overflow off-screen. The fix must leave desktop behaviour untouched.

## Goals / Non-Goals

**Goals:**
- Hide the `PortalBreadcrumb` and its preceding divider on viewports < 768 px (`md` breakpoint)
- Ensure `UserAvatarMenu` and notification button remain fully accessible at all mobile widths
- Zero runtime cost — pure CSS visibility change

**Non-Goals:**
- Modifying `PortalBreadcrumb.tsx` itself
- Adding a collapsible or alternative mobile breadcrumb
- Changing any other header elements or breakpoints
- Restructuring the header layout beyond the targeted wrapper

## Decisions

**Decision: Wrap breadcrumb + divider in a single responsive container (`hidden md:flex`)**

Using Tailwind's `hidden md:flex` on a wrapper `<div>` is the idiomatic Next.js / Tailwind pattern for conditional responsive visibility. The wrapper applies `display: none` on mobile (removing both elements from layout and accessibility tree) and `display: flex` on ≥ md, preserving the existing `items-center gap-2` alignment.

Alternatives considered:
- `md:hidden` on `PortalBreadcrumb` and divider separately — more verbose, risks drift if elements change
- CSS media query in a stylesheet — not idiomatic in this Tailwind-first codebase
- Dynamic rendering via `useMediaQuery` hook — unnecessary JS overhead for a pure visibility concern

**Decision: Do not touch `PortalBreadcrumb.tsx`**

The component itself has no mobile-specific concerns. Keeping it clean and reusable is preferable. Visibility is a layout-level concern, owned by the parent header.

## Risks / Trade-offs

- **[Risk]** Future developers may not notice breadcrumb is wrapped and add elements outside the wrapper → **Mitigation**: JSX comment added explaining the hidden wrapper purpose
- **[Risk]** Tailwind purge removes `hidden` or `md:flex` classes → **Mitigation**: Both are core Tailwind utilities included by default; no safelisting needed

## Migration Plan

Single-file change. No deployment steps, no rollback needed beyond reverting the wrapper `<div>`.
