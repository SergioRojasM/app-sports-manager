# US-0140 — App Public Home (Hero Video, Upcoming Events Ribbon, Organizations)

## ID
US-0140

## Name
Replace the marketing landing at the app root (`/`) with a public app home: a centered hero over a looping video, a premium auto-scrolling ribbon of upcoming public events, and a showcase of public organizations with their logos

## As a
Visitor or athlete (anonymous or signed in) arriving at the GRIT Arena app

## I Want
To immediately see what is happening on the platform — upcoming events I can get tickets for and the clubs that train on GRIT Arena — with clear paths to the full events listing and to sign in

## So That
- The app root becomes a useful entry point for athletes instead of a B2B sales page (the marketing landing moved to its own repo in US-0139).
- Public events get more visibility and ticket conversion.
- Organizations get exposure, driving sign-ups and membership requests.

---

## Description

### Current State
- `src/app/page.tsx` renders the old marketing landing (`src/components/landing/{Header,HeroSection,ProblemSolutionSection,operation,administration,PricingSection,Footer}`), which now lives in the separate `grit-arena/landing` repo (US-0139) and is pending removal here.
- Public events are already available anonymously: `eventosService.listEventosPublicados({ soloPublicos: true })` (`src/services/supabase/portal/eventos.service.ts`) returns `EventoPublicoListItem[]` (US-0120), used by `/eventos` through `useEventosLanding`.
- `public.tenants` is only readable by `authenticated` (`tenants_select_authenticated`, `using (true)`); `anon` cannot read organizations. `tenants.publico` (US-0133) marks organizations visible in the marketplace. There is no city column on `tenants`.
- The organizations marketplace lives at `/portal/orgs` (`src/app/portal/orgs/page.tsx`, `PortalTenantsPage`) and requires a session (middleware protects `/portal`).

### Design Reference
Source: `projectspec/designs/pencil/grit-arena-v2.pen`
- **Desktop (1440)**: frame `T9KXek` "App Home — Desktop".
- **Mobile (390)**: frame `XWAjJ` "App Home — Mobile".
- **States + implementation notes**: frame `ldXx5` "App Home — Estados y notas" (skeleton, empty state).
- **Components**: `C9T8S` "Event Card", `ojyQD` "Organization Card".
- **Hero background**: `projectspec/designs/refernce/grit-hero-loop.webm` / `.mp4` (8 s loop, 1920×1280). Poster: `projectspec/designs/pencil/images/grit-hero-poster.jpg`.
- Club logos in the design are illustrative placeholders; the real ones come from `tenants.logo_url`.

#### Deviations from the design (intentional)
- **City row** on the organization card is **not implemented** (no data). The name block keeps only the organization name.
- **"PREMIUM" card ribbon**: there is no premium/featured flag on events. The **soonest upcoming event** is rendered as the featured card with the ribbon label **"PRÓXIMO"** (same visuals: ribbon, cyan border, glow, 340px width). "Premium" refers to the ribbon (band) treatment as a whole.

#### Design → code token mapping
Use only `grit-*` tokens and the `@/components/ui` kit (US-0116). No new color tokens.

| Design value | Code |
|---|---|
| `$bg-navy` `#07111F` | `bg-grit-bg` |
| `$accent-cyan` `#14DBC4` / `#49F5E2` | `grit-cyan` / `grit-cyan-light` |
| `$text-primary` / `$text-subtext` / `#8A9AAB` | `text-grit-text` / `text-grit-subtext` / `text-grit-muted` |
| `$card-fill`, `$glass-fill`, `$glass-border` | `bg-grit-card`, `bg-grit-glass`, `border-grit-glass-border` |
| Discipline dot colors | `grit-discipline-*` (fallback `grit-cyan`) |
| Titles (Rajdhani Bold Italic) / body (Montserrat) | `font-grit-title font-bold italic` / `font-grit-body` |
| Radii 12 / 16 / 20 | `rounded-grit-lg` / `rounded-grit-2xl` / `rounded-[20px]` |

### Proposed Changes

