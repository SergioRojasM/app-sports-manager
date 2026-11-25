# Design

## Context

See `proposal.md` (Why/What) and the specs (`app-public-home`, `tenant-marketplace-visibility`, `team-events-discovery`). Constraints that shape the approach:

- **Events**: `eventosService.listEventosPublicados({ soloPublicos: true })` already works for `anon` (explicit filters in `publicadosQuery` + RLS) and returns `EventoPublicoListItem[]` ordered by `fecha_hora` asc, nulls last. `/eventos` already features the first event as "Próximo" (`team-events-discovery`) — the home reuses that rule.
- **Organizations**: `public.tenants` is readable only by `authenticated` (`tenants_select_authenticated`). Discipline names live in `public.disciplinas (tenant_id, nombre, activo)`; members in `public.miembros_tenant (tenant_id, rol_id, estado)` with roles `administrador | entrenador | usuario` in `public.roles`.
- **Images**: the `org-assets` bucket is **private**. `tenants.logo_url` / `banner_url` and event `banner_url` store **1-year signed URLs** (`SIGNED_URL_TTL`), which load for anyone. `useTenantBrandingImages` (`src/hooks/portal/tenant/`) refreshes a failing URL via `createSignedUrl`, which only works for authorized members — for anon it resolves to `null` (fallback).
- **Image rendering convention**: remote images are rendered with `<img>` + `eslint-disable-next-line @next/next/no-img-element` (e.g. `EventoPublicoCard`); `next.config.ts` has no `remotePatterns`. Local assets use `next/image`.
- **Reusable helpers**: `getDisciplinaVisual(nombre)` (`src/lib/portal/disciplina-visual.ts`) → Material Symbols icon + `text-grit-discipline-*` class; `formatEventoPrecio(precio)` (`src/lib/portal/eventos.utils.ts`) → "Gratis" / "COP x" / "Desde COP x"; `buildEventoLandingDetalleHref(id, { from })` (`src/lib/portal/eventos-publicos.utils.ts`); `GritIcon`, `cx` and grit kit (`@/components/ui`).
- **Icons**: the app uses Material Symbols through `GritIcon`. Design (lucide) → code: `shield`→`shield`, `map-pin`→`location_on`, `arrow-up-right`→`north_east`, `arrow-right`→`arrow_forward`, `crown`→`workspace_premium`, `users`→`group`, `lock`→`lock`, `chevrons-down`→`keyboard_double_arrow_down`, `menu`/`close`, `calendar-clock`→`event_upcoming`.
- **Session**: `createClient()` from `@/services/supabase/server` (async) gives `auth.getUser()` in server components; middleware already refreshes the session for `/`.

## Goals / Non-Goals

**Goals:**
- A home that matches Pencil frames `T9KXek` / `XWAjJ` / `ldXx5` using only `grit-*` tokens and existing helpers.
- Anonymous read of a minimal organizations projection without widening `tenants` RLS.
- Motion that is pausable and disabled under reduced motion (WCAG 2.2.2), with no JS per animation frame.

**Non-Goals:**
- SSR data fetching for events/organizations (client hooks, consistent with `/eventos`; the page shell and hero render server-side).
- Making `org-assets` public or regenerating URLs for anon.
- A shared design-system package with the external landing.

## Architecture

```
src/app/page.tsx  (server: getUser → isAuthenticated, metadata)
└── components/home/HomePage (client boundary per section)
    ├── HomeHeader ─────────── hooks/home/useHeaderScrolled
    ├── HomeHero
    │   └── HeroVideoBackground ── hooks/home/usePrefersReducedMotion
    ├── EventosCintaSection ── hooks/home/useHomeEventos ── eventosService.listEventosPublicados({soloPublicos, limit:12})
    │   ├── EventoCintaCard (lib: getDisciplinaVisual, formatEventoPrecio, home.utils.formatFechaBadge)
    │   └── EventosCintaSkeleton
    ├── OrganizacionesSection ─ hooks/home/useOrganizacionesDestacadas ─ organizacionesPublicasService.listDestacadas(6)
    │   └── OrganizacionCard ── hooks/portal/tenant/useTenantBrandingImages (logo/banner fallback)
    ├── ClubCtaBand (lib: home.utils.getLandingUrl)
    └── HomeFooter
                                         │
                                         ▼  supabase.rpc('listar_organizaciones_destacadas', { p_limit })
                              SECURITY DEFINER fn → tenants(publico) + disciplinas + miembros_tenant/roles
```

## Decisions

### D1 — RPC (`SECURITY DEFINER`) instead of an `anon` policy on `tenants`
`listar_organizaciones_destacadas(p_limit)` returns only `id, nombre, descripcion, logo_url, banner_url, disciplinas[], total_atletas` for `publico` tenants (excluding the internal `public` tenant, same rule as the directory), capped at 24; `revoke all … from public; grant execute … to anon, authenticated`; `set search_path = public`; `language sql stable`.
- **Why**: an `anon` SELECT policy on `tenants` would expose every column (email, phone, `max_solicitudes`, social URLs) because RLS is row-level. A view would need its own grants and still be `security_invoker` concerns; the function gives a precise projection plus aggregated counts in one round-trip.
- **Alternatives**: public view with `security_invoker = false` (equivalent, but aggregates/limit clamping are cleaner in a function); server-side fetch with the service client (bypasses RLS from Next — avoided, the project keeps service role for internal routes only).

