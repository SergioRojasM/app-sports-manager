# Design

## Context

- `openspec validate --specs --strict` flags ten requirement descriptions over 500 characters in `discipline-levels-management`, `organization-view`, `plan-management` and `tenant-suspension-rules` (see proposal.md, Why).
- `grit-arena-v3-admin-organizacion` is still open. It modifies other requirements of three of these specs: in `plan-management` "Plans list displays…", "Usuario sees Adquirir…" and "Delete plan…"; in `organization-view` "gestion-organizacion page includes…"; in `tenant-suspension-rules` "TenantReglasSuspensionCard renders…". None of them is one of the ten.
- OpenSpec applies a delta per requirement header. Deltas of two changes that touch different requirements of the same spec don't conflict.

## Goals / Non-Goals

**Goals:**
- Every one of the ten requirements gets a description of at most 500 characters that states one behavior.
- No requirement meaning changes, and no scenario is dropped or reworded.
- `openspec validate split-long-spec-requirements --strict` passes, and after archive the ten no longer appear in the strict spec validation.

**Non-Goals:**
- Long requirements outside these four specs, and the three that `grit-arena-v3-admin-organizacion` already splits.
- Any code, schema or behavior change.

## Decisions

### 1. Keep the header and every scenario under MODIFIED
Archive replaces a MODIFIED block whole, and it refuses a block that drops scenarios. Each MODIFIED block therefore keeps:
- the exact header;
- all original scenarios, in order and verbatim.

Only the description is cut down to the requirement's core behavior, using the original wording.

### 2. Removed behaviors become ADDED requirements, copied without strengthening
Each sentence or bullet taken out of a description moves into an ADDED requirement:
- its wording is preserved;
- it gets a header named after the behavior;
- it has at least one new scenario.

The new scenarios only restate what the moved text already says (a constraint, a label, a mapping). They don't add cases the old text left open.

### 3. SHOULD stays SHOULD
"ReglaSuspensionFormModal…" has two SHOULD-level hints ("Permanente (sin límite de días)", "No aplica"). Moving them into their own requirement would trigger the RFC 2119 warning (no SHALL/MUST). Raising them to SHALL would change their meaning.

They stay in the MODIFIED description, which is 466 characters with them. This is the one requirement that keeps two closely related statements: the form and its input hints.

*Alternative*: SHALL hints in an ADDED requirement. Rejected because it strengthens the contract.

### 4. Split boundaries

| Requirement | Kept in MODIFIED | Moved to ADDED |
|---|---|---|
| nivel_disciplina migration | table and columns | constraints · RLS · index |
| max_solicitudes field | admin-only field, label, range, save path | type / row / mapper wiring |
| requiere_perfil_completo toggle | admin-only toggle, label, save path | help text + placement · type / mapper / default wiring |
| plan modal | one modal, 3 modes, close / pending | titles and submit labels |
| Subscription request modal | plan summary, subtype selection, Confirmar / Cancelar | subtype details without plan fallback · comments + proof file input |
| Subscription request submission | single RPC creating pending subscription + payment, `plan_tipo_id` | server-side amount · proof upload before the RPC |
| tenant_reglas_suspension table | table and columns | constraints + index · `miembros_tenant` reference |
| suspension service | the four exported functions | read ordering · mutation return values |
| useReglasSuspension | exposed state | modal controls + 3-rule limit · mutations + toasts |
| ReglaSuspensionFormModal | drawer, fields, modes, SHOULD hints | validation · submit + duplicate-name mapping |

## Risks / Trade-offs

- [A moved sentence subtly changes meaning] → Each ADDED description is the original text with only its subject made explicit. The review compares old and new side by side (task group 2).
- [New scenarios add untested expectations] → They restate the moved text and add no new edge cases. Scenarios that need a live database (constraints, RLS) describe the existing schema, which already behaves that way.
- [Archiving in the wrong order] → No conflict: the two changes touch disjoint requirements. Validation is re-run after each archive.

## Migration Plan

- Specs only: archive the change after review. Nothing is deployed or rolled back.