#### 1. Page `/` (`src/app/page.tsx`)
- Server component. Reads the session with `createClient()` from `@/services/supabase/server` (`supabase.auth.getUser()`) and passes `isAuthenticated: boolean` to `<HomePage />`. No redirect: the home is public for everyone.
- `metadata`: title `GRIT Arena — Eventos y clubes deportivos`, description `Descubre eventos deportivos, entrena con tu club y gestiona tus entradas en GRIT Arena.`
- Renders, in order, inside `.grit-shell`-like navy background (`bg-grit-bg`): `HomeHeader`, `HomeHero`, `EventosCintaSection`, `OrganizacionesSection`, `ClubCtaBand`, `HomeFooter`.

#### 2. Header (`HomeHeader`)
- Absolute over the hero; becomes `bg-grit-glass` + `backdrop-blur` + bottom border once `window.scrollY > 24` (client component, passive scroll listener).
- Left: logo (`/logo-navbar.png`, link `/`). Center (≥1024px): links "Eventos" → `/eventos`, "Organizaciones" → `#organizaciones`.
- Right: if `isAuthenticated` → primary button "Mi portal" → `/portal`; else "Iniciar sesión" → `/auth/login`.
- <1024px: logo + menu button (`aria-expanded`, `aria-label` "Abrir menú"/"Cerrar menú") opening a panel with the same links + action button; closes on link click and on `Escape`.

#### 3. Hero (`HomeHero` + `HeroVideoBackground`)
- Height `min-h-[100svh]` (desktop design 860px min, mobile 720px min). Content centered vertically and horizontally.
- Background `HeroVideoBackground` (client):
  - `<video autoPlay muted loop playsInline preload="metadata" poster="/home/grit-hero-poster.jpg" aria-hidden="true">` with `<source src="/home/grit-hero-loop.webm" type="video/webm">` and `<source src="/home/grit-hero-loop.mp4" type="video/mp4">`, `object-cover`; on mobile `object-[30%_center]` so the silhouettes stay in frame.
  - When `prefers-reduced-motion: reduce` matches (hook `usePrefersReducedMotion`), render only the poster with `next/image` (`priority`, `fill`, `object-cover`), no `<video>`.
  - Overlays: radial dark vignette centered behind the text (`radial-gradient(ellipse at center, rgba(7,17,31,0.9) 0%, rgba(7,17,31,0.63) 45%, rgba(7,17,31,0.25) 100%)`) + bottom fade to `#07111F` (last 30%) + top fade (`rgba(7,17,31,0.6)` → transparent in the first 18%).
- Content:
  - Eyebrow pill: glass, cyan dot, text `EVENTOS · CLUBES · ENTRENAMIENTOS` (Rajdhani 14px bold, letter-spacing 0.25em, `grit-cyan-light`).
  - `h1`: "La plataforma donde el deporte evoluciona" — Rajdhani bold italic, 88px desktop / 46px mobile, line-height 0.95, max-width 980px, centered.
  - Divider 96×3px, horizontal cyan gradient fading at both ends.
  - Subtitle: "Descubre eventos, entrena con tu club y gestiona tus entradas en un solo lugar." — Montserrat 19px / 16px mobile, `text-grit-subtext`, max-width 620px, centered.
  - CTAs: primary "Ver eventos" + arrow → `/eventos`; secondary (outline cyan) "Iniciar sesión" → `/auth/login`, or "Mi portal" → `/portal` when `isAuthenticated`. Side by side ≥640px, stacked full-width below.
  - Scroll hint at the bottom ("DESLIZA" + chevrons), links to `#eventos`; hidden when reduced motion is preferred is not required (static).

#### 4. Upcoming events ribbon (`EventosCintaSection` + `EventoCintaCard`)
- Section `id="eventos"`. Header row (desktop: left heading, right button; mobile: heading on top, button below the ribbon full width):
  - Eyebrow "PRÓXIMOS EVENTOS" with a 28px cyan line, `h2` "Vive el deporte en vivo", subtitle "Carreras, travesías y clínicas de los clubes de GRIT Arena. Asegura tu entrada en minutos." (subtitle hidden on mobile).
  - Button "Ver todos los eventos" + arrow → `/eventos` (outline cyan).
