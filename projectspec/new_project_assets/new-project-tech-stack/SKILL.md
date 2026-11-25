---
name: new-project-tech-stack
description: "Write the tech stack specs for a new application and initialize it with that stack (Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase). Use when starting a new project from scratch or when the user asks to document or set up the tech stack."
argument-hint: 'Application name and a one-line description'
---

# New Project — Tech Stack Specs & Initialization

Produces the stack specification files in `projectspec/` and, if the user wants, initializes the application following them.

**Input**: application name and a one-line description. If either is missing, ask before continuing.

Templates live next to this `SKILL.md`:

```
templates/01-project-tech-stack.md   # stack and versions
templates/02-project-init.md         # step-by-step initialization
templates/04-supabase-setup.md       # clients, middleware, auth, RLS, storage
```

(`03-project-structure.md` is produced by the `new-project-architecture` skill.)

---

## Steps

### 1. Confirm the stack

Show the default stack and ask whether anything changes. Do not ask question by question — one confirmation is enough.

| Area | Default |
|------|---------|
| Runtime | Node 24.21.0 (LTS), npm |
| Framework | Next.js 16.4.0 (App Router), React 19.3.0, React Compiler |
| Language | TypeScript 5.9, strict (not 7 yet) |
| UI | Tailwind CSS 4 + PostCSS |
| Backend | Supabase (Auth, Postgres + RLS, Storage, Realtime), `@supabase/ssr` |
| Tooling | ESLint 9 (not 10 yet) + `eslint-config-next`, Supabase CLI |
| Hosting | Vercel + Supabase Cloud |

Also ask which optional libraries are needed from the table at the end of `01-project-tech-stack.md` (email, charts, Excel, PDF, QR…). Install none by default.

### 2. Write the specs

Create `projectspec/` and copy the three templates into it, keeping the file names. Then:

- Replace `{{APP_NAME}}`, `{{APP_DESCRIPTION}}` and `{{APP_SLUG}}` (kebab-case name) in `02-project-init.md`.
- Apply every change agreed in step 1 to **all** files that mention it (versions appear in both `01` and `02`).
- In `01-project-tech-stack.md`, move the chosen optional libraries into a `### Libraries` section and delete the optional table rows that were not chosen.
- If the backend is not Supabase, do not copy `04-supabase-setup.md`; write the equivalent setup doc for the chosen backend with the same sections (installation, configuration, clients, auth, route protection, data access, security).

Never overwrite an existing `projectspec/0*.md` without asking.

### 3. Initialize the application (ask first)

Ask whether to initialize now. If yes, follow `projectspec/02-project-init.md` in order:

1. `node -v` matches the spec.
2. Create the Next.js project. When the target directory already has files (e.g. `projectspec/`, `.claude/`), generate in a temporary sibling directory and move the result in, without overwriting existing files.
3. Install Supabase dependencies and run `npx supabase init`.
4. Configure Tailwind, TypeScript (`@/*` → `./src/*`) and the React Compiler.
5. Create `.env.example`; create `.env.local` with placeholders only — never invent or request real keys in chat.
6. Create the Supabase clients and middleware from `04-supabase-setup.md`:
   - `src/services/supabase/client.ts`
   - `src/services/supabase/server.ts`
   - `src/services/supabase/middleware.ts`
   - `middleware.ts` (root) with the protected-paths redirect to `/auth/login?next=...`
7. Set the real project name in `package.json`.

### 4. Verify

```bash
npm run lint
npx tsc --noEmit
npm run dev   # confirm it starts, then stop it
```

Report failures with their output; do not claim success for a step that was skipped.

---

## Output

- Spec files written, with any deviation from the default stack
- Whether the app was initialized, and the result of lint / type check / dev server
- Manual steps left for the user: create the Supabase project, fill `.env.local`, configure Auth redirect URLs
- Next skill: `new-project-architecture`

## Guardrails

- Pin exact versions in the specs for Node, Next.js and React; ranges only for the rest.
- `SUPABASE_SERVICE_ROLE_KEY` and any other secret never get the `NEXT_PUBLIC_` prefix.
- Do not create Supabase cloud resources or push migrations to a remote project.
- Do not commit.
