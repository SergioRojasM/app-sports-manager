---
name: {{APP_NAME}} — UI Design Guide
design_source: {{DESIGN_SOURCE}}
code_source: src/app/globals.css · tailwind.config.ts · src/components/ui/{{PREFIX}}/
scope: {{SCOPE}}
updated: {{DATE}}
---

# UI Design Guide

Read this **before building or restyling any page**. It describes the design
system as it exists in the code today, so a new screen looks like it belongs to
the product without reinventing anything.

Two rules cover most of it:

1. **Use the tokens and the kit.** Colours, fonts, radii and containers already
   exist. If a screen needs something the kit doesn't have, extend the kit —
   don't write one-off classes.
2. **The design file wins.** `{{DESIGN_SOURCE}}` is the source of truth for
   measurements. The tokens mirror its variables 1:1, so a variable named
   `$surface-border` in the design is `border-{{PREFIX}}-surface-border` in code.

---

## 1. Where everything lives

| What | Where |
| --- | --- |
| Design file (source of truth) | `{{DESIGN_SOURCE}}` |
| CSS variables + `.{{PREFIX}}-shell` | `src/app/globals.css` |
| Tailwind tokens (colours, fonts, radii) | `tailwind.config.ts` (`theme.extend`) |
| Component kit | `src/components/ui/{{PREFIX}}/` — import from `@/components/ui` |
| App shell (header, navigation, page container) | `src/app/{{AREA}}/layout.tsx`, `src/components/{{AREA}}/` |
| Design → app icon map | `src/components/ui/{{PREFIX}}/icon-map.ts` |

### Design file frames

| Frame | Screen it drives |
| --- | --- |
| `<frame id>` | `<screen or feature>` |

---

## 2. Tokens

Use the Tailwind names. Never write a raw hex in a component.

### Colour

| Token | Value | Use for |
| --- | --- | --- |
| `{{PREFIX}}-bg` | `{{COLOR_BG}}` | Page background (via `.{{PREFIX}}-shell`), text on accent fills |
| `{{PREFIX}}-accent` | `{{COLOR_ACCENT}}` | The single brand accent: primary buttons, active states, key icons, links |
| `{{PREFIX}}-accent-light` | `{{COLOR_ACCENT_LIGHT}}` | Hover state of an accent fill only |
| `{{PREFIX}}-text` | `{{COLOR_TEXT}}` | Titles, values, primary copy |
| `{{PREFIX}}-subtext` | `{{COLOR_SUBTEXT}}` | Labels, meta lines, secondary copy |
| `{{PREFIX}}-muted` | `{{COLOR_MUTED}}` | Tertiary detail, placeholders (≥11px only) |
| `{{PREFIX}}-surface` | `{{COLOR_SURFACE}}` | Panel fill |
| `{{PREFIX}}-card` | `{{COLOR_CARD}}` | Denser fill for data cards, tiles and nested surfaces |
| `{{PREFIX}}-surface-border` | `{{COLOR_BORDER}}` | The hairline border on nearly every surface |
| `{{PREFIX}}-success` | `{{COLOR_SUCCESS}}` | Positive values, upward deltas |
| `{{PREFIX}}-warning` | `{{COLOR_WARNING}}` | Warnings, pending states |
| `{{PREFIX}}-danger` | `{{COLOR_DANGER}}` | Errors, destructive actions, failed states |

Category colours — reuse these, never invent a hue per page:

| Token | Value |
| --- | --- |
| `{{PREFIX}}-category-<name>` | `<hex>` |

**Opacity modifiers**: solid tokens are hex, so `bg-{{PREFIX}}-accent/15` works.
Translucent tokens defined as `rgba()` CSS variables **must be used without a
modifier** — `bg-{{PREFIX}}-card/60` silently produces nothing.

### Typography

| Token | Family | Use for |
| --- | --- | --- |
| `font-{{PREFIX}}-title` | {{FONT_TITLE}} | `h1`–`h3`, KPI values, prices, big numerals |
| `font-{{PREFIX}}-body` | {{FONT_BODY}} | Everything else; set once by `.{{PREFIX}}-shell` |

Scale in use — stay inside it:

| Size | Where |
| --- | --- |
| 36px | Page `h1` |
| 28px | KPI value, price |
| 22px / 20px | Section headings (`lg` / `md`) |
| 15px | Lead paragraph under a title |
| 13–14px | Body, buttons, table cells, nav |
| 11–12px | Labels, meta, badges, captions |

