---
name: GRIT Arena — UI Design Guide
design_source: projectspec/designs/pencil/grit-arena-v2.pen
code_source: src/app/globals.css · tailwind.config.ts · src/components/ui/grit/
scope: Authenticated Portal (/portal/*) and the public training pages
updated: 2026-09-23 (US-0116 + analitica-v2-design)
---

# UI Design Guide

Read this **before building or restyling any page**. It describes the design
system as it exists in the code today, so a new screen looks like it belongs to
the product without reinventing anything.

Two rules cover most of it:

1. **Use the tokens and the kit.** Colours, fonts, radii and containers already
   exist. If a screen needs something the kit doesn't have, extend the kit —
   don't write one-off classes.
2. **The design file wins.** `grit-arena-v2.pen` is the source of truth for
   measurements. The tokens mirror its variables 1:1, so `$glass-border` in the
   design is `border-grit-glass-border` in code.

---

## 1. Where everything lives

| What | Where |
| --- | --- |
| Design file (source of truth) | `projectspec/designs/pencil/grit-arena-v2.pen` |
| CSS variables + `.grit-shell` | `src/app/globals.css` |
| Tailwind tokens (colours, fonts, radii) | `tailwind.config.ts` (`theme.extend`) |
| Component kit | `src/components/ui/grit/` — import from `@/components/ui` |
| Portal shell (header, breadcrumb, page container) | `src/app/portal/layout.tsx`, `src/components/portal/Portal*.tsx` |
| Chart theme + palette | `src/components/portal/analitica/chart-theme.ts` |
| Discipline icon/colour helper | `src/lib/portal/disciplina-visual.ts` |
| Design → Material Symbols icon map | `src/components/ui/grit/icon-map.ts` |

### Design file frames

| Frame | Screen it drives |
| --- | --- |
| `zfVKC` | Operations dashboard — KPI cards, panels, tables (used by `analitica`) |
| `OyIqr` | Public training detail |
| `ql3Ij` | Public trainings marketplace |
| `d41rX5` | Athlete trainings schedule |
| `P43Yo` | Form preview / form builder header |

---

## 2. Tokens

Use the Tailwind names. Never write a raw hex in a component.

### Colour

| Token | Value | Use for |
| --- | --- | --- |
| `grit-bg` | `#07111F` | Page background (via `.grit-shell`), text on cyan fills |
| `grit-cyan` | `#14DBC4` | The single brand accent: primary buttons, active states, key icons, links |
| `grit-cyan-light` | `#49F5E2` | Hover state of a cyan fill only |
| `grit-teal` | `#0FA3AB` | Secondary accent, rarely — prefer cyan |
| `grit-text` | `#E6EDF3` | Titles, values, primary copy |
| `grit-subtext` | `#BAC7D5` | Labels, meta lines, secondary copy |
| `grit-muted` | `#8A9AAB` | Tertiary detail, placeholders, "compare" captions (≥11px only) |
| `grit-glass` | `rgba(15,31,48,.69)` | Translucent panel fill (always with `backdrop-blur`) |
| `grit-card` | `rgba(11,24,38,.8)` | Denser fill for data cards, tiles and nested surfaces |
| `grit-glass-border` | `rgba(20,219,196,.25)` | The hairline border on nearly every surface |
| `grit-sidebar` | `rgba(6,14,26,.8)` | Reserved for a future sidebar layout |
| `grit-success` | `#3DDC97` | Positive values, upward deltas |
| `grit-danger` | `#FF6B6B` | Errors, destructive actions, failed states |

Category colours — reuse these, never invent a hue per page:

| Token | Value |
| --- | --- |
| `grit-discipline-swim` | `#14DBC4` |
| `grit-discipline-cycle` | `#0FA3AB` |
| `grit-discipline-run` | `#F2B84B` (also the warning colour) |
| `grit-discipline-strength` | `#B98AFF` |
| `grit-discipline-functional` | `#FF6B6B` |
| `grit-discipline-mobility` | `#6BCB77` |

Don't pick a discipline colour by hand: `getDisciplinaVisual(nombre)` returns
`{ icon, colorClass }` from the discipline's name, with a neutral fallback.

**Opacity modifiers**: solid tokens are hex, so `bg-grit-cyan/15` works.
Translucent tokens (`grit-glass`, `grit-card`, `grit-glass-border`,
`grit-sidebar`) are CSS variables and **must be used without a modifier** —
`bg-grit-card/60` silently produces nothing.

### Typography

| Token | Family | Use for |
| --- | --- | --- |
| `font-grit-title` | Rajdhani | `h1`–`h3`, KPI values, prices, big numerals |
| `font-grit-body` | Montserrat | Everything else; set once by `.grit-shell` |

Scale in use — stay inside it:

| Size | Where |
| --- | --- |
| 36px (`sm:text-[36px]`) | Page `h1` |
| 28px | KPI value, price |
| 22px / 20px | Section headings (`GritSectionHeading` `lg` / `md`) |
| 15px | Lead paragraph under a title |
| 13–14px | Body, buttons, table cells, nav |
| 11–12px | Labels, meta, badges, captions |

Secondary text always uses `text-grit-subtext` — never a dimmed
`text-grit-text`, so contrast stays predictable.

### Radius

Use the named scale. **`rounded-lg` and `rounded-xl` are 32px and 48px** in
this project (a legacy override the landing and auth pages depend on), so they
must never appear in Portal code.

| Class | Value | Use for |
| --- | --- | --- |
| `rounded-grit-xs` | 6px | Tiny chips |
| `rounded-grit-sm` | 8px | Tags, badges |
| `rounded-grit-md` | 10px | Buttons, inputs, menu items, 34–40px icon tiles |
| `rounded-grit-lg` | 12px | Dropdown panels, 48px icon tiles, tab containers |
| `rounded-grit-xl` | 14px | The design's KPI/panel radius — available when you need it, though `GritCard` standardises on 16px |
| `rounded-grit-2xl` | 16px | Cards, panels, modals (the `GritCard` default) |

### Spacing

- **Gaps**: 4–6 (label pairs) · 8–14 (controls, list rows) · 16–20 (cards in a
  grid) · 24–32 (sections).
- **Padding**: 16 / 20 / 24 / 28 (`GritCard` `sm`–`xl`) · 18 (KPI cards) ·
  22 (dashboard panels).
- **Page**: owned by `GritPageContainer` — max width 1440, side padding
  16/24/48 by breakpoint, 24 top, 48 bottom, 32 between blocks.

---

## 3. Page skeleton

### Portal pages

`src/app/portal/layout.tsx` already provides the shell. A page renders **only
its content**:

```
.grit-shell (h-screen, flex-col, font-grit-body)
├─ PortalHeader            navbar: logo · Menú · notifications · avatar
└─ <main> (scrolls)
   ├─ PortalBreadcrumb     ⌂ Inicio › Org › Page
   └─ GritPageContainer    ← your page renders inside this
      ├─ GritPageHeader    the page's single <h1> (+ actions)
      └─ your content      cards, tables, panels…
```

Consequences for a new page:

- **Do not** add outer page padding, a max width, or a background — the layout
  owns them. A page component starts at `<div className="space-y-6">`.
- **Exactly one `h1` per page**, and it comes from `GritPageHeader`.
- Don't re-render the navbar or the breadcrumb; both are automatic. Add a label
  for a new route segment in `SLUG_LABELS` inside `PortalBreadcrumb.tsx`.

```tsx
export function MiModuloPage({ tenantId }: { tenantId: string }) {
  return (
    <section className="space-y-6">
      <GritPageHeader
        eyebrow="Módulo"
        title="Gestión de"
        titleAccent="entrenamientos"
        subtitle="Una frase que explica para qué sirve la página."
        actions={<GritButton icon="add">Crear</GritButton>}
      />
      {/* content */}
    </section>
  );
}
```

### Public pages

`/entrenamientos-publicos/*` keeps the marketing `Header` and `Footer` and the
`landing-shell` wrapper (with its top padding for the fixed header). Inside
that chrome, the content uses the same tokens and kit as the Portal. The
marketing home (`/`) and `/auth/*` keep the older `landing-*` tokens and are
out of scope for this guide.

---

## 4. The component kit

Everything imports from `@/components/ui`. These are presentational only: no
data fetching, no business logic.

| Component | Key props (defaults) | Notes |
| --- | --- | --- |
| `GritCard` | `variant` glass·card·highlight (`glass`), `padding` none·sm·md·lg·xl (`lg`), `as` (`div`) | 16px radius + glass border. `glass` = panels, filters, modals (adds blur); `card` = data tiles, tables, KPIs; `highlight` = the featured item |
| `GritPageHeader` | `title`, `titleAccent`, `eyebrow`, `subtitle`, `italic`, `actions` | The page's `h1`; `titleAccent` renders cyan |
| `GritPageContainer` | — | Applied once by the Portal layout; use directly only outside `/portal` |
| `GritSectionHeading` | `title`, `subtitle`, `action`, `size` md·lg (`lg`), `as` (`h2`) | Section title inside a card; `action` is right-aligned |
| `GritButton` | `variant` primary·secondary·outline-accent·ghost (`primary`), `size` sm·md (`md`), `icon`, `iconPosition`, `fullWidth`, `loading`, `href`, `external` | Renders `<button>`, `<Link>`, or `<a target="_blank" rel="noopener noreferrer">` when `external`. Cyan focus ring included |
| `GritTag` | `tone` accent·neutral (`accent`), `icon`, `colorClass` | Uppercase pill, 12px/700, letter-spacing .5 |
| `GritBadge` | `icon` | Neutral info chip on `grit-card` |
| `GritIconTile` | `size` 34·40·48 (`34`), `shape` rounded·circle, `tone` card·accent | Icon container from the design's "Icon Wrap" frames |
| `GritInfoRow` | `icon`, `label`, `value`, `as` | Icon tile + label/value pair |
| `GritDivider` | — | 1px `grit-glass-border` rule |
| `GritIcon` | `name`, `size` (16), `label` | Material Symbols at weight 300; decorative (`aria-hidden`) unless `label` is set |
| `GritEmptyState` | `icon`, `title`, `description`, `action`, `titleAs`, `descriptionClassName` | Loading / error / empty / not-found |
| `gritInputClass`, `gritSelectClass` | — | Class strings for `<input>` / `<select>` |
| `gritFocusRing`, `cx` | — | Shared focus ring; class joiner |

### Button rules

- One filled `primary` per view. Cyan is an accent, not a background.
- Text on a cyan fill is `text-grit-bg` (dark), never white.
- A destructive action is `variant="secondary"` with `text-grit-danger`, not a
  red fill.

---

## 5. Recurring patterns

### KPI card (design `zfVKC`)

`GritCard variant="card"` + 18px padding + 14px gap: a 40px round
`GritIconTile tone="accent"`, then a 28px Rajdhani value, a 12px `grit-subtext`
label and an optional 11px `grit-muted` detail. (The design draws these at a
14px radius; the kit keeps every card at 16px for consistency.) Tone the value with
`grit-success` (positive) or `grit-discipline-run` (warning). See
`AnaliticaKpiCard.tsx`.

### Panel with a heading

```tsx
<GritCard as="section" variant="card" padding="none" className="p-[22px]">
  <GritSectionHeading size="md" title="Ingresos mensuales" subtitle="Pagos validados" />
  <div className="mt-5">{children}</div>
</GritCard>
```

### Tables

Header cells: `text-grit-subtext`, 12px, semibold, uppercase, tracking-wide.
Body cells: `text-grit-text`, tertiary column `text-grit-subtext`. Row
separators: `border-t border-white/[.07]` — a neutral hairline, not the cyan
glass border, which is reserved for surface edges.

### List rows

`GritIconTile` (category-tinted) → a text block (title 14px/700 + one or two
`grit-subtext` meta lines) → a right-aligned value or action. Reuse this shape
for any list of records.

### Modals and drawers

Backdrop: `fixed inset-0 z-50 bg-grit-bg/70 backdrop-blur-sm`. Panel:
`GritCard variant="glass"` (16px radius), title as a section heading, actions
as `GritButton`. Keep Escape-to-close and click-outside-to-close.

### Forms

`gritInputClass` / `gritSelectClass` for fields; labels 12px semibold
`grit-subtext`; inline errors `text-grit-danger`. Never restyle a field
ad hoc — extend `styles.ts` if a new field type appears.

### Empty, loading and error states

All three go through `GritEmptyState`. Keep them distinct: a fetch error is
retryable (`action` = "Reintentar") and must never read as "no data". When data
is already on screen and a refresh fails, show a compact banner above it
instead of replacing the page.

### Charts (`@nivo`)

Import `analiticaChartTheme` and `ANALITICA_CHART_COLORS` from
`src/components/portal/analitica/chart-theme.ts`. Never pass an inline palette
or theme. Series order is cyan → purple → amber → green → teal → red;
neighbouring entries differ in hue so adjacent slices stay distinguishable.
Charts are the one place hex literals are allowed, because nivo cannot read
Tailwind classes — and they live only in that file.

### Background

`.grit-shell` paints the navy background plus two soft radial glows (cyan
top-right, teal mid-left). Don't add page-level gradients on top of it.

---

## 6. Icons

The design draws Lucide icons; the app renders **Material Symbols Outlined** at
weight 300 through `GritIcon`. `icon-map.ts` holds the translation (for example
`house → home`, `clock-3 → schedule`, `circle-check → check_circle`,
`arrow-up-right → arrow_outward`). When you take an icon from the design file,
add its mapping there rather than guessing in a component.

Sizes: 13px (inside tags and small buttons) · 15–18px (list rows, menu items) ·
20–22px (headers, 48px tiles) · 30px+ (decorative). Colour: `grit-subtext` when
neutral, `grit-cyan` or a category colour when active.

---

## 7. Accessibility

- One `h1` per page; sections use `h2`/`h3` via `GritSectionHeading`.
- Every interactive element keeps a visible focus ring (`gritFocusRing`; the
  kit's buttons include it).
- Icons are `aria-hidden` unless they carry meaning — then pass `label`.
- Breadcrumbs: `nav[aria-label="Ruta de navegación"] > ol`, last crumb
  `aria-current="page"`.
- Dropdowns and dialogs: `aria-expanded` / `aria-haspopup` / `aria-modal`,
  Escape closes, focus returns to the trigger.
- Contrast on `#07111F`: `grit-text` ≈ 15:1, `grit-subtext` ≈ 10:1,
  `grit-muted` ≈ 6:1 (so `grit-muted` only for 11px+ secondary text).

---

## 8. Deprecated — never in Portal code

These exist only for the marketing landing and `/auth/*`:

`turquoise` · `accent-teal` (`#00e5c4`) · `navy-deep` / `navy-medium` /
`navy-soft` · `card-dark` · `.glass` / `.glass-card` · `font-display` (Lexend) ·
`landing-*` tokens · `slate-*` text and surfaces · `rounded-lg` / `rounded-xl`.

CI-style check before opening a PR:

```bash
grep -rE "turquoise|portal-primary|portal-card|portal-border|glass-card|navy-deep|navy-medium|navy-soft|card-dark|font-display|landing-(primary|text|bg|border|surface)|rounded-(lg|xl)\b" \
  src/components/portal src/app/portal
```

It must return nothing.

---

## 9. Checklist for a new page

- [ ] The page renders only its content; no outer padding, max width or background.
- [ ] Exactly one `h1`, from `GritPageHeader`.
- [ ] Every surface is a `GritCard` (`card` for data, `glass` for panels/modals).
- [ ] Only `grit-*` tokens; no `slate-*`, no raw hex, no deprecated tokens.
- [ ] Radii come from `rounded-grit-*`; no `rounded-lg` / `rounded-xl`.
- [ ] Headings in `font-grit-title`, everything else in `font-grit-body`.
- [ ] One filled cyan primary action per view; dark text on cyan.
- [ ] Inputs use `gritInputClass`; modals use the standard backdrop.
- [ ] Loading, empty and error states exist and are distinguishable; errors retry.
- [ ] Category colours come from `getDisciplinaVisual` or the discipline tokens.
- [ ] Icons go through `GritIcon`, with new design icons added to `icon-map.ts`.
- [ ] Checked at 375 / 768 / 1440 px: no horizontal scroll, columns stack.
- [ ] Keyboard pass: focus rings visible, Escape closes overlays.
- [ ] The grep in §8 returns nothing.

---

## 10. Extending the system

If a screen needs something the kit doesn't cover:

1. Check the design file first — the pattern probably exists in another frame.
2. Add it to `src/components/ui/grit/` with the same prop style (`variant`,
   `size`, `tone`), export it from the barrel, and document it in §4.
3. New colour or radius: add the CSS variable in `globals.css` **and** the
   Tailwind token, mirroring the design file's variable name.
4. Never fork a kit component inside a feature folder — that is how the two
   parallel design systems appeared in the first place.
