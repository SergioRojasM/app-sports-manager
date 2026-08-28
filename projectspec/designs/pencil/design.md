---
screen: Athlete Trainings Schedule (Entrenamientos)
source: projectspec/designs/pencil/grit-arena.pen
node_id: d41rX5
canvas_size: 1536x964
breadcrumb: Inicio › Orgs › Wolfpack › Entrenamientos
---

# Entrenamientos — Weekly Schedule

Portal screen where an athlete browses this week's trainings in a 7-day
calendar grid and books a spot, with a secondary filters/list sidebar for a
flat chronological view of the same week. Visual language follows the GRIT
Arena brand system (see [`../landing_new_dessign/DESIGN.md`](../landing_new_dessign/DESIGN.md)):
dark navy background, cyan accent, Rajdhani for display type, Montserrat for
UI text.

## Design tokens used on this screen

| Token | Value | Usage |
| --- | --- | --- |
| `$bg-navy` | `#07111F` | Screen background |
| `$accent-cyan` | `#14DBC4` | Primary accent — active states, CTAs, links, icons |
| `$accent-teal` | `#0FA3AB` | Secondary accent (also `discipline-cycle`) |
| `$text-primary` | `#E6EDF3` | Headings, primary content |
| `$text-subtext` | `#BAC7D5` | Secondary/meta text |
| `$glass-fill` | `#0F1F30B0` | Translucent panel background (navbar avatar/bell, cards, sidebar) |
| `$glass-border` | `#14DBC440` | 1px hairline borders on panels, pills, buttons |
| `$card-fill` | `#0B1826CC` | Day-column training card background |
| `$font-title` | Rajdhani | Page title, day numbers, logo wordmark |
| `$font-body` | Montserrat | All other text |
| `discipline-swim` | `#14DBC4` | Natación |
| `discipline-cycle` | `#0FA3AB` | Ciclismo |
| `discipline-run` | `#F2B84B` | Running |
| `discipline-strength` | `#B98AFF` | Fuerza |
| `discipline-functional` | `#FF6B6B` | Cross Training |
| `discipline-mobility` | `#6BCB77` | Movilidad |

Background decoration: two large soft radial-gradient ellipses (`#14DBC4` top
right, `#0FA3AB` bottom left, both fading to transparent) sit behind all
content for ambient glow — non-interactive, `clip: true` on the root frame.

## Layout structure

```
Athlete Trainings Schedule (1536x964, bg-navy, clip)
└─ Content (vertical)
   ├─ Navbar (row, space-between, 1px bottom border, padding 18/48)
   │  ├─ Nav Left
   │  │  ├─ Logo Group — icon badge "⚡" + "GRIT" / "ARENA" wordmark
   │  │  ├─ Menu Dropdown — grid icon + "Menú" + chevron
   │  │  └─ Breadcrumb — Inicio › Orgs › Wolfpack › Entrenamientos
   │  └─ Nav Right
   │     ├─ Bell button (glass pill, 36x36)
   │     └─ Avatar (cyan circle, initial "S")
   └─ Body (vertical, gap 28, padding 32/48/36/48)
      ├─ Header Row (space-between)
      │  ├─ Header Left — "Entrenamientos" title + subtitle
      │  └─ Sessions Widget — "24 entrenamientos disponibles esta semana"
      └─ Main Row (row, gap 32)
         ├─ Calendar Column (fill_container, glass panel)
         │  ├─ Date Nav Row (space-between)
         │  │  ├─ Date Nav Left — ‹ prev · "20 – 26 mayo, 2024" · next ›
         │  │  └─ Date Nav Right — "Hoy" button · "Semana" dropdown
         │  ├─ Week Grid — 7 day columns (LUN…DOM), 2 training cards each
         │  ├─ Divider
         │  └─ "No encuentras lo que buscas?" → "Ver más entrenamientos"
         └─ Filters Sidebar (width 400, glass panel)
            ├─ Filters Header — "Filtros" + "Limpiar" link
            ├─ Filter Row 1 — ‹ prev · "20 - 26 mayo" · next ›
            ├─ Discipline Dropdown — "Todas las disciplinas"
            ├─ Filter Row 2 — "Hoy" / "Mañana" quick filters
            ├─ Divider
            ├─ "Lista de entrenamientos" heading
            ├─ List Wrap — 5 flat list items (Mon–Fri, chronological)
            └─ "Ver todos los entrenamientos" link
```

## Component: Day Training Card (`b91jku`, reusable, 150px wide)

Used inside each Week Grid day column, stacked with `gap: 12`.

- Frame: `card-fill` background, `glass-border` 1px stroke, `cornerRadius: 10`,
  vertical layout, `gap: 6`, `padding: 10`.
- **Sport Row**: small icon (12px) + label (11px/600), both tinted with the
  discipline color.
- **Card Title**: 13px/700, `text-primary`, wraps (`lineHeight: 1.25`).
- **Card Time**: 10px/500, `text-subtext` — e.g. `07:00 AM – 08:30 AM`.
- **Card Location**: 10px/500, `text-subtext`.
- **Spots Pill**: bottom-aligned, `accent-cyan` 1px stroke, `cornerRadius: 6`,
  text `10px/700` in `accent-cyan`, format `booked/capacity` (e.g. `12/20`).

## Component: List Training Item (`QQNs1`, reusable, 400px wide)

Used in the sidebar's "Lista de entrenamientos", stacked with `gap: 16`.