Secondary text always uses `text-{{PREFIX}}-subtext` — never a dimmed
`text-{{PREFIX}}-text`, so contrast stays predictable.

### Radius

Use the named scale; do not mix it with Tailwind's default `rounded-*` classes.

| Class | Value | Use for |
| --- | --- | --- |
| `rounded-{{PREFIX}}-xs` | 6px | Tiny chips |
| `rounded-{{PREFIX}}-sm` | 8px | Tags, badges |
| `rounded-{{PREFIX}}-md` | 10px | Buttons, inputs, menu items, small icon tiles |
| `rounded-{{PREFIX}}-lg` | 12px | Dropdown panels, large icon tiles, tab containers |
| `rounded-{{PREFIX}}-xl` | 16px | Cards, panels, modals (the card default) |

### Spacing

- **Gaps**: 4–6 (label pairs) · 8–14 (controls, list rows) · 16–20 (cards in a
  grid) · 24–32 (sections).
- **Padding**: 16 / 20 / 24 / 28 (card `sm`–`xl`).
- **Page**: owned by the page container — max width 1440, side padding
  16/24/48 by breakpoint, 24 top, 48 bottom, 32 between blocks.

---

## 3. Page skeleton

`src/app/{{AREA}}/layout.tsx` provides the shell. A page renders **only its
content**:

```
.{{PREFIX}}-shell (h-screen, font-{{PREFIX}}-body)
├─ Header / Sidebar        navigation · notifications · avatar
└─ <main> (scrolls)
   ├─ Breadcrumb
   └─ PageContainer        ← your page renders inside this
      ├─ PageHeader        the page's single <h1> (+ actions)
      └─ your content      cards, tables, panels…
```

Consequences for a new page:

- **Do not** add outer page padding, a max width, or a background — the layout
  owns them. A page component starts at `<section className="space-y-6">`.
- **Exactly one `h1` per page**, and it comes from the page header component.
- Don't re-render the navigation or the breadcrumb; both are automatic.

Public pages (landing, auth) that use a different chrome are listed here with
the tokens they are allowed to use.

---

## 4. The component kit

Everything imports from `@/components/ui`. These are presentational only: no
data fetching, no business logic.

| Component | Key props (defaults) | Status | Notes |
| --- | --- | --- | --- |
| `{{KIT}}Card` | `variant` surface·card·highlight, `padding` none·sm·md·lg·xl, `as` | planned | Radius + border; `card` for data, `surface` for panels and modals |
| `{{KIT}}PageHeader` | `title`, `titleAccent`, `eyebrow`, `subtitle`, `actions` | planned | The page's `h1` |
| `{{KIT}}PageContainer` | — | planned | Applied once by the layout |
| `{{KIT}}SectionHeading` | `title`, `subtitle`, `action`, `size` md·lg, `as` | planned | Section title inside a card |
| `{{KIT}}Button` | `variant` primary·secondary·outline-accent·ghost, `size` sm·md, `icon`, `fullWidth`, `loading`, `href`, `external` | planned | Renders `<button>`, `<Link>` or an external `<a>`; focus ring included |
| `{{KIT}}Tag` | `tone` accent·neutral, `icon` | planned | Uppercase pill |
| `{{KIT}}Badge` | `icon` | planned | Neutral info chip |
| `{{KIT}}IconTile` | `size`, `shape` rounded·circle, `tone` card·accent | planned | Icon container |
| `{{KIT}}Divider` | — | planned | 1px border rule |
| `{{KIT}}Icon` | `name`, `size`, `label` | planned | Decorative (`aria-hidden`) unless `label` is set |
| `{{KIT}}EmptyState` | `icon`, `title`, `description`, `action` | planned | Loading / error / empty / not-found |
| `{{PREFIX}}InputClass`, `{{PREFIX}}SelectClass` | — | planned | Class strings for `<input>` / `<select>` |
| `{{PREFIX}}FocusRing`, `cx` | — | planned | Shared focus ring; class joiner |

Change **Status** to `built` as each component lands, and keep props in sync
with the code.

### Button rules

- One filled `primary` per view. The accent is an accent, not a background.
- Text on an accent fill uses the colour with enough contrast against it
  (state which one here), never chosen per page.
- A destructive action is `variant="secondary"` with `text-{{PREFIX}}-danger`,
  not a red fill.

---

