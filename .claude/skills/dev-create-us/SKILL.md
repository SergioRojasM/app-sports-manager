---
name: dev-create-us
description: "Create a developer-ready User Story file. Use when the user wants to write a new user story, define a feature, or document a requirement with full technical detail."
---

# Create User Story

**Input**: A description of the feature or requirement. If not provided, ask the user before continuing — do not proceed without it.

**Language**: Always write the user story in **English**, even if the input is in another language.

**Role**: Act as a product expert with strong technical knowledge of the codebase.

---

## Steps

### 1. Understand the Input

Read the description carefully. If it is ambiguous or lacks enough detail to write a developer-ready story, ask 1–3 targeted clarifying questions before proceeding. Focus on:
- Who is the user actor (admin, athlete, coach)?
- What is the specific outcome or change?
- Are there edge cases or constraints?

### 2. Read the Technical Context

Read `projectspec/03-project-structure.md` to understand the architecture, directory conventions, naming patterns, and existing components/hooks/services that are relevant to the feature being described.

### 3. Determine the Next Story Number

List the files in `projectspec/userstory/`. The file names follow the pattern `us{NNNN}-*.md`. Identify the highest number and increment by 1 to get `{next-number}` (zero-padded to 4 digits, e.g. `0038`).

### 4. Create the User Story File

Create the file at:
```
projectspec/userstory/us{next-number}-{short-description}.md
```
Where `{short-description}` is a lowercase, hyphen-separated summary (3–5 words max).

### 5. Write the User Story

Produce a complete Markdown file with the following sections:

```markdown
# US-{NNNN} — {Title}

## ID
US-{NNNN}

## Name
{Full descriptive name}

## As a
{Actor role}

## I Want
{Goal — what the user wants to accomplish}

## So That
{Business value — why this matters}

---

## Description

### Current State
{Brief description of how things work today, if relevant. What is missing or broken?}

### Proposed Changes
{Detailed description of every change required. Group logically (UI, data model, API, logic). Be specific about field names, types, constraints, behaviors, and validations.}

---

## Database Changes
{Detail every migration needed: new tables, new columns, constraints, RLS policies, indexes. Include SQL snippets where useful.}

---

## API / Server Actions
{List every server action or API route needed. For each, specify:
- **File path** (e.g., `src/services/supabase/portal/example.service.ts`)
- **Function name / HTTP verb + path**
- **Input parameters and types**
- **Return value**
- **Auth / RLS requirements**
}

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/portal/example.service.ts` | Add function `X` |
| Hook | `src/hooks/portal/example/useExample.ts` | New hook |
| Component | `src/components/portal/example/ExampleModal.tsx` | New modal |
| Page | `src/app/portal/orgs/[tenant_id]/(role)/route/page.tsx` | Wire component |
| Migration | `supabase/migrations/{timestamp}_{name}.sql` | Add table/column |

---

## Acceptance Criteria

A numbered list of verifiable conditions. Each criterion must be testable.

1. {Criterion}
2. {Criterion}
...

---

## Implementation Steps

An ordered checklist for the developer to follow:

- [ ] Create migration and apply locally
- [ ] Add service function(s)
- [ ] Create/update custom hook(s)
- [ ] Build UI component(s)
- [ ] Wire to page
- [ ] Verify RLS policies in Supabase
- [ ] Test manually: happy path + edge cases
- [ ] Update any affected documentation

---

## Non-Functional Requirements

- **Security**: List RLS policies, role guards, input validation requirements.
- **Performance**: Note any queries that need indexes or pagination.
- **Accessibility**: Any ARIA or keyboard navigation requirements.
- **Error handling**: How errors surface to the user (toast, inline message, etc.).
```

---

## Quality Bar

Before saving, verify the story meets these criteria:

- [ ] A developer can implement this story without asking any follow-up questions
- [ ] Every new database object has RLS policies described
- [ ] Every file to touch is listed with the exact path (matching the architecture in `03-project-structure.md`)
- [ ] Acceptance criteria are specific and testable, not vague
- [ ] Edge cases (empty states, errors, permission denials) are addressed in acceptance criteria or description