- Data: hook `useHomeEventos` → `eventosService.listEventosPublicados({ soloPublicos: true, limit: 12 })` (already ordered by `fecha_hora` ascending; events without date come last).
- **Ribbon band**: full-bleed, background subtle horizontal glass gradient, 1px cyan gradient lines on top and bottom, 220px edge fades to `#07111F` on both sides (desktop; 0 on mobile).
- **Desktop (≥768px) marquee**:
  - Render the list twice inside a flex track (`gap-6`); animate `transform: translateX(-50%)` linearly and infinitely (CSS keyframes `home-marquee` in `globals.css`), duration `items.length * 6s`.
  - Pause on hover and `:focus-within`.
  - The second copy has `aria-hidden="true"` and its links `tabIndex={-1}`.
  - If there are fewer than 4 events, do not animate: render once, centered.
  - With reduced motion: no animation; the track becomes horizontally scrollable (`overflow-x-auto`, scroll-snap).
- **Mobile (<768px)**: no auto-scroll; horizontal `overflow-x-auto snap-x snap-mandatory` track with `px-5`, cards 280px wide; pagination dots under the ribbon reflecting the snapped card (IntersectionObserver), dots are decorative (`aria-hidden`).
- **Card (`EventoCintaCard`)** — whole card is a `next/link` to `buildEventoLandingDetalleHref(evento.id, { from: '/' })` (`src/lib/portal/eventos-publicos.utils.ts`):
  - Cover 190px: `bannerUrl` (`next/image`, `object-cover`), fallback = navy gradient with a discipline `GritIcon`; bottom shade gradient.
  - Date badge (top-left, glass): day (Rajdhani 28px bold) + month abbreviation uppercase (`NOV`), from `fechaHora` in `America/Bogota`. Without date: badge shows "POR DEFINIR" in one line.
  - Discipline chip (bottom-left of cover): colored dot (`grit-discipline-*` by name: natación→swim, ciclismo→cycle, running/trail→run, fuerza→strength, funcional→functional, movilidad→mobility, else cyan) + `disciplinaNombre`.
  - Name (Rajdhani 22px bold italic, max 2 lines, `line-clamp-2`, fixed 2-line height so all cards align).
  - Organization row (`shield` icon + `nombreTenant`) and location row (`map-pin` + `escenarioNombre` · `escenarioUbicacion`, or `puntoEncuentro`; hidden if none); each one line, truncated.
  - Footer: "DESDE" + lowest price from `precio` formatted `COP 80.000` (`Intl.NumberFormat('es-CO')`), or "Gratis" when all prices are 0 / empty; circular arrow button on the right (decorative).
  - Featured variant (first item only): width 340px, ribbon "PRÓXIMO" (crown/sparkle icon) top-right, `border-grit-cyan` 1.5px and cyan glow shadow.
  - Hover: translate-y -4px, cyan border.
- **States**:
  - Loading: 3 skeleton cards (design `ldXx5`) with `animate-pulse`.
  - Empty (0 events) and error: `GritEmptyState`-style block "Pronto habrá nuevos eventos" + body "Los clubes están preparando su próxima fecha. Mientras tanto, explora el calendario completo." + outline button "Ver eventos" → `/eventos`. Errors are logged with `console.error` and render the same empty block (no error banner on the home).

#### 5. Organizations (`OrganizacionesSection` + `OrganizacionCard`)
- Section `id="organizaciones"`, centered alignment, background `#0A1626` with a top radial cyan glow and a 1px top gradient border.
- Heading: eyebrow "ORGANIZACIONES" (lines both sides), `h2` "Clubes que entrenan con GRIT Arena", subtitle "Encuentra tu club, reserva entrenamientos y sigue tu progreso con tu equipo."
- Data: hook `useOrganizacionesDestacadas` → new RPC `listar_organizaciones_destacadas(p_limit => 6)` (see Database Changes). Callable by `anon`.
- Layout: desktop 3 columns × 2 rows (`grid grid-cols-3 gap-6`), tablet 2 columns, mobile horizontal snap carousel with cards 310px wide.
- **Card (`OrganizacionCard`)** — not a link for anonymous users (the marketplace requires a session); for signed-in users the whole card links to `/portal/orgs`:
  - Banner 110px: `bannerUrl` (`next/image`, `object-cover`, 85% opacity) with bottom shade; fallback navy→teal gradient.
  - **Logo (required visual)**: 76×76, `rounded-[20px]`, 4px border `#0B1826`, shadow, absolutely positioned overlapping the banner (`top: 70px; left: 22px`). Shows `logoUrl` with `next/image` `object-cover`. **Fallback** when `logoUrl` is null or fails to load (`onError`): initials (first letter of the first two words, uppercase) in Rajdhani bold italic 28px on a cyan→teal gradient. `alt` = `Logo de {nombre}`.
  - Name (Rajdhani 22px bold, max 2 lines) to the right of the logo (left padding 92px), block grows with the text.
  - Description: 2 lines max (`line-clamp-2`); if null, "Organización deportiva en GRIT Arena."
  - Footer: up to 2 discipline chips (`bg-grit-cyan/10 text-grit-cyan`) from `disciplinas`, and members `users` icon + "{n} atletas" (`1 atleta` singular; hidden when 0).
