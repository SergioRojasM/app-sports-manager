# New Project Assets

Skills to bootstrap a new application with the same stack, architecture and spec-driven workflow as this project. Each folder is a self-contained skill (`SKILL.md` + the templates it uses).

| Order | Skill | Produces |
|:-----:|-------|----------|
| 1 | [`new-project-tech-stack`](new-project-tech-stack/SKILL.md) | `projectspec/01-project-tech-stack.md`, `02-project-init.md`, `04-supabase-setup.md`; optionally the initialized Next.js + Supabase app |
| 2 | [`new-project-architecture`](new-project-architecture/SKILL.md) | `projectspec/03-project-structure.md` (hexagonal architecture + feature slices) and the folder scaffold |
| 3 | [`new-project-design`](new-project-design/SKILL.md) | `DESIGN.md` (UI design guide) and the design tokens in `globals.css` / `tailwind.config.ts` |
| 4 | [`new-project-openspec`](new-project-openspec/SKILL.md) | `openspec/` with `config.yaml`, the `opsx` skills/commands, and the custom `dev-create-us`, `opsx-ff-mod`, `opsx-new-mod` skills |

## Install in the new project

```bash
mkdir -p <new-project>/.claude/skills
cp -r projectspec/new_project_assets/new-project-* <new-project>/.claude/skills/
```

Then, from the new project, run them in order:

```
/new-project-tech-stack <App name> — <one-line description>
/new-project-architecture
/new-project-design <design file, or brand colours and fonts>
/new-project-openspec
```

After that the daily workflow is:

```
/dev-create-us <feature description>          → projectspec/userstory/us0001-*.md
/opsx-ff-mod projectspec/userstory/us0001-*.md → proposal, design, specs, tasks
/opsx:apply                                    → implementation
/opsx:verify  →  /opsx:archive
```

## Contents

```
new-project-tech-stack/
├── SKILL.md
└── templates/
    ├── 01-project-tech-stack.md
    ├── 02-project-init.md
    └── 04-supabase-setup.md
new-project-architecture/
├── SKILL.md
└── templates/
    └── 03-project-structure.md
new-project-design/
├── SKILL.md
└── templates/
    └── DESIGN.md
new-project-openspec/
├── SKILL.md
├── templates/
│   └── config.yaml
└── skills/                 # copied into the new project's .claude/skills/
    ├── dev-create-us/
    ├── opsx-ff-mod/
    └── opsx-new-mod/
```

The four `new-project-*` skills are only needed once; they can be deleted from the new project's `.claude/skills/` after the bootstrap.
