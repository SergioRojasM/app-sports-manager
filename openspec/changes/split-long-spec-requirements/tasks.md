# Tasks

**References**: `proposal.md` (scope, counts), `design.md` (decisions §1–§4 and the split table), and the deltas under `specs/`. This change only touches specs: no code, no database.

## 1. Branch setup

- [ ] 1.1 Create branch `fix/split-long-spec-requirements`, from `develop` once `grit-arena-v3-admin-organizacion` is merged (or from `feat/grit-arena-v3-admin-organizacion` while it is open). Verify with `git branch --show-current`
- [ ] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`). Stop if it is

## 2. Review the split

- [ ] 2.1 For each of the ten requirements, compare the main spec text (`openspec/specs/<capability>/spec.md`) with the delta: the MODIFIED header is identical, every original scenario is present verbatim, and every sentence removed from the description appears in an ADDED requirement with the same meaning (SHOULD stays SHOULD). Verify with a scratch script that lists, per requirement, the scenario names before and after (identical sets) and that the moved sentences appear in the delta
- [ ] 2.2 Run `openspec validate split-long-spec-requirements --strict` and verify that it reports the change as valid. Also verify that every requirement description in the deltas is at most 500 characters

## 3. Archive and verify

- [ ] 3.1 Archive the change (`/opsx:archive split-long-spec-requirements`). Verify that the four main specs now contain the new requirements, with the same requirement count as the proposal: `discipline-levels-management` +3, `organization-view` +3, `plan-management` +5, `tenant-suspension-rules` +8
- [ ] 3.2 Run `openspec validate --specs --strict`. Verify that none of the ten requirements is reported, and that `discipline-levels-management`, `organization-view`, `plan-management` and `tenant-suspension-rules` pass, or only report requirements that another open change still owns
- [ ] 3.3 Run `npx tsc --noEmit` and `npm run lint` and verify that the results are identical to before this change (specs-only change). Do not run `npm run build`
- [ ] 3.4 Documentation: `projectspec/03-project-structure.md` is not affected (no code or structure change). Verify with `git diff --stat` that only `openspec/` files changed

## 4. Delivery

- [ ] 4.1 Write the commit message (`docs(specs): split long requirements into single-behavior requirements`) and the PR description to `openspec/changes/archive/<date>-split-long-spec-requirements/pr.md`. Cover:
  - the ten requirements and their split, using the design §4 table;
  - the statement that no meaning changed;
  - the SHOULD exception;
  - the validation results.

  Verify that the file exists