- CTA below the grid: primary "Ver todas las organizaciones" + arrow:
  - anonymous → `/auth/login?next=/portal/orgs`, with hint under it (`lock` icon) "Inicia sesión para ver todas las organizaciones y unirte a la tuya."
  - signed in → `/portal/orgs`, no hint.
- States: loading → 6 (desktop) / 2 (mobile) skeleton cards; 0 organizations or error → hide the whole section (log the error).

#### 6. Club CTA band and footer
- `ClubCtaBand`: rounded 20px glass band, title "¿Tienes un club o equipo deportivo?", body "Gestiona atletas, entrenamientos, pagos y eventos en una sola plataforma.", outline button "Conoce GRIT Arena" + `arrow-up-right` → `process.env.NEXT_PUBLIC_LANDING_URL` (default `https://grit-arena.com`), `target="_blank" rel="noopener noreferrer"`.
- `HomeFooter`: logo, links (Eventos `/eventos`, Iniciar sesión `/auth/login`, Contacto `mailto:contacto@grit-arena.com`), social icons (WhatsApp `https://wa.me/573224399865`, others only if a URL is configured — none for now, so only WhatsApp + email), copyright `© {año actual} GRIT Arena`.

#### 7. Assets
- Copy `projectspec/designs/refernce/grit-hero-loop.webm` and `.mp4` to `public/home/`, and `projectspec/designs/pencil/images/grit-hero-poster.jpg` to `public/home/grit-hero-poster.jpg`.

#### 8. Cleanup of the old marketing landing (now in `grit-arena/landing`)
Delete files no longer imported after this story:
- `src/components/landing/{HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,ShowcaseSection,TrustedBySection}.tsx`, `src/components/landing/operation/**`, `src/components/landing/administration/**`, `src/components/landing/shared/ConnectedStepsBar.tsx`, `src/hooks/landing/useScrollReveal.ts`, `public/landing/**`.
- Keep `src/components/landing/{Header,Footer,ComingSoonPage}.tsx` and `src/components/landing/eventos/**` (still used by `/eventos`, `/equipos`, `/atletas`). In `Header.tsx`, change the anchor items (`/#hero`, `/#operacion`, …) to: "Eventos" → `/eventos`, "Organizaciones" → `/#organizaciones`; remove "Precios"/"Recursos"/"Para equipos"/"Funciones".
- Remove from `globals.css` only the utilities used exclusively by deleted files (`.landing-hero-overlay`, `.landing-hero-glow`, `.landing-value-item`, `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector`); verify each with grep before removing.

---

## Database Changes

Migration `supabase/migrations/20261114120000_listar_organizaciones_destacadas.sql` — apply locally only (never push to remote).

