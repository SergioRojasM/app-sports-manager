## Context

`entrenamientos.fecha_hora` is `timestamptz`. The tenant's operating timezone is hardcoded as `America/Bogota` (UTC-5, no DST) throughout the codebase — see `toIsoFromDateAndTime` and `toBogotaIsoFromLocalInput` in `entrenamientos.service.ts` / `useEntrenamientos.ts`, which already append a literal `-05:00` offset when *writing* timestamps, and `toDateKeyInBogota` / `toDateOnlyFromIso` / `toDateTimeLocalInBogota`, which correctly use `Intl.DateTimeFormat({ timeZone: 'America/Bogota' })` when *reading* timestamps back for display.

The gap is in three *range query* call sites that build `gte`/`lte` boundaries by concatenating a plain `YYYY-MM-DD` string (representing a Bogotá calendar day, e.g. the month being viewed in the calendar, or a date-range filter picked by the user) with a hardcoded UTC suffix:

- `entrenamientos.service.ts:359-365` — `${from}T00:00:00.000Z` / `${to}T23:59:59.999Z`
- `reservas.service.ts:1030-1036` (`getReservasManagement`) — `fechaDesde` raw (no offset) / `${fechaHasta}T23:59:59` (no offset, interpreted by Postgres in the session/UTC timezone)
- `reservas.service.ts:1095-1101` (`getMisReservas`) — same pattern as above

Because these boundaries are computed as if the requested day/month were UTC, any row whose true Bogotá-local instant falls within the requested range but whose *stored UTC instant* spills into the next UTC day (any local time after 19:00 Bogotá) is excluded by the database query itself — before the data ever reaches the frontend's (correct) Bogotá-aware grouping/display logic.

## Goals / Non-Goals

**Goals:**
- Make the three affected range queries return rows whose Bogotá-local calendar day falls within `[from, to]`, regardless of UTC day rollover.
- Reuse a single, small, well-named helper so the `-05:00` boundary convention isn't duplicated ad hoc across files.
- Keep the fix consistent with the codebase's existing fixed-offset Bogotá convention (no new timezone library, no DST handling — Colombia does not observe DST).

**Non-Goals:**
- Generalizing to multi-timezone tenants. The whole codebase currently hardcodes `America/Bogota`; this fix does not change that scope.
- Introducing a timezone library (`date-fns-tz`, `luxon`, etc.). Not justified for a single fixed offset.
- Changing the `entrenamientos.fecha_hora` column type or any RLS policy.
- Fixing the creation/display paths — they are already correct.

## Decisions

**Decision: Fixed `-05:00` string offset helper, not `Intl`/Date math.**
The existing write-path code (`toIsoFromDateAndTime`, `toBogotaIsoFromLocalInput`) already uses literal `-05:00` string concatenation rather than computing offsets dynamically. Using the same technique for the two new helpers (`bogotaDayStartIso`, `bogotaDayEndIso`) keeps the fix minimal, consistent with existing conventions, and trivially correct: PostgREST/Postgres parses an ISO 8601 string with an explicit offset and converts it correctly to UTC for comparison against the `timestamptz` column, regardless of server session timezone.
*Alternative considered*: compute boundaries with `Date` + `Intl.DateTimeFormat` (mirroring the display-side helpers). Rejected as unnecessary complexity for a fixed, no-DST offset — string concatenation is simpler and matches the existing write-path pattern.

**Decision: One shared helper module instead of duplicating the offset logic three times.**
`src/lib/portal/bogota-date.ts` is a pure, dependency-free module per the existing `src/lib/` convention (`csv.ts`, `validators.ts`). It is imported by both `entrenamientos.service.ts` and `reservas.service.ts`, which currently have no shared utils file between them.

**Decision: Scope the fix to the three known call sites; do not touch the creation/display paths.**
Those paths were independently verified during investigation to already produce/consume correct Bogotá-aware timestamps. Touching them is out of scope and would risk regressions.

## Risks / Trade-offs

- [Risk] Hardcoded `-05:00` does not generalize if the product later supports tenants in other timezones or if Colombia ever adopts DST → Mitigation: this matches the existing codebase-wide convention; a future multi-timezone effort would need to revisit all Bogotá-hardcoded call sites together, not just these three. Out of scope here.
- [Risk] `getReservasManagement` / `getMisReservas` currently have no openspec capability spec covering their date-filter behavior, so this fix is only formalized as a spec scenario under `training-management` (for `listTrainingInstancesByTenantAndRange`) → Mitigation: covered by manual acceptance criteria in the User Story (US-0075) and by the implementation tasks; not a regression risk since both functions move to the *same* shared, tested helper.
- [Risk] Off-by-one if `bogotaDayEndIso` is misapplied to a different upstream column whose semantics differ → Mitigation: the helper is intentionally narrow (string formatting only); call sites are unchanged in shape, only the literal boundary value changes.

## Migration Plan

No data migration. No Supabase migration needed (no schema change). Deploy as a regular code change:
1. Add `src/lib/portal/bogota-date.ts`.
2. Update the three call sites to use it.
3. No feature flag needed — strictly a correctness fix with no behavior change for rows that were already inside the (intended) range.
4. Rollback: revert the commit; no data cleanup required since no writes are affected.