## 5. Recurring patterns

### Panel with a heading

A card as `<section>`, a section heading (`title`, `subtitle`, optional
right-aligned `action`), then the content with a fixed top margin.

### Tables

Header cells: `text-{{PREFIX}}-subtext`, 12px, semibold, uppercase,
tracking-wide. Body cells: `text-{{PREFIX}}-text`. Row separators: a neutral
hairline, not the surface border, which is reserved for surface edges.

### List rows

Icon tile → a text block (title 14px/700 + one or two subtext meta lines) → a
right-aligned value or action. Reuse this shape for any list of records.

### Modals and drawers

Backdrop: `fixed inset-0 z-50 bg-{{PREFIX}}-bg/70 backdrop-blur-sm`. Panel: a
`surface` card, title as a section heading, actions as kit buttons. Keep
Escape-to-close and click-outside-to-close.

### Forms

Kit input/select classes for fields; labels 12px semibold subtext; inline
errors `text-{{PREFIX}}-danger`. Never restyle a field ad hoc — extend
`styles.ts` if a new field type appears.

### Empty, loading and error states

All three go through the empty-state component. Keep them distinct: a fetch
error is retryable and must never read as "no data". When data is already on
screen and a refresh fails, show a compact banner above it instead of replacing
the page.

### Charts

One chart theme and one palette file for the whole app; never pass an inline
palette. That file is the only place hex literals are allowed.

---

## 6. Icons

Icon set in the app: **{{ICON_SET}}**, rendered only through the kit's icon
component. When the design file uses a different set, `icon-map.ts` holds the
translation — add the mapping there rather than guessing in a component.

Sizes: 13px (inside tags and small buttons) · 15–18px (list rows, menu items) ·
20–22px (headers, large tiles) · 30px+ (decorative). Colour: subtext when
neutral, accent or a category colour when active.

---

## 7. Accessibility

- One `h1` per page; sections use `h2`/`h3` via the section heading.
- Every interactive element keeps a visible focus ring.
- Icons are `aria-hidden` unless they carry meaning — then pass `label`.
- Breadcrumbs: `nav[aria-label] > ol`, last crumb `aria-current="page"`.
- Dropdowns and dialogs: `aria-expanded` / `aria-haspopup` / `aria-modal`,
  Escape closes, focus returns to the trigger.
- Contrast on `{{PREFIX}}-bg`: text ≥ 7:1, subtext ≥ 4.5:1, muted ≥ 4.5:1 and
  only at 11px+. Record the measured ratios here once the palette is final.

---

## 8. Not allowed

Raw hex values in components · Tailwind palette classes (`slate-*`, `gray-*`,
`blue-*`…) · default `rounded-*` radii · inline `style` colours · forking a kit
component inside a feature folder.

Check before opening a PR — it must return nothing:

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b|\b(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b|\brounded-(sm|md|lg|xl|2xl|3xl)\b" \
  src/components/{{AREA}} src/app/{{AREA}}
```

---

## 9. Checklist for a new page

- [ ] The page renders only its content; no outer padding, max width or background.
- [ ] Exactly one `h1`, from the page header component.
- [ ] Every surface is a kit card.
- [ ] Only `{{PREFIX}}-*` tokens; no raw hex, no Tailwind palette classes.
- [ ] Radii come from `rounded-{{PREFIX}}-*`.
- [ ] Headings in `font-{{PREFIX}}-title`, everything else in `font-{{PREFIX}}-body`.
- [ ] One filled primary action per view.
- [ ] Inputs use the kit classes; modals use the standard backdrop.
- [ ] Loading, empty and error states exist and are distinguishable; errors retry.
- [ ] Icons go through the kit's icon component.
- [ ] Checked at 375 / 768 / 1440 px: no horizontal scroll, columns stack.
- [ ] Keyboard pass: focus rings visible, Escape closes overlays.
- [ ] The grep in §8 returns nothing.

---

## 10. Extending the system

If a screen needs something the kit doesn't cover:

1. Check the design file first — the pattern probably exists in another frame.
2. Add it to `src/components/ui/{{PREFIX}}/` with the same prop style
   (`variant`, `size`, `tone`), export it from the barrel, and document it in §4.
3. New colour or radius: add the CSS variable in `globals.css` **and** the
   Tailwind token, mirroring the design file's variable name.
4. Never fork a kit component inside a feature folder — that is how parallel
   design systems appear.