```sql
-- US-0140: public read of featured organizations for the app home (anon + authenticated).
-- tenants stays unreadable for anon; this SECURITY DEFINER function exposes only public fields
-- of tenants with publico = true.
begin;

create or replace function public.listar_organizaciones_destacadas(p_limit integer default 6)
returns table (
  id uuid,
  nombre varchar,
  descripcion text,
  logo_url varchar,
  banner_url varchar,
  disciplinas text[],
  total_atletas integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.nombre,
    t.descripcion,
    t.logo_url,
    t.banner_url,
    coalesce(
      (select array_agg(d.nombre::text order by d.nombre)
         from (select dd.nombre from public.disciplinas dd
                where dd.tenant_id = t.id and dd.activo
                order by dd.nombre limit 3) d),
      '{}'::text[]
    ) as disciplinas,
    (select count(*)::integer
       from public.miembros_tenant m
       join public.roles r on r.id = m.rol_id
      where m.tenant_id = t.id
        and r.nombre = 'usuario'
        and m.estado = 'activo') as total_atletas
  from public.tenants t
  where t.publico
  order by 7 desc, t.nombre asc
  limit least(greatest(coalesce(p_limit, 6), 1), 24);
$$;

comment on function public.listar_organizaciones_destacadas(integer) is
  'US-0140: public organizations for the app home. Exposes only id, nombre, descripcion, logo_url, banner_url, up to 3 active disciplines and the active athlete count. Max 24 rows.';

revoke all on function public.listar_organizaciones_destacadas(integer) from public;
grant execute on function public.listar_organizaciones_destacadas(integer) to anon, authenticated;

commit;
```

- No table, column or policy changes. `tenants` RLS remains `authenticated`-only; anon access is limited to this function's projection.
- No email, phone, social URLs, `max_solicitudes`, `requiere_perfil_completo` or member identities are exposed.
- Indexes: existing FKs on `disciplinas.tenant_id` / `miembros_tenant.tenant_id` are sufficient for ≤24 tenants; no new index.

---

## API / Server Actions

1. **Modify** `src/services/supabase/portal/eventos.service.ts`
   - `listEventosPublicados(options: { soloPublicos: boolean; limit?: number })` — when `limit` is provided use `.limit(Math.min(limit, EVENTOS_PUBLICOS_LIMIT))`, otherwise keep `EVENTOS_PUBLICOS_LIMIT`. Existing callers unchanged.
   - Return: `EventoPublicoListItem[]`. Auth: anon/authenticated via existing RLS + explicit filters.

2. **New** `src/services/supabase/portal/organizaciones-publicas.service.ts`
   - `organizacionesPublicasService.listDestacadas(limit = 6): Promise<OrganizacionDestacada[]>`
   - Calls `createClient().rpc('listar_organizaciones_destacadas', { p_limit: limit })` (browser client `@/services/supabase/client`).
   - Maps snake_case → camelCase (`logo_url` → `logoUrl`, `banner_url` → `bannerUrl`, `total_atletas` → `totalAtletas`); `disciplinas` defaults to `[]`, `totalAtletas` to `0`.
   - Throws `Error('No fue posible cargar las organizaciones.')` on RPC error (logs the original).
   - Auth: anon + authenticated (function grant).

3. **New types** `src/types/portal/organizaciones-publicas.types.ts`
   ```ts
   export type OrganizacionDestacada = {
     id: string;
     nombre: string;
     descripcion: string | null;
     logoUrl: string | null;
     bannerUrl: string | null;
     disciplinas: string[];
     totalAtletas: number;
   };
   ```

