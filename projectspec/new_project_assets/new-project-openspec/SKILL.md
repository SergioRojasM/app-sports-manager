---
name: new-project-openspec
description: "Set up OpenSpec (spec-driven workflow) in a new project: install the CLI, run openspec init, write the project config with the team's artifact rules, and install the custom user-story skills. Use when bootstrapping a new application or when the user asks to add OpenSpec to a project."
argument-hint: 'Application name and a one-line description'
---

# New Project — OpenSpec Setup

Leaves the project ready to run the full workflow: **user story → `/opsx:ff` → `/opsx:apply` → `/opsx:verify` → `/opsx:archive`**.

**Input**: application name and a one-line description. If either is missing, ask before continuing.

**Prerequisites**: `projectspec/01-project-tech-stack.md` and `projectspec/03-project-structure.md` should exist (created by `new-project-tech-stack` and `new-project-architecture`), and `DESIGN.md` (created by `new-project-design`). The config references all three; if they are missing, warn the user and offer to run those skills first.

This skill's own files live next to this `SKILL.md`:

```
templates/config.yaml          # openspec/config.yaml with the per-artifact rules
skills/dev-create-us/          # writes developer-ready user stories
skills/opsx-ff-mod/            # fast-forward all artifacts from a user story
skills/opsx-new-mod/           # step-by-step change from a user story
```

---

## Steps

### 1. Verify the environment

```bash
node -v            # must be >= 20.19
git rev-parse --is-inside-work-tree
openspec --version # use the latest release (1.14.1 at the time of writing)
```

- If not a git repository, run `git init` (the task rules rely on feature branches).
- If `openspec` is missing, install it: `npm install -g @fission-ai/openspec@latest`. Ask before installing globally.

### 2. Initialize OpenSpec

```bash
openspec init --tools claude
```

Add other tools when the team uses them (e.g. `--tools claude,github-copilot`). This creates:

- `openspec/` with `specs/`, `changes/` and `changes/archive/`
- `.claude/skills/openspec-*` and `.claude/commands/opsx/*` (the standard workflow skills and slash commands)

If `openspec/` already exists, do not re-initialize — run `openspec update` instead and continue.

### 3. Write the project config

Copy `templates/config.yaml` to `openspec/config.yaml`, replacing:

- `{{APP_NAME}}` → application name
- `{{APP_DESCRIPTION}}` → one-line description

Keep every rule as is unless the user asks to change it. The rules encode the working agreement:

| Artifact | What the rules enforce |
|----------|------------------------|
| proposal | Starts from a user story; page → component → hook → service → types; design required before UI; non-goals, file list and step-by-step plan |
| design | Same layer order; diagrams when useful; migrations applied locally only, never pushed to remote Supabase |
| tasks | Task 1 creates a `feat/` or `fix/` branch; task 2 checks the branch is not `main`/`master`/`develop`; docs update task; commit message + PR description task; type/lint/test check, never build |

If the project does not use Supabase, replace the migration rule with the equivalent for its database.

### 4. Install the custom skills

Copy the three folders under `skills/` into the project's `.claude/skills/`:

```bash
cp -r <this-skill-dir>/skills/* .claude/skills/
```

Then create the folders these skills write to:

```bash
mkdir -p projectspec/userstory projectspec/designs
```

`dev-create-us` reads `projectspec/03-project-structure.md` and numbers stories from the files in `projectspec/userstory/` (`us0001-...` when empty).

### 5. Validate

```bash
openspec list
openspec schemas
```

Check that `openspec/config.yaml` parses (no `{{...}}` placeholders left) and that `.claude/skills/` contains the `openspec-*` skills plus `dev-create-us`, `opsx-ff-mod` and `opsx-new-mod`.

---

## Output

Summarize:

- OpenSpec version and tools configured
- Files created (`openspec/config.yaml`, skills, commands, folders)
- The workflow to follow next:
  1. `/dev-create-us <description>` → `projectspec/userstory/us0001-*.md`
  2. `/opsx-ff-mod projectspec/userstory/us0001-*.md` → proposal, design, specs, tasks
  3. `/opsx:apply` → implement
  4. `/opsx:verify` then `/opsx:archive`

## Guardrails

- Never overwrite an existing `openspec/config.yaml` or existing skills without showing the difference and asking.
- Do not commit; leave the changes staged or unstaged for the user to review.
