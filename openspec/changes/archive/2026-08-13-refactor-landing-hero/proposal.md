## Why

The current landing hero does not match the new GRIT Arena brand direction and weakens the first impression for anonymous visitors evaluating the platform. The update is needed now because the visual reference, design system, and runtime asset requirements are already defined, and the current hero still presents outdated typography, layout, and imagery.

## What Changes

- Refactor the landing header to use the new GRIT Arena logo treatment, desktop navigation labels, and login CTA aligned with the approved design direction.
- Rebuild the landing hero to use the new cinematic sports background, updated headline/body copy, CTA hierarchy, and turquoise accent treatment.
- Add a product-focused value proposition row under the hero with five differentiators: Procesos, Seguimiento, Comunidad, Enfoque, and Analitica.
- Introduce landing-specific typography and visual tokens so Rajdhani and Montserrat can be adopted without regressing portal screens.
- Move the provided logo and hero background into `public/landing/` for runtime-safe asset usage.
- Re-enable the pricing section and add missing landing anchors required by the new header navigation.

## Capabilities

### New Capabilities
- `landing-hero`: Defines the branded landing header and hero experience, including navigation anchors, hero copy, CTA behavior, runtime assets, responsive layout, and product-differentiator value props.

### Modified Capabilities
- None. No existing OpenSpec capability currently defines landing-page hero behavior.

## Impact

**Affected code**:
- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/app/page.tsx`
- `src/components/landing/Header.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/TrustedBySection.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/HeroValueProps.tsx` (new)
- `public/landing/logo-navbar.png` (new)
- `public/landing/landing-hero-background.png` (new)

**No impact to**:
- Database schema, migrations, or RLS policies
- API routes, server actions, or Supabase services
- Auth flow behavior beyond existing `/auth/login` navigation targets

## Non-Goals

- Redesigning the rest of the landing page sections beyond anchor support and visual continuity adjustments
- Introducing new backend capabilities, data models, or analytics pipelines
- Changing portal navigation, authenticated layouts, or portal typography globally
- Adding a mobile hamburger menu or a broader marketing-site information architecture

## Files to be Modified or Created

| File | Type | Change |
|------|------|--------|
| `src/app/layout.tsx` | Modify | Load Rajdhani and Montserrat in a landing-safe way |
| `src/app/globals.css` | Modify | Add landing-specific tokens, overlays, typography, and CTA utilities |
| `tailwind.config.ts` | Modify | Extend reusable landing fonts and brand tokens |
| `src/app/page.tsx` | Modify | Re-enable `PricingSection` and preserve landing composition |
| `src/components/landing/Header.tsx` | Modify | Refactor landing navigation and login CTA |
| `src/components/landing/HeroSection.tsx` | Modify | Rebuild hero layout, copy, assets, and CTA structure |
| `src/components/landing/HeroValueProps.tsx` | Create | Render the five landing differentiators under the hero |
| `src/components/landing/TrustedBySection.tsx` | Modify | Add `trusted-by` anchor support |
| `src/components/landing/Footer.tsx` | Modify | Add `footer` anchor support |
| `public/landing/logo-navbar.png` | Create | Add runtime-safe logo asset |
| `public/landing/landing-hero-background.png` | Create | Add runtime-safe background asset |

## Step-by-Step Implementation Plan

1. Add runtime landing assets under `public/landing/` and wire font loading for Rajdhani and Montserrat.
2. Extend shared landing tokens in `globals.css` and `tailwind.config.ts` without affecting portal pages.
3. Refactor `Header.tsx` and `HeroSection.tsx`, extracting `HeroValueProps.tsx` for the differentiator row.
4. Re-enable `PricingSection` and add missing section IDs used by header anchors.
5. Validate responsive behavior, in-page navigation, asset rendering, and portal non-regression.