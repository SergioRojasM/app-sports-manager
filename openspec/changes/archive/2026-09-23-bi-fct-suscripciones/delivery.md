# Delivery — bi-fct-suscripciones

## Commit message

```
feat(bi-fct-suscripciones): add bi.fct_suscripciones and derive subscription KPIs from it

- New private view bi.fct_suscripciones: one row per subscription with
  plan, plan type, Bogotá sale date, es_vendida, es_activa (estado =
  'activa', kept current by the expiry cron) and a per-subscription
  payment summary (counts, validated/pending/rejected amounts, first
  validated payment date).
- get_tenant_bi_dashboard no longer reads public.suscripciones: the
  subscriptions section and the team active-subscription CTE read the
  view. Same signature, auth and JSON; output verified identical.
- Index pagos (suscripcion_id, estado) for the payment summary.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request

**Title:** feat(bi): subscription fact view `bi.fct_suscripciones`

### Why
Subscription KPIs read `public.suscripciones` directly in two places of `get_tenant_bi_dashboard`, each with its own joins and rules. Upcoming subscription KPIs need a single definition.

### What
- `bi.fct_suscripciones` (migration `20260923130000_bi_fct_suscripciones.sql`), private like the other `bi.*` facts:
  `suscripcion_id, tenant_id, atleta_id, plan_id, plan_nombre, plan_tipo_id, plan_tipo_nombre, suscripcion_estado, fecha_creacion, fecha_venta_analitica, fecha_inicio, fecha_fin, clases_plan, clases_restantes, es_vendida, es_activa, pagos_count, pagos_validados_count, monto_validado, monto_pendiente, monto_rechazado, fecha_primer_pago_validado_analitica`.
- `get_tenant_bi_dashboard`: `subscriptions_sold` and `valid_subscriptions` now read the view; nothing else in the function changed.
- "Active subscription" is now `estado = 'activa'`, matching every portal service. The `vencer-suscripciones-diarias` cron keeps it current. It can differ from the previous date re-check only between 00:00 and 01:00 Bogotá or if the cron fails.

### Verification (local DB only — not pushed to remote)
- RPC JSON before vs after, as a tenant admin: **identical** for the year to date, the current month, all of 2025 and a range with no data.
- View: 188 rows = 188 subscriptions; unique ids; 83 subscriptions without payments show 0 amounts / null date; `es_activa` count = `estado = 'activa'` count (56); the sum of amounts in the view equals `sum(pagos.monto)`.
- `authenticated` gets `permission denied for schema bi`; non-admin RPC call still raises `42501`.
- No `public.suscripciones` reference left in the function body.
- No frontend changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