### D2 — Featured event = soonest ("PRÓXIMO")
No schema change; consistent with `/eventos` "Próximo" featured card (team-events-discovery). The ribbon label reads "PRÓXIMO".

### D3 — Marquee in pure CSS with a duplicated track
`@keyframes home-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`; `.home-marquee { animation: home-marquee var(--home-marquee-duration) linear infinite }`; `.home-marquee-wrap:hover .home-marquee, .home-marquee-wrap:focus-within .home-marquee { animation-play-state: paused }`; `@media (prefers-reduced-motion: reduce) { .home-marquee { animation: none } }`. Duration = `items.length * 6s` set inline via CSS variable. The second copy is wrapped in `<div aria-hidden="true">` and its links get `tabIndex={-1}`. Enabled only when `items.length >= 4` and `md:` (class `md:home-marquee`-equivalent applied via `max-md:animate-none` / `md:` wrapper). Below `md` the track is `overflow-x-auto snap-x snap-mandatory` and only one copy is rendered.
- **Why**: GPU-only transform, no rAF loop, trivially pausable, respects reduced motion with no JS.
- **Alternative**: JS carousel library — unnecessary dependency.

### D4 — Mobile dots via IntersectionObserver
Each card in the mobile track is observed (`threshold: 0.6`, root = track); the most visible index drives the active dot. Dots are `aria-hidden` (decorative).

### D5 — Video component with reduced-motion switch
`usePrefersReducedMotion()` uses `matchMedia` with a change listener and returns `false` during SSR / first render, so the server renders the poster `next/image` (`priority`) **and** the client mounts the `<video>` only when motion is allowed (`useEffect`), avoiding a video download for reduced-motion users. `<video autoPlay muted loop playsInline preload="metadata" poster aria-hidden>` with WebM then MP4 sources; positioned over the poster.
- **Trade-off**: users with motion get the poster first and the video fades in (opacity transition on `canplay`) — acceptable and avoids layout shift.

### D6 — Reuse `useTenantBrandingImages` for logos/banners
`OrganizacionCard` builds a `TenantIdentityPayload` (`tenantId`, `name`, `description`, `logoUrl`, `bannerUrl`, `foundedAt: null`) and uses the hook's `logoSrc/onLogoError` and `bannerSrc/onBannerError`. For anon, the refresh attempt fails and resolves to `null` → initials fallback (logo) / gradient (banner).
- **Why**: one fallback implementation (spec "Tenant branding image fallback SHALL be shared").

### D7 — Session read on the server, no redirect
`src/app/page.tsx` is an async server component: `const { data: { user } } = await (await createClient()).auth.getUser()` → `isAuthenticated = Boolean(user)`. Errors → treated as anonymous. Passed down as a prop (no client auth hook needed on the home).

### D8 — Landing URL helper
`getLandingUrl()` in `src/lib/home/home.utils.ts`: `(process.env.NEXT_PUBLIC_LANDING_URL || 'https://grit-arena.com').replace(/\/+$/, '')`.

### D8b — Ribbon price
`formatPrecioCinta(precio)` in `home.utils.ts`: "Gratis" when there is no price or the cheapest ticket costs 0 (the shared `formatEventoPrecio` would print "Desde $ 0"), otherwise delegates to `formatEventoPrecio` (app currency format `$ 80.000`).

### D9 — Date badge in Bogotá
`formatFechaBadge(fechaHora)` → `{ day: '23', month: 'NOV' } | null` using `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short' })`, month uppercased without the trailing dot. `null` → "POR DEFINIR".

### D10 — Header nav for public pages
`src/components/landing/Header.tsx` keeps its structure but `navItems` becomes `[{ label: 'Eventos', href: '/eventos' }, { label: 'Organizaciones', href: '/#organizaciones' }]`; the `PlataformaDropdown` component is removed as dead code.

### D11 — Deletions verified by grep
Delete only files with no remaining import (verified with `grep -rn` before removing). CSS utilities removed only if no `className` references remain: `.landing-hero-overlay`, `.landing-hero-glow`, `.landing-value-item`, `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector`. `--landing-*` tokens and `.landing-shell`, `.landing-panel`, `.landing-nav-link`, buttons stay (used by `Header`, `Footer`, `ComingSoonPage`, `eventos/*`).

## Risks / Trade-offs

- [Signed URLs in `logo_url` expire after 1 year → anon sees initials until an admin re-uploads] → fallback is graceful; out of scope to make assets public (Non-goal); documented.
- [Hero video weight (~1.8 MB WebM) on mobile data] → `preload="metadata"`, poster first, not mounted under reduced motion; can later add `saveData` check without spec changes.
- [Marquee distracts / WCAG 2.2.2] → pause on hover/focus, disabled with reduced motion, no auto-scroll on mobile.
- [Duplicate items read twice by screen readers] → second copy `aria-hidden` + `tabIndex=-1`.
- [RPC counts with many tenants] → limit ≤ 24 and correlated subqueries over FK-indexed columns; fine at current scale.
- [Removing `public/landing/**` breaks a reference] → grep for `/landing/` in `src` before deletion.

## Migration Plan

1. Add `supabase/migrations/20261114120000_listar_organizaciones_destacadas.sql`; apply **locally only** (`npx supabase migration up` or `db reset`); never push to the remote project.
2. Deploy app code (page + components) together with the migration in the normal release; until the function exists remotely, the organizations section hides itself (error → hidden), so the home degrades gracefully.
3. Rollback: revert the app commit; the function can stay (read-only, harmless) or be dropped with `drop function public.listar_organizaciones_destacadas(integer);`.
