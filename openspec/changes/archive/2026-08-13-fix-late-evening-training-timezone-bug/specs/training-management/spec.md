## ADDED Requirements

### Requirement: Monthly range query uses tenant-local day boundaries

The `listTrainingInstancesByTenantAndRange` query SHALL include every training instance whose tenant-local (`America/Bogota`, UTC-5) calendar day falls within the requested `[from, to]` range, regardless of which UTC calendar day the instance's `fecha_hora` falls on. The `from`/`to` range boundaries MUST be converted to UTC using the `America/Bogota` offset (`-05:00`) before being applied to the `fecha_hora` (`timestamptz`) column, not treated as bare UTC boundaries.

#### Scenario: Late-evening training near the end of the range is included
- **WHEN** a training is created with `fecha_hora` corresponding to 20:00 Bogotá time on the last day of the requested month (stored as 01:00 UTC the following day)
- **AND** the trainings panel loads instances for that month using `from`/`to` equal to that month's first and last calendar day
- **THEN** the training instance is included in the query result and appears on its correct Bogotá-local day in the panel

#### Scenario: Training outside the requested month is still excluded
- **WHEN** a training has `fecha_hora` corresponding to 10:00 Bogotá time on the first day of the month following the requested range
- **THEN** the training instance is NOT included in the query result for the requested range
