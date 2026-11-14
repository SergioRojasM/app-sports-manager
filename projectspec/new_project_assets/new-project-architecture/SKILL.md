---
name: new-project-architecture
description: "Define the architecture of a new application as hexagonal architecture + feature slices: write projectspec/03-project-structure.md and create the matching folder scaffold. Use when starting a new project, when the user asks for the project structure or scaffold, or to document layers and feature-slice conventions."
argument-hint: 'Application name, roles and the first features'
---

# New Project — Hexagonal Architecture + Feature Slices

Produces `projectspec/03-project-structure.md` — the source of truth that OpenSpec and the user-story skill read on every change — and the folder scaffold that matches it.

**Input**: application name and description, main post-login area, roles, initial features. Ask for whatever is missing in a single round of questions.

Template next to this `SKILL.md`:

```
templates/03-project-structure.md
```

---

## The model

Six layers, dependencies pointing inward only:

| Layer | Directory | Hexagonal role |
|-------|-----------|----------------|
| Delivery | `src/app/` | Inbound adapter |
| Presentation | `src/components/` | Inbound adapter |
| Application | `src/hooks/` | Application core (use cases) |
| Infrastructure | `src/services/` | Outbound adapter |
| Domain | `src/types/` | Ports (contracts) |
| Utilities | `src/lib/` | Support |

A feature is a vertical slice with the **same kebab-case name** in every layer:

```text
app/<area>/(<role>)/<route>/page.tsx
components/<area>/<feature-name>/
hooks/<area>/<feature-name>/
services/supabase/<area>/<feature-name>.service.ts
types/<area>/<feature-name>.types.ts
```

Flow is always `page → component → hook → service → types`; components never reach a service or the database SDK.

---

## Steps

### 1. Gather the application shape

| Question | Used for | Default |
|----------|----------|---------|
| Application name and one-line description | Title | — |
| Main post-login area (bounded context) | `{{AREA}}` | `portal` |
| Roles, with a short description each | `{{ROLE}}` route groups and Roles table | a single `admin` |
| Initial features: name, route, roles, tables | Features table and scaffold | none |
| Multi-tenant? | Adds `[tenant_id]` segment under the area | no |

Read `projectspec/01-project-tech-stack.md` if it exists. If the backend is not Supabase, rename `services/supabase/` to the real adapter (e.g. `services/api/`) everywhere in the document.

### 2. Write `projectspec/03-project-structure.md`

Start from the template and:

- Replace `{{APP_NAME}}`, `{{APP_DESCRIPTION}}` and `{{AREA}}`.
- Expand every `({{ROLE}})` occurrence: one route group per role in the directory tree, one row per role in the Roles table. With a single role, drop the route group and use `app/<area>/<route>/page.tsx`.
- Multi-tenant: insert the tenant segment — `app/<area>/orgs/[tenant_id]/(<role>)/<route>/page.tsx` — with a `[tenant_id]/layout.tsx` that gates membership, and state in the Hard Rules that every query and RLS policy is tenant-scoped.
- Fill the Features table with the initial features, and list each feature's folders in the directory tree.
- Replace the `orders` example with one of the real features when at least one is known; keep the five-file code flow (page, component, hook, service, types).
- Leave the "Database Functions & Scheduled Jobs" and "Visual Design System" sections with their placeholder sentence; the first is filled as the project grows, the second by the `new-project-design` skill.

No `{{...}}` placeholder may remain. Never overwrite an existing `03-project-structure.md` without asking.

### 3. Create the scaffold

Create **folders only** — no source files — for the shared structure and for each initial feature:

```bash
mkdir -p src/app/{api,auth/{login,signup,callback,forgot-password,update-password},<area>}
mkdir -p src/components/{ui,auth,landing,<area>}
mkdir -p src/hooks/{auth,<area>}
mkdir -p src/services/supabase/<area>
mkdir -p src/types/<area>
mkdir -p src/lib
mkdir -p supabase/migrations projectspec/{userstory,designs}

# per feature
mkdir -p "src/app/<area>/(<role>)/<route>" src/components/<area>/<feature-name> src/hooks/<area>/<feature-name>
```

Add a `.gitkeep` to each empty folder so the scaffold survives a commit. Do not touch folders that already contain files.

### 4. Validate

- Every directory named in the document's tree exists, and nothing was scaffolded that the document does not describe.
- Every feature in the Features table has its `components/` and `hooks/` folders with the same name.
- Role route groups match the Roles table.

---

## Output

- Path of the structure document and a summary of area, roles and features
- Tree of the folders created
- Next skill: `new-project-design`, then `new-project-openspec`

## Guardrails

- Do not create pages, components, hooks or services here — features are implemented through the OpenSpec workflow, starting from a user story.
- Keep the document in English.
- When a later change alters routes, layers or conventions, the document is updated in the same change.
- Do not commit.