No API routes or server actions.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261114120000_listar_organizaciones_destacadas.sql` | New RPC + grants |
| Types | `src/types/portal/organizaciones-publicas.types.ts` | New `OrganizacionDestacada` |
| Service | `src/services/supabase/portal/organizaciones-publicas.service.ts` | New `listDestacadas` |
| Service | `src/services/supabase/portal/eventos.service.ts` | Optional `limit` in `listEventosPublicados` |
| Hook | `src/hooks/home/useHomeEventos.ts` | New — `{ items, loading, error }` (limit 12) |
| Hook | `src/hooks/home/useOrganizacionesDestacadas.ts` | New — `{ items, loading, error }` (limit 6) |
| Hook | `src/hooks/home/usePrefersReducedMotion.ts` | New — `matchMedia('(prefers-reduced-motion: reduce)')` with change listener, SSR-safe (`false` on server) |
| Lib | `src/lib/home/home.utils.ts` | New — `formatFechaBadge`, `formatPrecioDesde`, `disciplinaColorClass`, `getIniciales` |
| Component | `src/components/home/HomePage.tsx` | New — composes the sections, receives `isAuthenticated` |
| Component | `src/components/home/HomeHeader.tsx` | New |
| Component | `src/components/home/HomeHero.tsx` | New |
| Component | `src/components/home/HeroVideoBackground.tsx` | New (client) |
| Component | `src/components/home/EventosCintaSection.tsx` | New (client) — marquee/carousel + states |
| Component | `src/components/home/EventoCintaCard.tsx` | New |
| Component | `src/components/home/OrganizacionesSection.tsx` | New (client) |
| Component | `src/components/home/OrganizacionCard.tsx` | New — logo + fallback initials |
| Component | `src/components/home/ClubCtaBand.tsx` | New |
| Component | `src/components/home/HomeFooter.tsx` | New |
| Component | `src/components/home/index.ts` | New — barrel |
| Component | `src/components/landing/Header.tsx` | Update nav items (see §8) |
| Page | `src/app/page.tsx` | Replace landing with `HomePage` + session + metadata |
| Styles | `src/app/globals.css` | Add `@keyframes home-marquee` + `.home-marquee` (pause on hover/focus-within, disabled under reduced motion); remove unused landing utilities (§8) |
| Assets | `public/home/grit-hero-loop.webm`, `public/home/grit-hero-loop.mp4`, `public/home/grit-hero-poster.jpg` | New |
| Config | `.env.example` (if present) | Add `NEXT_PUBLIC_LANDING_URL=https://grit-arena.com` |
| Delete | Old marketing sections, `useScrollReveal`, `public/landing/**` (§8) | Remove |
| Docs | `projectspec/03-project-structure.md` | Document `components/home`, `hooks/home`, the RPC, and replace the "pending removal / root will redirect" note |

---

## Acceptance Criteria

**Page & header**
1. `/` renders the new home for anonymous and signed-in users (no redirect); the old marketing sections (pricing, operation, administration) no longer appear.
2. Anonymous: header and hero secondary CTA show "Iniciar sesión" → `/auth/login`. Signed in: both show "Mi portal" → `/portal`.
3. The header becomes opaque/glass after scrolling > 24px; below 1024px the menu button toggles a panel with correct `aria-expanded`/`aria-label`, and the panel closes on link click and on `Escape`.

**Hero**
4. A muted, looping, inline video plays behind the hero (WebM with MP4 fallback) with the poster visible until it loads; the title, subtitle and both CTAs are centered and readable (text contrast ≥ 4.5:1 against the overlay in every frame of the loop).
5. With `prefers-reduced-motion: reduce`, no `<video>` element is rendered and the poster image is shown instead.
6. "Ver eventos" navigates to `/eventos`.

**Events ribbon**
7. The ribbon shows up to 12 upcoming public events ordered by date; the first one is the featured card (340px, "PRÓXIMO" ribbon, cyan border and glow).
8. Each card shows date badge (day + month in `America/Bogota`, or "POR DEFINIR"), discipline chip with its color, name (max 2 lines), organization, location (hidden when absent), and "DESDE COP x" / "Gratis"; clicking it opens `/eventos/{id}?from=/`.
9. Desktop ≥768px with ≥4 events: the track scrolls automatically and seamlessly, pauses on hover and when a card has keyboard focus; the duplicated copy is not reachable by Tab and is `aria-hidden`. With <4 events, no animation.
10. Mobile <768px: the ribbon is a swipeable snap carousel (no auto-scroll) and the dots reflect the visible card.
11. Reduced motion on desktop: no animation; the track is horizontally scrollable.
12. While loading, 3 skeleton cards are shown; with 0 events or a request error, the "Pronto habrá nuevos eventos" block with a "Ver eventos" button is shown.
13. "Ver todos los eventos" navigates to `/eventos`.