- Row layout, `gap: 12`, vertically centered.
- **Icon Wrap**: 36x36, `cornerRadius: 8`, fill = discipline color at ~13%
  opacity (e.g. `#14DBC422`), icon 16px in the full discipline color.
- **Text Block** (fills remaining width, `gap: 2`):
  - Item Title — 14px/700, `text-primary`.
  - Meta 1 — 11px/500, `text-subtext`, format `Disciplina • Día DD, hh:mm AM/PM`.
  - Meta 2 — 11px/500, `text-subtext`, location.
- **Right Block** (right-aligned, `gap: 6`):
  - Spots Block — value `booked/capacity` (13px/700, `text-primary`) over
    label "cupos" (10px/500, `text-subtext`).
  - Reserve Button — `accent-cyan` fill, `cornerRadius: 8`, padding `7/16`,
    label "Reservar" (12px/700, `#07111F` — dark text on the cyan fill for
    contrast).

## Week grid content (20–26 mayo, 2024)

| Día | # | Disciplina | Título | Horario | Ubicación | Cupos |
| --- | --- | --- | --- | --- | --- | --- |
| LUN 20 (hoy) | 1 | Natación | Técnica en Aguas Abiertas | 07:00 AM – 08:30 AM | Piscina Olímpica | 12/20 |
| LUN 20 (hoy) | 2 | Ciclismo | Rodada de Fondo | 06:30 PM – 08:30 PM | Salidas Norte | 15/30 |
| MAR 21 | 1 | Running | Intervalos de Velocidad | 06:30 AM – 07:30 AM | Parque Central | 18/25 |
| MAR 21 | 2 | Fuerza | Fuerza Funcional | 05:30 PM – 06:30 PM | Box Central | 10/16 |
| MIÉ 22 (seleccionado) | 1 | Natación | Potencia en el Agua | 08:00 AM – 09:00 AM | Piscina Olímpica | 8/20 |
| MIÉ 22 (seleccionado) | 2 | Cross Training | WOD Intensivo | 06:00 PM – 07:00 PM | Box Central | 14/20 |
| JUE 23 | 1 | Ciclismo | Subidas en Resistencia | 06:30 AM – 08:00 AM | Salidas Norte | 10/25 |
| JUE 23 | 2 | Natación | Técnica Avanzada | 06:00 PM – 07:00 PM | Piscina Olímpica | 9/20 |
| VIE 24 | 1 | Running | Tempo Run | 06:30 AM – 07:30 AM | Parque Central | 16/25 |
| VIE 24 | 2 | Fuerza | Fuerza Superior | 05:30 PM – 06:30 PM | Box Central | 12/16 |
| SÁB 25 | 1 | Natación | Aguas Abiertas Largas | 07:00 AM – 09:00 AM | Playa Norte | 6/15 |
| SÁB 25 | 2 | Cross Training | Metcon Endurance | 10:00 AM – 11:00 AM | Box Central | 13/20 |
| DOM 26 | 1 | Ciclismo | Rodada Social | 07:00 AM – 09:00 AM | Salidas Norte | 20/30 |
| DOM 26 | 2 | Movilidad | Movilidad y Recuperación | 09:30 AM – 10:30 AM | Estudio Zen | 14/20 |

**Day column states**:
- Default column: no fill, no stroke.
- Today (LUN): default styling, plus a small cyan dot (`●`, 8px) below the day
  number.
- Selected day (MIÉ, in this mock): `fill: #14DBC414`, `stroke: accent-cyan`
  at `1.5px`, `cornerRadius: 12`, and the day number rendered in
  `accent-cyan` instead of `text-primary`.

## Sidebar list content (flat chronological view, Mon–Fri)

| Disciplina | Título | Meta | Ubicación | Cupos |
| --- | --- | --- | --- | --- |
| Natación | Técnica en Aguas Abiertas | Natación • Lunes 20, 07:00 AM | Piscina Olímpica | 12/20 |
| Running | Intervalos de Velocidad | Running • Martes 21, 06:30 AM | Parque Central | 18/25 |
| Natación | Potencia en el Agua | Natación • Miércoles 22, 08:00 AM | Piscina Olímpica | 8/20 |
| Ciclismo | Subidas en Resistencia | Ciclismo • Jueves 23, 06:30 AM | Salidas Norte | 10/25 |
| Running | Tempo Run | Running • Viernes 24, 06:30 AM | Parque Central | 16/25 |

## Icons (Lucide)

`zap` (logo), `layout-grid` (menu), `chevron-down` (dropdowns), `bell`,
`calendar` (date pills/filters), `arrow-left` / `arrow-right` (date nav),
`users` (sessions widget), `list-filter` (filters header), `chevron-right`
(links), `activity` (running / discipline filter icon), `waves` (natación),
`bike` (ciclismo), `dumbbell` (fuerza), `flame` (cross training), `wind`
(movilidad).

## Notes for implementation

- The Week Grid and the sidebar list currently show **overlapping but
  independent data** — the sidebar list mirrors only the first Mon–Fri
  sessions from the grid and does not yet reflect the sidebar's own filter
  state (discipline / date-range / "Hoy"·"Mañana"). Treat the mock content as
  illustrative, not as the literal data contract.
- "Hoy" (today) and the selected day are two distinct visual states (dot
  marker vs. highlighted column) — both are visible simultaneously in this
  mock (LUN vs. MIÉ), so the UI must support "viewing a day that isn't today."
- All spots/capacity values follow the `booked/capacity` format consistently
  across both the day cards and the sidebar list.
