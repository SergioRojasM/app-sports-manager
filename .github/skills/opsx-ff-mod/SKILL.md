---
name: opsx-ff-mod
description: Fast-forward through OpenSpec artifact creation from a User Story. Use when the user wants to quickly create all artifacts needed for implementation in one go, providing a User Story, Change Request, or description as input.
argument-hint: 'File path of a user story/change request, or a description of what to build'
---

Fast-forward through artifact creation from a User Story — generate everything needed to start implementation in one go.

**Input**: The argument after `/opsx:ff` is a file path to a User Story.

**Steps**

1. **If no input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Provide the path to a User Story or Change Request, or describe what you want to build."

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Read the input and derive the change name**

   - If the input is a file path, read the file to extract the title/description. Derive a kebab-case name from the story's title or ID (e.g., US-0040 "Prevent Booking Past Trainings" → `prevent-booking-past-trainings`).
   - If the input is a plain description, derive a kebab-case name directly (e.g., "add user authentication" → `add-user-auth`).
   - Keep the full user story content in context — it will be used to populate every artifact.

   **IMPORTANT**: Do NOT proceed without a valid kebab-case change name.

3. **Determine the workflow schema**

   Use the default schema (omit `--schema`) unless the user explicitly requests a different workflow.

   **Use a different schema only if the user mentions:**
   - A specific schema name → use `--schema <name>`
   - "show workflows" or "what workflows" → run `openspec schemas --json` and let them choose

   **Otherwise**: Omit `--schema` to use the default.

4. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   Add `--schema <name>` only if the user requested a specific workflow.
   This creates a scaffolded change at `openspec/changes/<name>/` with the selected schema.

   If a change with that name already exists, suggest using `/opsx:continue` instead and stop.

5. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["tasks"]`)
   - `artifacts`: list of all artifacts with their status and dependencies

6. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you — do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you — do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `outputPath`: Where to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - **Use the User Story content as the primary source** when populating the artifact — map its fields (description, acceptance criteria, files to modify, etc.) to the artifact's template sections
      - Create the artifact file using `template` as the structure
      - Apply `context` and `rules` as constraints — but do NOT copy them into the file
      - Show brief progress: "✓ Created <artifact-id>"

   b. **Continue until all `applyRequires` artifacts are complete**
      - After creating each artifact, re-run `openspec status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (critically unclear context not covered by the User Story):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

7. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- User Story used as input
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` or ask me to implement to start working on the tasks."

**Artifact Creation Guidelines**

- Use the User Story as the **primary source of truth** for content — acceptance criteria, files to modify, proposed changes, etc.
- Follow the `instruction` field from `openspec instructions` for structure and format rules
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file — fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read the User Story file before creating any artifact
- Always read dependency artifacts before creating a new one
- If context is critically unclear and the User Story doesn't cover it, ask the user — but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, suggest using `/opsx:continue` instead
- Verify each artifact file exists after writing before proceeding to next
