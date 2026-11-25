---
name: new-project-design
description: "Create the UI design guide (DESIGN.md) for a new application and wire its design tokens into globals.css and tailwind.config.ts. Use when starting a new project, when the user asks for a design.md, design system, tokens or UI guide, or before building the first page."
argument-hint: 'Design source (file path, or brand colours and fonts)'
---

# New Project — UI Design Guide (DESIGN.md)

Produces `DESIGN.md` at the project root — the document read before building or restyling any page — plus the design tokens in code that it describes. The guide must describe what exists in the code, so both are written together.

**Input**: a design source. One of:

- a design file (`.pen`, HTML mock, Figma export, screenshots) — preferred;
- brand colours and fonts given in chat;
- nothing — then propose a palette and ask for approval before writing.

Template next to this `SKILL.md`:

```
templates/DESIGN.md
```

---

## Steps

### 1. Gather the design inputs

Read `projectspec/03-project-structure.md` for the main area (`{{AREA}}`) and the application name. Then resolve, from the design source or by asking in a single round:

| Input | Placeholder | Default |
|-------|-------------|---------|
| Token prefix: short, lowercase, brand-derived | `{{PREFIX}}` | first word of the app name |
| Kit component prefix (PascalCase of the token prefix) | `{{KIT}}` | derived |
| Design source path | `{{DESIGN_SOURCE}}` | `projectspec/designs/<file>` |
| Scope (which routes follow this guide) | `{{SCOPE}}` | `Authenticated area (/<area>/*)` |
| Palette: bg, accent, accent-light, text, subtext, muted, surface, card, border, success, warning, danger | `{{COLOR_*}}` | from the design source |
| Category colours, if the domain has categories | category table | none — delete the table |
| Title and body fonts (Google Fonts available through `next/font`) | `{{FONT_TITLE}}`, `{{FONT_BODY}}` | from the design source |
| Icon set | `{{ICON_SET}}` | Material Symbols Outlined |

When the source is a design file, read its variables and use their names and values exactly — tokens mirror the design 1:1. Read `.pen` files only through the pencil MCP tools. Copy the design file into `projectspec/designs/` if it lives elsewhere.

Check contrast before accepting a palette: text ≥ 7:1, subtext and muted ≥ 4.5:1 against the background. If a colour fails, say so and propose the nearest passing value instead of writing it silently.

### 2. Write `DESIGN.md`

Copy the template to the project root and replace every placeholder. Then:

- Fill the frames table from the design file, or delete the subsection when there is no design file (and rewrite rule 2 of the intro to name the tokens as the source of truth).
- Adjust the radius, spacing and type scales to the design's real values; the template values are a starting point.
- Record the measured contrast ratios in §7.
- State in "Button rules" which text colour goes on an accent fill.
- Leave kit components as `planned` in §4 unless they already exist in `src/components/ui/`.
- Set `updated` to today's date.

No `{{...}}` placeholder may remain. Never overwrite an existing `DESIGN.md` without asking.

### 3. Wire the tokens into code

Skip this step, and say so, when the app is not initialized yet (`src/app/globals.css` missing).

1. **`src/app/globals.css`** — add the CSS variables to `:root` under a comment naming the design source, plus the shell class:

   ```css
   @config "../../tailwind.config.ts";
   @import "tailwindcss";

   :root {
     --<prefix>-bg: <hex>;
     --<prefix>-accent: <hex>;
     /* …one variable per colour token… */
   }

   .<prefix>-shell {
     background: var(--<prefix>-bg);
     color: var(--<prefix>-text);
   }
   ```

   Tailwind 4 only reads `tailwind.config.ts` when `globals.css` has the `@config` line; add it if missing.

2. **`tailwind.config.ts`** — under `theme.extend`, add `colors.<prefix>` (hex for solid tokens so opacity modifiers work, `var(--…)` for translucent ones), `fontFamily["<prefix>-title" | "<prefix>-body"]` and `borderRadius["<prefix>-xs" … "<prefix>-xl"]`. Values must equal the ones in `DESIGN.md` §2.

3. **`src/app/layout.tsx`** — load both fonts with `next/font/google`, expose them as CSS variables and reference those variables from the Tailwind font tokens. Add the icon font link if the icon set needs one.

4. **`src/components/ui/<prefix>/styles.ts`** and the barrel `src/components/ui/index.ts` — create only the class helpers (`cx`, input/select classes, focus ring). Kit components are built through the OpenSpec workflow, not here.

### 4. Connect the guide to the workflow

- In `projectspec/03-project-structure.md`, replace the placeholder under "Visual Design System" with: the design source, the token prefix, the fonts, and "See `DESIGN.md`".
- If `openspec/config.yaml` exists and has no rule mentioning `DESIGN.md`, add to both `rules.proposal` and `rules.design`:
  `- Always read DESIGN.md before proposing or designing any page or component; use only its tokens and component kit`
  (the `new-project-openspec` template already includes it).

### 5. Verify

```bash
npm run lint
npx tsc --noEmit
```

Confirm every token named in `DESIGN.md` §2 exists in `tailwind.config.ts` with the same value, and that the grep in §8 runs against real paths.

---

## Output

- Path of `DESIGN.md`, token prefix, palette and fonts chosen
- Files changed in code, or a note that token wiring was skipped
- Contrast ratios, with any colour that was adjusted to pass
- Suggested first user story: build the component kit listed as `planned` in §4
- Next skill: `new-project-openspec` (if not run yet)

## Guardrails

- The guide and the code never disagree: a token is added to both or to neither.
- Do not invent frame ids, measurements or components that are not in the design source or the code.
- Do not build pages or kit components here.
- Keep the document in English; user-facing copy examples may be localized.
- Do not commit.
