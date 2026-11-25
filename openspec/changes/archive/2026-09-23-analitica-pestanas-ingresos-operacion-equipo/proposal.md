## Why

After the Resumen redesign (`analitica-resumen-kpis-graficas`) and the subscription fact view (`bi-fct-suscripciones`), the **Ingresos**, **Operación** and **Equipo** tabs still show the phase-one layout. They mix definitions with Resumen: Ingresos shows validated revenue only, Operación shows pooled occupancy, and Equipo counts every member role. They also lack the monthly trends, per-training averages and subscription/athlete breakdowns administrators asked for. Part of the RPC still reads operational tables (`usuarios`, `miembros_tenant`, `roles`, `plan_tipos`, `reservas`) instead of `bi` facts. The request is that **every figure comes from the `bi` fact views**.

## What Changes

Input: change request for the Ingresos, Operación and Equipo tabs ("Todo se debe obtener de las fct"), with these clarifications from the user:
- The duplicated "Métodos de pago" table is **Atletas con mayor ingreso**.
- Revenue tables show **Suscripciones, Pagos, Total, Validado, Pendiente**; Total = validated + pending (rejected excluded).
- "Atletas con menos reservas" ranks **active athletes, including those with 0 bookings**.
- "Próximas sesiones con alta ocupación" is **kept as row 6** of Operación.

### Ingresos
| Row | Content |
|---|---|
| 1 | Ingresos totales (validados + pendientes) · Ingreso promedio por mes · Acumulado MTD · Pendiente de validar (unchanged) |
| 2 | Bar: monthly total revenue with the total labelled on each bar (same chart as Resumen) |
| 3 | Stacked bar: subscriptions sold per month, split into with / without validated payment, total labelled |
| Tables | Ingresos por plan · Métodos de pago · Atletas con mayor ingreso — each with the Suscripciones, Pagos, Total, Validado and Pendiente columns |

### Operación
| Row | Content |
|---|---|
| 1 | Entrenamientos programados (+ detail "promedio por mes") · Reservas válidas (+ detail "promedio por mes") · % Ocupación promedio / entrenamiento · % Asistencia promedio / entrenamiento |
| 2 | Line: trainings and bookings per month (two series, shared left Y axis) |
| 3 | Line: average occupancy % per month · Line: average attendance % per month |
| 4 | Table "Reservas por disciplina" · Table "Reservas por tipo de entrenamiento" (Público / Privado) — column headers; Reservas, % Ocupación promedio, % Asistencia promedio |
| 5 | Table "Atletas con más reservas" (top 10) · Table "Atletas con menos reservas" (top 10, active athletes incl. 0) |
| 6 | "Próximas sesiones con alta ocupación" (unchanged) |

### Equipo
- Only athletes (role `usuario`) are counted, including the status cards.
- "Atletas activos por plan": grouped by **plan** instead of plan type.
- "Cobertura de suscripciones": unchanged.
- "Atletas activos sin suscripción": column headers; columns Atleta, Estado, Última reserva, Última suscripción.

### Data layer
- **New view `bi.fct_miembros`** (one row per tenant membership, with name, role, `es_atleta`, state). With it, `get_tenant_bi_dashboard` reads **only** `bi.*` facts, apart from the admin-check helper.
- **RPC** (`create or replace`, same signature/auth): new and extended fields per tab (see specs). **Semantic changes** — none of these fields are used by Resumen:
  - `revenueByPlan`, `revenueByPaymentMethod` and `topAthletesByRevenue` include pending payments and gain `subscriptionCount`, `totalRevenue` and `pendingRevenue`; `paymentCount` counts validated + pending.
  - `bookingByPublicStatus` labels become "Público" / "Privado".
  - `topAthletesByBookings` returns 10 rows (was 5).
  - `team.membersByStatus` counts athletes only.
  - `team.membersWithoutSubscription[].latestBookingDate` becomes the Bogotá session date of the athlete's latest non-cancelled booking (was the booking creation timestamp date, including cancelled bookings).

## Capabilities

### New Capabilities
- `analitica-detail-tabs`: layout, metric definitions and RPC fields of the Ingresos, Operación and Equipo tabs.
- `bi-member-facts`: `bi.fct_miembros`, and the rule that `get_tenant_bi_dashboard` reads only `bi` fact views.

### Modified Capabilities
- `analitica-visual`: "Analytics behavior is unchanged" now defers to `analitica-detail-tabs` for the detail tabs' content (they no longer have to match the pre-change output).

## Non-goals

- Resumen tab, date filter, tabs component, service and hook behaviour.
- Changing the definition of total revenue, "sold" or "active" subscription (from `analitica-resumen-dashboard` / `bi-subscription-facts`).
- Exports, drill-downs, pagination of rankings.
- Pushing migrations to the remote Supabase project (local only).

## Impact

Files created:
- `supabase/migrations/20260924120000_analitica_pestanas_detalle.sql`: `bi.fct_miembros`, full `create or replace` of `get_tenant_bi_dashboard`.
- `src/components/portal/analitica/charts/SubscriptionsSoldStackedBarChart.tsx`, `MonthlyOperationsLineChart.tsx` (trainings + bookings), `MonthlyPercentLineChart.tsx` (occupancy / attendance).
- `src/components/portal/analitica/AnaliticaDataTable.tsx`: table with column headers and right-aligned numeric columns, shared by the three tabs.

Files modified:
- `src/components/portal/analitica/AnaliticaPage.tsx`: `Ingresos`, `Operacion` and `Equipo` rewritten; unused `MiniBars`, `RevenueTable`, `OperationsTable` and `Ranking` removed.
- `src/components/portal/analitica/charts/index.ts`, `MonthlyRevenueBarChart.tsx` (optional `height` prop for the full-width variant).
- `src/types/portal/analitica.types.ts`.
- `projectspec/03-project-structure.md`.

Unchanged: `useAnalitica.ts`, `analitica.service.ts`, route page.

## Implementation Plan

1. Branch from `develop` (contains both previous changes).
2. Page: rewrite the three tab components with the row layouts above.
3. Components: the shared data table and the three new chart components; reuse `MonthlyRevenueBarChart`.
4. Hook / service: no change.
5. Types: extend `AnaliticaRevenue`, `AnaliticaOperations`, `AnaliticaTeam`, `AnaliticaSubscriptions`.
6. DB: `bi.fct_miembros`; RPC repointed to facts only, with the new fields; apply locally; verify invariants and that Resumen fields are unchanged.
7. Docs, type-check, lint, delivery notes.