**Organizations**
14. Up to 6 public organizations (`tenants.publico = true`) are shown, ordered by active athlete count desc then name; private organizations never appear.
15. Every card shows the organization **logo** from `logo_url` overlapping the banner; when `logo_url` is null or the image fails to load, initials on the cyan gradient are shown instead. The logo has `alt="Logo de {nombre}"`.
16. Cards show name, description (2 lines, default text when null), up to 2 discipline chips and "{n} atletas" (singular for 1, hidden for 0). No email, phone or member data is present in the network response.
17. Anonymous: "Ver todas las organizaciones" → `/auth/login?next=/portal/orgs` and the lock hint is visible; after logging in the user lands on `/portal/orgs`. Signed in: it goes to `/portal/orgs` and the hint is hidden.
18. With 0 organizations or an RPC error, the organizations section is not rendered and the rest of the page works.
19. As `anon`, `select listar_organizaciones_destacadas(6)` returns rows; `select * from tenants` still returns 0 rows / permission error for `anon`.

**Rest**
20. "Conoce GRIT Arena" opens `NEXT_PUBLIC_LANDING_URL` in a new tab with `rel="noopener noreferrer"`.
21. Desktop (1440) and mobile (390) layouts match Pencil frames `T9KXek` / `XWAjJ` except the documented deviations; no horizontal page scroll at 375px.
22. `/eventos`, `/eventos/[id]`, `/equipos`, `/atletas` keep working; their header links point to `/eventos` and `/#organizaciones`.
23. Deleted landing files are not referenced anywhere (`grep -rn "landing/operation\|landing/administration\|HeroSection\|PricingSection\|useScrollReveal" src` returns nothing); type-check and lint pass.

---

## Implementation Steps

- [ ] Create the migration and apply it locally (`supabase migration up` / `db reset` locally only — never push to remote); verify grants as `anon` (AC 19)
- [ ] Add `OrganizacionDestacada` type and `organizacionesPublicasService.listDestacadas`
- [ ] Add `limit` option to `eventosService.listEventosPublicados`
- [ ] Create hooks `useHomeEventos`, `useOrganizacionesDestacadas`, `usePrefersReducedMotion` and `src/lib/home/home.utils.ts`
- [ ] Copy hero video/poster assets to `public/home/`
- [ ] Build components: `HeroVideoBackground`, `HomeHero`, `HomeHeader`, `EventoCintaCard`, `EventosCintaSection` (+ `home-marquee` CSS), `OrganizacionCard`, `OrganizacionesSection`, `ClubCtaBand`, `HomeFooter`, `HomePage`
- [ ] Wire `src/app/page.tsx` (session + metadata)
- [ ] Update `src/components/landing/Header.tsx` nav; delete unused landing files/assets/CSS utilities
- [ ] Test manually: anon vs signed-in, 0 / 2 / 12 events, events without banner/date/price, orgs with/without logo and banner, broken logo URL, RPC error, reduced motion, 375/768/1440 widths, keyboard navigation through the ribbon
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: `tenants` RLS unchanged (authenticated-only). Anonymous access goes exclusively through `listar_organizaciones_destacadas` (`SECURITY DEFINER`, `search_path = public`, execute granted to `anon, authenticated`, revoked from `public`), returning only public fields of `publico = true` tenants and capped at 24 rows. Events keep the existing explicit visibility filters (`activo`, not `borrador`, `confirmado`, upcoming, `publico`). External links use `rel="noopener noreferrer"`. Event/org images come from stored URLs; render with `next/image` only for allowed remote patterns (add the Supabase storage host to `next.config.ts` `images.remotePatterns` if not already present).
- **Performance**: Events limited to 12 and orgs to 6 per request. Video: `preload="metadata"`, poster shown immediately, WebM (~1.8 MB) first; not rendered under reduced motion. Hero poster uses `priority`; card images lazy-load with `sizes="300px"`/`"400px"`. Marquee animates only `transform` (GPU), no JS per frame.
- **Accessibility**: Single `h1` (hero); section `h2`s. Video `aria-hidden` and muted (no audio). Marquee pausable on hover/focus and disabled under reduced motion (WCAG 2.2.2); duplicated items hidden from AT and Tab order. Cards are single links with an accessible name (event name / organization name). Logo `alt` text. Menu button with `aria-expanded`/`aria-label`; `Escape` closes it. Text contrast ≥ 4.5:1 over the hero overlay.
- **Error handling**: No toasts or banners on the home. Events error → same empty block as 0 events; organizations error → section hidden. Errors logged with `console.error` including the hook name. Broken images fall back (event cover → gradient + discipline icon; logo → initials).
